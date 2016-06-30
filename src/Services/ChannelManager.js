import MessageRoom from '../Components/MessageRoom/MessageRoom.jsx';
import * as Helpers from '../Helpers/Helpers.js';

class ChannelManager {
	constructor(opts) {
		this.bus = opts.bus;
		this.transport = opts.transport;
		this.rooms = [];
		this.active = m.prop(null);

		// When we reconnect, we need to re-join all of our rooms
		this.bus.on('transport.open', (event) => {
			if (!event.was_reconnection) {
				return;
			}

			var groups = _.map(this.rooms, (room) => {
				return room.instance.transportSafeRoomName();
			});

			if (groups.length) {
				this.transport.join(groups);
			}
		}, this);

		// If we get a channel invite for one we don't already have, open it
		this.bus.on('message.channel.invite', (event) => {
			var label = event.channel_label;
			if (event.invite_size === 2 && event.channel_type === 3) {
				// Only us and 1 other person in this channel, and it's a private channel? it's a PM
				label = event.user;
			}

			var channel = this.getRoom(event.channel_name);
			if (channel) {
				channel.instance.label(label);
			} else {
				this.createRoom(event.channel_name, {
					label: label
				});
			}
		});

		this.bus.on('action.ocbutton.click', (event, channel_name) => {
			if (!channel_name) {
				return;
			}

			event.preventDefault();
			var channel = this.createRoom(channel_name);
			this.setActive(channel.instance.name());
		});
	}

	transportSafeRoomName(name) {
		return name.toLowerCase().replace('/r/', 'reddit_sub_');
	}

	createRoom(room_name, args) {
		args = args || {};
		var room = this.getRoom(room_name);

		if (!room) {
			room = Helpers.subModule(MessageRoom, {
				name: room_name,
				label: args.label,
				read_upto: args.read_upto,
				access: args.access,
				linked_channels: args.linked_channels,
				bus: this.bus,
				room_manager: this
			});

			this.rooms.push(room);
			this.transport.join(room.instance.transportSafeRoomName());

			this.bus.trigger('channel.created', room.instance);
		}

		// If we don't currently have an active room, make this the active room
		if (!this.active()) {
			this.setActive(room.instance.name);
		}

		return room;
	}

	closeRoom(room_name) {
		var room = this.getRoom(room_name);
		if (!room) {
			return;
		}

		var room_idx = this.rooms.indexOf(room);

		this.rooms = _.without(this.rooms, room);
		this.transport.leave(room.instance.transportSafeRoomName());
		this.bus.trigger('channel.close', room);

		// The room after the one that was just removed should now be selected. If there
		// is none, then the one before it.
		if (this.rooms[room_idx]) {
			this.setActive(this.rooms[room_idx].instance.name());
		} else if (this.rooms[room_idx - 1]){
			this.setActive(this.rooms[room_idx - 1].instance.name());
		} else {
			this.setActive(null);
		}
	}

	getRoom(room_name) {
		if (typeof room_name !== 'string') {
			return;
		}

		var normalised_name = this.transportSafeRoomName(room_name);
		return _.find(this.rooms, function(room) {
			return normalised_name === room.instance.transportSafeRoomName();
		});
	}

	setActive(room_name) {
		var current_room = this.active();
		var selected_room = this.getRoom(room_name);

		if (!selected_room) {
			return false;
		}

		this.active(selected_room || null);

		if (current_room) {
			current_room.instance.is_active = false;
		}
		if (selected_room) {
			selected_room.instance.is_active = true;
		}

		this.bus.trigger(
			'channel.active',
			selected_room ? selected_room.instance : null,
			current_room ? current_room.instance : null
		);
	}

	setIndexActive(room_idx) {
		var room = this.rooms[0];
		this.setActive(room ? room.name() : null);
	}
}

export default ChannelManager;
