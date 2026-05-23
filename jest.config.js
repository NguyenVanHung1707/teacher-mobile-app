module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-native-community|@react-navigation|react-native-gesture-handler|react-native-svg|react-native-linear-gradient|react-native-chart-kit|react-native-gifted-charts)',
  ],
};
