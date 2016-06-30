class EventBus {

	constructor() {
		this.findandAssignEventEmitter();
		this.overloadAddEvent();
	}

	findandAssignEventEmitter() {
		// reddit.com has backbone...
		if (Backbone && Backbone.Events) {
			_.extend(this, Backbone.Events);
		} else {
			// TODO: Include a very simple event emitter to use outside of reddit.com
			console.log('[error] No event emitter found!');
		}
	}

	overloadAddEvent() {
		var self = this;
		var original_on = this.on;
		var original_once = this.once;

		this.on = function on(event, fn, context) {
			original_on.call(this, event, fn, context);
			return {
				off: function off() {
					self.off(event, fn, context);
				}
			};
		};

		this.once = function once(event, fn, context) {
			original_once.call(this, event, fn, context);
			return {
				off: function off() {
					self.off(event, fn, context);
				}
			};
		};
	}
}

export default EventBus;
