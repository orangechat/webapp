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
		if (this.destroy_tmr) {
			clearTimeout(this.destroy_tmr);
		}
	};

	this.destroy = () => {
		if (this.destroy_tmr) {
			clearTimeout(this.destroy_tmr);
		}

		setTimeout(() => {
			this.is_destroyed = true;
		}, 1000);

		this.destroying_in_progress = true;
	};

	this.destroyIn = (ttl) => {
		this.ttl = ttl;
	};

	// Called from the view so that the timer starts when we actually see this channel
	this.checkDestroyTmr = () => {
		if (this.ttl && !this.destroy_tmr) {
			this.destroy_tmr = setTimeout(this.destroy, this.ttl);
		}
	};
};

Alert.view = function(controller, args) {
	controller.checkDestroyTmr();

	var css_class = 'OC-MessageRoom__alert ';
	if (controller.is_open) {
		css_class += 'OC-MessageRoom__alert--open ';
	}
	if (controller.destroying_in_progress) {
		css_class += 'OC-MessageRoom__alert--destroy';
	}

	return (
		<div class={css_class}>
			<a class="OC-MessageRoom__alert--header" onclick={controller.toggle}>Access via IRC!</a>
			<div class="OC-MessageRoom__alert--body">
				Enjoy IRC? You can access this channel via <a href={'irc://irc.snoonet.org/' + args.irc_channel}>irc.snoonet.org/{args.irc_channel}</a>
			</div>
			<div class="OC-MessageRoom__alert--footer">
				<a class="OC-button__dark OC-MessageRoom__alert--close" onclick={controller.destroy}>Close</a>
			</div>
		</div>
	);
};


export default Alert;