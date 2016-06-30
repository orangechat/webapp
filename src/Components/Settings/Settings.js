import './Settings.styl';

import * as Helpers from '../../Helpers/Helpers.js';
import * as Notifications from '../../Services/Notifications.js';


var Settings = {};

Settings.controller = function(args) {
	this.bus = args.bus;

	this.toggleApp = () => {
		this.bus.trigger('action.toggle_app');
	};

	this.close = () => {
		this.bus.trigger('action.close_workspace');
	};

	/**
	 * Notifications
	 */
	this.notificationState = () => {
		return Notifications.notificationState();
	};

	this.requestNotificationPermission = () => {
		Notifications.requestPermission((permission) => {
			m.redraw();
		});
	};
};


Settings.view = function(controller) {
	var header = Settings.viewHeader(controller);
	var content = Settings.viewContent(controller);

	return m('div', {class: 'OC-MessageRoom'}, [
		header,
		m('div', {class: 'OC__workspace-content'}, content)
	]);
};

Settings.viewHeader = function(controller) {
	return m('div', {class: 'OC-MessageRoom__header'}, [
		m('div', {class: 'OC-MessageRoom__header-collapse', title: 'Toggle sidebar', onclick: controller.close}, [
			m('svg[version="1.1"][xmlns="http://www.w3.org/2000/svg"][xmlns:xlink="http://www.w3.org/1999/xlink"][width="24"][height="24"][viewBox="0 0 24 24"]', [
				m('path[d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"]')
			])
		]),
		m('div', {class: 'OC-MessageRoom__header-info', onclick: Helpers.isInReddit() ? controller.toggleApp : null}, [
			m('h4', 'Preferences')
		])
	]);
};

Settings.viewContent = function(controller) {
	var sections = [];

	sections.push(m('div', {
		class: 'OC-Settings__section'
	}, Settings.viewSectionNotifications(controller)));

	sections.push(m('div', {
		class: 'OC-Settings__section'
	}, Settings.viewSectionVersion(controller)));

	return sections;
};

Settings.viewSectionNotifications = function(controller) {
	var state = controller.notificationState();
	var action = null;

	if (state === 'needs_request') {
		action = m('button', {onclick: controller.requestNotificationPermission}, 'Enable Notifications');
	} else if (state === 'requesting') {
		action = m('button', {disabled:true}, 'Requesting permission...');
	} else if (state === 'not_supported') {
		action = m('span', 'Your browser does not support desktop notifications :(');
	} else if (state === 'denied') {
		action = m('span', 'Your browser has denied access to notifications. You may enable them in your browser settings');
	} else if (state === 'ok') {
		action = m('span', 'Notifications enabled :)');
	}

	return [
		m('h5', 'Enable message notifications'),
		m('p', 'Recieve a notification when somebody mentions you'),
		m('div', {style: 'text-align:right;'}, [
			action
		])
	];
};

Settings.viewSectionVersion = function(controller) {
	return [
		m('h5', 'Application version'),
		m('p', 'You are using version 1.3.1 of orangechat')
	];
};

export default Settings;
