/**
 * Syncing between tabs/windows with the Kango extension framework
 * @param {Object} values Object that stores the key/val settings
 */
class ExtensionSync {
	constructor(state, bus, body) {
		this.state = state;
		this.bus = bus;
		this.body = body;
		this.is_syncing = false;
	}


	isExtensionAvailable() {
		return !!(this.ext || window.__oc6789);
	}


	init(cb) {
		var cb_after_sync = null;

		this.bus.on('state.change', (changed, new_value, old_value, values) => {
			if (!this.is_syncing && changed === 'channel_list') {
				this.extCall('setChannels', new_value);
			}
		});

		this.body.addEventListener('__ocext', (event) => {
			var payload = JSON.parse(event.detail);
			if (payload[0] !== 'ext') {
				return;
			}

			if (payload[1] === 'channelsStateUpdated') {
				this.is_syncing = true;
				this.state.set('channel_list', payload[2]);
				this.is_syncing = false;

				if (cb_after_sync) {
					cb_after_sync();
					cb_after_sync = null;
				}
			}
		});

		cb_after_sync = cb;
		this.extCall('sendMeChannels');
	}


	extCall(function_name, args) {
		var payload = ['app', function_name, args];
		var event = new CustomEvent('__ocext', {
			detail: JSON.stringify(payload)
		});
		this.body.dispatchEvent(event);
	}
}


export default ExtensionSync;
