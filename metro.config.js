// Metro (the bundler): default Expo setup, but skip folders the app never imports. ad/ alone is ~2.4 GB
// (videos and its own node_modules), and crawling it made `eas update` run out of memory on this PC.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const skip = ['ad', 'design-src', 'dist', 'store', 'scripts', 'assets/demo-raw', 'assets/cartoons-raw', 'supabase'].map(
  (dir) => new RegExp(`^${path.join(__dirname, dir).replace(/[\\/]/g, '[\\\\/]').replace(/[.*+?^${}()|]/g, '\\$&')}[\\\\/].*`),
);
config.resolver.blockList = skip;
config.watchFolders = [__dirname];

module.exports = config;
