import './Message.styl';

import * as Helpers from '../../Helpers/Helpers.js';

var Message = {};

Message.controller = function(args) {
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
	<li class={controller.cssClass() + ' OC-Message--inline'}>
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
	<li class={controller.cssClass() + ' OC-Message--block'} key={args.message.id}>
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
	</li>
	);
};

export default Message;
