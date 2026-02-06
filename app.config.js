import 'dotenv/config';

export default () => ({
  expo: {
    name: 'HUMI',
    slug: 'HUMI',
    version: '1.0.9',
    scheme: 'humi',
    platforms: ['ios', 'android', 'web'],
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './assets/images/favicon.png',
      name: 'HUMI - Digital Cigar Lounge',
      shortName: 'HUMI',
      description: 'Your private digital cigar lounge. Log, rate, and connect with fellow enthusiasts.',
      themeColor: '#8B4513',
      backgroundColor: '#f9f9f9',
      display: 'standalone',
      orientation: 'portrait',
      startUrl: '/',
      lang: 'en'
    },
    extra: {
      eas: {
        projectId: ''
      }
    },
    plugins: [
      'expo-build-properties',
      'expo-web-browser'
    ]
  },
});
