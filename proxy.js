const http = require('http');
const httpProxy = require('http-proxy');
const fs = require('fs');
const path = require('path');

const METRO_URL = 'http://localhost:8081';

function serverFetchWithTimeout(url, options, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

// Stripe Configuration - Get credentials from Replit connection API
async function getStripeCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) {
    console.log('Stripe: No Replit connector available, using env vars');
    return {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      secretKey: process.env.STRIPE_SECRET_KEY
    };
  }

  try {
    const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
    const targetEnvironment = isProduction ? 'production' : 'development';
    
    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set('include_secrets', 'true');
    url.searchParams.set('connector_names', 'stripe');
    url.searchParams.set('environment', targetEnvironment);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    });

    const data = await response.json();
    const connectionSettings = data.items?.[0];

    if (connectionSettings?.settings?.publishable && connectionSettings?.settings?.secret) {
      console.log(`Stripe: Using ${targetEnvironment} credentials from Replit`);
      return {
        publishableKey: connectionSettings.settings.publishable,
        secretKey: connectionSettings.settings.secret
      };
    }
  } catch (error) {
    console.error('Stripe: Error fetching credentials:', error.message);
  }

  return { publishableKey: null, secretKey: null };
}

// Initialize Stripe client
let stripeClient = null;
let stripePublishableKey = null;

async function initStripe() {
  const { publishableKey, secretKey } = await getStripeCredentials();
  stripePublishableKey = publishableKey;
  
  if (secretKey) {
    const Stripe = require('stripe');
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2023-10-16'
    });
    console.log('Stripe: Client initialized successfully');
  } else {
    console.log('Stripe: No secret key available - checkout disabled');
  }
}

