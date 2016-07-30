import './ChatApp.styl';

import * as Helpers from '../../Helpers/Helpers.js';

import Sidebar from '../Sidebar/Sidebar.jsx';
import Topbar from '../Topbar/Topbar.js';
import HomeView from '../HomeView/HomeView.jsx';
import Settings from '../Settings/Settings.js';

import Orangechat from '../../Services/Orangechat.js';
import Reddit from '../../Services/Reddit.js';
import Transport from '../../Services/Transport.js';
import ChannelManager from '../../Services/ChannelManager.js';
import ModeratorToolbox from '../../Services/ModeratorToolbox.js';


/**
 * Top level application controller
 */
var ChatApp = {};

ChatApp.controller = function(args) {
	Helpers.setAppInstance(this);

	this.is_in_reddit = !!window.location.host.match(/reddit.com$/i);
	this.has_extension = args.has_extension;

	this.bus = args.bus;
	this.state = args.state;

	this.orangechat = new Orangechat.instance(this.state);
	this.transport = new Transport(this.orangechat.sid, this.bus);

	this.top_bar = Helpers.subModule(Topbar, {app: this});
	this.side_bar = Helpers.subModule(Sidebar, {app: this});

	// TODO: .home will be the default homescreen
	this.home = m(HomeView, {app: this});

	// The active workspace instance. If null, the channel manager will takeover
	this.workspace_instance = null;

	this.rooms = new ChannelManager({
		bus: this.bus,
		transport: this.transport,
		state: this.state
	});

	// The subreddits we are subscribed to
	this.orangechat.loadSubreddits();
	this.subreddits = this.orangechat.subreddits;
	this.subreddits.refresh = () => {
		this.orangechat.loadSubreddits(true);
	};

	// Keep note if we have loaded the channels from storage or elsewhere yet
	this.channels_loaded = false;

	this.setWorkspace = (instance) => {
		this.toggleSidebar(false);
		this.workspace_instance = instance;
	};

	// Get the view function for the active room. (generates the DOM structure)
	this.activeWorkspaceView = () => {
		if (this.workspace_instance) {
			return this.workspace_instance;
		}

		// Not logged in? Show the homepage only
		if (!this.orangechat.username()) {
			return this.home;
		}

		var active_room = this.rooms.active();
		return active_room ?
			active_room :
			this.home;
	};

	// Toggle the app
	this.toggle = () => {
		this.state.set('is_open', !this.state('is_open'));
		this.bus.trigger('app.toggle', this.state('is_open'));
	};

	this.toggleSidebar = (should_open) => {
		if (typeof should_open === 'undefined') {
			should_open = !this.state('is_sidebar_open');
		}

		this.state.set('is_sidebar_open', !!should_open);
		this.bus.trigger('app.toggle_sidebar', this.state('is_sidebar_open'));
	}

	// Determine the classes for the app
	this.appClasses = () => {
		var classes = 'OC__ui';

		if(!this.state('is_open')) {
			classes = classes + ' OC__ui--closed ';
		}

		if(!this.state('is_sidebar_open')) {
			classes = classes + ' OC__ui--sidebar-collapsed ';
		}

		if(ModeratorToolbox.isActive()) {
			classes = classes + ' OC__ui--toolbox ';
		}

		if (!this.is_in_reddit) {
			classes = classes + ' OC__ui--standalone';
		}

		if (!this.orangechat.username()) {
			classes = classes + ' OC__ui--loggedout';
		}

		return classes;
	}

	// Once we're ready (logged in, app is ready) then we show the active rooms
	this.addInitialRooms = () => {
		var default_channel = '/r/OrangeChat';
		var channel_list = this.state.get('channel_list') || [];
		var active_channel = this.state.get('active_channel');
		var channel_in_url = (!this.is_in_reddit && window.location.hash) ?
			window.location.hash.substring(1).split(',')[0] :
			null;

		if (!channel_list.length) {
			this.rooms.createRoom(default_channel);
		} else {
			_.each(channel_list, (channel_state) => {
				// Upgrade the list of string based channel names from older OC versions to objects
				if (typeof channel_state === 'string') {
					channel_state = {
						name: channel_state,
					};
				}

				var channel = this.rooms.createRoom(channel_state.name, {
					label: channel_state.label,
					read_upto: channel_state.read_upto || 0,
					access: channel_state.access,
					linked_channels: channel_state.linked_channels,
					flags: channel_state.flags
				});
			});
		}

		//if (Reddit.currentSubreddit()) {
		//	this.rooms.createRoom('/r/' + Reddit.currentSubreddit());
		//}

		// If we had a channel specified in the URL, make sure it exists and set it as the defualt channel
		if (channel_in_url) {
			if (!this.rooms.getRoom(channel_in_url)) {
				this.rooms.createRoom(channel_in_url);
			}
			active_channel = channel_in_url;
		}

		// If our active channel no longer exists, set the first channel active instead
		if (!this.rooms.setActive(active_channel || default_channel) === false) {
			this.rooms.setIndexActive(0);
		}

		this.channels_loaded = true;
		this.bus.trigger('channels.loaded');
	};

	this.saveChannelState = (new_channel) => {
		// Don't save channel state is we haven't got it yet
		if (!this.channels_loaded) {
			return;
		}

		var channels = _.map(this.rooms.rooms, function(channel) {
			return {
				name: channel.instance.name(),
				label: channel.instance.label(),
				read_upto: channel.instance.read_upto,
				access: channel.instance.access,
				linked_channels: channel.instance.linked_channels,
				flags: channel.instance.flags
			};
		});

		this.state.set('channel_list', channels);
	};

	// Harsh hack to speed up redrawing
	// The way the CSS is structured leaves huge white breaks between redraws
	// if the height is increased. This forces a redraw to mask it.
	// TODO: Have the CSS background colours on the wrapping elemements, not the
	// individual content elements
	window.onresize = () => {
		m.redraw();
	};

	// Keep track of our channels state on a few events
	this.bus.on('channel.created', this.saveChannelState);
	this.bus.on('channel.close', this.saveChannelState);
	window.onunload = this.saveChannelState;

	// Toggle the app
	this.bus.on('action.toggle_app', this.toggle);

	// Toggle the sidebar
	this.bus.on('action.toggle_sidebar', this.toggleSidebar);

	this.bus.on('action.close_workspace', () => {
		this.workspace_instance = null;
		// Go back to the channel view, with the channel list
		this.toggleSidebar(true);
	});

	this.bus.on('action.show_settings', () => {
		this.setWorkspace(Helpers.subModule(Settings, {
			bus: this.bus
		}));
	});

	// Keep track of the active channel between page refreshes
	this.bus.on('channel.active', (active_channel, previous_channel) => {
		if (active_channel) {
			this.state.set('active_channel', active_channel.name());

			// Remove any active workspace so this channel can be shown
			this.workspace_instance = null;
		}
	});

	// Keep a few components updated when our state changes
	this.bus.on('state.change', (changed, new_value, old_value, values) => {
		// If our session ID has changed, update the transport so it's in sync
		// Eg. First logging in, the session ID is not available for the transport. After
		// logged in and the session is created, the transport is then safe to connect.
		if (changed === 'sid' && new_value !== old_value) {
			this.transport.setSessionId(new_value);
		}

		// The channel list state may have been updated by the extension, so lets
		// go through it and merge any changes as needed
		if (changed === 'channel_list') {
			var channel_list = this.state.get('channel_list') || [];
			// First, remove any channels not in the state
			_.each(this.rooms.rooms, (channel) => {
				var chan_in_state = !!_.find(channel_list, (item) => {
					return item.name.toLowerCase() === channel.instance.name().toLowerCase();
				});

				if (!chan_in_state) {
					this.rooms.closeRoom(channel.instance.name());
				}
			});

			// Now add any new channels
			_.each(channel_list, (channel_state) => {
				var channel = this.rooms.createRoom(channel_state.name, {
					label: channel_state.label,
					read_upto: channel_state.read_upto || 0,
					access: channel_state.access,
					linked_channels: channel_state.linked_channels
				});

				// Make sure we have the most recent read_upto value
				if (channel.instance.read_upto < channel_state.read_upto) {
					channel.instance.read_upto = channel_state.read_upto;
				}
			});
		}
	});

	// Pipe some messages from transport into relevant bus events
	this.bus.on('transport.message', (message) => {
		if (message.author && message.target) {
			// Add some user-application specific properties to the message
			if (message.content.match(new RegExp('\\b' + this.orangechat.username() + '\\b', 'i'))) {
				message.is_highlight = true;
			}

			this.bus.trigger('im.message', message);
		}

		// Messages sent specifically for this user
		if (message.type && message.payload) {
			this.bus.trigger('message.' + message.type, message.payload);
		}
	});
	this.bus.on('transport.groupmeta', (groups) => {
		this.bus.trigger('im.meta', groups);
	});

	// Convert some document events into bus events
	$(document).on('click', (event) => {
		// This event comes from outside the mithrill application so we need to handle
		// the redraw ourselves
		m.startComputation();
		this.bus.trigger('action.document_click', event);
		m.endComputation();
	});

	if (Helpers.isInReddit()) {
		Reddit.injectUserbarIcon(this, this.bus);
		Reddit.hookOcButtons(this.bus);
	}

	// The ping call will check that we are logged in, but since the mojority of the time
	// the user wouldn't have been logged out for no reason then we start by checking the local
	// state (orangechat.username()) below while the ping call is in progress
	this.orangechat.ping().then((user_data) => {
		if (user_data.just_logged_in) {
			this.addInitialRooms();
		}

		// The user channel lets us broadcast+receive data between all of the instances the
		// user has open. Browser tabs, devices, different browsers, etc.
		if (user_data.user_channel) {
			this.transport.join(user_data.user_channel);
		}

		// Update our existing channels if any differ
		_.map(user_data.channels, (channel) => {
			var our_channel = this.rooms.getRoom(channel.name);
			// TODO: Replace the 2 with the ACCESS_TYPE_* constants
			if (!our_channel && channel.access_type === 2) {
				// Do we want to add all of our invited channels from other devices/tabs
				// to this channel list? Then uncomment below
				//our_channel = this.rooms.createRoom(channel.name, {label: channel.label});

			}

			if (!our_channel) {
				return;
			}

			if (channel.type === 3 && channel.access_type === 2 && channel.other_user) {
				// Private channels which we have an invite for along with 1 other person (PM) will
				// have .other_user as the other persons username
				our_channel.instance.label(channel.other_user);

			} else if (channel.label !== our_channel.instance.label()) {
				our_channel.instance.label(channel.label);
			}
		});
	});

	// Start checking for the user auth
	if (!this.orangechat.username()) {
	} else {
		// Add a few channels/rooms
		this.addInitialRooms();
	}
};

ChatApp.view = function(controller) {
	var content = [
		controller.top_bar.view()
	];

	if (controller.state('is_open')) {
		content.push(
			<div class="OC__shadow-underlay"></div>
		);

		if(controller.orangechat.username()) {
			content.push(controller.side_bar.view());
		}

		content.push(
			<div class="OC__workspace">
				{controller.activeWorkspaceView()}
			</div>
		);
	}

	return (
		<div id="chat-inner" class={controller.appClasses()}>
			{content}
		</div>
	);
};

export default ChatApp;
