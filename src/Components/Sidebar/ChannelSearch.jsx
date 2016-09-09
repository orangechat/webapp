import Orangechat from '../../Services/Orangechat.js';
import Reddit from '../../Services/Reddit.js';

var ChannelSearch = {};

ChannelSearch.controller = function(args) {
	this.bus = args.bus;
	this.orangechat = Orangechat.instance();
	this.app = args.app;

	this.trending_channels = m.prop([]);
	this.trending_last_updated = 0;

	// Keep track of the join channel scroll position between renders
	this.join_channels_scrolltop = m.prop(0);
	this.join_channel_input = m.prop('');

	this.list_open = false;

	// Either 'trending' or 'subscribed'
	this.list_type = 'subscribed';

	this.refreshTrendingChannels = () => {
		if (Date.now() - this.trending_last_updated < 10000) {
			return;
		}

		this.trending_last_updated = Date.now();
		this.orangechat.trendingChannels().then((resp) => {
			this.trending_channels(resp.channels || []);
			m.redraw();
		});
	};

	this.showList = (give_focus) => {
		this.refreshTrendingChannels();

		if (this.app.subreddits().length === 0) {
			this.app.subreddits.refresh();
		}

		this.bus.once('action.document_click', this.hideList);
		this.list_open = true;

		if (give_focus) {
			$('.OC-Sidebar__header-search-input').focus();
		}
	};

	this.hideList = () => {
		this.list_open = false;
	};

	this.onSearchInputFocus = (event) => {
		this.stopEventPropagation(event);
		this.showList();
	};

	this.joinChannelFormSubmit = (event) => {
		this.stopEventPropagation(event);
		var sub_name = this.join_channel_input();
		this.join_channel_input('');

		// Make sure we actually have characters
		if ((sub_name||'').replace(/[^a-z0-9]/, '')) {
			// Normalise the /r/ formatting
			if (sub_name.toLowerCase().indexOf('r/') === 0) {
				sub_name = '/' + sub_name;
			} else if (sub_name.toLowerCase().indexOf('/r/') !== 0) {
				sub_name = '/r/' + sub_name;
			}

			var channel = this.app.rooms.createRoom(sub_name);
			this.app.rooms.setActive(channel.instance.name());
			this.hideList();

			// Clear the entry box
			$(event.target).find('input').val('');
		}

		// Make sure the form does not actually submit anywhere
		return false;
	};

	this.onTrendingClick = (event) => {
		this.stopEventPropagation(event);
		this.list_type = 'trending';
	};
	this.onSubscribedClick = (event) => {
		this.stopEventPropagation(event);
		this.list_type = 'subscribed';
	};

	this.stopEventPropagation = (event) => {
		event = $.event.fix(event);
		event.stopPropagation();
		return event;
	};
};


ChannelSearch.view = function(controller) {
	// stopEventPropagation on all click events so clicking the background of the menu doesn't
	// trigger it to close
	return m('div', {onclick: controller.stopEventPropagation}, [
		ChannelSearch.viewSearch(controller),
		controller.list_open ?
			ChannelSearch.viewList(controller) :
			null
	]);
};


ChannelSearch.viewSearch = function(controller) {
	return m('form', {class: 'OC-Sidebar__header-search', onsubmit: controller.joinChannelFormSubmit}, [
		m('svg[version="1.1"][xmlns="http://www.w3.org/2000/svg"][xmlns:xlink="http://www.w3.org/1999/xlink"][width="16"][height="16"][viewBox="0 0 24 24"]', [
			m('path[d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"]')
		]),
		m('input', {
			type: 'text',
			class: 'OC-Sidebar__header-search-input',
			placeholder: '/r/subreddit',
			onfocus: controller.onSearchInputFocus,
			onclick: controller.stopEventPropagation,
			onkeyup: m.withAttr('value', controller.join_channel_input)
		})
	]);
};


ChannelSearch.viewList = function(controller) {
	var current_search = controller.join_channel_input().toLowerCase();

	var subreddit_list = [];

	if (controller.list_type === 'subscribed') {
		subreddit_list = _.map(controller.app.subreddits(), function(sub) {
			var sub_compare = sub.name.toLowerCase();
			if (sub_compare.indexOf(current_search.replace('/r/', '')) > -1) {
				return sub.name;
			}
		});

		if (Reddit.currentSubreddit()) {
			subreddit_list.unshift('/r/' + Reddit.currentSubreddit());
		}
	}

	if (controller.list_type === 'trending') {
		subreddit_list = _.map(controller.trending_channels(), (sub) => {
			// TODO: This is hacky and shouldn't need to replace things here. Rethink it
			return sub.replace('reddit_sub_', '/r/');
		});
	}

	subreddit_list = _.compact(subreddit_list);
	subreddit_list = _.map(subreddit_list, function(sub_name) {
		return m('li', {
			class: 'OC-Sidebar__join-dialog-channels-item',
			onclick: function(event) {
				controller.stopEventPropagation(event);
				var channel = controller.app.rooms.createRoom(sub_name);
				controller.app.rooms.setActive(channel.instance.name());
				controller.hideList();
			}
		}, sub_name);
	});

	if (subreddit_list.length === 0) {
		subreddit_list.push(m('div', {class: 'OC-Sidebar__join-dialog-channels-loading'}, [
			m('svg[version="1.1"][xmlns="http://www.w3.org/2000/svg"][xmlns:xlink="http://www.w3.org/1999/xlink"][width="30"][height="30"][viewBox="25 25 50 50"]', [
				m('circle[fill="none"][stroke-width="4"][stroke-miterlimit="10"][cx="50"][cy="50"][r="20"]')
			])
		]));
	}

	return m('div', {class: 'OC-Sidebar__join-dialog'}, [
		m('.OC-Sidebar__join-dialog-subswitcher', [
			m('a', {class: 'OC-link', onclick:controller.onSubscribedClick}, 'Subbed'),
			m('a', {class: 'OC-link', onclick:controller.onTrendingClick}, 'Trending'),
			m('div', {
				class: 'OC-Sidebar__join-dialog-subswitcher-bar OC-Sidebar__join-dialog-subswitcher-bar--' + controller.list_type.toLowerCase()
			})
		]),
		m('ul', {
			class: 'OC-Sidebar__join-dialog-channels',
			onscroll: m.withAttr('scrollTop', controller.join_channels_scrolltop),
			config: function(el, already_initialised) {
				if (already_initialised) {
					return;
				}
				// Keep our scroll position when we get redrawn
				el.scrollTop = controller.join_channels_scrolltop();
			}
		}, subreddit_list)
	]);
};

export default ChannelSearch;
