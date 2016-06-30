export default class MessageModel {
	constructor(message) {
		this.fromObj(message);
	}

	fromObj(obj) {
		this.id = obj.id;
		this.matchid = obj.matchid;
		this.author = obj.author;
		this.content = obj.content;
		this.channel = obj.channel;
		this.created = obj.created;
		this.source = obj.source;
		this.type = obj.type;
		this.is_highlight = obj.is_highlight;
	}
}
