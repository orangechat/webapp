import Orangechat from '../../../Services/Orangechat.js';
import ModeratorToolbox from '../../../Services/ModeratorToolbox.js';

var UserMenu = {};

UserMenu.controller = function(args) {
	this.username = args.username;
	this.source = args.source;
	this.room = args.room;
	this.room_manager = args.room_manager;
	this.orangechat = Orangechat.instance();

	if (this.source === 'irc') {
		this.title = m.prop(this.username);
	} else {
		this.title = m.prop('/u/' + this.username);
	}

	this.openPrivateChannel = () => {
		this.orangechat.createChannel(this.username).then((resp) => {
			if (!resp.channel_name) {
				return;
			}

			var label = resp.channel_label;
			// Since we only have 1 user in this invite, set the label to
			// the user name.
			label = this.username;

			var channel = this.room_manager.createRoom(resp.channel_name, {
				label: label
			});

			this.room_manager.setActive(channel.instance.name());
			args.bus.trigger('panel.close');
		});
	};

	this.inviteToChannel = channel => {
		this.orangechat.inviteToChannel(channel.name(), this.username).then((resp) => {
			if (resp.status == 'ok') {
				args.bus.trigger('panel.close');
				return;
			}

			console.log('inviteToChannel() Something went wrong...', resp);
		});
	};

	this.banFromChannel = () => {
		if (!confirm('Ban ' + this.username + ' from ' + this.room.name() + '?')) {
			return;
		}

		this.orangechat.banFromChannel(this.room.name(), this.username).then((resp) => {
			if (resp.status == 'ok') {
				args.bus.trigger('panel.close');
				return;
			}

			console.log('banFromChannel() Something went wrong...', resp);
		});
	};

	this.toolboxShowUser = () => {
		function doFn() {
			var $lastPopup = $('.mod-toolbox .tb-popup:last-of-type');
			if (!$lastPopup.length) {
				setTimeout(doFn, 200);
				return;
			}

			var popupOffset = $lastPopup.offset();
			var newTop = popupOffset.top-300;
			var newLeft = popupOffset.left-200;
			$lastPopup.css({
			    'top':  newTop + 'px',
			    'left':  newLeft + 'px',
			    'z-index': '2147483675'
			});
		}

		doFn();
	};

	// TODO: Move this from a timer to when the DOM is updated
	// Let the toolbox extension know that there are toolbox buttons to add its events to
	setTimeout(() => {
		var event = new CustomEvent('TBNewThings');
		window.dispatchEvent(event);
	}, 200);
};

UserMenu.view = function(controller) {
	var items = [];

	if (controller.source === 'irc') {
		items = [m('p', {class: 'OC-Menu__link'}, 'This person is talking via IRC')];

	} else {
		items = [
			m('a', {
				class: 'OC-Menu__link',
				onclick: controller.openPrivateChannel
			}, 'Send private message'),

			m('a', {
				class: 'OC-Menu__link',
				href: 'https://www.reddit.com/u/' + controller.username
			}, 'Reddit profile'),

			UserMenu.viewInviteToChannels(controller),
		];
	}

	items.push(UserMenu.viewModAction(controller));

	return m('div', {class: 'OC-Menu__content'}, items);
};

UserMenu.viewInviteToChannels = function(controller) {
	var content;
	var chan_list;
	var channels = _.filter(controller.room_manager.rooms, channel => {
		return channel.instance.access.is_invite;
	});

	if (!channels.length) {
		return;
	}

	if (channels.length === 1) {
		content = m('a', {
			class: 'OC-Menu__link',
			onclick: inviteFn(channels[0].instance)
		}, 'Invite to ' + channels[0].instance.displayLabel());
	} else {
		chan_list = _.map(channels, channel => {
			return m('a', {
				class: 'OC-Menu__link',
				onclick: inviteFn(channel.instance)
			}, channel.instance.displayLabel());
		});

		content = [
			m('hr')
		].concat(chan_list);
	};

	return m('div', {
		class: 'OC-Menu__invite-list OC-Menu__invite-list--' + (channels.length === 1 ? 'single' : 'multiple')
	}, content);

	function inviteFn(channel) {
		return () => {
			controller.inviteToChannel(channel);
		};
	};
};

UserMenu.viewModAction = function(controller) {
	if (!controller.room.access.is_reddit_mod) {
		return;
	}

	var content = [
		m('hr'),
		m('a', {
			class: 'OC-Menu__link',
			onclick: controller.banFromChannel
		}, 'Ban user')
	];

	if(false && ModeratorToolbox.isActive()) {
		// TODO: Hacky way to get just the sub name, rethink this
		var subreddit_name = (controller.room.name() || '')
			.replace('reddit_sub_', '')
			.replace('reddit_mod_', '')
			.replace('/r/', '');

		content.push(<hr />);
		content.push(
			<div class="thing color-processed" data-subreddit={subreddit_name} data-author={controller.username}>
			    <div class="entry mod-button" subreddit={subreddit_name}>
			        <span class="subreddit" style="display:none">{subreddit_name}</span>
			        <span class="author user" style="display:none">{controller.username}</span>
			        <a class="bylink" style="display:none" href={'https://orangechat.io/r/' + subreddit_name}>channel link</a>
			        <a href="javascript:;" title="Perform various mod actions on this user" class="global-mod-button" style="display:none;">mod</a>
			        
			        <a
			        	href="javascript:;"
			        	class="OC-Menu__link user-history-button"
			        	title="view user history"
			        	onclick={controller.toolboxShowUser}
			        >
			        	Subreddit history
			        </a>
			        
			        <span
			        	title={'View and add notes about this user for /r/' + subreddit_name}
			        	class={'usernote-button usernote-span-' + subreddit_name}
			        >
			            <a
			            	class={'OC-Menu__link add-user-tag-' + subreddit_name}
			            	id="add-user-tag"
			            	href="javascript:;"
			            	onclick={controller.toolboxShowUser}
			            >
			            	Notes
			            </a>
			        </span>
			    </div>
			</div>
	 	);
	}

	return m('div', {
		class: 'OC-Menu__mod-actions'
	}, content);
};

export default UserMenu;
