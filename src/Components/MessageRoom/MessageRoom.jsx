import './MessageRoom.styl';

import * as Helpers from '../../Helpers/Helpers.js';

import Reddit from '../../Services/Reddit.js';
import Orangechat from '../../Services/Orangechat.js';
import AutoComplete from './AutoComplete.jsx';
import MessageModel from '../Message/Model.js';
import Message from '../Message/Message.jsx';
import MessageParser from '../../Services/MessageParser.js';
import * as Notifications from '../../Services/Notifications.js';

import Menus from '../Menus/Menus.jsx';
import UserMenu from '../Menus/Menus/User.jsx';
import ModerationMenu from '../Menus/Menus/Moderation.jsx';

import GroupSettings from './Views/GroupSettings.js';
import ModSettings from './Views/ModSettings.jsx';

var ACCESS_TYPE_BAN = 1;
var ACCESS_TYPE_INVITE = 2;
var ACCESS_TYPE_REDDIT_MOD = 3;

/**
 * The message room (channel) UI.
 * Contains thread listing
 */
var MessageRoom = {};

MessageRoom.controller = function(args) {
	this.name = m.prop(args.name);
	this.label = m.prop(args.label);
	this.current_message = m.prop('');
	this.num_users = m.prop(0);
	this.known_usernames = m.prop([]);
	this.known_irc_usernames = m.prop([]);
	this.bus = args.bus;
	this.room_manager = args.room_manager;
	this.orangechat = Orangechat.instance();
	this.message_parser = new MessageParser(null, this.known_usernames);

	this.access = args.access || {
		is_reddit_mod: false,
		is_admin: false,
		is_invite: false
	};

	// Associated channels such as the mod only channel
	this.linked_channels = args.linked_channels || {};

	this.is_active = false;
	this.messages = m.prop([
		//{author: 'prawnsalad', content: 'ello '+this.name()+'! This is my room. There are many like it, but this one is mine.'}
	]);

	// Unread messages
	this.unread_counter = 0;

	// An unread message mentions us
	this.unread_highlight = false;

	// Timestamp of the last message we read
	this.read_upto = args.read_upto || 0;

	// Timestamp of the last message we have received
	this.received_upto = 0;

	// Keep track of the thread scroll position between renders
	this.thread_scrolltop = m.prop(0);
	this.thread_autoscroll = true;

	this.menu_container = Helpers.subModule(Menus, {
		bus: this.bus
	});

	// A component instance that gets rendered instead of the message thread
	this.open_panel = null;

	this.transportSafeRoomName = () => {
		return this.name().toLowerCase().replace('/r/', 'reddit_sub_');
	};

	this.displayLabel = () => {
		return this.label() || this.name();
	};

	this.resetCounters = () => {
		this.unread_counter = 0;
		this.unread_highlight = false;

		var last_message = _.last(this.messages());
		if (last_message) {
			this.read_upto = last_message.data.created;
		}
	};

	// When we send a message we attach a random ID (match ID) that we can identify as
	// it comes back. This lets us add a message to the view before it gets sent for instant
	// user feedback and detect it as we see it come back to update our displayed
	// version of the message. Each channel gets a random prefix so that we can safely
	// use an incrementing counter easily.
	this.generateMessageMatchId = (function() {
		var next_id = 0;
		var prefix = Math.floor(Math.random() * 100000000000).toString(36);
		return function() {
			var id = next_id++;
			return prefix + next_id.toString(36);
		};
	})();

	this.bus.on('channel.active', (new_channel, old_channel) => {
		if (new_channel === this) {
			this.resetCounters();
			this.thread_autoscroll = true;
		}
	});

	this.bus.on('app.toggle', (is_open) => {
		if (is_open && this.is_active) {
			this.resetCounters();
		}
	});

	this.bus.on('im.message', (message_raw) => {
		if (message_raw.target !== this.transportSafeRoomName()) {
			return;
		}

		var messages = this.messages();

		var new_message = new MessageModel(message_raw);
		new_message.display = this.message_parser.parseAll(new_message);

		// Any messages we send will have a .matchid property only known to us. Check
		// if we have that matchid in our messages so we don't add it again
		var existing_message;
		if (new_message.matchid) {
			existing_message = _.find(messages, function(message) {
				return message.data.matchid === new_message.matchid;
			});
		}

		// This message may already exist if we sent it ourselves, so update it
		if (existing_message) {
			existing_message.data.fromObj(new_message);
		} else if (new_message.created > this.received_upto) {
			// Only add new messages if they don't appear from the past
			this.addMessage(new_message);

			if (this.known_usernames().indexOf(new_message.author.toLowerCase())  === -1) {
				this.known_usernames().push(new_message.author.toLowerCase());
			}

			// Temporary way to get a rough number of active IRC users to be added to
			// the user count for this channel
			if (new_message.source === 'irc') {
				let irc_usernames = this.known_irc_usernames();
				if (irc_usernames.indexOf(new_message.author.toLowerCase()) === -1) {
					irc_usernames.push(new_message.author.toLowerCase());
				}
			}
		}

		m.redraw();

		var our_username = this.orangechat.username();
		var is_our_message = our_username.toLowerCase() === new_message.author.toLowerCase();
		var has_focus = Helpers.isAppActive() && this.is_active;

		// We know the time of the last message we read was, so anything before it
		// is also considered as read
		if (!is_our_message && !has_focus && new_message.created > this.read_upto) {
			this.unread_counter++;

			if (new_message.content.toLowerCase().indexOf(our_username.toLowerCase()) > -1) {
				this.unread_highlight = true;

				// We only need the desktop notification if this page is not in focus + in standalone
				if (!Helpers.isAppActive() && !Helpers.isInReddit()) {
					this.notify('Somebody mentioned you!', new_message.author + ': ' + new_message.content);
				}
			}
		}

		// Only move our read_upto position forward if this channel is active.
		// Never move it backwards... that just makes no sense.
		if (has_focus && new_message.created > this.read_upto) {
			this.read_upto = new_message.created;
		}

		this.received_upto = _.last(messages).data.created;
	});

	this.bus.on('im.meta', (groups) => {
		var this_name = this.transportSafeRoomName().toLowerCase();
		if (!groups[this_name]) {
			return;
		}

		this.num_users(groups[this_name].num_users);
	});

	this.bus.on('message.chan_access', (message) => {
		if (message.target !== this.transportSafeRoomName()) {
			return;
		}
		if (message.access === ACCESS_TYPE_REDDIT_MOD) {
			this.access.is_reddit_mod = true;
			this.linked_channels.reddit_mod = message.mod_channel;
		}
		if (message.access === ACCESS_TYPE_INVITE) {
			this.access.is_invite = true;
		}
	});

	this.bus.on('message.channel.meta', (message) => {
		var do_redraw = false;

		if (message.target !== this.transportSafeRoomName()) {
			return;
		}

		if (message.label) {
			this.label(message.label);
			do_redraw = true;
		}
		if (message.parent) {
			this.linked_channels.parent = message.parent;
			do_redraw = true;
		}

		if (do_redraw) {
			m.redraw();
		}
	});

	// If we get banned
	this.bus.on('message.channel.ban', (event) => {
		if (event.channel_name !== this.transportSafeRoomName()) {
			return;
		}

		var message = new MessageModel({
			author: '*',
			content: 'You have been banned from this channel! There will be no more channel updates here.'
		});

		message.display = this.message_parser.parseAll(message);
		this.addMessage(message);
		m.redraw();
	});

	this.notify = (title, body) => {
		var notification = Notifications.notify(title, body);
		if (!notification) {
			return;
		}

		notification.onclick = () => {
			// Some older browsers use .cancel instead of .close
			var closeFn = (notification.close || notification.cancel || function(){});
			closeFn.call(notification);

			this.room_manager.setActive(this.name());
			window.focus();
		};
	}
	this.onFormSubmit = (event) => {
		event = $.event.fix(event);
		event.preventDefault();

		var message_type;
		var message = this.current_message();
		if (!message) {
			return;
		}

		// Lets keep some IRC users happy... support /me
		if (message.toLowerCase().indexOf('/me ') === 0) {
			message_type = 'action';
			message = message.substring(4);
		}

		this.sendMessage(message, message_type);
		this.current_message('');

		// We only use one way binding for the input box so we need to update the input
		// manually. Two way binding causes issues with vdom diffing
		$(event.currentTarget).find('input[type="text"]').val('');

		m.redraw();
	};

	this.sendMessage = (message_content, message_type) => {
		var message = new MessageModel({
			author: this.orangechat.username(),
			content: message_content,
			matchid: this.generateMessageMatchId(),
			created: (new Date()).getTime(),
			type: message_type
		});

		message.display = this.message_parser.parseAll(message);
		this.addMessage(message);

		var attemptSend = () => {
			message.is_sending = true;

			return m.request({
				background: true,
				method: 'POST',
				url: this.orangechat.apiUrl('/send'),
				data: {
					target: this.transportSafeRoomName(),
					content: message_content,
					matchid: message.matchid,
					type: message_type
				}
			}).then(function(api_response) {
				message.is_sending = false;

				if (api_response.status !== 'ok') {
					var err_map = {
						'requires_auth': 'You must be logged in to send a message here',
						'not_allowed': 'You do not have permission to send messages here',
						'blocked': 'This message was blocked from being sent'
					};

					var blocked_reasons = {
						flood: 'Message has not been sent - slow down!',
						repeat: 'Message has not been sent - repeating yourself?',
						similar: 'Message has not been sent - repeating yourself?'
					};

					var err_reason;
					if (api_response.error === 'blocked') {
						err_reason = blocked_reasons[api_response.reason];
					} else {
						err_reason = err_map[api_response.error];
					}

					message.error = err_reason || 'There was an error sending this message :(';
					message.retry = attemptSend;

				} else {
					// Message sent just fine, remove any errors if they existed
					delete message.error;
					delete message.retry;
				}

				m.redraw();
			}).catch(function(err) {
				message.is_sending = false;

				// TODO: Message failed to send so add a .error property to the
				// message so that the view can show it didn't send.
				message.error = 'There was an error sending this message :(';
				message.retry = attemptSend;

				m.redraw();
			});
		};

		return attemptSend();
	};

	this.openChat = () => {
		this.open_panel = null;
	};

	this.openGroupSettings = () => {
		this.open_panel = Helpers.subModule(GroupSettings, {
			bus: this.bus,
			room: this,
			room_manager: this.room_manager
		});
	};

	this.openUserMenu = (event, username, opts) => {
		this.bus.trigger('panel.open', event, Helpers.subModule(UserMenu, {
			bus: this.bus,
			username: username,
			source: opts.source,
			room: this,
			room_manager: this.room_manager
		}));
	};

	this.openModerationMenu = (event) => {
		event = $.event.fix(event);
		event.stopPropagation();

		this.bus.trigger('panel.open', event, Helpers.subModule(ModerationMenu, {
			bus: this.bus,
			room: this,
			room_manager: this.room_manager
		}));
	};

	// this.openGroupPanel = () => {
	// 	this.bus.trigger('panel.open', Helpers.subModule(GroupPanel, {
	// 		bus: this.bus,
	// 		room: this,
	// 		room_manager: this.room_manager
	// 	}));
	// };

	// this.bus.on('panel.opened', () => {
	// 	this.isPanelOpen = true;
	// });

	// this.bus.on('panel.closed', () => {
	// 	this.isPanelOpen = false;
	// });

	this.close = () => {
		this.room_manager.closeRoom(this.name());
	};

	this.toggleApp = () => {
		this.bus.trigger('action.toggle_app');
	};

	this.addMessage = (message_model) => {
		var max_messages = 200;

		var component = Helpers.subModule(Message, {
			message: message_model,
			message_room: this
		});

		var message = {
			data: message_model,
			view: component.view
		};

		var messages = this.messages();
		messages.push(message);

		// Keep our thread pruned to a suitable number so not to balloon memory usage
		if (messages.length > max_messages) {
			this.messages(messages.slice(messages.length - max_messages));
		}

		return message;
	};

	this.toggleSidebar = () => {
		this.bus.trigger('action.toggle_sidebar');
	};

	this.is_options_overlay_open = false;

	this.openOptionsOverlay = (event) => {
		event = $.event.fix(event);
		event.stopPropagation();

		this.is_options_overlay_open = true;

		args.bus.once('action.document_click', () => {
			this.closeOptionsOverlay();
		});
	};

	this.closeOptionsOverlay = () => {
		this.is_options_overlay_open = false;
	};

	this.openModSettings = (event) => {
		this.open_panel = Helpers.subModule(ModSettings, {
			bus: this.bus,
			room: this,
			room_manager: this.room_manager
		});
	};
};

