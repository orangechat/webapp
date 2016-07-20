import './Sidebar.styl';

import * as Helpers from '../../Helpers/Helpers.js';
import Reddit from '../../Services/Reddit.js';
import OptionsMenu from '../OptionsMenu/OptionsMenu.jsx';


/**
 * The sidebar UI
 */
var Sidebar = {};

Sidebar.controller = function(args) {
	this.app = args.app;
	this.mods = m.prop(0);
	this.is_join_dialog_open = false;

	// When there's a menu to show, this will be it
	this.options_menu = null;

	// Keep track of the join channel scroll position between renders
	this.join_channels_scrolltop = m.prop(0);
	this.join_channel_input = m.prop('');

	this.closeChannel = (channel_name) => {
		this.app.rooms.closeRoom(channel_name);
	};

	this.onOptionsMenuItemClick = (event) => {
		this.stopEventPropagation(event);
		this.options_menu = Helpers.subModule(OptionsMenu, {
			bus: this.app.bus
		});
		this.options_menu.instance.once('close', () => {
			this.options_menu = null;
		});
	};

	this.openJoinDialog = (event) => {
		this.stopEventPropagation(event);

		if (this.is_join_dialog_open) {
			return;
		}

		this.is_join_dialog_open = true;

		if (this.app.subreddits().length === 0) {
			this.app.subreddits.refresh();
		}

		this.app.bus.once('action.document_click', this.closeJoinDialog);

		// The search input DOM element won't exist until the next redraw so
		// force that to happen now so we can give it focus
		m.redraw(true);
		$('.OC-Sidebar__header-search-input').focus();
	};

	this.closeJoinDialog = () => {
		this.is_join_dialog_open = false;
	};

	this.joinChannelFormSubmit = (event) => {
		this.stopEventPropagation(event);
		var sub_name = this.join_channel_input();
		this.join_channel_input('');

		// Make sure we actually have characters
		if ((sub_name||'').replace(/[^a-z0-9]/, '')) {
			// Normalise the /r/ formatting
			if (sub_name.toLowerCase().indexOf('r/') === 0) {
				sub_name = '/' + sub_name;
			} else if (sub_name.toLowerCase().indexOf('/r/') !== 0) {
				sub_name = '/r/' + sub_name;
			}

			var room = this.app.rooms.createRoom(sub_name);
			this.app.rooms.setActive(room.instance.name());
			this.closeJoinDialog();

			// Clear the entry box
			$(event.target).find('input').val('');
		}

		// Make sure the form does not actually submit anywhere
		return false;
	};

	this.stopEventPropagation = (event) => {
		event = $.event.fix(event);
		event.stopPropagation();
		return event;
	};
};

/**
 * Organise the channel list into a structured list
 * Eg.
 * * Top level channel
 * * Top level channel
 *   * Sub channel
 * * Sub channel without a parent
 *
 * People may link directly to a subchannel such as #/r/live-rnc without joining its
 * parent channel, so these must then be treated like a top level channel until they
 * do join the parent channel.
 */
