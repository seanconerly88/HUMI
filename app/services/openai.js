// openai.js (Expo-compatible, using fetch instead of Node SDK)

const OPENAI_API_KEY = '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';
const ASSISTANT_ID = 'asst_wXgdBhlVibDMLbCmKLMjFvty';

export async function analyzeCigarImage(imageUri, userId = 'anonymous', userInterests = [], nameHint = null) {
  try {
    const base64Image = await convertImageToBase64(imageUri);

    // Step 1: Vision API
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
              { type: 'text', text: 'Describe the cigar band shown in the image, including all visible words, symbols, colors, and layout. Focus on descriptive detail — not just brand name.' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'high' } },
            ],
          },
        ],
      }),
    });

    const visionData = await visionResponse.json();
    const bandDescription = visionData.choices?.[0]?.message?.content || 'No visual detail returned';
    const fullName = extractProbableCigarName(bandDescription);
    const visionResult = { fullName, bandDescription };

    // Step 2: Assistant Prompt
    const prompt = formatAssistantMessage(visionResult, userInterests, nameHint);
    const aiResponse = await callAssistant(prompt, userId);

    if (aiResponse?.fullName && aiResponse?.description) return aiResponse;
    return buildFallbackResponse(visionResult, fallbackMessagePartial());
  } catch (err) {
    console.error('Vision or Assistant Error:', err);
    return buildFallbackResponse(null, fallbackMessageFail());
  }
}

async function convertImageToBase64(uri) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const reader = new FileReader();
  return await new Promise((resolve, reject) => {
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
  const hintText = nameHint ? `They think it might be: \"${nameHint}\".` : "";

  return `
A cigar band was scanned. Here’s what the AI vision saw:
- Visible words: \"${scanResult.fullName || 'N/A'}\"
- Visual Description: \"${scanResult.bandDescription || 'No detail provided'}\"

${interestText}
${hintText}

Identify the best matching cigar from the attached cigar database. Use your knowledge to fill in any missing metadata. Return only valid JSON as described in your instructions.
  `;
}

export async function callAssistant(message, userId = 'anonymous') {
  const thread = await fetch('https://api.openai.com/v1/threads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
  }).then(res => res.json());

  await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'user', content: message }),
  });

  const run = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assistant_id: ASSISTANT_ID,
      user_id: userId,
      response_format: "json_object"
    }),
  }).then(res => res.json());


  let runStatus = null;
  do {
    await new Promise(r => setTimeout(r, 1000));
    runStatus = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    }).then(res => res.json());
  } while (runStatus.status !== 'completed');

  const messages = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
  }).then(res => res.json());

  const content = messages.data?.[0]?.content?.[0]?.text?.value;
  console.log('Raw Assistant response:', content);


  try {
    return JSON.parse(content);
  } catch (e) {
    console.error('Assistant returned non-JSON:', content);
    return buildFallbackResponse(null, fallbackMessageFail());
  }
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
