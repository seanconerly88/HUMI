const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.resolver.sourceExts.push('cjs');
defaultConfig.resolver.unstable_enablePackageExports = false;

let exclusionList;
try {
  exclusionList = require('metro-config/src/defaults/exclusionList');
} catch {
  try {
    exclusionList = require('metro-config/src/defaults/blacklist');
  } catch {
    exclusionList = (regexes) => new RegExp(regexes.map(r => r.source).join('|'));
  }
}

defaultConfig.resolver.blockList = exclusionList([
  /\.local\/.*/,
]);

module.exports = defaultConfig;
