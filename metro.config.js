const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.resolver.sourceExts.push('cjs');
defaultConfig.resolver.unstable_enablePackageExports = false; // Add this line

defaultConfig.transformer.minifierConfig = {
  compress: {
    drop_console: true,
  }
};

module.exports = defaultConfig;
