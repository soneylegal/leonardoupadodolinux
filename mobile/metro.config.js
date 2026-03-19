// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Disable 'mjs' to fix 'import.meta' syntax error from Zustand on Expo Web
if (config.resolver && config.resolver.sourceExts) {
  config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'mjs');
}

module.exports = config;
