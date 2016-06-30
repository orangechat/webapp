import * as Helpers from './Helpers/Helpers.js';
import ChatApp from './Components/ChatApp/ChatApp.jsx';
import Storage from './Services/Storage.js';
import Settings from './Services/Settings.js';
import EventBus from './Services/EventBus.js';
import ExtensionSync from './Services/ExtensionSync.js';

(function loadApp() {
	// Don't run on reddit API pages such as the oauth login page
	if (window.location.href.indexOf('reddit.com/api/') > -1 || window.location.href.indexOf('reddit.com/login') > -1) {
		return;
	}

	var body = document.querySelector('body');
	var extension_detected = false;
	var extension = null;

	// The extension adds an __ocext to the body, remove it as it's only needed
	// for us to detect the precense of the extension.
	if (body.getAttribute('__ocext')) {
		body.removeAttribute('__ocext');
		extension_detected = true;
	}


	// Lets not swallow all errors. This causes headaches
	m.deferred.onerror = function(err) {
		console.error(err.stack);
	};


	var event_bus = initEventBus();
	var app_state = null;

	initState(event_bus)
		.then((state) => {
			app_state = state;
		})
		.then(initUi);




	function initUi() {
		var $app = $('<div>').appendTo($('#chat'));
		m.mount($app[0], Helpers.subModule(ChatApp, {
			bus: event_bus,
			state: app_state,
			has_extension: extension_detected
		}));
	}


	function initEventBus() {
		var event_bus = new EventBus();
		event_bus.on('all', function(event_name) {
			//console.log('[event bus] ' + event_name);
		});

		return event_bus;
	}


	function initState(bus) {
		var deferred = m.deferred();

		// Keep application state in one place so that page refreshing keeps
		// the most important things consistent (minimised, active channel, etc)
		var state_obj = Storage.get('oc-state');
		if (typeof state_obj !== 'object') {
			state_obj = {
				// is_open = render the whole app. false = minimised
				is_open: true,

				// Current subscribed channels
				channel_list: [],

				// Active channel name
				active_channel: '',

				// state of the sidebar
				is_sidebar_open: true
			};
		}

		var state = new Settings(state_obj);
		var state_fully_loaded = false;
		state.onChange = function(changed, new_value, old_value, values) {
			//console.log('state.onChange()', changed, new_value, old_value);
			// We only want to deal with state changes once it has been fully loaded as
			// the extension may modify/sync it's state first
			if (!state_fully_loaded) {
				return;
			}

			// If we're syncing state from the extension, don't save it to storage yet.
			// It will be stored when the page is closed or refreshed
			if (changed === 'channel_list' && extension && extension.is_syncing) {
			} else {
				Storage.set('oc-state', values);
			}

			bus.trigger('state.change', changed, new_value, old_value, values);
		};

		if (extension_detected) {
			extension = new ExtensionSync(state, bus, body);
			extension.init(() => {
				state_fully_loaded = true;
				deferred.resolve(state);
			});

		} else {
			state_fully_loaded = true;
			deferred.resolve(state);
		}

		return deferred.promise;
	}
})();
