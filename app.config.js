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
      backgroundColor: '#1a1a2e',
      display: 'standalone',
      orientation: 'portrait',
      startUrl: '/',
      lang: 'en'
    },
    extra: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ASSISTANT_ID: process.env.ASSISTANT_ID,
      BRAVE_API_KEY: process.env.BRAVE_API_KEY,
      DEV_BYPASS_PAYWALL: process.env.DEV_BYPASS_PAYWALL || 'false'
    },
    plugins: [
      'expo-build-properties',
      'expo-web-browser'
    ]
  },
});