Sidebar.view = function(controller) {
	var channels = [];
	var sub_channels = Object.create(null);
	var list = [];

	// Separate the main channels and their subchannels
	_.each(controller.app.rooms.rooms, function(channel) {
		var chan = channel.instance;
		var parent_chan_name;

		// Main channels don't have a parent channel
		if (!chan.linked_channels.parent) {
			channels.push(channel);
		} else {
			parent_chan_name = chan.linked_channels.parent.name;
			sub_channels[parent_chan_name] = sub_channels[parent_chan_name] || [];
			sub_channels[parent_chan_name].push(channel);
		}
	});

	// Add each channel entry to the list, followed by its subchannels
	if (channels.length > 0) {
		_.each(channels, function(channel, idx) {
			var this_chans_subchannels = sub_channels[channel.instance.transportSafeRoomName()] || [];

			// The parent channel...
			list.push(Sidebar.viewChannelListItem(controller, channel));

			// The channels subchannels...
			_.each(this_chans_subchannels, function(channel) {
				list.push(Sidebar.viewChannelListItem(controller, channel, {
					subchannel: true
				}));
			});

			this_chans_subchannels.added_to_list = true;
		});

		// Add any remaning subchannels that haven't already been added
		_.each(sub_channels, function(sub_channels, parent_chan_name) {
			if (sub_channels.added_to_list) {
				return;
			}

			_.each(sub_channels, function (channel) {
				list.push(Sidebar.viewChannelListItem(controller, channel, {
					//subchannel: true
				}));
			});
		});

	} else {
		list.push(<p>You're not in any channels yet</p>);
	}

	// The message underneath the channels explaining where to find channels
	list.push(
		<div class="OC-Sidebar__join-something">
			<a class="OC-Sidebar__join-something-go" onclick={controller.openJoinDialog}>
				Find more channels
			</a>
		</div>
	);

	return m('div', {class: !controller.is_join_dialog_open ? 'OC-Sidebar' : 'OC-Sidebar OC-Sidebar--join-dialog-open'}, [
		m('div', {class: 'OC-Sidebar__header'}, [
			m('form', {class: 'OC-Sidebar__header-search', onsubmit: controller.joinChannelFormSubmit}, [
				m('svg[version="1.1"][xmlns="http://www.w3.org/2000/svg"][xmlns:xlink="http://www.w3.org/1999/xlink"][width="16"][height="16"][viewBox="0 0 24 24"]', [
					m('path[d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"]')
				]),
				m('input', {
					type: 'text',
					class: 'OC-Sidebar__header-search-input',
					placeholder: 'r/subreddit',
					onfocus: controller.openJoinDialog,
					onclick: controller.stopEventPropagation,
					onkeyup: m.withAttr('value', controller.join_channel_input)
				})
			]),
			controller.is_join_dialog_open ? Sidebar.viewJoinDialog(controller) : null,

			m('div[class="OC-Sidebar__header-user-options"]', {onclick: controller.onOptionsMenuItemClick}, [
				m('svg[version="1.1"][xmlns="http://www.w3.org/2000/svg"][xmlns:xlink="http://www.w3.org/1999/xlink"][width="24"][height="24"][viewBox="0 0 24 24"]', [
					m('path[d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"]')
				])
			]),
			controller.options_menu ? controller.options_menu.view() : null
		]),

		m('ul', {class: controller.app.rooms.rooms.length > 0 ? 'OC-Sidebar__channels' : 'OC-Sidebar__channels OC-Sidebar__channels--no-channels'}, [
			list
		]),
	]);
};

Sidebar.viewChannelListItem = function(controller, channel, opts) {
	var unread_badge;
	var list_item;
	var item_classes = '';

	opts = opts || {};

	if (channel.instance.unread_counter > 0) {
		unread_badge = m('span', {
			class: 'OC-Sidebar__channels-item-badge',
			title: 'Unread messages'
		}, channel.instance.unread_counter);
	}

	item_classes = 'OC-Sidebar__channels-item';
	if (controller.app.rooms.active() === channel) {
		item_classes += ' OC-Sidebar__channels-item--active';
	}
	if (opts.subchannel) {
		item_classes += ' OC-Sidebar__channels-item--sub-channel';
	}

	var num_users_text = channel.instance.num_users() + channel.instance.known_irc_usernames().length;
	num_users_text = num_users_text === 1 ?
		num_users_text + ' person here' :
		num_users_text + ' people here';

	list_item = m('li', {
		class: item_classes,
		onclick: function() { controller.app.rooms.setActive(channel.instance.name()); }
	}, [
		m('div', {class: 'OC-Sidebar__channels-item-left'}, [
			m('span', {class: 'OC-Sidebar__channels-item-name'}, channel.instance.displayLabel()),
			m('span', {class: 'OC-Sidebar__channels-item-sub-name'}, num_users_text)
		]),
		unread_badge,
		m('svg[class="OC-Sidebar__channels-item-close"][version="1.1"][xmlns="http://www.w3.org/2000/svg"][xmlns:xlink="http://www.w3.org/1999/xlink"][width="24"][height="24"][viewBox="0 0 24 24"]', {
			onclick: channel.instance.close
		}, [
			m('path[d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"]')
		])
	]);

	return list_item;
};

Sidebar.viewJoinDialog = function(controller) {
	var subscribed_sub_count = 0;
	var current_search = controller.join_channel_input().toLowerCase();

	var subreddit_list = _.map(controller.app.subreddits(), function(sub) {
		subscribed_sub_count++;

		var sub_compare = sub.name.toLowerCase();
		if (sub_compare.indexOf(current_search.replace('/r/', '')) > -1) {
			return sub.name;
		}
	});
	if (Reddit.currentSubreddit()) {
		subreddit_list.unshift('/r/' + Reddit.currentSubreddit());
	}
	subreddit_list = _.compact(subreddit_list);

	subreddit_list = _.map(subreddit_list, function(sub_name) {
		return m('li', {
			class: 'OC-Sidebar__join-dialog-channels-item',
			onclick: function(event) {
				controller.stopEventPropagation(event);
				var room = controller.app.rooms.createRoom(sub_name);
				controller.app.rooms.setActive(room.instance.name());
				controller.closeJoinDialog();
			}
		}, sub_name);
	});

	if (!subscribed_sub_count) {
		subreddit_list.push(m('div', {class: 'OC-Sidebar__join-dialog-channels-loading'}, [
			m('svg[version="1.1"][xmlns="http://www.w3.org/2000/svg"][xmlns:xlink="http://www.w3.org/1999/xlink"][width="30"][height="30"][viewBox="25 25 50 50"]', [
				m('circle[fill="none"][stroke-width="4"][stroke-miterlimit="10"][cx="50"][cy="50"][r="20"]')
			])
		]));
	}

	return m('div', {class: 'OC-Sidebar__join-dialog'}, [
		m('ul', {
			class: 'OC-Sidebar__join-dialog-channels',
			onscroll: m.withAttr('scrollTop', controller.join_channels_scrolltop),
			config: function(el, already_initialised) {
				if (already_initialised) {
					return;
				}
				// Keep our scroll position when we get redrawn
				el.scrollTop = controller.join_channels_scrolltop();
			}
		}, subreddit_list)
	]);
};

export default Sidebar;
