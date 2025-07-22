import Constants from 'expo-constants';
const { OPENAI_API_KEY, ASSISTANT_ID } = Constants.expoConfig.extra;

console.log('🧠 Keys:', OPENAI_API_KEY, ASSISTANT_ID);


export async function analyzeCigarImage(imageUri, userId = 'anonymous', userInterests = [], nameHint = null) {
  try {
    const base64Image = await convertImageToBase64(imageUri);
    console.log('🖼️ Base64 Image Length:', base64Image.length);

    // Step 1: Vision
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
    const bandDescription = visionData.choices?.[0]?.message?.content || 'No visual detail returned';
    const fullName = extractProbableCigarName(bandDescription);
    console.log('📷 Vision Description:', bandDescription);
    const visionResult = { fullName, bandDescription };

    // Step 2: Assistant
    const prompt = formatAssistantMessage(visionResult, userInterests, nameHint);
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
  const match = description.match(/(?:says|reads|label says)\s[‘"“”']?([A-Za-z0-9\s\-]+)[’"“”']?/i);
  return match ? match[1].trim() : '';
}

export function formatAssistantMessage(scanResult, interests = [], nameHint = null) {
  const interestText = interests.length ? `The smoker is interested in: ${interests.join(", ")}.` : `No specific interests were noted.`;
  const hintText = nameHint ? `They think it might be: "${nameHint}".` : "";

  return `
A cigar band was scanned. Here’s what the AI vision saw:
- Visible words: "${scanResult.fullName || 'N/A'}"
- Visual Description: "${scanResult.bandDescription || 'No detail provided'}"

${interestText}
${hintText}

Identify the best matching cigar from the attached cigar database. Use your knowledge to fill in any missing metadata. For the description:
Write in a modern, friendly, conversational tone — like a cigar lounge regular sharing wisdom. 

Personalize the description based on the user’s interests and make it sound like you are helping them feel good about the decision:

- If they're into **Pairings**, suggest specific drink or food pairings.
- If they like **History & Culture**, mention the cigar’s origin story or regional roots.
- If they care about **Flavor Profiles**, highlight tasting notes and how they evolve during the smoke.
- If they’re a **Collector**, mention rarity, brand legacy, or aging potential.

Speak to what matters to them. Do not repeat the band description — enrich their cigar experience. 120 words or less. Start each description with something like:

- "You have the.... You can expect... "
- "Looks like you're holding the... The interesting thing to note is...."
- "Ah, you have the... A great pairing with this would be...."
- "The {cigar name} is a great choice because... You should add this because..."

120 words or less. Return only valid JSON as described in your instructions.
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
        // user_id: userId,
        // response_format: 'auto',
      }),
    });

    const run = await runRes.json();
    console.log('🔁 Run ID:', run.id);

    let runStatus = null;
    let attempts = 0;

    // Wait for assistant to finish
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

    // Get final message
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
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/i); // ✅ Extract only what's inside
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim();
  }

  // fallback: remove loose triple backticks
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
  return "We couldn’t identify this cigar with confidence just yet, but the Humi community is growing fast. Tap the 👎 icon to add it to the catalog and help us get better.";
}

function fallbackMessageFail() {
  return "We’re still learning — and your help makes this better. Tap the 👎 icon to contribute this cigar to the Humi catalog.";
}
