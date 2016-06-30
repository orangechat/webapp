var notification_requesting_permission = false;

// Click handlers on mobile app notifications are tracked by an ID. Keep track
// of id=>clickhandlerFn callbacks
var mobile_click_handlers = Object.create(null);
var next_mobile_click_id = 0;


// Mobile app injects a nsWebViewInterface event emitter into the window
function isInMobileApp() {
	return ('nsWebViewInterface' in window);
}


// If we're in the mobile app, listen out for the click callback events
if (isInMobileApp()) {
	window.nsWebViewInterface.on('notification_clicked', (event) => {
		var notification_id = event.id;
		var handler = mobile_click_handlers[notification_id];

		if (!handler) {
			return;
		}

		delete mobile_click_handlers[notification_id];
		_.each(handler._click_handlers, (fn) => {
			fn();
		});
	});
}


export function notificationState() {
	// Mobile app local notifications
	if (isInMobileApp()) {
		return 'ok';
	}

	if (notification_requesting_permission) {
		return 'requesting';
	}

	if (!('Notification' in window)) {
		return 'not_supported';
	}

	if (Notification.permission === 'granted') {
		return 'ok';
	}

	if (Notification.permission === 'denied') {
		return 'denied';
	}

	return 'needs_request';
}


export function requestPermission(cb) {
	notification_requesting_permission = true;

	Notification.requestPermission((permission) => {
		notification_requesting_permission = false;
		cb(permission);
	});
}


export function notify(title, body, icon) {
	if (notificationState() !== 'ok') {
		return false;
	}

	if (isInMobileApp()) {
		var click_id = next_mobile_click_id++;
		nsWebViewInterface.emit('notification', {
			id: click_id,
			title: title,
			body: body
		});

		// Luckily all mobile browsers supper defineProperty, so use it to
		// set click handlers to be consistent with desktop
		// notificaiton.onclick = function(){}
		var ret = {_click_handlers: []};
		Object.defineProperty(ret, 'onclick', {
			get: () => {
				return undefined;
			},
			set: (fn) => {
				// Lazily adding the click handlers reference so it doesn't
				// build up when not required
				mobile_click_handlers[click_id] = ret;
				ret._click_handlers.push(fn);
			}
		});

		return ret;

	} else {
		var options = {
			body: body,
			icon: icon || 'https://app.orangechat.io/assets/logo-color.png'
		}
		return new Notification(title, options);
	}
}