// Parse JSON body from request
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Send JSON response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// Handle API routes
async function handleApiRoute(req, res) {
  const url = req.url.split('?')[0];
  
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return true;
  }
  
  // Get Stripe publishable key
  if (url === '/api/stripe/publishable-key' && req.method === 'GET') {
    if (!stripePublishableKey) {
      return sendJson(res, 503, { error: 'Stripe not configured' });
    }
    return sendJson(res, 200, { publishableKey: stripePublishableKey });
  }
  
  // Create Checkout Session (redirect mode - legacy)
  if (url === '/api/stripe/create-checkout' && req.method === 'POST') {
    if (!stripeClient) {
      return sendJson(res, 503, { error: 'Stripe not configured' });
    }
    
    try {
      const body = await parseBody(req);
      const { priceId, userId, email, successUrl, cancelUrl } = body;
      
      if (!priceId) {
        return sendJson(res, 400, { error: 'priceId is required' });
      }
      
      // Create checkout session with session_id in success URL for verification
      const baseSuccessUrl = successUrl || `${req.headers.origin || 'https://humi.app'}/`;
      const baseCancelUrl = cancelUrl || `${req.headers.origin || 'https://humi.app'}/`;
      
      const session = await stripeClient.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1
        }],
        success_url: `${baseSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseCancelUrl}?canceled=true`,
        customer_email: email || undefined,
        metadata: {
          userId: userId || ''
        },
        subscription_data: {
          metadata: {
            userId: userId || ''
          }
        }
      });
      
      return sendJson(res, 200, { url: session.url, sessionId: session.id });
    } catch (error) {
      console.error('Stripe checkout error:', error.message);
      return sendJson(res, 500, { error: error.message });
    }
  }
  
  // Create Embedded Checkout Session (stays in-app)
  if (url === '/api/stripe/create-embedded-checkout' && req.method === 'POST') {
    if (!stripeClient) {
      return sendJson(res, 503, { error: 'Stripe not configured' });
    }
    
    try {
      const body = await parseBody(req);
      const { priceId, userId, email, referralCode } = body;
      
      if (!priceId) {
        return sendJson(res, 400, { error: 'priceId is required' });
      }
      
      const baseUrl = req.headers.origin || 'https://app.gethumi.co';
      const YEARLY_PRICE_ID = 'price_1Sn7T08EMAXqcROYGK2fyp4V';
      
      const sessionParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1
        }],
        ui_mode: 'embedded',
        return_url: `${baseUrl}/?checkout_complete=true&session_id={CHECKOUT_SESSION_ID}`,
        customer_email: email || undefined,
        metadata: {
          userId: userId || '',
          referralCode: referralCode || ''
        },
        subscription_data: {
          metadata: {
            userId: userId || '',
            referralCode: referralCode || ''
          }
        }
      };
      
      const isValidReferralFormat = referralCode && 
        typeof referralCode === 'string' && 
        referralCode.startsWith('HUMI-') && 
        referralCode.length === 11;
      
      const isAnnualPlan = priceId === YEARLY_PRICE_ID;
      
      if (isValidReferralFormat && isAnnualPlan) {
        sessionParams.discounts = [{ coupon: 'REFERRAL_10_OFF' }];
        console.log('Stripe: Applying referral discount for code:', referralCode);
      } else if (referralCode && !isAnnualPlan) {
        console.log('Stripe: Referral code only applies to annual plan, skipping discount');
      }
      
      const session = await stripeClient.checkout.sessions.create(sessionParams);
      
      return sendJson(res, 200, { 
        clientSecret: session.client_secret,
        sessionId: session.id 
      });
    } catch (error) {
      console.error('Stripe embedded checkout error:', error.message);
      return sendJson(res, 500, { error: error.message });
    }
  }
  
  // Get products and prices
  if (url === '/api/stripe/prices' && req.method === 'GET') {
    if (!stripeClient) {
      return sendJson(res, 503, { error: 'Stripe not configured' });
    }
    
    try {
      const prices = await stripeClient.prices.list({
        active: true,
        expand: ['data.product'],
        limit: 10
      });
      return sendJson(res, 200, { prices: prices.data });
    } catch (error) {
      console.error('Stripe prices error:', error.message);
      return sendJson(res, 500, { error: error.message });
    }
  }
  
  // Brave Search API - for HUMI Insights
  if (url === '/api/brave/search' && req.method === 'POST') {
    const braveApiKey = process.env.BRAVE_API_KEY;
    if (!braveApiKey) {
      return sendJson(res, 503, { error: 'Brave API not configured' });
    }
    
    try {
      const body = await parseBody(req);
      const { query } = body;
      
      if (!query) {
        return sendJson(res, 400, { error: 'query is required' });
      }
      
      const braveResponse = await serverFetchWithTimeout(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': braveApiKey
          }
        },
        15000
      );
      
      if (!braveResponse.ok) {
        throw new Error(`Brave API error: ${braveResponse.status}`);
      }
      
      const searchData = await braveResponse.json();
      return sendJson(res, 200, searchData);
    } catch (error) {
      console.error('Brave search error:', error.message);
      return sendJson(res, 500, { error: error.message });
    }
  }
  
  // Verify Stripe checkout session - SECURITY: Server-side verification with strict userId match
  // Also writes subscription to Firestore on successful verification (backend-controlled)
  if (url === '/api/stripe/verify-session' && req.method === 'POST') {
    if (!stripeClient) {
      return sendJson(res, 503, { error: 'Stripe not configured' });
    }
    
    try {
      const body = await parseBody(req);
      const { sessionId, userId } = body;
      
      if (!sessionId) {
        return sendJson(res, 400, { error: 'sessionId is required', verified: false });
      }
      
      if (!userId) {
        return sendJson(res, 400, { error: 'userId is required for verification', verified: false });
      }
      
      // Retrieve the session from Stripe to verify it's real and paid
      const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription']
      });
      
      // SECURITY: FAIL CLOSED - session MUST have metadata.userId and it MUST match
      const sessionUserId = session.metadata?.userId;
      if (!sessionUserId) {
        console.warn(`Session ${sessionId} missing metadata.userId - rejecting`);
        return sendJson(res, 403, { 
          error: 'Session missing user verification',
          verified: false 
        });
      }
      
      if (sessionUserId !== userId) {
        console.warn(`Session userId mismatch: expected ${userId}, got ${sessionUserId}`);
        return sendJson(res, 403, { 
          error: 'Session does not belong to this user',
          verified: false 
        });
      }
      
      // Check if the session is valid and payment was successful
      if (session.payment_status !== 'paid' && session.status !== 'complete') {
        return sendJson(res, 400, { 
          error: 'Payment not completed',
          verified: false 
        });
      }
      
      // Extract subscription details from Stripe
      const subscription = session.subscription;
      const plan = subscription?.items?.data?.[0]?.price?.recurring?.interval === 'year' 
        ? 'yearly' 
        : 'monthly';
      const trialEnd = subscription?.trial_end 
        ? new Date(subscription.trial_end * 1000) 
        : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const currentPeriodEnd = subscription?.current_period_end 
        ? new Date(subscription.current_period_end * 1000) 
        : null;
      
      // Send purchase webhook to GHL
      const ghlPurchaseWebhook = process.env.GHL_PURCHASE_WEBHOOK_URL;
      if (ghlPurchaseWebhook) {
        try {
          await fetch(ghlPurchaseWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'subscription_purchased',
              timestamp: new Date().toISOString(),
              user: {
                userId: sessionUserId,
                email: session.customer_email,
                plan: plan,
                subscriptionId: subscription?.id || null,
                trialEnd: trialEnd.toISOString(),
                currentPeriodEnd: currentPeriodEnd?.toISOString() || null,
                status: subscription?.status || 'trialing'
              }
            })
          });
          console.log('GHL purchase webhook sent for user:', sessionUserId);
        } catch (webhookErr) {
          console.error('GHL purchase webhook error:', webhookErr.message);
        }
      }
      
      // Return verified subscription data (client will use this to update local state)
      return sendJson(res, 200, { 
        verified: true,
        userId: sessionUserId,
        email: session.customer_email,
        plan: plan,
        subscriptionId: subscription?.id || null,
        trialEnd: trialEnd.toISOString(),
        currentPeriodEnd: currentPeriodEnd?.toISOString() || null,
        status: subscription?.status || 'trialing'
      });
    } catch (error) {
      console.error('Stripe verify session error:', error.message);
      return sendJson(res, 500, { error: error.message, verified: false });
    }
  }
  
  // ========== OpenAI API Proxy (secure server-side) ==========
  // Rate limiting: 3 requests per minute per user
  const RATE_LIMIT = 3;
  const RATE_WINDOW_MS = 60 * 1000; // 1 minute
  
  // In-memory rate limit store (resets on server restart)
  if (!global.openaiRateLimits) {
    global.openaiRateLimits = new Map();
  }
  
  // 3-layer API key failover system
  if (!global.openaiKeyIndex) {
    global.openaiKeyIndex = 0;
  }
  
  function getOpenAIKeys() {
    return [
      process.env.OPENAI_API_KEY,
      process.env.OPENAI_API_KEY2,
      process.env.OPENAI_API_KEY3,
    ].filter(k => k && k.trim());
  }
  
  async function callOpenAIWithFailover(url, options, maxRetries = 3) {
    const keys = getOpenAIKeys();
    if (keys.length === 0) {
      throw new Error('No OpenAI API keys configured');
    }
    
    let lastError = null;
    const startIndex = global.openaiKeyIndex;
    
    for (let attempt = 0; attempt < Math.min(maxRetries, keys.length); attempt++) {
      const keyIndex = (startIndex + attempt) % keys.length;
      const apiKey = keys[keyIndex];
      
      try {
        const fetchOptions = {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${apiKey}`,
          },
        };
        
        const response = await serverFetchWithTimeout(url, fetchOptions, 40000);
        const data = await response.json();
        
        if (data.error) {
          const errorCode = data.error.code || data.error.type || '';
          const errorMsg = data.error.message || '';
          
          if (errorCode === 'invalid_api_key' || 
              errorCode === 'insufficient_quota' ||
              errorMsg.includes('API key') ||
              errorMsg.includes('quota') ||
              response.status === 401 ||
              response.status === 429) {
            console.log(`OpenAI key ${keyIndex + 1} failed (${errorCode || response.status}), trying next...`);
            lastError = data.error;
            global.openaiKeyIndex = (keyIndex + 1) % keys.length;
            continue;
          }
          throw data.error;
        }
        
        global.openaiKeyIndex = keyIndex;
        return { data, keyIndex };
        
      } catch (error) {
        console.log(`OpenAI key ${keyIndex + 1} error:`, error.message);
        lastError = error;
        global.openaiKeyIndex = (keyIndex + 1) % keys.length;
      }
    }
    
    throw lastError || new Error('All OpenAI API keys failed');
  }
  
  function getOpenAIHeaders(apiKey, extraHeaders = {}) {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    };
  }
  
  function checkRateLimit(userId) {
    const now = Date.now();
    const userLimits = global.openaiRateLimits.get(userId) || { requests: [], windowStart: now };
    
    // Clean old requests outside the window
    userLimits.requests = userLimits.requests.filter(ts => now - ts < RATE_WINDOW_MS);
    
    if (userLimits.requests.length >= RATE_LIMIT) {
      const oldestRequest = userLimits.requests[0];
      const resetIn = Math.ceil((RATE_WINDOW_MS - (now - oldestRequest)) / 1000);
      return { allowed: false, resetIn };
    }
    
    userLimits.requests.push(now);
    global.openaiRateLimits.set(userId, userLimits);
    return { allowed: true, remaining: RATE_LIMIT - userLimits.requests.length };
  }
  
  // OpenAI Vision API - analyze cigar images
  if (url === '/api/openai/vision' && req.method === 'POST') {
    const keys = getOpenAIKeys();
    if (keys.length === 0) {
      return sendJson(res, 503, { error: 'OpenAI not configured' });
    }
    
    try {
      const body = await parseBody(req);
      const { base64Image, userId } = body;
      
      if (!base64Image) {
        return sendJson(res, 400, { error: 'base64Image is required' });
      }
      
      // Rate limit check
      const rateCheck = checkRateLimit(userId || 'anonymous');
      if (!rateCheck.allowed) {
        return sendJson(res, 429, { 
          error: `Rate limit exceeded. Try again in ${rateCheck.resetIn} seconds.`,
          resetIn: rateCheck.resetIn
        });
      }
      
      console.log('OpenAI Vision API called for user:', userId || 'anonymous');
      
      const { data: visionData, keyIndex } = await callOpenAIWithFailover(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        }
      );
      
      console.log(`OpenAI Vision success using key ${keyIndex + 1}`);
      const description = visionData.choices?.[0]?.message?.content || 'No visual detail returned';
      return sendJson(res, 200, { description, remaining: rateCheck.remaining });
      
    } catch (error) {
      console.error('OpenAI Vision proxy error:', error.message || error);
      return sendJson(res, 500, { error: error.message || 'Vision API error' });
    }
  }
  
  // OpenAI Chat Completion API - for HUMI Insights and other chat uses
  if (url === '/api/openai/chat' && req.method === 'POST') {
    const keys = getOpenAIKeys();
    if (keys.length === 0) {
      return sendJson(res, 503, { error: 'OpenAI not configured' });
    }
    
    try {
      const body = await parseBody(req);
      const { prompt, userId, model = 'gpt-4o-mini', maxTokens = 200 } = body;
      
      if (!prompt) {
        return sendJson(res, 400, { error: 'prompt is required' });
      }
      
      // Rate limit check (shared with other OpenAI endpoints)
      const rateCheck = checkRateLimit(userId || 'anonymous');
      if (!rateCheck.allowed) {
        return sendJson(res, 429, { 
          error: `Rate limit exceeded. Try again in ${rateCheck.resetIn} seconds.`,
          resetIn: rateCheck.resetIn
        });
      }
      
      console.log('OpenAI Chat API called for user:', userId || 'anonymous');
      
      const { data: chatData, keyIndex } = await callOpenAIWithFailover(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
          }),
        }
      );
      
      console.log(`OpenAI Chat success using key ${keyIndex + 1}`);
      const content = chatData.choices?.[0]?.message?.content || '';
      return sendJson(res, 200, { content, remaining: rateCheck.remaining });
      
    } catch (error) {
      console.error('OpenAI Chat proxy error:', error.message || error);
      return sendJson(res, 500, { error: error.message || 'Chat API error' });
    }
  }
  
  // OpenAI Responses API - unified cigar scan (image + file_search in one call)
  if (url === '/api/openai/scan' && req.method === 'POST') {
    console.log('📥 Scan route matched:', req.method, url);
    const keys = getOpenAIKeys();
    
    if (keys.length === 0) {
      return sendJson(res, 503, { error: 'OpenAI not configured' });
    }
    
    const VECTOR_STORE_ID = 'vs_683ce63a617c819184d6c5591c8ce6aa';
    const SYSTEM_INSTRUCTIONS = `You are a cigar identification expert. You will receive an image of a cigar band. Your job is to identify the cigar by matching it to an entry in the attached cigar database.

THE DATABASE STRUCTURE: The database is a JSON object where each top-level key is a brand name (e.g. "E.P. Carrillo", "Perdomo", "Oliva"). Under each brand you will find:
- "logo": a description of the brand's logo (may be null)
- "cigars": an array of cigar lines, where each item has:
  - "line": the cigar line name (e.g. "Allegiance", "Serie V Melanio")
  - "bandDescription": a visual description of the band (may be null)
  - "valuableDetail": notable achievements or awards (may be absent)

HOW TO IDENTIFY:
Step 1 — Read the band image: identify all visible text, colors, logos, and design elements.
Step 2 — Search the database using what you read from the band.
Step 3 — Find the single best matching entry: the brand key + line that most closely matches what you see. Use the bandDescription field to confirm your match when available.
Step 4 — If only one result comes back, use it. If multiple results come back, pick the best match using the band image details and bandDescription to decide.
Step 5 — Build fullName as exactly "[Brand] [Line]" using the brand key and line value from that one matched entry. Nothing else.

IMPORTANT: Some cigars in the database include a "valuableDetail" field with notable achievements, awards, or publication rankings (e.g. "#2 on the Cigar Snob Top 25 Cigars of 2025 List"). When this data is available for a matched cigar, you MUST weave it naturally into the humiBlurb and peopleSaying fields. For example, mention the ranking in the blurb and reference the recognition in what people are saying. If no valuableDetail exists, proceed normally.

Return your response as valid JSON in this exact format:

{
  "fullName": "",
  "humiBlurb": "",
  "peopleSaying": "",
  "originCountry": "",
  "wrapperType": "",
  "strength": "",
  "commonNotes": "",
  "recommendedPairings": ""
}

Field instructions:
- "fullName": EXACTLY "[Brand] [Line]" where Brand is the top-level key from the matched database entry and Line is the "line" field value from that same entry. Both MUST come from the SAME single database entry. Never use a brand name that is not in the database. Never combine a brand from one entry with a line from a different entry. Never use general knowledge to substitute or modify the brand or line name.
- "humiBlurb": A compelling 3-4 sentence paragraph that tells the cigar's story, origin, wrapper, strength, and key flavor notes. If the cigar has a valuableDetail (award, ranking, publication feature), lead with or prominently include that distinction. Write it like a knowledgeable friend at a cigar lounge — concise, opinionated, no filler. Combine what would normally be a description and tasting notes into one tight, high-value paragraph. Do NOT mention pairings or what reviewers say here.
- "peopleSaying": Write this like a knowledgeable friend sharing what the cigar community and reviews say about this cigar. Vary your opening naturally — rotate through phrasings like: "The word across reviews on this one is...", "Here's what reviewers and smokers tend to say...", "Based on reviews, the general take is...", "What keeps coming up in reviews about this cigar...", "The consensus from reviews and the community...", "From testimonials and lounge talk, the feedback is...", "Reviews consistently point to...", "What you'll hear from reviews and regulars...", "The reputation based on reviews...", "Across reviews and community feedback, where people land on it...". If the cigar has a valuableDetail, reference it naturally (e.g. "It earned #2 on Cigar Snob's Top 25 — and the reviews back it up..."). Include specific praise AND criticisms. Do NOT repeat flavor notes or cigar specs — that belongs in humiBlurb. This section is purely about the community's opinion and experience with this cigar.
- "originCountry": Country of origin
- "wrapperType": Wrapper leaf type
- "strength": mild, mild-medium, medium, medium-full, or full
- "commonNotes": Key flavor/aroma notes as a comma-separated list (e.g. "cedar, pepper, leather, dark chocolate")
- "recommendedPairings": 3-4 recommended pairings as a comma-separated list (e.g. "bourbon, espresso, dark chocolate")

ABSOLUTE RULE: The fullName must be constructed solely from one matched database entry — the top-level brand key + the "line" value from that entry, nothing else. If the database search returns results, your fullName MUST come from one of those entries exactly as written. If you are uncertain between two results, pick the one whose bandDescription or logo best matches the image. If no database results match at all, return only what you can read directly from the band image and flag the uncertainty in humiBlurb. Never invent, combine, or modify cigar names.

Only return valid JSON. Do not include any extra text outside the JSON object.`;
    
    try {
      const body = await parseBody(req);
      const { base64Image, mimeType, userId, descriptionPrompt } = body;
      
      if (!base64Image) {
        return sendJson(res, 400, { error: 'base64Image is required' });
      }
      
      const rateCheck = checkRateLimit(userId || 'anonymous');
      if (!rateCheck.allowed) {
        return sendJson(res, 429, { 
          error: `Rate limit exceeded. Try again in ${rateCheck.resetIn} seconds.`,
          resetIn: rateCheck.resetIn
        });
      }
      
      const imageMime = mimeType || 'image/jpeg';
      const responsesStartTime = Date.now();
      console.log('OpenAI Unified Scan called for user:', userId || 'anonymous', 'MIME:', imageMime, 'Base64 length:', base64Image.length);
      
      let lastError = null;
      const startIndex = global.openaiKeyIndex;
      
      for (let attempt = 0; attempt < keys.length; attempt++) {
        const keyIndex = (startIndex + attempt) % keys.length;
        const apiKey = keys[keyIndex];
        
        try {
          const fetchStart = Date.now();
          
          let promptText = descriptionPrompt || 'Identify this cigar from its band image. Search the cigar database for the best match.';
          if (!promptText.toLowerCase().includes('json')) {
            promptText += '\n\nReturn only valid JSON.';
          }
          
          const inputContent = [
            { type: 'input_image', image_url: `data:${imageMime};base64,${base64Image}`, detail: 'high' },
            { type: 'input_text', text: promptText }
          ];
          
          const responsesRes = await serverFetchWithTimeout('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              temperature: 0.55,
              instructions: SYSTEM_INSTRUCTIONS,
              input: [{
                role: 'user',
                content: inputContent
              }],
              tools: [{
                type: 'file_search',
                vector_store_ids: [VECTOR_STORE_ID],
                max_num_results: 5
              }],
              text: {
                format: { type: 'json_object' }
              }
            }),
          }, 60000);
          console.log(`OpenAI Unified Scan fetch took ${Date.now() - fetchStart}ms`);
          
          const responseData = await responsesRes.json();
          
          if (responseData.error) {
            const errorCode = responseData.error.code || responseData.error.type || '';
            const errorMsg = responseData.error.message || '';
            
            if (errorMsg.includes('image data') || errorMsg.includes('valid image') || errorMsg.includes('Could not process')) {
              console.error(`OpenAI Scan image rejected: ${errorMsg}`);
              throw new Error('The image could not be processed. Please try taking a clearer photo of the cigar band.');
            }
            
            if (errorCode === 'invalid_api_key' || 
                errorCode === 'insufficient_quota' ||
                errorMsg.includes('API key') ||
                errorMsg.includes('quota') ||
                responsesRes.status === 401 ||
                responsesRes.status === 429) {
              console.log(`OpenAI Scan key ${keyIndex + 1} failed (${errorCode || responsesRes.status}), trying next...`);
              global.openaiKeyIndex = (keyIndex + 1) % keys.length;
              lastError = responseData.error;
              continue;
            }
            throw new Error(errorMsg || 'Responses API error');
          }
          
          let content = '';
          if (responseData.output) {
            for (const item of responseData.output) {
              if (item.type === 'message' && item.content) {
                for (const part of item.content) {
                  if (part.type === 'output_text') {
                    content = part.text;
                    break;
                  }
                }
                if (content) break;
              }
            }
          }
          
          if (!content && responseData.output_text) {
            content = responseData.output_text;
          }
          
          if (!content) {
            console.log(`OpenAI Scan returned empty content. Full response:`, JSON.stringify(responseData).substring(0, 500));
            throw new Error('Scan returned empty content');
          }
          
          console.log(`OpenAI Unified Scan success using key ${keyIndex + 1} (total: ${Date.now() - responsesStartTime}ms)`);
          global.openaiKeyIndex = keyIndex;
          return sendJson(res, 200, { content, remaining: rateCheck.remaining });
          
        } catch (keyError) {
          console.log(`OpenAI Scan key ${keyIndex + 1} error:`, keyError.message);
          lastError = keyError;
          global.openaiKeyIndex = (keyIndex + 1) % keys.length;
        }
      }
      
      throw lastError || new Error('All OpenAI API keys failed');
      
    } catch (error) {
      console.error('OpenAI Unified Scan error:', error.message || error);
      return sendJson(res, 500, { error: error.message || 'Scan error' });
    }
  }
  
  // OpenAI Responses API - text-only cigar identification (reanalyze / manual name correction)
  if (url === '/api/openai/assistant' && req.method === 'POST') {
    const keys = getOpenAIKeys();
    
    if (keys.length === 0) {
      return sendJson(res, 503, { error: 'OpenAI not configured' });
    }
    
    const VECTOR_STORE_ID = 'vs_683ce63a617c819184d6c5591c8ce6aa';
    const SYSTEM_INSTRUCTIONS = `You are a cigar identification expert. When given a cigar name or description, your job is to match it to an entry in the attached cigar database and return structured data.

THE DATABASE STRUCTURE: The database is a JSON object where each top-level key is a brand name (e.g. "E.P. Carrillo", "Perdomo", "Oliva"). Under each brand you will find:
- "logo": a description of the brand's logo (may be null)
- "cigars": an array of cigar lines, where each item has:
  - "line": the cigar line name (e.g. "Allegiance", "Serie V Melanio")
  - "bandDescription": a visual description of the band (may be null)
  - "valuableDetail": notable achievements or awards (may be absent)

HOW TO IDENTIFY:
Step 1 — Search the database using the cigar name or description provided.
Step 2 — Find the single best matching entry: the brand key + line that most closely matches the input.
Step 3 — If only one result comes back, use it. If multiple results come back, pick the best match.
Step 4 — Build fullName as exactly "[Brand] [Line]" using the brand key and line value from that one matched entry. Nothing else.

IMPORTANT: Some cigars in the database include a "valuableDetail" field with notable achievements, awards, or publication rankings (e.g. "#2 on the Cigar Snob Top 25 Cigars of 2025 List"). When this data is available for a matched cigar, you MUST weave it naturally into the humiBlurb and peopleSaying fields. If no valuableDetail exists, proceed normally.

Return your response as valid JSON in this exact format:

{
  "fullName": "",
  "humiBlurb": "",
  "peopleSaying": "",
  "originCountry": "",
  "wrapperType": "",
  "strength": "",
  "commonNotes": "",
  "recommendedPairings": ""
}

Field instructions:
- "fullName": EXACTLY "[Brand] [Line]" where Brand is the top-level key from the matched database entry and Line is the "line" field value from that same entry. Both MUST come from the SAME single database entry. Never use a brand name that is not in the database. Never combine a brand from one entry with a line from a different entry. Never use general knowledge to substitute or modify the brand or line name.
- "humiBlurb": A compelling 3-4 sentence paragraph that tells the cigar's story, origin, wrapper, strength, and key flavor notes. If the cigar has a valuableDetail (award, ranking, publication feature), lead with or prominently include that distinction. Write it like a knowledgeable friend at a cigar lounge — concise, opinionated, no filler. Combine what would normally be a description and tasting notes into one tight, high-value paragraph. Do NOT mention pairings or what reviewers say here.
- "peopleSaying": Write this like a knowledgeable friend sharing what the cigar community and reviews say about this cigar. Vary your opening naturally — rotate through phrasings like: "The word across reviews on this one is...", "Here's what reviewers and smokers tend to say...", "Based on reviews, the general take is...", "What keeps coming up in reviews about this cigar...", "The consensus from reviews and the community...", "From testimonials and lounge talk, the feedback is...", "Reviews consistently point to...", "What you'll hear from reviews and regulars...", "The reputation based on reviews...", "Across reviews and community feedback, where people land on it...". If the cigar has a valuableDetail, reference it naturally (e.g. "It earned #2 on Cigar Snob's Top 25 — and the reviews back it up..."). Include specific praise AND criticisms. Do NOT repeat flavor notes or cigar specs — that belongs in humiBlurb. This section is purely about the community's opinion and experience with this cigar.
- "originCountry": Country of origin
- "wrapperType": Wrapper leaf type
- "strength": mild, mild-medium, medium, medium-full, or full
- "commonNotes": Key flavor/aroma notes as a comma-separated list (e.g. "cedar, pepper, leather, dark chocolate")
- "recommendedPairings": 3-4 recommended pairings as a comma-separated list (e.g. "bourbon, espresso, dark chocolate")

ABSOLUTE RULE: The fullName must be constructed solely from one matched database entry — the top-level brand key + the "line" value from that entry, nothing else. If the database search returns results, your fullName MUST come from one of those entries exactly as written. If you are uncertain between two results, pick the one that best matches the input description. If no database results match at all, return only the cigar name as provided and flag the uncertainty in humiBlurb. Never invent, combine, or modify cigar names.

Only return valid JSON. Do not include any extra text outside the JSON object.`;
    
    try {
      const body = await parseBody(req);
      const { prompt, userId } = body;
      
      if (!prompt) {
        return sendJson(res, 400, { error: 'prompt is required' });
      }
      
      const rateCheck = checkRateLimit(userId || 'anonymous');
      if (!rateCheck.allowed) {
        return sendJson(res, 429, { 
          error: `Rate limit exceeded. Try again in ${rateCheck.resetIn} seconds.`,
          resetIn: rateCheck.resetIn
        });
      }
      
      const responsesStartTime = Date.now();
      console.log('OpenAI Responses API (text) called for user:', userId || 'anonymous');
      
      let lastError = null;
      const startIndex = global.openaiKeyIndex;
      
      for (let attempt = 0; attempt < keys.length; attempt++) {
        const keyIndex = (startIndex + attempt) % keys.length;
        const apiKey = keys[keyIndex];
        
        try {
          const fetchStart = Date.now();
          const responsesRes = await serverFetchWithTimeout('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              temperature: 0.55,
              instructions: SYSTEM_INSTRUCTIONS,
              input: prompt + '\n\nRespond with valid JSON only.',
              tools: [{
                type: 'file_search',
                vector_store_ids: [VECTOR_STORE_ID],
                max_num_results: 5
              }],
              text: {
                format: { type: 'json_object' }
              }
            }),
          }, 60000);
          console.log(`OpenAI Responses API (text) fetch took ${Date.now() - fetchStart}ms`);
          
          const responseData = await responsesRes.json();
          
          if (responseData.error) {
            const errorCode = responseData.error.code || responseData.error.type || '';
            const errorMsg = responseData.error.message || '';
            
            if (errorCode === 'invalid_api_key' || 
                errorCode === 'insufficient_quota' ||
                errorMsg.includes('API key') ||
                errorMsg.includes('quota') ||
                responsesRes.status === 401 ||
                responsesRes.status === 429) {
              console.log(`OpenAI Responses key ${keyIndex + 1} failed (${errorCode || responsesRes.status}), trying next...`);
              global.openaiKeyIndex = (keyIndex + 1) % keys.length;
              lastError = responseData.error;
              continue;
            }
            throw new Error(errorMsg || 'Responses API error');
          }
          
          let content = '';
          if (responseData.output) {
            for (const item of responseData.output) {
              if (item.type === 'message' && item.content) {
                for (const part of item.content) {
                  if (part.type === 'output_text') {
                    content = part.text;
                    break;
                  }
                }
                if (content) break;
              }
            }
          }
          
          if (!content && responseData.output_text) {
            content = responseData.output_text;
          }
          
          if (!content) {
            console.log(`OpenAI Responses API returned empty content. Full response:`, JSON.stringify(responseData).substring(0, 500));
            throw new Error('Responses API returned empty content');
          }
          
          console.log(`OpenAI Responses API (text) success using key ${keyIndex + 1} (total: ${Date.now() - responsesStartTime}ms)`);
          global.openaiKeyIndex = keyIndex;
          return sendJson(res, 200, { content, remaining: rateCheck.remaining });
          
        } catch (keyError) {
          console.log(`OpenAI Responses key ${keyIndex + 1} error:`, keyError.message);
          lastError = keyError;
          global.openaiKeyIndex = (keyIndex + 1) % keys.length;
        }
      }
      
      throw lastError || new Error('All OpenAI API keys failed');
      
    } catch (error) {
      console.error('OpenAI Responses API proxy error:', error.message || error);
      return sendJson(res, 500, { error: error.message || 'Responses API error' });
    }
  }
  
  return false; // Not an API route
}

const proxy = httpProxy.createProxyServer({
  target: METRO_URL,
  ws: true,
  changeOrigin: true
});

const waitingPage = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>HUMI - Digital Cigar Lounge</title>
  <meta name="theme-color" content="#8B4513">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="HUMI">
  <link rel="manifest" href="/manifest.json">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      text-align: center;
      padding: 40px;
    }
    h1 {
      font-size: 48px;
      margin-bottom: 20px;
      background: linear-gradient(90deg, #c4a35a, #d4af37);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(196, 163, 90, 0.3);
      border-top-color: #c4a35a;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 30px auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    p {
      color: #aaa;
      font-size: 16px;
      margin-bottom: 10px;
    }
    .status {
      color: #c4a35a;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>HUMI</h1>
    <div class="spinner"></div>
    <p>Starting the Digital Cigar Lounge...</p>
    <p class="status">Preparing your experience, this takes about 15-20 seconds</p>
  </div>
  <script>
    let checkCount = 0;
    const maxChecks = 60;
    
    async function checkServer() {
      checkCount++;
      if (checkCount > maxChecks) {
        document.querySelector('.status').textContent = 'Taking longer than expected. Please refresh the page.';
        return;
      }
      
      try {
        const response = await fetch('/', { method: 'HEAD', cache: 'no-store' });
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && !contentType.includes('text/html')) {
          window.location.reload();
          return;
        }
        if (response.ok && contentType.includes('text/html')) {
          const text = await fetch('/').then(r => r.text());
          if (!text.includes('Starting the Digital Cigar Lounge')) {
            window.location.reload();
            return;
          }
        }
      } catch (e) {}
      
      setTimeout(checkServer, 1000);
    }
    
    setTimeout(checkServer, 2000);
  </script>
</body>
</html>
`;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.css': 'text/css',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json'
};

const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
const DIST_DIR = path.join(__dirname, 'dist');

function serveStaticFile(filePath, res) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      return false;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400'
    });
    res.end(data);
    return true;
  });
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  
  // Health check endpoint
  if (url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ status: 'ok', version: 'v4-diagnostic', routes: ['/api/openai/scan', '/api/openai/assistant', '/api/openai/vision', '/api/openai/chat', '/api/stripe/*', '/api/brave/search'], isProduction, timestamp: Date.now() }));
    return;
  }

  // Handle API routes first
  if (url.startsWith('/api/')) {
    try {
      const handled = await handleApiRoute(req, res);
      if (handled !== false) return;
      console.error('Unhandled API route:', req.method, url);
      sendJson(res, 404, { error: `API route not found: ${req.method} ${url}` });
      return;
    } catch (apiError) {
      console.error('API route handler crashed:', req.method, url, apiError.message);
      sendJson(res, 500, { error: `Server error: ${apiError.message}` });
      return;
    }
  }
  
  // Proxy Firebase Auth routes to Firebase's auth handler (fixes Safari/iOS PWA third-party cookie issue)
  if (url.startsWith('/__/auth/')) {
    const https = require('https');
    const firebaseProjectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'humi-75da3';
    const targetUrl = `https://${firebaseProjectId}.firebaseapp.com${req.url}`;
    
    const proxyReq = https.request(targetUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: `${firebaseProjectId}.firebaseapp.com`
      }
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      console.error('Firebase auth proxy error:', err);
      res.writeHead(502);
      res.end('Bad Gateway');
    });
    
    req.pipe(proxyReq);
    return;
  }
  
  if (url === '/manifest.json') {
    const filePath = isProduction
      ? path.join(DIST_DIR, 'manifest.json')
      : path.join(__dirname, 'public', 'manifest.json');
    if (fs.existsSync(filePath)) {
      return serveStaticFile(filePath, res);
    }
  }
  
  // Service worker must never be cached by the browser
  if (url === '/service-worker.js') {
    const filePath = isProduction
      ? path.join(DIST_DIR, 'service-worker.js')
      : path.join(__dirname, 'public', 'service-worker.js');
    if (fs.existsSync(filePath)) {
      fs.readFile(filePath, (err, data) => {
        if (err) return;
        res.writeHead(200, {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        res.end(data);
      });
      return true;
    }
  }
  
  // Version check file must never be cached
  if (url === '/version.json') {
    const filePath = isProduction 
      ? path.join(DIST_DIR, 'version.json')
      : path.join(__dirname, 'public', 'version.json');
    if (fs.existsSync(filePath)) {
      fs.readFile(filePath, (err, data) => {
        if (err) return;
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        res.end(data);
      });
      return true;
    }
  }
  
  // In production, serve static files from dist folder
  if (isProduction) {
    let filePath = path.join(DIST_DIR, url);
    
    // Handle root path
    if (url === '/') {
      filePath = path.join(DIST_DIR, 'index.html');
    }
    
    // Check if file exists
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      
      // Set cache headers based on file type
      let cacheControl = 'public, max-age=31536000'; // 1 year for assets
      if (ext === '.html') {
        cacheControl = 'no-cache, no-store, must-revalidate';
      }
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Internal Server Error');
          return;
        }
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': cacheControl
        });
        res.end(data);
      });
      return;
    }
    
    // SPA fallback - serve index.html for all routes
    const indexPath = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      fs.readFile(indexPath, (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Internal Server Error');
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(data);
      });
      return;
    }
    
    res.writeHead(404);
    res.end('Not Found');
    return;
  }
  
  proxy.web(req, res);
});

server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head);
});

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err.message);
  if (res.writeHead) {
    res.writeHead(200, { 
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(waitingPage);
  }
});

// Initialize and start server
(async () => {
  await initStripe();
  
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log('HUMI Digital Cigar Lounge');
    console.log('Reverse proxy listening on http://0.0.0.0:5000');
    console.log('Forwarding to Expo web server at http://localhost:8081');
    console.log('PWA manifest available at /manifest.json');
    console.log('Service worker available at /service-worker.js');
    console.log('Stripe API available at /api/stripe/*');
  });
})();
