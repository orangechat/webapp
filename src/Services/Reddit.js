/**
 * Hacky API to get reddit.com info while embedded into reddit.com
 * TODO: This should be moved into the backend via oauth
 */
var Reddit = {};

Reddit.isLoggedIn = function() {
	return $('.user > a').attr('class') !== 'login-required';
};

Reddit.username = (function() {
	var username = $('.user > a').text();
	return function() {
		return username;
	}
})();

Reddit.currentSubreddit = function() {
	return $('.redditname:first a').text();
};

Reddit.subreddits = function() {
	var subreddits = m.prop([]);

	$.getJSON('/subreddits/mine.json', (response) => {
		var new_subreddits = [];
		if (!response || !response.data) {
			return;
		}

		$.each(response.data.children, (idx, item) => {
			new_subreddits.push({
				name: '/r/' + item.data.display_name,
				short_name: item.data.display_name
			});
		});

		new_subreddits = _.sortBy(new_subreddits, (sub) => {
			return sub.name.toLowerCase();
		});

		subreddits(new_subreddits);
		m.redraw();

	}).fail(function() {
	});

	return subreddits;
};

Reddit.injectUserbarIcon = function(app, bus) {
	// Get the preferences link as we want to inject just before that
	var $preferences = $('#header-bottom-right a.pref-lang').parents('.flat-list:first');
	var $sep = $('<span class="separator">|</span>');
	var $icon = $('<a title="OrangeChat" href="#" class="ChatApp__reddit-icon" style="top:1px;position:relative;font-size:1.2em;">im</a>');

	$sep.insertBefore($preferences);
	$icon.insertBefore($sep);

	$icon.on('click', (event) => {
		event.preventDefault();
		app.toggle();
		// Mithril won't detect the redraw as the icon is outside of the app
		m.redraw();
	});

	var alert_level = 0;
	function setAlertLevel(level) {
		if (level > alert_level) {
			alert_level = level;
			setIconStyles();
		}
	}
	function resetAlerts() {
		alert_level = 0;
		setIconStyles();
	}
	function setIconStyles() {
		if (alert_level === 0) {
			$icon.css({
				'font-weight': 'normal',
				'color': ''
			});
		} else if (alert_level === 1) {
			$icon.css({
				'font-weight': 'bold',
				'color': ''
			});
		} else if (alert_level === 2) {
			$icon.css({
				'font-weight': 'bold',
				'color': 'orangered'
			});
		}
	}

	bus.on('im.message', (message) => {
		if (window.document.hasFocus && window.document.hasFocus() && app.state('is_open')) {
			return;
		}

		setAlertLevel(1);
		if (message.content.toLowerCase().indexOf(Reddit.username().toLowerCase()) > -1) {
			setAlertLevel(2);
		}
	});

	bus.on('app.toggle', (is_open) => {
		if (is_open) {
			resetAlerts();
		}
	});

	bus.on('channel.active', (channel) => {
		// Consider this as the user being active and doing stuff, so they've seen the alert
		resetAlerts();
	});
};

Reddit.hookOcButtons = function(bus) {
	var $buttons = $('a[href^="https://app.orangechat.io"]');
	$buttons.on('click', function(event) {
		var url = $(this).attr('href');
		if (url && !url.match(/#./)) {
			return;
		}

		var channel = url.split('#')[1].split(',')[0];
		bus.trigger('action.ocbutton.click', event, channel);
	});
};

export default Reddit;
