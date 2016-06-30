/**
 * Simple settings object
 * @param {Object} values Object that stores the key/val settings
 */
function Settings(values) {
	var instance;

	var get = function(key, default_val) {
		var val = values[key];
		return (val === null || val === undefined) ?
			default_val :
			val;
	};

	var set = function(key, val) {
		var old_val = values[key];
		values[key] = val;
		if (typeof instance.onChange === 'function') {
			instance.onChange(key, val, old_val, values);
		}
	};

	// Support:
	// instance(getter)
	// instance.get(getter)
	// instance.set(setter)

	instance = get;
	instance.get = get;
	instance.set = set;
	instance.values = values;

	// This .onChange as a property is bad mmkay. Add it as an event listener or something
	instance.onChange = null;

	return instance;
}


export default Settings;
