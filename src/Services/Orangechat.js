/**
 * Integration to the orangechat.io backend
 *
 * TODO: Should Services/Transport be in here?
 */


function Orangechat(state) {
	this.state = state;
	this.sid = state('sid') || '';
	this.username = m.prop(state('username') || '');
	this.api_url = 'https://app.orangechat.io/app';
	//this.api_url = 'https://app.orangechat.io/prawnsaladapp';
	this.subreddits = m.prop([]);
}


/**
 * Generate a singleton instance
 * @return {Orangechat}
 */
Orangechat.instance = (function() {
	var instance = null;

	return function(state) {
		instance = instance || new Orangechat(state);
		return instance;
	};
})();


// TODO: Not a fan of this setter. Find a way to detect changes on m.prop() and use that
Orangechat.prototype.setSid = function(sid) {
	this.sid = sid;
	this.state.set('sid', sid);
};
// TODO: Not a fan of this setter. Find a way to detect changes on m.prop() and use that
Orangechat.prototype.setUsername = function(username) {
	this.username(username);
	this.state.set('username', username);
};


/**
 * Build a URL to call the backend
 * @param  {String} path  The API path, ie. API method to be called
 * @param  {Object} _args Object of querystring parameters
 * @return {String}       A complete API URL
 */
Orangechat.prototype.apiUrl = function(path, _args) {
	var args = _args || {};
	var querystring_params = [];
	
	args.sid = this.sid || '';

	for (var prop in args) {
		if (!args.hasOwnProperty(prop)) {
			continue;
		}

		querystring_params.push(prop + '=' + encodeURIComponent(args[prop]));
	}

	return this.api_url + path + '?' + querystring_params.join('&');
};

Orangechat.prototype.ping = function() {
	var deferred = m.deferred();

	m.request({method: 'GET', url: this.apiUrl('/ping')})
	.then((resp) => {
		var just_logged_in = false;

		if (resp && resp.sid) {
			this.setSid(resp.sid);
		}

		if (!resp.username) {
			this.setUsername('');
			deferred.resolve({});

		} else {
			// If we don't current have a username but have one now, then we must have
			// just logged in.
			just_logged_in = !this.username();

			// Just make sure we know our correct username
			this.setUsername(resp.username);

			deferred.resolve({
				just_logged_in: just_logged_in,
				username: resp.username,
				user_channel: resp.user_channel || '',
				channels: resp.channels
			});
		}
	});

	return deferred.promise;
};


/**
 * Create a private channel and return the channel name
 */
Orangechat.prototype.createChannel = function(_invite_users) {
	var invite_users = [].concat(_invite_users);
	var url = this.apiUrl('/channels/create', {
		invite: invite_users.join(',')
	});

	return m.request({method: 'GET', url: url})
	.then((resp) => {
		return resp;
	});
};


/**
 * get the banlist for a channel
 */
Orangechat.prototype.getBanlist = function(channel_name) {
	var url = this.apiUrl('/channels/banlist', {
		channel: channel_name
	});
	return m.request({
		method: 'GET',
		url: url,
		background: true,
		initialValue: []
	});
};


/**
 * Ban users from a channel
 */
Orangechat.prototype.banFromChannel = function(channel_name, _ban_users) {
	var users = [].concat(_ban_users);
	var api_params = {
		users: users.join(','),
		channel: channel_name
	};

	var url = this.apiUrl('/channels/ban', api_params);

	return m.request({method: 'GET', url: url, background: true})
	.then((resp) => {
		return resp;
	});
};


/**
 * Unban users from a channel
 */
Orangechat.prototype.unbanFromChannel = function(channel_name, _ban_users) {
	var users = [].concat(_ban_users);
	var api_params = {
		users: users.join(','),
		channel: channel_name
	};

	var url = this.apiUrl('/channels/unban', api_params);

	return m.request({method: 'GET', url: url, background: true})
	.then((resp) => {
		return resp;
	});
};


/**
 * Create a private channel and return the channel name
 */
Orangechat.prototype.inviteToChannel = function(channel_name, _invite_users, _opts) {
	var invite_users = [].concat(_invite_users);
	var opts = _opts || {};
	var api_params = {
		invite: invite_users.join(','),
		channel: channel_name
	};

	if (opts.label) {
		api_params.label = opts.label;
	}

	var url = this.apiUrl('/channels/invite', api_params);

	return m.request({method: 'GET', url: url})
	.then((resp) => {
		return resp;
	});
};

Orangechat.prototype.updateChannel = function(channel_name, updates) {
	updates.channel = channel_name;
	var url = this.apiUrl('/channels/update', updates);

	return m.request({method: 'GET', url: url})
	.then((resp) => {
		return resp;
	});
};

Orangechat.prototype.channelUserlist = function(channel_name) {
	var url = this.apiUrl('/channels/users', {
		channel: channel_name
	});

	return m.request({method: 'GET', url: url})
	.then((resp) => {
		return resp;
	});
};

Orangechat.prototype.loadSubreddits = function(force_reddit_update) {
	var subreddits = this.subreddits;
	var url = this.apiUrl('/subreddits', force_reddit_update ? {refresh:1} : undefined);

	return $.getJSON(url, (response) => {
		var new_subreddits = [];
		if (!response) {
			return;
		}

		_.each(response, (item) => {
			new_subreddits.push({
				name: '/r/' + item.subreddit,
				short_name: item.subreddit
			});
		});

		new_subreddits = _.sortBy(new_subreddits, (sub) => {
			return sub.name.toLowerCase();
		});

		subreddits(new_subreddits);

		// TODO: This redraw shouldn't be here.
		m.redraw();

	}).fail(function() {
	});
};


/**
 * Auth into the API backend
 * This will either return the username if already auth'd or process the reddit OAuth
 * and handle any redirects until fully auth'd, and then returns the username.
 */
Orangechat.prototype.auth = function() {
	var deferred = m.deferred();

	m.startComputation();

	function resolveAuth(result) {
		m.endComputation();
		deferred.resolve(result);
	}
	function rejectAuth(err) {
		m.endComputation();
		deferred.reject(err);
	}

	m.request({method: 'GET', url: this.apiUrl('/auth')})
	.then((resp) => {

		// Check if we have a session ID set (can't use cookies.. IE9< doesn't
		// support cookies over CORS)
		if (resp && resp.sid) {
			this.setSid(resp.sid);
		}

		if (!resp || resp.status === 'bad') {
			rejectAuth(resp.error || 'unknown_error');
			return;
		}

		// If instructed to redirect somewhere, do that now
		if (resp.redirect) {
			window.location = resp.redirect + '&return_url=' + encodeURIComponent(window.location.href);
			return;
		}

		if (resp.username) {
			this.setUsername(resp.username);
			resolveAuth({username: this.username()});
		}
	});

	return deferred.promise;
};


/**
 * 
 */
Orangechat.prototype.logout = function() {
	return m.request({method: 'GET', url: this.apiUrl('/logout')})
	.then((resp) => {
		this.setUsername('');
	});
};


/**
 * Convert 'type_string:{JSON structure}' into an object
 * @param  {String} message Raw string, typically recieved from a window message
 * @return {Object}         {type: 'string', args: {args}
 */
function parsePostedMessage(message) {
	var result = {
		type: null,
		args: {}
	};

	var split_pos = message.indexOf(':');
	if (split_pos === -1) {
		return result;
	}

	result.type = message.substring(0, split_pos);
	try {
		result.args = JSON.parse(message.substring(split_pos + 1));
	} catch (err) {
	}

	return result;
}

export default Orangechat;
