import './Topbar.styl';

/**
 * The topbar UI
 */
var Topbar = {};

Topbar.controller = function(args) {
	this.app = args.app;

	this.toggleApp = () => {
		this.app.bus.trigger('action.toggle_app');
	};
};

Topbar.view = function(controller) {
	var active_room = controller.app.rooms.active();
	var total_unread = 0;
	var have_highlight = false;
	var title = [
		m('img', {
			class: 'OC-Topbar__branding-logo',
			src: 'https://app.orangechat.io/assets/logo-white.svg'
		})
	];

	have_highlight = active_room ?
		active_room.instance.unread_highlight :
		false;

	controller.app.rooms.rooms.map(function(room) {
		total_unread += room.instance.unread_counter;
	});

	if (total_unread > 0) {
		title.push(m('div', {
			class: 'OC-Topbar__badge',
			title: 'Unread messages'
		}, total_unread));
	}

	return m('div', {
		class: (total_unread > 0 && have_highlight) ?
			'OC-Topbar OC-Topbar--new-messages' :
			'OC-Topbar',
		onclick: controller.toggleApp
	}, title);
};

export default Topbar;
