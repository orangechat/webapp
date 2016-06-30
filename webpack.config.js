var webpack = require('webpack');
var poststylus = require('poststylus');

module.exports = {
	devtool: 'source-map',
	entry: __dirname + '/src',
	output: {
		path: 'public/builds/',
		filename: 'bundle.js'
	},
	module: {
		loaders: [
			{
				test: /\.jsx?$/,
				loader: 'babel',
				include: __dirname + '/src',
				query: {
					presets: ['es2015'],
					plugins: ['mjsx']
				},
			},
			{
				test: /\.styl/,
				loader: 'style!css!stylus',
			},
			{
				test: /\.html/,
				loader: 'html'
			}
		],
	},
	stylus: {
		use: [
			function (stylus) {
				stylus.import(__dirname + '/src/stylus/variables');
			},
			poststylus([ 'autoprefixer' ])
		]
	},
	plugins: [
    new webpack.ProvidePlugin({
	    m: 'mithril'
		})
  ]
}
