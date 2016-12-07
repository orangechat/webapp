import strftime from 'strftime';
import * as Helpers from '../../Helpers/Helpers.js';
import Embed from './embed.js';

/**
 * Parse messages into displayable formats. Parses URLs, embedded media, etc.
 */
class MessageParser {

	constructor(filters = null, usernames = null) {
		// Word replacments in message content
		this.filters = Object.create(filters);

		// A mithril prop function returning an array of usernames
		this.usernames = usernames;
	}

	parseAll(message) {
		var display_obj = {
			author: this.parseAuthor(_.escape(message.author), message.source),
			content: message.content,
			created: message.created ? this.parseTimestamp(message.created) : '',
			created_short: message.created ? this.parseShortTimestamp(message.created) : ''
		};

		var words = display_obj.content.split(' ');

		// Go through each word and parse individually. If nothing is returned from a
		// parser function, continue to the next one.
		words = words.map((word) => {
			var parsed;

			parsed = this.parseUrls(word);
			if (typeof parsed === 'string') return parsed;

			parsed = this.parseFilters(word);
			if (typeof parsed === 'string') return parsed;

			parsed = this.parseRedditPhrases(word);
			if (typeof parsed === 'string') return parsed;

			if (typeof this.usernames === 'function') {
				parsed = this.parseUsernames(word);
				if (typeof parsed === 'string') return parsed;
			}

			return _.escape(word);
		});

		display_obj.content = words.join(' ');

		return display_obj;
	}

	parseUrls(word) {
		var found_a_url = false,
			parsed_url;

		parsed_url = word.replace(/^(([A-Za-z][A-Za-z0-9\-]*\:\/\/)|(www\.))([\w\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF.\-]+)([a-zA-Z]{2,6})(:[0-9]+)?(\/[\w\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF!:.?$'()[\]*,;~+=&%@!\-\/]*)?(#.*)?$/gi, function (url) {
			var nice = url,
				extra_html = '',
				embed_type;

			// Don't allow javascript execution
			if (url.match(/^javascript:/i)) {
				return url;
			}

			found_a_url = true;

			// Add the http if no protoocol was found
			if (url.match(/^www\./i)) {
				url = 'http://' + url;
			}

			// Shorten the displayed URL if it's going to be too long
			if (nice.length > 100) {
				nice = nice.substr(0, 100) + '...';
			}

			// Check if we can embed this URL
			embed_type = _.find(Embed.all, (embed) => {
				if (embed.match(url)) {
					return embed;
				}
			});
			if (embed_type) {
				extra_html += '<a class="OC-Message__content--embed" data-url="' + url.replace(/"/g, '%22') + '" data-embed-type="' + embed_type.name + '">&gt;</a>';
			}

			// Make the link clickable
			return '<a class="link-ext" target="_blank" rel="nofollow" href="' + url.replace(/"/g, '%22') + '">' + _.escape(nice) + '</a>' + extra_html;
		});

		return found_a_url ? parsed_url : false;
	}

	parseFilters(word) {
		if (this.filters[word.toLowerCase()]) {
			return this.filters[word.toLowerCase()];
		}
	}

	parseRedditPhrases(word) {
		var replacement_made = false;
		var ret = word;
		// Convert /r/sub into channel links
		ret = ret.replace(/(?:^|\s)(\/?(r\/[a-zA-Z0-9_]+))/, (match, group1, group2) => {
			replacement_made = true;
			return '<a href="#" class="OC-Message__content--channel" data-channel="/' + group2 + '">' + group1 + '</a>';
		});

		// Convert /u/user into reddit links
		ret = ret.replace(/(?:^|\s)(\/?(u\/[a-zA-Z0-9_\-]+))/, (match, group1, group2) => {
			replacement_made = true;
			return '<a target="_blank" href="https://www.reddit.com/' + group2 + '">' + group1 + '</a>';
		});

		return replacement_made ?
			ret :
			false;
	}

	parseUsernames(word) {
		var usernames = this.usernames();
		if (!usernames && !usernames.length) {
			return;
		}

		var match = word.match(/^([a-z0-9_\-]+)([^a-z0-9_\-]+)?$/i);
		if (!match) {
			return;
		}

		// If this word isn't a recognised username, return
		if (usernames.indexOf(match[1].toLowerCase()) === -1) {
			return;
		}

		var colour = Helpers.nickColour(match[1]);
		var ret = '<span class="OC-Message__content--username" style="color:' + colour + ';">' + _.escape(match[1]) + '</span>';

		// Add any trailing characters back on
		if (match[2]) {
			ret += _.escape(match[2]);
		}

		return ret;
	}

	parseTimestamp(timestamp) {
		return strftime('%H:%M:%S', new Date(timestamp));
	}

	parseShortTimestamp(timestamp) {
		return strftime('%H:%M', new Date(timestamp));
	}

	parseAuthor(author, source) {
		if(source == 'irc') {
			author += '*';
		}

		return author;
	}

}

export default MessageParser;
