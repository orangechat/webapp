var Alert = {};

Alert.controller = function(args) {
	this.is_open = false;
	this.is_destroyed = false;
	this.destroying_in_progress = false;

	this.ttl = 0;
	this.destroy_tmr = null;

	this.toggle = () => {
		this.is_open = !this.is_open;

		// Remove any destroy timers so it doesn't close while we're reading it
		this.killDestroyTimer();
	};

	this.killDestroyTimer = () => {
		clearTimeout(this.destroy_tmr);
		this.destroy_tmr = null;
	};

	this.destroy = () => {
		// Flag that this alert has been shown
		args.channel.flag(args.channel.FLAG_ALERT_IRC, true);

		this.killDestroyTimer();

		// Give some time for the CSS transitions to complete
		setTimeout(() => {
			this.is_destroyed = true;
		}, 1000);

		this.destroying_in_progress = true;
		m.redraw();
	};

	// Timeout before this alert automatically destroys itself
	this.destroyIn = (ttl) => {
		this.ttl = ttl;
	};

	this.domCreated = (el, isInit, context) => {
		if (isInit) return;

		if (this.ttl && !this.destroy_tmr) {
			this.destroy_tmr = setTimeout(this.destroy, this.ttl);
		}

		// When the alert is removed off-screen, stop the destroy timer so that
		// it doesn't get detroyed while not on-screen
		context.onunload = () => {
			// Remove any destroy timers so it doesn't destroy while the alert is not in view
			this.killDestroyTimer();
		};
	};
};

Alert.view = function(controller, args) {
	if (controller.is_destroyed) {
		return;
	}

	var css_class = 'OC-MessageRoom__alert ';
	if (controller.is_open) {
		css_class += 'OC-MessageRoom__alert--open ';
	}
	if (controller.destroying_in_progress) {
		css_class += 'OC-MessageRoom__alert--destroy';
	}

	return (
		<div class={css_class} config={controller.domCreated} key={'alert_' + args.channel.name()}>
			<a class="OC-MessageRoom__alert--header" onclick={controller.toggle}>Access via IRC!</a>
			<div class="OC-MessageRoom__alert--body">
				Prefer IRC? You can access this channel via <a class="OC-link" href={'irc://irc.snoonet.org/' + args.irc_channel}>irc.snoonet.org/{args.irc_channel}</a>
			</div>
			<div class="OC-MessageRoom__alert--footer">
				<a class="OC-button__dark OC-MessageRoom__alert--close" onclick={controller.destroy}>Close</a>
			</div>
		</div>
	);
};


export default Alert;