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
  const timer = setTimeout(() => {
    console.warn(`⏱️ Fetch timeout after ${timeoutMs / 1000}s for ${url}`);
    controller.abort();
  }, timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .then(response => {
      clearTimeout(timer);
      return response;
    })
    .catch(err => {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
      }
      throw err;
    });
};

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

function buildDescriptionPrompt(nameHint = null) {
  const cigarName = nameHint || 'this cigar';
  const randomStarter = DESCRIPTION_STARTERS[Math.floor(Math.random() * DESCRIPTION_STARTERS.length)]
    .replace('{name}', cigarName);
  const randomTone = TONE_VARIATIONS[Math.floor(Math.random() * TONE_VARIATIONS.length)];

  const hintText = nameHint ? `The user thinks this might be: "${nameHint}".` : "";

  return `Look at the cigar band in the image. Identify all visible text, logos, colors, and design elements. Then search the cigar database for the best match.

${hintText}

For the description:
${randomTone}

Personalize based on what cigar lovers typically care about:
- Suggest specific drink or food pairings when relevant
- Mention the cigar's origin story or regional roots if notable
- Highlight tasting notes and how they evolve during the smoke
- Note rarity, brand legacy, or aging potential if applicable

Do not just describe the band — enrich their experience.

Start with something like: "${randomStarter}..."

Keep it 100-140 words. Return only valid JSON.`;
}

export async function analyzeCigarImage(
  imageUri,
  userId = 'anonymous',
  nameHint = null,
  isReanalyzeMode = false
) {
  try {
    console.log('🚀 analyzeCigarImage called (unified scan mode)');

    if (isReanalyzeMode && nameHint) {
      console.log("♻️ Reanalyze mode active. Using text-only endpoint.");

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

    const { base64Data, mimeType } = await convertImageToBase64(imageUri);
    console.log('🖼️ Base64 Image Length:', base64Data.length, 'MIME:', mimeType);

    console.log('🔍 Calling Unified Scan API...');
    console.log('🌐 API Base URL:', API_BASE_URL);
    const scanStartTime = Date.now();
    
    const descriptionPrompt = buildDescriptionPrompt(nameHint);
    
    const scanResponse = await fetchWithTimeout(`${API_BASE_URL}/api/openai/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Image: base64Data,
        mimeType,
        userId,
        descriptionPrompt,
      }),
    }, 60000);

    const scanData = await scanResponse.json();
    console.log(`📡 Scan response status: ${scanResponse.status} (${Date.now() - scanStartTime}ms)`);
    
    if (scanResponse.status === 429) {
      console.warn('⏱️ Rate limited:', scanData.error);
      return buildFallbackResponse(null, scanData.error || 'Too many requests. Please wait a moment.');
    }
    
    if (scanData.error) {
      console.error('❌ Scan API error:', scanData.error);
      return buildFallbackResponse(null, `AI error: ${scanData.error}`);
    }

    const content = scanData.content || '';
    console.log('📦 Raw Scan Response:', content.substring(0, 200));
    
    if (!content || content.trim().length === 0) {
      console.error('❌ Scan returned empty content');
      return buildFallbackResponse(null, fallbackMessageFail());
    }
    
    const cleaned = cleanMarkdownCodeBlock(content);
    const parsed = JSON.parse(cleaned);
    console.log('✅ Parsed scan result:', parsed.fullName);
    return parsed;

  } catch (err) {
    const errorMsg = err.message || String(err);
    console.error('🚨 Error in analyzeCigarImage:', errorMsg);
    if (errorMsg.includes('timed out')) {
      return buildFallbackResponse(null, 'The scan took too long. Please try again — it usually works on the second attempt.');
    }
    if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('network')) {
      return buildFallbackResponse(null, 'Network error — please check your connection and try again.');
    }
    return buildFallbackResponse(null, fallbackMessageFail());
  }
}


async function convertImageToBase64(uri) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const mimeMatch = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const base64Data = dataUrl.split(',')[1];
      console.log('Image MIME type detected:', mimeType, 'Base64 length:', base64Data.length);
      resolve({ base64Data, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

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
    const assistantStartTime = Date.now();
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/openai/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        userId,
      }),
    }, 60000);

    const data = await response.json();
    console.log(`📡 Assistant response (${Date.now() - assistantStartTime}ms)`);
    
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
