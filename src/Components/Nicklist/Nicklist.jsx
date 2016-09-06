import './Nicklist.styl';

import Orangechat from '../../Services/Orangechat.js';
import * as Helpers from '../../Helpers/Helpers.js';

var Nicklist = {};

Nicklist.controller = function(args) {
	this.orangechat = Orangechat.instance();

	this.has_loaded = false;
	this.users = m.prop([]);

	this.last_refreshed = null;
	this.refreshList = () => {
		// Only refresh the nicklist once every 10 seconds
		if (this.last_refreshed && (new Date()).getTime() - this.last_refreshed < 10000) {
			return;
		}

		this.last_refreshed = (new Date()).getTime();

		this.orangechat.channelUserlist(args.channel.transportSafeRoomName())
		.then((resp) => {
			var new_list = [];
			_.each(resp.userlist, (user) => {
				new_list.push({
					name: user.name,
					source: user.source
				});
			});

			var ordered_list = new_list.sort(function compare(a, b) {
				if (a.name.toLowerCase() < b.name.toLowerCase()) {
					return -1;
				}
				if (a.name.toLowerCase() > b.name.toLowerCase()) {
					return 1;
				}

				return 0;
			});

			this.users(ordered_list);
			this.has_loaded = true;

			m.redraw();
		});
	};

	this.nickClick = (mouse_event, user) => {
		args.channel.openUserMenu(mouse_event, user.name, {
			source: user.source
		});
	};
};

Nicklist.view = function(controller, args) {
	function userMenuFn(user) {
		return function(event) {
			event = $.event.fix(event);
			event.stopPropagation();
			controller.nickClick(event, user);
		};
	}

	var users = controller.users();
	var list = [];

	if (!controller.has_loaded) {
		list.push(
			<li class="OC-Nicklist__Loader">
				<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="25 25 50 50">
					<circle fill="none" stroke-width="4" stroke-miterlimit="10" cx="50" cy="50" r="20" />
				</svg>
			</li>
		);

	} else if (users.length > 0) {
		_.each(users, (user) => {
			var colour = Helpers.nickColour(user.name.replace('*', ''));
			list.push(
				<li class="OC-Nicklist__User" onclick={userMenuFn(user)} key={user.name.toLowerCase()} style={'border-left-color:' + colour}>
					<div class="OC-Nicklist__User--Avatar"></div>
					<div class="OC-Nicklist__User--Nick">{user.name}</div>
				</li>
			);
		});

	} else {
		list.push(
			<li class="OC-Nicklist__Info">Nobody to be seen here..</li>
		);
	}

	function nicklistConfig(el, isInitialized, context) {
		if (!isInitialized) {
			$(el).addClass('OC-Nicklist-open');

			// Give time for the CSS animation to complete before loading the users.
			// Doing both at the same time causes jank on slower devices
			setTimeout(() => {
				controller.refreshList();
			}, 200);
		}
	}

	return (
		<ul class="OC-Nicklist" config={nicklistConfig}>
			{list}
		</ul>
	);
};


export default Nicklist;
