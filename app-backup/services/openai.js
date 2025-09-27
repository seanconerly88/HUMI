import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';

export async function analyzeCigarImage(imageUri) {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `api-key
        `, // Replace with secure key storage for production
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this cigar band and return the cigar name, brand, and anything else interesting.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content;
  } catch (error) {
    Alert.alert('Error', 'Failed to analyze image. Please try again.');
    console.error(error);
    return null;
  }
}
export default { analyzeCigarImage };