MessageRoom.view = function(controller) {
	var header = MessageRoom.viewHeader(controller);

	var room_content = [];

	room_content.push(controller.menu_container.view());

	if(!controller.open_panel) {
		room_content.push(MessageRoom.viewChat(controller));
	} else {
		room_content.push(controller.open_panel.view());
	}

	return (
		<div class="OC-MessageRoom">
			{header}
			{room_content}
		</div>
	);
};

MessageRoom.viewChat = function(controller) {
	// TODO: Only render the last X messages
	var thread_style = Helpers.isInReddit() ? 'inline' : 'block';
	var thread_items = [];
	var last_message = null;
	var mins_20 = 60 * 20 * 1000;

	_.each(controller.messages(), function(message, idx, list) {
		if (thread_style === 'inline') {
			// Show the message time if it's the first or there was a gap of 20mins
			// since the last message
			if (!last_message || message.data.created - last_message.data.created > mins_20) {
				thread_items.push(
					<div class="OC-MessageRoom__thread--time-separator">
						{m.trust(message.data.display.created_short)}
					</div>
				);
			}
		}

		thread_items.push(message.view({
			style: thread_style,
			thread: list,
			message_idx: idx
		}));

		last_message = message;
	});

	if (thread_items.length === 0) {
		thread_items.push(<div class="OC-MessageRoom__no-messages">No messages here recently... :(</div>);
	}

	return [
		<ul
			class="OC-MessageRoom__thread"
			onscroll={function() {
				var rect = this.getBoundingClientRect();

				// Scrolled to the bottom with a margin of 20px = autoscroll
				if (this.scrollTop + rect.height > this.scrollHeight - 20) {
					controller.thread_autoscroll = true;
				} else {
					controller.thread_autoscroll = false;
				}

				controller.thread_scrolltop(this.scrollTop);

				// We don't need to redraw on every scroll event
				m.redraw.strategy('none');
			}}
			config={function(el, already_initialised) {
				if (controller.thread_autoscroll) {
					el.scrollTop = el.scrollHeight;
				}

				// Only set the scroll position when the element is first being initialised/created
				if (!already_initialised && !controller.thread_autoscroll) {
					el.scrollTop = controller.thread_scrolltop();
				}
			}}
		>
			{thread_items}
		</ul>,

		controller.auto_complete ? controller.auto_complete.view() : null,

		<form class="OC-MessageRoom__footer" onsubmit={controller.onFormSubmit.bind(controller)}>
			<input
				type="text"
				placeholder="send a message"
				maxlength="1000"
				onkeydown={function(event) {
					event = $.event.fix(event);

					controller.current_message(this.value);

					// Controlling the autocomplete list
					if (controller.auto_complete) {
						controller.auto_complete.instance.handleKeyDown(event);
					}
				}}
				onkeyup={function(event) {
					event = $.event.fix(event);

					controller.current_message(this.value);

					var inserted_char = this.value.substr(this.selectionStart-1, 1);

					// Not using .which/.keyCode here since it's inconsistent between OSs
					// 27 = esc
					if (!controller.auto_complete && inserted_char === '@' && event.which !== 27) {
						controller.auto_complete = Helpers.subModule(AutoComplete, {
							start_pos: this.selectionStart,
							options: controller.known_usernames().sort(),
							el: this
						});

						// When the autocomplete closes... remove it
						controller.auto_complete.instance.once('close', () => {
							delete controller.auto_complete;
						});
					}

					if (controller.auto_complete) {
						controller.auto_complete.instance.handleKeyUp(event);
					}
				}}
			/>
			<button type="submit">
				<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
					<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
				</svg>
			</button>
		</form>
	];
};

MessageRoom.viewHeader = function(controller) {
	var tabs = [];
	var title = '';
	var parent_channel;

	if (controller.access.is_invite) {
		tabs.push(
			<li
				class={'OC-MessageRoom__header-tabs-item' + (controller.open_panel ? ' OC-MessageRoom__header-tabs-item--active' : '')}
				onclick={controller.openGroupSettings}
			>
				<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
					<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"></path>
				</svg>
			</li>
		);
	}

	// Insert a tab to open the chat view again if there are any other options
	if(tabs.length > 0) {
		tabs.unshift(
			<li
				class={'OC-MessageRoom__header-tabs-item' + (!controller.open_panel ? ' OC-MessageRoom__header-tabs-item--active' : '')}
				onclick={controller.openChat}
			>
				<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
					<path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"></path>
				</svg>
			</li>
		);
	}

	if(controller.access.is_reddit_mod) {
		tabs.push(
			<li class="OC-MessageRoom__header-tabs-item" onclick={controller.openModerationMenu} title="Moderator tools">
				<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
					<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"></path>
				</svg>
			</li>
		);
	}

	title = controller.displayLabel();
	if (controller.linked_channels.parent) {
		parent_channel = controller.room_manager.getRoom(controller.linked_channels.parent.name);
		if (parent_channel) {
			title = parent_channel.instance.displayLabel() + ' - ' + title;
		}
	}

	return (
		<div class="OC-MessageRoom__header">
			<div class="OC-MessageRoom__header-collapse" title="Toggle sidebar" onclick={controller.toggleSidebar}>
				<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
					<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"></path>
				</svg>
			</div>
			<div class="OC-MessageRoom__header-info" onclick={Helpers.isInReddit() ? controller.toggleApp : null}>
				<h4>{title}</h4>
			</div>
			<ul class="OC-MessageRoom__header-tabs">
				{tabs}
			</ul>
		</div>
	);
};

export default MessageRoom;
