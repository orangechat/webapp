import ModeratorToolbox from '../../../Services/ModeratorToolbox.js';

var ModerationMenu = {};

ModerationMenu.controller = function(args) {
	this.room = args.room;
	this.room_manager = args.room_manager;
	this.bus = args.bus;

	this.title = m.prop('Moderation');

	this.openModChannel = (event) => {
		if (!this.room.access.is_reddit_mod) {
			return;
		}
		if (!this.room.linked_channels.reddit_mod) {
			return;
		}

		var channel = this.room_manager.createRoom(this.room.linked_channels.reddit_mod);
		this.room_manager.setActive(channel.instance.name());
	};

	this.openModSettings = () => {
		this.room.openModSettings();
	};
};

ModerationMenu.view = function(controller) {
	return (
		<div class="OC-Menu__content">
			<a class="OC-Menu__link" onclick={controller.openModChannel}>Open moderators channel</a>
			<a class="OC-Menu__link" onclick={controller.openModSettings}>Channel settings</a>
		</div>
	);
};

export default ModerationMenu;
