import Orangechat from '../../../Services/Orangechat.js';

var GroupSettings = {};

GroupSettings.controller = function(args) {
	this.room = args.room;
	this.room_manager = args.room_manager;
	this.orangechat = Orangechat.instance();

	this.target_username = m.prop('');
	this.channel_label = m.prop(this.room.label());

	this.title = m.prop('group options');

	this.sendInvite = e => {
		var event = $.event.fix(e);
		event.preventDefault();

		var usernames = this.target_username().split(/[ ,]/);
		usernames = _.compact(usernames).join(',');

		this.orangechat.inviteToChannel(this.room.name(), usernames).then((resp) => {
			if (resp.status == 'ok') {
				args.bus.trigger('panel.close');
				return;
			}

			console.log('sendInvite() Something went wrong...', resp);
		});
	};

	this.saveName = e => {
		var event = $.event.fix(e);
		event.preventDefault();

		var new_name = this.channel_label();
		if (!new_name) {
			// TODO: Show an error or highlight the name field in red or something
			return;
		}

		var updates = {
			label: new_name
		};

		this.orangechat.updateChannel(this.room.name(), updates).then((resp) => {
			if (resp.status == 'ok') {
				args.bus.trigger('messageroom.renamed', this.room);
				return;
			}

			console.log('updateChannel() Something went wrong...', resp);
		});
	};
};

GroupSettings.view = function(controller) {
	return m('div', {class: 'OC-MessageRoom__group-settings'}, [

		m('form', {class: 'OC-MessageRoom__group-settings-section', onsubmit: controller.sendInvite}, [
			m('input', {
				placeholder: 'type any username',
				id: 'groupinvite',
				onkeyup: m.withAttr('value', controller.target_username)
			}),
			m('button[type="submit"]', [
				m('svg[version="1.1"][xmlns="http://www.w3.org/2000/svg"][xmlns:xlink="http://www.w3.org/1999/xlink"][width="24"][height="24"][viewBox="0 0 24 24"]', [
					m('path[d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"]')
				])
			]),
			m('label[for="groupinvite"]', 'Invite someone to this channel')
		]),

		m('form', {class: 'OC-MessageRoom__group-settings-section', onsubmit: controller.saveName}, [
			m('input', {
				placeholder: 'think of a cool name',
				id: 'groupname',
				onkeyup: m.withAttr('value', controller.channel_label),
				//config: GroupSettings.viewConfigChannelname
				value: controller.channel_label()
			}),
			m('button[type="submit"]', [
				m('svg[version="1.1"][xmlns="http://www.w3.org/2000/svg"][xmlns:xlink="http://www.w3.org/1999/xlink"][width="24"][height="24"][viewBox="0 0 24 24"]', [
					m('path[d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"]')
				])
			]),
			m('label[for="groupname"]', 'Change the group name')
		])
	]);
};

GroupSettings.viewConfigChannelname = function(el, already_init, ctx, vdom) {
	if (!already_init) {
		el._created = (new Date()).toString();
		//vdom.attrs.value = ctx.channel_label
	};
};

export default GroupSettings;
