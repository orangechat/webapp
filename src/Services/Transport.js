import SockJS from 'sockjs-client';

var MESSAGE_TYPE_JOIN = '01';
var MESSAGE_TYPE_LEAVE = '02';
var MESSAGE_TYPE_MESSAGE = '03';
var MESSAGE_TYPE_GROUPMETA = '04';

class Transport {

	constructor(sid, bus) {
		this.sid = null;
		this.bus = bus;
		this.connected = false;
		this.queue = [];

		this.setSessionId(sid);
		this.updateGroupMetaLoop();
	}

	setSessionId(sid) {
		this.sid = sid;
		if (sid) {
			this.initSocket();
		}
	}

	initSocket() {
		var self = this;
		var reconnect_attempts = 0;

		connectSocket();

		function connectSocket() {
			self.bus.trigger('transport.connecting', {
				reconnect_attempts: reconnect_attempts
			});
			self.sock = new SockJS('https://app.orangechat.io/transport2?sid=' + self.sid);
			self.sock.onopen = onOpen;
			self.sock.onclose = onClose;
			self.sock.onmessage = onMessage;
		}

		function onOpen() {
			self.bus.trigger('transport.open', {
				was_reconnection: reconnect_attempts > 0,
				reconnect_attempts: reconnect_attempts
			});

			reconnect_attempts = 0;
			self.connected = true;
			self.flushSocket();
		}

		function onMessage(event) {
			var message_type = event.data.substring(0, 2);
			var raw_message = event.data.substring(2);
			var message;

			if (message_type === MESSAGE_TYPE_MESSAGE) {
				try {
					message = JSON.parse(raw_message);
					self.bus.trigger('transport.message', message);
				} catch (err) {
					console.log(err);
				}

			} else if (message_type === MESSAGE_TYPE_GROUPMETA) {
				var groups = {};
				_.map(raw_message.split(' '), function(group_meta) {
					var parts = group_meta.split(':');
					groups[parts[0]] = {
						name: parts[0],
						num_users: parseInt(parts[1], 10)
					};
				});

				m.startComputation();
				self.bus.trigger('transport.groupmeta', groups);
				m.endComputation();
			}
		}

		function onClose() {
			self.connected = false;
			self.bus.trigger('transport.close');

			setTimeout(function() {
				reconnect_attempts++;
				connectSocket();
			}, reconnectInterval(reconnect_attempts));
		}

		// Exponential backoff upto 1min for reconnections
		function reconnectInterval(attempt_num) {
			var interval = Math.pow(2, attempt_num) - 1;
			interval = Math.min(60, interval);
			return interval * 1000;
		}
	}

	join(group) {
		var group_str = [].concat(group).join(',');
		this.queue.push(MESSAGE_TYPE_JOIN + group_str);
		this.flushSocket();
	}

	leave(group) {
		var group_str = [].concat(group).join(',');
		this.queue.push(MESSAGE_TYPE_LEAVE + group_str);
		this.flushSocket();
	}

	updateGroupMeta() {
		this.queue.push(MESSAGE_TYPE_GROUPMETA);
		this.flushSocket();
	}

	updateGroupMetaLoop() {
		if (this.connected) {
			this.updateGroupMeta();
		}
		setTimeout(_.bind(this.updateGroupMetaLoop, this), 10000);
	}

	flushSocket() {
		if (!this.sock || this.sock.readyState !== 1) {
			return;
		}

		_.each(this.queue, (data) => {
			this.sock.send(data);
		});

		this.queue = [];
	}

}

export default Transport;
