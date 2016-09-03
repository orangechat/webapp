import './Nicklist.styl';

import Orangechat from '../../Services/Orangechat.js';
import * as Helpers from '../../Helpers/Helpers.js';

var Nicklist = {};

Nicklist.controller = function(args) {
	this.orangechat = Orangechat.instance();

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
			m.redraw();
		});
	};

	this.nickClick = (mouse_event, user) => {
		args.channel.openUserMenu(mouse_event, user.name, {
			source: user.source
		});
		/*
		this.bus.trigger('panel.open', event, Helpers.subModule(UserMenu, {
			bus: this.bus,
			username: user.nick,
			source: user.source,
			room: this,
			room_manager: this.room_manager
		}));
		*/
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

	if (users.length > 0) {
		_.each(users, (user) => {
			var colour = Helpers.nickColour(user.name);
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
			controller.refreshList();
			$(el).addClass('OC-Nicklist-open');
		}
	}

	return (
		<ul class="OC-Nicklist" config={nicklistConfig}>
			{list}
		</ul>
	);
};


export default Nicklist;
