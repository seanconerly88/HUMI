import Constants from 'expo-constants';

const getKeys = () => {
  const extra = Constants.expoConfig?.extra || {};
  return {
    OPENAI_API_KEY: extra.OPENAI_API_KEY || process.env.OPENAI_API_KEY || null,
    ASSISTANT_ID: extra.ASSISTANT_ID || process.env.ASSISTANT_ID || null,
    BRAVE_API_KEY: extra.BRAVE_API_KEY || process.env.BRAVE_API_KEY || null,
  };
};

const { OPENAI_API_KEY, ASSISTANT_ID, BRAVE_API_KEY } = getKeys();


export async function analyzeCigarImage(
  imageUri,
  userId = 'anonymous',
  nameHint = null,
  isReanalyzeMode = false
) {
  try {
    console.log('🚀 analyzeCigarImage called');
    console.log('🔑 API Key available:', !!OPENAI_API_KEY);
    
    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY is not configured!');
      return buildFallbackResponse(null, 'AI analysis unavailable - API key not configured');
    }

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

    console.log('🔍 Calling Vision API...');
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe the cigar band shown in the image, including all visible words, symbols, colors, and layout.' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'high' } },
            ],
          },
        ],
      }),
    });

    const visionData = await visionResponse.json();
    console.log('📡 Vision API response status:', visionResponse.status);
    
    if (visionData.error) {
      console.error('❌ Vision API error:', visionData.error);
      return buildFallbackResponse(null, `AI error: ${visionData.error.message || 'Unknown error'}`);
    }
    
    const bandDescription = visionData.choices?.[0]?.message?.content || 'No visual detail returned';
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
  const headers = {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v2',
  };

  try {
    console.log('🧵 Creating thread...');
    const threadRes = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    const thread = await threadRes.json();
    console.log('📌 Thread ID:', thread.id);

    console.log('💬 Sending message...');
    await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ role: 'user', content: prompt }),
    });

    console.log('🏃 Starting assistant run...');
    const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
      }),
    });

    const run = await runRes.json();
    console.log('🔁 Run ID:', run.id);

    let runStatus = null;
    let attempts = 0;

    do {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;

      const statusRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers,
      });
      runStatus = await statusRes.json();
      console.log(`⏳ Attempt ${attempts} – Status: ${runStatus.status}`);
    } while (runStatus.status !== 'completed' && runStatus.status !== 'failed');

    if (runStatus.status === 'failed') {
      throw new Error('Assistant run failed');
    }

    const msgRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers,
    });
    const msgList = await msgRes.json();
    const content = msgList.data?.[0]?.content?.[0]?.text?.value || '';

    console.log('📦 Raw Assistant Response:', content);
    const cleaned = cleanMarkdownCodeBlock(content);
    const parsed = JSON.parse(cleaned);
    console.log('✅ Parsed JSON:', parsed);
    return parsed;

  } catch (err) {
    console.error('❌ Assistant Error:', err);
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
  };
}

function fallbackMessagePartial() {
  return "We couldn't identify this cigar with confidence just yet, but the Humi community is growing fast. Tap the 👎 icon to add it to the catalog and help us get better.";
}

function fallbackMessageFail() {
  return "We're still learning — and your help makes this better. Tap the 👎 icon to contribute this cigar to the Humi catalog.";
}

export { BRAVE_API_KEY, OPENAI_API_KEY };
