import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getApiBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.API_BASE_URL || 'https://app.gethumi.co';
};

const API_BASE_URL = getApiBaseUrl();

const fetchWithTimeout = (url, options, timeoutMs = 45000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
};


export async function analyzeCigarImage(
  imageUri,
  userId = 'anonymous',
  nameHint = null,
  isReanalyzeMode = false
) {
  try {
    console.log('🚀 analyzeCigarImage called (secure proxy mode)');

    if (isReanalyzeMode && nameHint) {
      console.log("♻️ Reanalyze mode active. Skipping image vision step.");

      const prompt = `
      The user corrected the cigar name manually. 
      Treat this corrected name as 100% accurate.
      Ignore any image text or brand that contradicts this.
      
      Corrected Cigar Name: ${nameHint}

      Provide:
      - Brand (if name includes it)
      - Line
      - Detailed description
      - Origin country
      - Wrapper type
      - Strength level
      - Common tasting notes
      - Recommended pairings
      - Everything same format as normal analyzeCigarImage().
      `;

      const aiResponse = await callAssistant(prompt, userId);

      if (aiResponse?.fullName && aiResponse?.description) return aiResponse;

      return buildFallbackResponse(null, fallbackMessagePartial());
    }

    const base64Image = await convertImageToBase64(imageUri);
    console.log('🖼️ Base64 Image Length:', base64Image.length);

    console.log('🔍 Calling Vision API via secure proxy...');
    const visionResponse = await fetchWithTimeout(`${API_BASE_URL}/api/openai/vision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Image,
        userId,
      }),
    }, 45000);

    const visionData = await visionResponse.json();
    console.log('📡 Vision API response status:', visionResponse.status);
    
    // Handle rate limiting
    if (visionResponse.status === 429) {
      console.warn('⏱️ Rate limited:', visionData.error);
      return buildFallbackResponse(null, visionData.error || 'Too many requests. Please wait a moment.');
    }
    
    if (visionData.error) {
      console.error('❌ Vision API error:', visionData.error);
      return buildFallbackResponse(null, `AI error: ${visionData.error}`);
    }
    
    const bandDescription = visionData.description || 'No visual detail returned';
    const fullName = extractProbableCigarName(bandDescription);

    console.log('📷 Vision Description:', bandDescription);

    const visionResult = { fullName, bandDescription };

    const prompt = formatAssistantMessage(visionResult, nameHint);
    const aiResponse = await callAssistant(prompt, userId);

    if (aiResponse?.fullName && aiResponse?.description) return aiResponse;

    return buildFallbackResponse(visionResult, fallbackMessagePartial());

  } catch (err) {
    console.error('🚨 Error in analyzeCigarImage:', err);
    return buildFallbackResponse(null, fallbackMessageFail());
  }
}


async function convertImageToBase64(uri) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function extractProbableCigarName(description) {
  const match = description.match(/(?:says|reads|label says)\s['"""']?([A-Za-z0-9\s\-]+)['"""']?/i);
  return match ? match[1].trim() : '';
}

const DESCRIPTION_STARTERS = [
  "This looks like the {name}. You can expect",
  "That's the distinctive band of {name}. The interesting thing to note is",
  "That's the signature look of {name}. A great pairing with this would be",
  "The {name} is a great choice because",
  "This is the hallmark style of {name}. The filler is",
  "You've got a {name} here. What makes this one special is",
  "Nice find! The {name} is known for",
  "Ah, the classic {name}. This one stands out because",
  "Solid choice with the {name}. The blend features",
  "The {name} brings",
  "Here's a {name}. Expect",
  "Classic {name} right here. The profile includes",
];

const TONE_VARIATIONS = [
  "Write like a knowledgeable friend at a cigar lounge sharing what they love about this smoke.",
  "Write like a sommelier describing a fine wine — refined but approachable.",
  "Write with enthusiasm, like discovering a hidden gem you can't wait to share.",
  "Write casually and conversationally, like texting a buddy your honest take.",
  "Write like a seasoned aficionado giving insider tips to someone new to cigars.",
];

export function formatAssistantMessage(scanResult, nameHint = null) {
  const hintText = nameHint ? `They think it might be: "${nameHint}".` : "";
  
  const cigarName = nameHint || scanResult.fullName || 'this cigar';
  const randomStarter = DESCRIPTION_STARTERS[Math.floor(Math.random() * DESCRIPTION_STARTERS.length)]
    .replace('{name}', cigarName);
  const randomTone = TONE_VARIATIONS[Math.floor(Math.random() * TONE_VARIATIONS.length)];

  return `
A cigar band was scanned. Here's what the AI vision saw:
- Visible words: "${scanResult.fullName || 'N/A'}"
- Visual Description: "${scanResult.bandDescription || 'No detail provided'}"

${hintText}

Identify the best matching cigar from the attached cigar database. Use your knowledge to fill in any missing metadata. 

For the description:
${randomTone}

Personalize based on what cigar lovers typically care about:
- Suggest specific drink or food pairings when relevant
- Mention the cigar's origin story or regional roots if notable
- Highlight tasting notes and how they evolve during the smoke
- Note rarity, brand legacy, or aging potential if applicable

Do not repeat the band description — enrich their experience. 

Start with something like: "${randomStarter}..."

Keep it 100-140 words. Return only valid JSON as described in your instructions.
`;
}

export async function callAssistant(prompt, userId = 'anonymous') {
  try {
    console.log('🧵 Calling Assistant via secure proxy...');
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/openai/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        userId,
      }),
    }, 90000);

    const data = await response.json();
    
    // Handle rate limiting
    if (response.status === 429) {
      console.warn('⏱️ Rate limited:', data.error);
      return buildFallbackResponse(null, data.error || 'Too many requests. Please wait a moment.');
    }
    
    if (data.error) {
      console.error('❌ Assistant API error:', data.error);
      return buildFallbackResponse(null, `AI error: ${data.error}`);
    }

    const content = data.content || '';
    console.log('📦 Raw Assistant Response:', content.substring(0, 200));
    
    if (!content || content.trim().length === 0) {
      console.error('❌ Assistant returned empty content');
      return buildFallbackResponse(null, fallbackMessageFail());
    }
    
    const cleaned = cleanMarkdownCodeBlock(content);
    console.log('🧹 Cleaned content:', cleaned.substring(0, 200));
    const parsed = JSON.parse(cleaned);
    console.log('✅ Parsed JSON fullName:', parsed.fullName);
    return parsed;

  } catch (err) {
    console.error('❌ Assistant Error:', err.message || err);
    return buildFallbackResponse(null, fallbackMessageFail());
  }
}

function cleanMarkdownCodeBlock(text) {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim();
  }

  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim();
}


function buildFallbackResponse(scanResult = null, fallbackMessage) {
  return {
    fullName: scanResult?.fullName || 'Unknown Cigar',
    description: fallbackMessage,
    originCountry: '',
    wrapperType: '',
    strength: '',
    commonNotes: '',
    recommendedPairings: '',
    isFallback: true,
    errorMessage: fallbackMessage,
  };
}

function fallbackMessagePartial() {
  return "We couldn't identify this cigar with confidence just yet, but the Humi community is growing fast. Tap the 👎 icon to add it to the catalog and help us get better.";
}

function fallbackMessageFail() {
  return "We're still learning — and your help makes this better. Tap the 👎 icon to contribute this cigar to the Humi catalog.";
}
