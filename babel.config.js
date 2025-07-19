module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',   // debe ir **al final**
      'expo-router/babel',               // si usas funcionalidades avanzadas del router
    ],
  };
};
