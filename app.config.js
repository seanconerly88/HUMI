import 'dotenv/config'; // 👈 This loads your .env file

export default () => ({
  expo: {
    name: 'HUMI',
    slug: 'HUMI',
    version: '1.0.0',
    extra: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ASSISTANT_ID: process.env.ASSISTANT_ID,
    },
  },
});
