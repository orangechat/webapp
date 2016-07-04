import './Menus.styl';

var Menus = {};

Menus.controller = function(args) {
	this.active_menu = null;
	this.active_menu_pos = {};

	this.open = (event, menu_instance) => {
		args.bus.trigger('panel.opening');
		this.active_menu = menu_instance;

		// Render once so we can get the sizing of the panel after it's rendered.
		m.redraw(true);

		this.active_menu_pos = {
			left: this.calculateOffsetLeft(event),
			top: this.calculateOffsetTop(event)
		};

		args.bus.once('action.document_click', () => {
			this.close();
		});

		args.bus.trigger('panel.opened');
	};

	this.close = () => {
		this.active_menu = null;
		args.bus.trigger('panel.closed');
	};

	this.calculateOffsetTop = event => {
		var workspace_height = $('.OC__workspace').height();
		var panel_height = $('.OC-Menu').height();

		if((event.clientY + panel_height) > window.innerHeight) {
			return ((window.innerHeight - (window.innerHeight - workspace_height)) - panel_height - 20);
		}

		return (event.clientY - (window.innerHeight - workspace_height));
	};

	this.calculateOffsetLeft = event => {
		var workspace_width = $('.OC__workspace').width();
		var panel_width = $('.OC-Menu').width();
		var left =  (event.clientX - $('.OC__workspace').offset().left);

		if((event.clientX + panel_width) > window.innerWidth) {
			left = ((window.innerWidth - (window.innerWidth - workspace_width)) - panel_width - 20);
		}

		return left;
	};

	args.bus.on('panel.open', this.open);
	args.bus.on('panel.close', this.close);
};

Menus.view = function(controller) {
	if (!controller.active_menu) {
		return null;
	}

	var style_tag = 'display: block;';
	style_tag += 'left:' + controller.active_menu_pos.left + 'px;';
	style_tag += 'top:' + controller.active_menu_pos.top + 'px;';

	var title = controller.active_menu.instance.title ?
		controller.active_menu.instance.title() :
		'';

	return (
		<div class="OC-Menu" style={style_tag}>
			<h5 class="OC-Menu__title">{title}</h5>
			{controller.active_menu.view()}
		</div>
	);
};

export default Menus;
