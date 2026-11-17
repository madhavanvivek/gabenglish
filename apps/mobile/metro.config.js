const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// The shared contracts package uses NodeNext-style ".js" specifiers so its
// TypeScript source also runs under Node/tsx. Metro must map those local
// source imports back to their TypeScript files during the native bundle.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.startsWith(".") &&
    moduleName.endsWith(".js") &&
    !moduleName.includes("/node_modules/")
  ) {
    return context.resolveRequest(
      context,
      moduleName.slice(0, -3),
      platform
    );
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
