// Some of the helper functions require the app instance. Hacky and bad, but for now it'l do
var app;

export function setAppInstance(app_instance) {
	app = app_instance;
}


export function isAppActive() {
	var is_app_open = (app && app.state('is_open'));
	var is_browser_active;

	if ('hidden' in window.document) {
		is_browser_active = !document.hidden;
	} else if (window.document.hasFocus) {
		is_browser_active = window.document.hasFocus();
	} else {
		is_browser_active = true;
	}

	return is_app_open && is_browser_active;
}


var nickColour = (function() {
	var cache = Object.create(null);

	function sumCharCodes(total, i) {
		return total + i.charCodeAt(0);
	}

	return function nickColour(nick) {
		var nick_lightness, nick_int, rgb;
		var cache_key = nick.toLowerCase();

		if (!cache[cache_key]) {
			nick_lightness = 40;
			nick_int = _.reduce(nick.toLowerCase().split(''), sumCharCodes, 0);
			rgb = hsl2rgb(nick_int % 200, 70, nick_lightness);

			cache[cache_key] = '#' + ('000000' + (rgb[2] | (rgb[1] << 8) | (rgb[0] << 16)).toString(16)).substr(-6);
		}

		return cache[cache_key];
	};
})();
export { nickColour };


export function hsl2rgb(h, s, l) {
	var m1, m2, hue;
	var r, g, b;
	s /= 100;
	l /= 100;
	if (s == 0) {
		r = g = b = (l * 255);
	} else {
		if (l <= 0.5) {
			m2 = l * (s + 1);
		} else {
			m2 = l + s - l * s;
		}
		m1 = l * 2 - m2;
		hue = h / 360;
		r = HueToRgb(m1, m2, hue + 1/3);
		g = HueToRgb(m1, m2, hue);
		b = HueToRgb(m1, m2, hue - 1/3);
	}

	return [r, g, b];

	function HueToRgb(m1, m2, hue) {
		var v;
		if (hue < 0)
			hue += 1;
		else if (hue > 1)
			hue -= 1;

		if (6 * hue < 1)
			v = m1 + (m2 - m1) * hue * 6;
		else if (2 * hue < 1)
			v = m2;
		else if (3 * hue < 2)
			v = m1 + (m2 - m1) * (2/3 - hue) * 6;
		else
			v = m1;

		return 255 * v;
	}
}


export function isInReddit() {
	return !!window.location.host.match(/reddit.com$/i);
}


export function hasExtension() {
	return app.has_extension;
}


export function subModule(module, args) {
	var instance = new module.controller(args);
	return {
		instance: instance,
		view: function() {
			var fn_args = Array.prototype.slice.call(arguments);
			return module.view.apply(module, [instance, args].concat(fn_args));
		}
	};
}
