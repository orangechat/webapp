import './Message.styl';

import * as Helpers from '../../Helpers/Helpers.js';
import Embed from './embed.js';

var Message = {};

Message.controller = function(args) {
	// The currently embeded media
	this.embed = null;

	this.cssClass = () => {
		var css_class = 'OC-Message';
		if (args.message.author === args.message_room.orangechat.username()) {
			css_class += ' OC-Message--own';
		}
		if (!args.message.id) {
			css_class += ' OC-Message--pending';
		}
		if (args.message.is_highlight) {
			css_class += ' OC-Message--highlight';
		}
		if (args.message.type === 'action') {
			css_class += ' OC-Message--action';
		}
		return css_class;
	};

	this.openUserMenu = (event) => {
		event = $.event.fix(event);
		event.stopPropagation();
		args.message_room.openUserMenu(event, args.message.author, {
			source: args.message.source
		});
	};

	this.onMessageClick = (event) => {
		// Clicking the embed link/media button
		if(event.target.className === 'OC-Message__content--embed') {
			var el = event.target;

			// < IE11 does not support el.dataset, el.getAttribute works in all cases
			var url = el.getAttribute('data-url');
			var embed_type = el.getAttribute('data-embed-type');
			var embed = _.findWhere(Embed.all, {name: embed_type});
			if (embed) {
				this.embed = Helpers.subModule(embed, {url: url});
			}
		}

		// Clicking a channel link
		if(event.target.className === 'OC-Message__content--channel') {
			let el = event.target;
			let channel_name = el.getAttribute('data-channel');
			if (channel_name) {
				let channel = args.room_manager.createRoom(channel_name);
				args.room_manager.setActive(channel.instance.name());
			}
		}
	};

	this.closeEmbed = () => {
		this.embed = null;
	};
};

Message.view = function(controller, args, ext) {
	var view = null;

	if (ext.style === 'inline') {
		view = Message.viewInline(controller, args, ext);
	} else {
		view = Message.viewBlock(controller, args, ext);
	}

	return view;
};

Message.viewInline = function(controller, args, ext) {
	var error = null;

	if (args.message.error) {
		error = (
			<div class="OC-Message__error">
				{args.message.error}
				{(() => {
					// If were able to retry sending the message
					if (!args.message.retry) {
						return;
					}

					if (args.message.is_sending) {
						return (<a class="OC-Message__error-retry">[retrying...]</a>);
					} else {
						return (<a class="OC-Message__error-retry" onclick={args.message.retry}>[retry]</a>);
					}
				})()}
			</div>
		);
	}

	return (
	<li class={controller.cssClass() + ' OC-Message--inline'} key={args.message.id} onclick={controller.onMessageClick}>
		<div
			style={args.message.type === 'action' ? 'color:' + Helpers.nickColour(args.message.author) + ';' : ''}
			class="OC-Message__content"
		>
			<a
				class="OC-Message__author"
				style={'color:' + Helpers.nickColour(args.message.author) + ';'}
				onclick={controller.openUserMenu}
			>
				{m.trust(args.message.display.author)}
			</a>
			{m.trust(args.message.display.content)}
		</div>
		{error}
		{Message.viewEmbed(controller, args, ext)}
	</li>
	);
};

Message.viewBlock = function(controller, args, ext) {
	var error = null;

	if (args.message.error) {
		error = (
			<div class="OC-Message__error">
				{args.message.error}
				{(() => {
					// If were able to retry sending the message
					if (!args.message.retry) {
						return;
					}

					if (args.message.is_sending) {
						return (<a class="OC-Message__error-retry">[retrying...]</a>);
					} else {
						return (<a class="OC-Message__error-retry" onclick={args.message.retry}>[retry]</a>);
					}
				})()}
			</div>
		);
	}

	return (
	<li class={controller.cssClass() + ' OC-Message--block'} key={args.message.id} onclick={controller.onMessageClick}>
		<a
			class="OC-Message__author"
			style={'color:' + Helpers.nickColour(args.message.author) + ';'}
			onclick={controller.openUserMenu}
		>
			{m.trust(args.message.display.author)}
		</a>
		<div class="OC-Message__timestamp">
			{m.trust(args.message.display.created)}
		</div>
		<div
			class="OC-Message__content"
			style={args.message.type === 'action' ? 'color:' + Helpers.nickColour(args.message.author) + ';' : ''}
		>
			{m.trust(args.message.display.content)}
		</div>
		{error}
		{Message.viewEmbed(controller, args, ext)}
	</li>
	);
};

Message.viewEmbed = function(controller, args, ext) {
	if (!controller.embed) {
		return;
	}

	return (
		<div class="OC-Message__content--embed-wrapper">
			<a class="OC-link OC-Message__content--embed-close" onclick={controller.closeEmbed}>
				<svg class="" width="24" height="24" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
			</a>
			<div class="OC-Message__content--embed-content">
				{controller.embed.view()}
			</div>
		</div>
	);
}

export default Message;
