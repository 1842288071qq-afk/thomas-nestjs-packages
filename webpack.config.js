const nodeExternals = require('webpack-node-externals');
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');

module.exports = function (options, webpack) {
  const webpack编译运行 = process.env.WEBPACK_RUN === 'true';
  // 打包后不需要运行，如果需要的话
  const runScript = new RunScriptWebpackPlugin({
    name: options.output.filename,
    autoRestart: false,
  });
  const pluginsAdd = [];
  if (webpack编译运行) {
    pluginsAdd.push(runScript);
  }

  return {
    ...options,
    devtool: 'source-map',
    entry: ['webpack/hot/poll?100', options.entry],
    externals: [
      nodeExternals({
        allowlist: ['webpack/hot/poll?100'],
      }),
    ],
    plugins: [
      ...options.plugins,
      new webpack.HotModuleReplacementPlugin(),
      new webpack.WatchIgnorePlugin({
        paths: [/\.js$/, /\.d\.ts$/],
      }),
      ...pluginsAdd,
    ],
  };
};
