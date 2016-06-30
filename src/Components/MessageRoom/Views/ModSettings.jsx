import strftime from 'strftime';
import Orangechat from '../../../Services/Orangechat.js';

var ModSettings = {};

ModSettings.controller = function(args) {
	this.room = args.room;
	this.room_manager = args.room_manager;
	this.orangechat = Orangechat.instance();

	this.banlist_status = 'loading';
	this.banlist = m.prop([]);

	this.close = () => {
		this.room.openChat();
	};

	this.refreshBanlist = () => {
		this.banlist_status = 'loading';
		this.orangechat.getBanlist(this.room.name())
		.then((response) => {
			var users = [];
			_.each(response.banlist, (user) => {
				users.push({
					status: 'banned',
					user: user
				});
			});

			this.banlist(users);
			this.banlist_status = 'loaded';

			m.redraw();
		});
	};

	this.unbanUser = (username) => {
		var ban = _.find(this.banlist(), (ban) => {
			return ban.user.username === username;
		});

		if (!ban) {
			return;
		}

		ban.status = 'unbanning';

		this.orangechat.unbanFromChannel(this.room.name(), ban.user.username)
		.then((response) => {
			if (response.status === 'ok') {
				ban.status = 'unbanned';
			} else {
				ban.status = 'banned';
			}

			m.redraw();
		});
	};

	this.banUser = (username) => {
		var ban = _.find(this.banlist(), (ban) => {
			return ban.user.username === username;
		});

		if (!ban) {
			return;
		}

		ban.status = 'banning';

		this.orangechat.banFromChannel(this.room.name(), ban.user.username)
		.then((response) => {
			if (response.status === 'ok') {
				ban.status = 'banned';
			} else {
				ban.status = 'unbanned';
			}

			m.redraw();
		});
	};

	this.refreshBanlist();
};



ModSettings.view = function(controller) {
	return (
		<div class="OC-MessageRoom__group-settings">
			<div class="OC-MessageRoom__mod-settings-header">
				<a class="OC-button__dark" onclick={controller.close}>Close</a>
			</div>
			{ModSettings.viewFloodControl(controller)}
			{ModSettings.viewBanlist(controller)}
		</div>
	);
};

ModSettings.viewBanlist = function(controller) {
	var list = [];
	var status_map = {
		'unbanning': 'Unbanning...',
		'unbanned': 'Ban removed',
		'banning': 'Banning...',
		'banned': 'Banned'
	};

	if (controller.banlist_status === 'loaded' && controller.banlist().length > 0) {
		_.each(controller.banlist(), (ban) => {
			if (ban.status === 'unbanned') {
				list.push(
					<tr>
						<td>{ban.user.username}</td>
						<td colspan="2">
							Ban removed.
							<a onclick={_.partial(controller.banUser, ban.user.username)} class="OC-link" style="margin-left:1em;">Undo</a>
						</td>
					</tr>
				);

			} else if (ban.status === 'banned') {
				list.push(
					<tr>
						<td>{ban.user.username}</td>
						<td>{strftime('%B %o, %k:%M', new Date(ban.user.created))}</td>
						<td><a onclick={_.partial(controller.unbanUser, ban.user.username)} class="OC-link">remove</a></td>
					</tr>
				);

			} else {
				list.push(
					<tr>
						<td>{ban.user.username}</td>
						<td colspan="2">{status_map[ban.status] || ban.status || ''}</td>
					</tr>
				);

			}
		});

	} else if(controller.banlist_status === 'loaded' && controller.banlist().length === 0) {
		list.push(
			<tr>
				<td>No current bans here</td>
			</tr>
		);
	} else {
		list.push(
			<tr>
				<td>Loading...</td>
			</tr>
		);
	}

	return (
		<div class="OC-MessageRoom__mod-settings-section">
			<div class="OC-MessageRoom__mod-settings-section-header">Ban list</div>
			<p>Users banned from this channel.</p>
			<table class="OC-MessageRoom__mod-settings-userlist">
				{list}
			</table>
		</div>
	);
};

ModSettings.viewOperators = function(controller) {
	return (
		<div class="OC-MessageRoom__mod-settings-section">
			<div class="OC-MessageRoom__mod-settings-section-header">Channel operators</div>
			<p>Promote non-moderators to help operate the orangechat channel.</p>
			<table class="OC-MessageRoom__mod-settings-userlist">
				<tr>
					<td>prawnsalad</td>
					<td><a onclick={function(){}}>remove</a></td>
				</tr>
				<tr>
					<td>someone else</td>
					<td><a onclick={function(){}}>remove</a></td>
				</tr>
				<tr>
					<td>other_person</td>
					<td><a onclick={function(){}}>remove</a></td>
				</tr>
				<tr>
					<td><input placeholder="username..." /></td>
					<td><button type="submit">Add</button></td>
				</tr>
			</table>
		</div>
	);
};

ModSettings.viewIrcLink = function(controller) {
	return (
		<div class="OC-MessageRoom__mod-settings-section">
			<div class="OC-MessageRoom__mod-settings-section-header">IRC link</div>
			<p>Link this channel to an IRC channel on irc.snoonet.org.</p>
			<ul class="OC-list">
				<li>Messages will be synced between both channels</li>
				<li>orangechat users will appear on IRC when they start talking</li>
				<li>Anybody logged into orangechat and has access to the subreddit will see the IRC channel messages</li>
			</ul>
			<div class="OC-MessageRoom__mod-settings-status-inactive">Disabled</div>
		</div>
	);
};

ModSettings.viewFloodControl = function(controller) {
	return (
		<div class="OC-MessageRoom__mod-settings-section">
			<div class="OC-MessageRoom__mod-settings-section-header">Flood control</div>
			<p>Prevents people from flooding a channel with messages or repeating the same message.</p>
			<div class="OC-MessageRoom__mod-settings-status-active">Active</div>
		</div>
	);
};


export default ModSettings;
