var webpack = require('webpack');
var poststylus = require('poststylus');
var path = require('path')

module.exports = {
	devtool: 'source-map',
	entry: path.resolve(__dirname, 'src'),
	output: {
		path: 'public/builds/',
		filename: 'bundle.js'
	},
	module: {
		loaders: [
			{
				test: /\.jsx?$/,
				loader: 'babel',
				include: path.resolve(__dirname, 'src'),
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
				stylus.import(path.resolve(__dirname, 'src/stylus/variables'));
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
