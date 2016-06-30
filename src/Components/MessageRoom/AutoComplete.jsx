var AutoComplete = {};

AutoComplete.controller = function(args) {
	_.extend(this, Backbone.Events);

	this.state = {
		el: args.el,
		start_pos: args.start_pos || 0,
		current_word: '',
		selected_idx: 0,
		options: args.options || [],
		filtered: [],

		// Before the selection
		prefix: '',

		// After the selection
		suffix: ''
	};

	this.handleKeyDown = (event) => {
		var el = event.target;

		// If the cursor has moved out of range, stop autocompleting
		if (el.selectionStart < this.state.start_pos) {
			this.close();
			return;
		}

		if (event.which === 38 || (event.which === 9 && event.shiftKey)) {
			// up or tab+shift
			this.state.selected_idx--;
			if (this.state.selected_idx < 0) {
				this.state.selected_idx = this.state.filtered.length-1;
			}
			event.preventDefault();
		} else if (event.which === 40 || event.which === 9) {
			// down or tab
			this.state.selected_idx++;
			if (this.state.selected_idx > this.state.filtered.length-1) {
				this.state.selected_idx = 0;
			}
			event.preventDefault();
		} else if (event.which === 13) {
			// return
			this.selectOption(this.state.selected_idx);
			this.close();
			event.preventDefault();
		} else if (event.which === 27) {
			// esc
			this.close();
			event.preventDefault();
		} else if (event.which === 32) {
			// space
			this.close();
		}
	};


	this.handleKeyUp = (event) => {
		var el = event.target;

		// If the cursor has moved out of range, stop autocompleting
		if (el.selectionStart < this.state.start_pos) {
			this.close();
			return;
		}

		var current_word = el.value.substring(this.state.start_pos);
		current_word = current_word.match(/^[a-z0-9_\-]+/i) || [];
		this.state.current_word = current_word[0] || '';
		this.filterOptions();

		this.ensureItemInView();
	};


	this.close = () => {
		this.trigger('close');
	};


	this.selectOption = (item_idx) => {
		var insert = this.state.filtered[item_idx];
		var new_pos = this.state.start_pos + insert.length;

		this.state.el.value = this.state.prefix + insert + this.state.suffix;
		this.state.el.setSelectionRange(new_pos, new_pos);
		this.state.el.focus();
	};


	this.ensureItemInView = () => {
		var el = $('.OC-MessageRoom__autocomplete-item-idx' + this.state.selected_idx)[0];
		if (el) {
			el.scrollIntoView();
		}
	};


	this.filterOptions = () => {
		var filtered = _.filter(this.state.options, (option) => {
			return option.toLowerCase().indexOf(this.state.current_word.toLowerCase()) === 0;
		});

		this.state.filtered = filtered;
	};


	this.extractPrefixAndSuffix = () => {
		var idx = this.state.start_pos;
		var val = this.state.el.value;
		this.state.prefix = val.slice(0, idx);
		this.state.suffix = val.slice(idx);
	};

	this.extractPrefixAndSuffix();
};


AutoComplete.view = function(controller, args) {
	var state = controller.state;
	var current_word = state.current_word;
	var filtered = state.filtered;
	var items = [];

	if (filtered.length === 0) {
		items.push(
			<li class="OC-MessageRoom__autocomplete-message">
				No usernames found starting with {current_word}...
			</li>
		);

	} else {
		_.map(filtered, (option, idx) => {
			var item_classes = 'OC-MessageRoom__autocomplete-item OC-MessageRoom__autocomplete-item-idx' + idx;
			if (idx === state.selected_idx) {
				item_classes += ' OC-MessageRoom__autocomplete-item--selected';
			}

			items.push(
				<li
					class={item_classes}
					onclick={function() {
						controller.selectOption(idx);
						controller.close();
					}}
				>
					{option}
				</li>
			);
		});
	}

	var list = (<ul class="OC-MessageRoom__autocomplete">{items}</ul>);
	return list;	
};


export default AutoComplete;
