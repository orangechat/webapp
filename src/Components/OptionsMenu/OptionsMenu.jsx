import './OptionsMenu.styl';

import * as Helpers from '../../Helpers/Helpers.js';
import Orangechat from '../../Services/Orangechat.js';

/**
 * The sidebar UI
 */
var OptionsMenu = {};

OptionsMenu.controller = function(args) {
	_.extend(this, Backbone.Events);
	this.bus = args.bus;
	this.orangechat = Orangechat.instance();

	this.listenTo(this.bus, 'action.document_click', (event) => {
		this.close();
	});

	this.onLogoutItemClick = () => {
		if (!confirm('Are you sure you want to logout of OrangeChat? This will close any conversations you are currently in')) {
			return;
		}
		this.orangechat.logout().then(() => {
			window.location.reload();
		});
	};

	this.onPreferencesClick = () => {
		this.bus.trigger('action.show_settings');
	};

	this.close = () => {
		this.trigger('close');
		this.stopListening();
	};

	this.onClick = (event) => {
		event = $.event.fix(event);
		event.stopPropagation();
		this.close();
	};
};

OptionsMenu.view = function(controller) {
	var items = [];

	items.push(
		<h5 class="OC-OptionsMenu__title">
			{'/u/' + controller.orangechat.username()}
		</h5>
	);

	items.push(
		<a
			onclick={controller.onPreferencesClick}
			class="OC-OptionsMenu__link"
		>Preferences</a>
	);

	var is_logged_in = !!controller.orangechat.username();
	if (is_logged_in) {
		items.push(
			<a
				onclick={controller.onLogoutItemClick}
				class="OC-OptionsMenu__link"
			>Logout</a>
		);
	}

	items.push(<hr />);

	if (!Helpers.hasExtension() && !Helpers.isInReddit()) {
		items.push(
			<a
				href="https://orangechat.io/"
				class="OC-OptionsMenu__link"
				target="_blank"
			>Download browser extension</a>
		);
	}

	items.push(
		<a
			href="https://orangechat.io"
			class="OC-OptionsMenu__link"
			target="_blank"
		>orangechat.io</a>
	);
	items.push(
		<a
			href="https://twitter.com/orangechatio"
			class="OC-OptionsMenu__link"
			target="_blank"
		>Twitter</a>
	);

	return (
		<div onclick={controller.onClick} class="OC-OptionsMenu">
			{items}
		</div>
	);
};

export default OptionsMenu;
