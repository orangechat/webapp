import * as Colour from './Colour';
import {md5} from './md5';

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

	return function nickColour(nick) {
		if (cache[nick]) {
			return cache[nick];
		}

		// The HSL properties are based on this specific colour
		var starting_colour = '#36809B'; // '#449fc1';


		var hash = md5(nick);
		var hue_offset = mapRange(hexVal(hash, 14, 3), 0, 4095, 0, 359);
		var sat_offset = hexVal(hash, 17);
		var base_colour = Colour.rgb2hsl(Colour.hex2rgb(starting_colour));
		base_colour.h = (((base_colour.h * 360 - hue_offset) + 360) % 360) / 360;

		if (sat_offset % 2 === 0) {
			base_colour.s = Math.min(1, ((base_colour.s * 100) + sat_offset) / 100);
		} else {
			base_colour.s = Math.max(0, ((base_colour.s * 100) - sat_offset) / 100);
		}

		var rgb = Colour.hsl2rgb(base_colour);
		var nick_colour = Colour.rgb2hex(rgb);

		cache[nick] = nick_colour;

		return nick_colour;
	}
})();
export { nickColour };


/**
 * Extract a substring from a hex string and parse it as an integer
 * @param {string} hash - Source hex string
 * @param {number} index - Start index of substring
 * @param {number} [length] - Length of substring. Defaults to 1.
 */
export function hexVal(hash, index, len) {
	return parseInt(hash.substr(index, len || 1), 16);
}

/*
 * Re-maps a number from one range to another
 * http://processing.org/reference/map_.html
 */
export function mapRange(value, vMin, vMax, dMin, dMax) {
	var vValue = parseFloat(value);
	var vRange = vMax - vMin;
	var dRange = dMax - dMin;

	return (vValue - vMin) * dRange / vRange + dMin;
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
