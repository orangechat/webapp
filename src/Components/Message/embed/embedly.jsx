import Config from 'Config/Config';

// Sets to true once the embedly script tag has been included to the page
var embedly_script_included = false;

export default {
	name: 'embedly',

	match: function(url) {
		// Embedly can embed any URL, so just match them all
		return true;
	},

	controller: function(args) {
		this.url = args.url;
		this.class_id = 'embed_' + Math.round(Math.random() * 1000000);
		this.embedly_key = Config.embedding.embedly.api_key || '';


		var checkEmbedlyAndShowCard = () => {
			// if the embedly function doesn't exist it's probably still loading the embedly script
			if (typeof window.embedly !== 'function') {
				setTimeout(checkEmbedlyAndShowCard, 100);
				return;
			}

			embedly('card', {selector: '.' + this.class_id});
		};

		if (embedly_script_included) {
			checkEmbedlyAndShowCard();

		} else {
			$('<script src="//cdn.embedly.com/widgets/platform.js"></script>').appendTo($('body'));
			embedly_script_included = true;
			checkEmbedlyAndShowCard()
		}
	},

	view: function(controller) {
		return (
			<a
				class={'OC-Message__content--embed-loading ' + controller.class_id}
				data-card-key={controller.embedly_key}
				href={controller.url}
				onclick={function() { return false; }}
			>
				Loading...
			</a>
		);
	}
};
