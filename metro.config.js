const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const smithyShim = path.join(__dirname, 'scripts', 'metro-shims', 'smithy-node-http-handler.js');
const nodeBuiltinsShim = path.join(__dirname, 'scripts', 'metro-shims', 'node-builtins.js');

// @aws-sdk/client-s3 pulls in @smithy/node-http-handler, which requires Node
// builtins (node:https, node:http2, node:stream) that don't exist in React
// Native. Swap it for a fetch-based implementation so the app can bundle and
// S3 uploads work at runtime.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@smithy/node-http-handler') {
    return { type: 'sourceFile', filePath: smithyShim };
  }
  // Node builtins (node:crypto, node:fs, ...) required by lazy AWS SDK code
  // paths (IMDS/SSO credential providers, streaming checksums) that never run
  // in React Native. Stub them so the bundle links.
  if (moduleName.startsWith('node:')) {
    return { type: 'sourceFile', filePath: nodeBuiltinsShim };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
