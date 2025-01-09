const webpack = require('webpack');
const { merge } = require('webpack-merge');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const common = require('./webpack.common.js');

const hotReload = !!process.env.HOT_RELOAD;

module.exports = merge(common, {
  devServer: {
    historyApiFallback: true,
    disableHostCheck: true,
    host: '0.0.0.0',
    port: process.env.QGRAPH_PORT,
    hot: hotReload,
    inline: hotReload,
  },
  devtool: 'eval-cheap-module-source-map',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: require.resolve('babel-loader'),
            options: {
              plugins: [
                hotReload && require.resolve('react-refresh/babel'),
              ].filter(Boolean),
            },
          },
        ],
      },
    ],
  },
  plugins: [
    hotReload && new webpack.HotModuleReplacementPlugin(),
    hotReload && new ReactRefreshWebpackPlugin(),
  ].filter(Boolean),
});
