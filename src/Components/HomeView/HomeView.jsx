import './HomeView.styl';

import Orangechat from '../../Services/Orangechat.js';

var HomeView = {};

HomeView.controller = function(args) {
	var app = args.app;

	this.getStarted = () => {
		app.orangechat.auth()
			.then((result) => {
				// Logged in OK...
				console.log('Logged in ok.', result);
				app.addInitialRooms();
			})
			.then(null, (err) => {
				// Logging in failed...
				//console.log('Failed to login.', err);
			});
	};
};

HomeView.view = function(controller) {
	return (
		<div class="OC-HomeView">
			<div class="OC-HomeView__get-started">
				<img class="OC-HomeView__get-started-branding-logo" src="https://app.orangechat.io/assets/logo-white.svg" />
				<h4>Welcome to orangechat.io</h4>
				<a class="OC-HomeView__get-started-button" onclick={controller.getStarted}>Get Started</a>
			</div>
		</div>
	);
};

export default HomeView;
