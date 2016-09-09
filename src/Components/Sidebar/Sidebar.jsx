import './Sidebar.styl';

import * as Helpers from '../../Helpers/Helpers.js';
import OptionsMenu from '../OptionsMenu/OptionsMenu.jsx';
import ChannelSearch from './ChannelSearch.jsx';


/**
 * The sidebar UI
 */
var Sidebar = {};

Sidebar.controller = function(args) {
	this.app = args.app;
	this.mods = m.prop(0);
	this.join_dialog = Helpers.subModule(ChannelSearch, {
		bus: args.app.bus,
		app: args.app
	});

	// When there's a menu to show, this will be it
	this.options_menu = null;

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

	this.onFindChannelsClick = (event) => {
		this.stopEventPropagation(event);
		event.preventDefault();
		this.join_dialog.instance.showList(true);
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
			<a class="OC-Sidebar__join-something-go" onclick={controller.onFindChannelsClick}>
				Find more channels
			</a>
		</div>
	);

	return m('div', {class: !controller.join_dialog.instance.list_open ? 'OC-Sidebar' : 'OC-Sidebar OC-Sidebar--join-dialog-open'}, [
		m('div', {class: 'OC-Sidebar__header'}, [
			controller.join_dialog.view(),

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

export default Sidebar;
