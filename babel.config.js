module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        blocklist: null,
        allowlist: null,
        blacklist: null, // deprecated
        whitelist: null, // deprecated
        safe: false,
        allowUndefined: true,
        verbose: false,
      },
    ],
  ],
};
