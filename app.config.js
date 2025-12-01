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
      favicon: './assets/favicon.png'
    },
    extra: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ASSISTANT_ID: process.env.ASSISTANT_ID,
      BRAVE_API_KEY: process.env.BRAVE_API_KEY
    },
    plugins: [
      'expo-build-properties',
      'expo-web-browser'
    ]
  },
});