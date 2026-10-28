const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native/asset-registry') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/react-native/asset-registry.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'react-native/unstable-internals-do-not-use') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/react-native/unstable-internals-do-not-use.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'react-native/setup-env') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/react-native/Libraries/Core/InitializeCore.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'expo-crypto') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/expo-auth-session/node_modules/expo-crypto/build/Crypto.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

