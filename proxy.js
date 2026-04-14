const http = require('http');
const httpProxy = require('http-proxy');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Firebase Admin — used server-side to bypass Firestore security rules
let adminDb = null;
try {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  adminDb = admin.firestore();
  console.log('Firebase Admin: initialized');
} catch (e) {
  console.warn('Firebase Admin: failed to initialize -', e.message);
}

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
      const baseSuccessUrl = successUrl || `${req.headers.origin || 'https://app.gethumi.co'}/`;
      const baseCancelUrl = cancelUrl || `${req.headers.origin || 'https://app.gethumi.co'}/`;
      
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
  
  // Brand Spotlights — served via admin SDK to bypass Firestore client security rules
  if (url === '/api/spotlights' && req.method === 'GET') {
    try {
      if (!adminDb) return sendJson(res, 503, { error: 'Admin DB not available', spotlights: [] });
      const snap = await adminDb.collection('brandSpotlights').where('active', '==', true).get();
      const spotlights = snap.docs.map(d => d.data());
      return sendJson(res, 200, { spotlights });
    } catch (e) {
      console.error('Spotlights error:', e.message);
      return sendJson(res, 500, { error: e.message, spotlights: [] });
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
Step 1 — Read the band image: focus first on the BRAND NAME — it is usually the largest, most prominent text on the band. Also note any secondary text, colors, logos, and design elements.
Step 2 — Extract the brand name you can read with confidence. This brand name is your primary search key. You do NOT need to read the full cigar line name from the image — the brand alone is enough to find the match.
Step 3 — Search the database using that brand name.
Step 4 — Evaluate what the search returns:
  • EXACTLY ONE entry for that brand → that IS the cigar. Line name confirmation from the image is NOT required. The brand match alone is sufficient. Return it at confidence 85.
  • MULTIPLE entries for that brand → use any additional visible band text, colors, logo details, and each entry's bandDescription to pick the best line match. Return the best match at confidence 65-80.
  • NO matching entries found → set fullName to "Unknown Cigar" and confidence to 0.
Step 5 — Build fullName as exactly "[Brand] [Line]" using the brand key and line value from the matched database entry. Nothing else.

IMPORTANT: Some cigars in the database include a "valuableDetail" field with notable achievements, awards, or publication rankings (e.g. "#2 on the Cigar Snob Top 25 Cigars of 2025 List"). When this data is available for a matched cigar, you MUST weave it naturally into the humiBlurb and peopleSaying fields. For example, mention the ranking in the blurb and reference the recognition in what people are saying. If no valuableDetail exists, proceed normally.

Return your response as valid JSON in this exact format:

{
  "cigarBrand": "",
  "fullName": "",
  "confidence": 0,
  "humiBlurb": "",
  "peopleSaying": "",
  "originCountry": "",
  "wrapperType": "",
  "strength": "",
  "commonNotes": "",
  "recommendedPairings": ""
}

Field instructions:
- "cigarBrand": The EXACT top-level brand key from the matched database entry (e.g. "Guido", "E.P. Carrillo", "Perdomo"). This must be just the brand key, not the full name. Leave empty string if Unknown Cigar.
- "fullName": EXACTLY "[Brand] [Line]" where Brand is the top-level key from the matched database entry and Line is the "line" field value from that same entry. Both MUST come from the SAME single database entry. Never use a brand name that is not in the database. Never combine a brand from one entry with a line from a different entry. Never use general knowledge to substitute or modify the brand or line name.
- "confidence": An integer from 0 to 100. Score using this logic — 90-100: you found an exact match and can confirm both brand AND line name from the band text/logo; 85: you can clearly read the brand name from the band and the database returned exactly ONE entry for that brand (line name confirmation from the image is NOT needed — the single-entry match is sufficient); 65-80: you can read the brand but the database has multiple entries for it, and you selected the best matching line using visual details and bandDescription; 40-64: brand is partially readable or ambiguous but you found a plausible match; 0-39: could not reliably identify the brand at all, or no database results found. If fullName is "Unknown Cigar", confidence MUST be 0.
- "humiBlurb": A compelling 3-4 sentence paragraph that tells the cigar's story, origin, wrapper, strength, and key flavor notes. If the cigar has a valuableDetail (award, ranking, publication feature), lead with or prominently include that distinction. Write it like a knowledgeable friend at a cigar lounge — concise, opinionated, no filler. Combine what would normally be a description and tasting notes into one tight, high-value paragraph. Do NOT mention pairings or what reviewers say here.
- "peopleSaying": Write this like a knowledgeable friend sharing what the cigar community and reviews say about this cigar. Vary your opening naturally — rotate through phrasings like: "The word across reviews on this one is...", "Here's what reviewers and smokers tend to say...", "Based on reviews, the general take is...", "What keeps coming up in reviews about this cigar...", "The consensus from reviews and the community...", "From testimonials and lounge talk, the feedback is...", "Reviews consistently point to...", "What you'll hear from reviews and regulars...", "The reputation based on reviews...", "Across reviews and community feedback, where people land on it...". If the cigar has a valuableDetail, reference it naturally (e.g. "It earned #2 on Cigar Snob's Top 25 — and the reviews back it up..."). Include specific praise AND criticisms. Do NOT repeat flavor notes or cigar specs — that belongs in humiBlurb. This section is purely about the community's opinion and experience with this cigar.
- "originCountry": Country of origin
- "wrapperType": Wrapper leaf type
- "strength": mild, mild-medium, medium, medium-full, or full
- "commonNotes": Key flavor/aroma notes as a comma-separated list (e.g. "cedar, pepper, leather, dark chocolate")
- "recommendedPairings": 3-4 recommended pairings as a comma-separated list (e.g. "bourbon, espresso, dark chocolate")

ABSOLUTE RULE: The fullName must be constructed solely from one matched database entry — the top-level brand key + the "line" value from that entry, nothing else. If the database search returns results, your fullName MUST come from one of those entries exactly as written. If you are uncertain between two results, pick the one whose bandDescription or logo best matches the image. If no database results match at all, set fullName to "Unknown Cigar" and confidence to 0. Never invent, combine, or modify cigar names.

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
Step 3 — If only one result comes back, use it. If multiple results come back, pick the best match using the bandDescription and logo fields to decide.
Step 4 — Build fullName as exactly "[Brand] [Line]" using the brand key and line value from that one matched entry. Nothing else.

IMPORTANT: Some cigars in the database include a "valuableDetail" field with notable achievements, awards, or publication rankings (e.g. "#2 on the Cigar Snob Top 25 Cigars of 2025 List"). When this data is available for a matched cigar, you MUST weave it naturally into the humiBlurb and peopleSaying fields. If no valuableDetail exists, proceed normally.

Return your response as valid JSON in this exact format:

{
  "fullName": "",
  "confidence": 0,
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
- "confidence": An integer from 0 to 100 representing how certain you are this is the correct cigar. Score as follows — 90-100: exact database match with full name/line confirmed; 70-89: strong match but minor uncertainty; 40-69: possible match — brand is recognizable but the specific line is ambiguous or you are choosing between candidates; 0-39: very uncertain, could not identify the brand, or no database results found. If fullName is "Unknown Cigar", confidence MUST be 0.
- "humiBlurb": A compelling 3-4 sentence paragraph that tells the cigar's story, origin, wrapper, strength, and key flavor notes. If the cigar has a valuableDetail (award, ranking, publication feature), lead with or prominently include that distinction. Write it like a knowledgeable friend at a cigar lounge — concise, opinionated, no filler. Combine what would normally be a description and tasting notes into one tight, high-value paragraph. Do NOT mention pairings or what reviewers say here.
- "peopleSaying": Write this like a knowledgeable friend sharing what the cigar community and reviews say about this cigar. Vary your opening naturally — rotate through phrasings like: "The word across reviews on this one is...", "Here's what reviewers and smokers tend to say...", "Based on reviews, the general take is...", "What keeps coming up in reviews about this cigar...", "The consensus from reviews and the community...", "From testimonials and lounge talk, the feedback is...", "Reviews consistently point to...", "What you'll hear from reviews and regulars...", "The reputation based on reviews...", "Across reviews and community feedback, where people land on it...". If the cigar has a valuableDetail, reference it naturally (e.g. "It earned #2 on Cigar Snob's Top 25 — and the reviews back it up..."). Include specific praise AND criticisms. Do NOT repeat flavor notes or cigar specs — that belongs in humiBlurb. This section is purely about the community's opinion and experience with this cigar.
- "originCountry": Country of origin
- "wrapperType": Wrapper leaf type
- "strength": mild, mild-medium, medium, medium-full, or full
- "commonNotes": Key flavor/aroma notes as a comma-separated list (e.g. "cedar, pepper, leather, dark chocolate")
- "recommendedPairings": 3-4 recommended pairings as a comma-separated list (e.g. "bourbon, espresso, dark chocolate")

ABSOLUTE RULE: The fullName must be constructed solely from one matched database entry — the top-level brand key + the "line" value from that entry, nothing else. If the database search returns results, your fullName MUST come from one of those entries exactly as written. If you are uncertain between two results, pick the one that best matches the input description. If no database results match at all, set fullName to "Unknown Cigar" and confidence to 0. Never invent, combine, or modify cigar names.

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
  
  // ========== Lounges: Google Places Search ==========
  if (url === '/api/lounges/search' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { query, lat, lng, radiusMeters = 16093 } = body;
      const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!MAPS_KEY) return sendJson(res, 500, { error: 'Maps API key not configured' });

      const fieldMask = [
        'places.id', 'places.displayName', 'places.formattedAddress',
        'places.rating', 'places.userRatingCount', 'places.currentOpeningHours',
        'places.regularOpeningHours', 'places.photos', 'places.location',
        'places.nationalPhoneNumber', 'places.types', 'places.priceLevel',
        'places.websiteUri', 'places.businessStatus',
        'places.editorialSummary', 'places.generativeSummary'
      ].join(',');

      // GPS mode = lat/lng came directly from the client (user tapped "Use My Location")
      // Text mode = no lat/lng from client; we geocode the city/zip from the query text
      const isGpsMode = !!(lat && lng);

      // Resolve center coordinates — use provided lat/lng or geocode from the text query
      let centerLat = lat, centerLng = lng;
      if (!isGpsMode && query) {
        const locationOnly = query
          .replace(/\b(cigar|cigars|lounge|bar|shop|store|tobacco|smoke)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (locationOnly) {
          try {
            const geoResp = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationOnly)}&key=${MAPS_KEY}`
            );
            const geoData = await geoResp.json();
            const loc = geoData.results?.[0]?.geometry?.location;
            if (loc) { centerLat = loc.lat; centerLng = loc.lng; }
          } catch (_) {}
        }
      }

      // GPS searches use locationBias (soft preference — won't exclude results outside circle)
      // Text searches use locationRestriction (hard cutoff — anchored to geocoded city/zip center)
      const locationCircle = (centerLat && centerLng)
        ? { circle: { center: { latitude: centerLat, longitude: centerLng }, radius: radiusMeters } }
        : undefined;
      const locationBias        = (isGpsMode && locationCircle) ? locationCircle : undefined;
      const locationRestriction = (!isGpsMode && locationCircle) ? locationCircle : undefined;

      // Run two searches in parallel:
      // 1. Primary: user's original query (surfaces lounges by venue type)
      // 2. Supplement: "cigars [location]" (surfaces retailers like Habano's)
      const makeSearch = (textQuery) => fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': MAPS_KEY,
          'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify({
          textQuery,
          maxResultCount: 20,
          languageCode: 'en',
          ...(locationBias        ? { locationBias }        : {}),
          ...(locationRestriction ? { locationRestriction } : {}),
        }),
      });

      const primaryQuery = query || 'cigar lounge';
      const locationOnly = (query || '')
        .replace(/\b(cigar|cigars|lounge|bar|shop|store|tobacco|smoke)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      const supplementQuery = `cigars ${locationOnly}`.trim();

      const [primaryResp, supplementResp] = await Promise.all([
        makeSearch(primaryQuery),
        makeSearch(supplementQuery),
      ]);
      const [primaryData, supplementData] = await Promise.all([
        primaryResp.json(),
        supplementResp.json(),
      ]);

      // Merge and deduplicate by place ID
      const seen = new Set();
      const merged = [...(primaryData.places || []), ...(supplementData.places || [])].filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      // Keywords that confirm a cigar-focused venue
      const CIGAR_KEYWORDS = ['cigar', 'cigars', 'humidor', 'smoke lounge', 'smoking lounge', 'habano', 'habanos', 'stogie'];
      // Keywords that disqualify a venue (vape/hookah/cannabis shops that happen to sell tobacco)
      const EXCLUDE_KEYWORDS = ['vape', 'hookah', 'cannabis', 'cbd', 'kratom', 'e-cig', 'shisha'];

      const filtered = merged.filter(p => {
        const name = (p.displayName?.text || '').toLowerCase();
        const editorial = (p.editorialSummary?.text || '').toLowerCase();
        const generative = (p.generativeSummary?.overview?.text || '').toLowerCase();
        const hasExcluded = EXCLUDE_KEYWORDS.some(k => name.includes(k));
        const hasCigar = CIGAR_KEYWORDS.some(k => name.includes(k) || editorial.includes(k) || generative.includes(k));
        return hasCigar && !hasExcluded;
      });

      return sendJson(res, 200, { places: filtered });
    } catch (err) {
      console.error('[Lounges] search error:', err.message);
      return sendJson(res, 500, { error: err.message });
    }
  }

  // ========== Lounges: Fetch Reviews for AI Summary ==========
  if (url === '/api/lounges/reviews' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { placeId } = body;
      const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!MAPS_KEY) return sendJson(res, 500, { error: 'Maps API key not configured' });

      const detailsResp = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: {
          'X-Goog-Api-Key': MAPS_KEY,
          'X-Goog-FieldMask': 'reviews,rating,userRatingCount',
        },
      });
      const detailsData = await detailsResp.json();
      return sendJson(res, 200, detailsData);
    } catch (err) {
      console.error('[Lounges] reviews error:', err.message);
      return sendJson(res, 500, { error: err.message });
    }
  }

  // ========== Lounges: AI Summary from Reviews ==========
  if (url === '/api/lounges/ai-summary' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { placeName, reviews } = body;
      if (!reviews || !reviews.length) return sendJson(res, 200, { summary: null });

      const reviewText = reviews.slice(0, 5).map((r, i) => `Review ${i + 1}: "${r}"`).join('\n');
      const prompt = `You are a knowledgeable cigar enthusiast writing for HUMI, a premium cigar app. Based on these Google reviews for "${placeName}", write exactly 2 sentences that capture what makes this place worth visiting for cigar lovers. Be specific — mention the selection, the staff, the atmosphere, or the experience that reviewers actually call out. Be honest: if there are downsides, include one. Write like a trusted friend, not a tour guide. No fluff, no "I" statements.\n\nIMPORTANT: Use varied, vivid language to describe atmosphere. Draw from a wide range of descriptors: intimate, welcoming, laid-back, lively, refined, no-frills, well-stocked, unpretentious, old-school, upscale, relaxed, neighborhood gem, hidden gem, electric, polished, unassuming, members-club feel, or any other word that genuinely fits the place. NEVER use the word "cozy" — it is banned. Avoid defaulting to the same word repeatedly across descriptions — let the place's actual character guide the word choice. Lead with what's distinctive, not generic filler.\n\nReviews:\n${reviewText}\n\nReturn only the 2-sentence summary, nothing else.`;

      const { data: aiData } = await callOpenAIWithFailover(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: getOpenAIHeaders(null),
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 120,
            temperature: 0.7,
          }),
        }
      );
      const summary = aiData.choices?.[0]?.message?.content?.trim() || null;
      return sendJson(res, 200, { summary });
    } catch (err) {
      console.error('[Lounges] AI summary error:', err.message);
      return sendJson(res, 500, { error: err.message });
    }
  }

  // ========== Cigar DB Status ==========
  if (url === '/api/cigar-db/status' && req.method === 'GET') {
    try {
      const cigarDbPath = path.join(__dirname, 'app', 'cigar_db.json');
      const backupPath = path.join(__dirname, 'scripts', 'assistant_backup.json');

      const dbRaw = fs.readFileSync(cigarDbPath, 'utf8');
      const db = JSON.parse(dbRaw);
      const stat = fs.statSync(cigarDbPath);

      const brandCount = Object.keys(db).length;
      const lineCount = Object.values(db).reduce((sum, brand) => sum + (brand.cigars ? brand.cigars.length : 0), 0);
      const lastModified = stat.mtime.toISOString();

      let fileId = null;
      try {
        const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        fileId = backup.file_id || null;
      } catch (_) {}

      return sendJson(res, 200, { brandCount, lineCount, lastModified, fileId });
    } catch (err) {
      console.error('[CigarDB] status error:', err.message);
      return sendJson(res, 500, { error: err.message });
    }
  }

  // ========== Cigar DB Webhook ==========
  if (url === '/api/cigar-db/webhook' && req.method === 'POST') {
    const cigarDbPath = path.join(__dirname, 'app', 'cigar_db.json');
    const backupPath = path.join(__dirname, 'scripts', 'assistant_backup.json');
    const VECTOR_STORE_ID = 'vs_683ce63a617c819184d6c5591c8ce6aa';

    let body;
    try {
      body = await parseBody(req);
    } catch (parseErr) {
      return sendJson(res, 400, { error: 'Malformed JSON body' });
    }

    const { secret, action } = body;
    const lines = body.lines !== undefined ? body.lines : body.cigars;
    const brand = typeof body.brand === 'string' ? body.brand.trim() : body.brand;

    // Auth check
    const expectedSecret = process.env.CIGAR_DB_WEBHOOK_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      return sendJson(res, 401, { error: 'Unauthorized: invalid or missing secret' });
    }

    // Payload validation
    if (!action || !['upsert', 'remove_lines'].includes(action)) {
      return sendJson(res, 400, { error: 'action must be "upsert" or "remove_lines"' });
    }
    if (!brand || typeof brand !== 'string' || !brand) {
      return sendJson(res, 400, { error: 'brand is required and must be a non-empty string' });
    }
    if (!Array.isArray(lines) || lines.length === 0) {
      return sendJson(res, 400, { error: 'lines must be a non-empty array' });
    }

    // Validate each line entry depending on action
    if (action === 'remove_lines') {
      for (let i = 0; i < lines.length; i++) {
        const entry = lines[i];
        const name = typeof entry === 'string' ? entry.trim() : (entry && typeof entry.line === 'string' ? entry.line.trim() : null);
        if (!name) {
          return sendJson(res, 400, { error: `lines[${i}] must be a non-empty string or object with a non-empty "line" field` });
        }
      }
    }

    try {
      // Load current DB
      let db = {};
      try {
        db = JSON.parse(fs.readFileSync(cigarDbPath, 'utf8'));
      } catch (_) {}

      let linesAdded = 0;
      let linesRemoved = 0;

      if (action === 'upsert') {
        // Validate line objects
        for (const item of lines) {
          if (!item.line || typeof item.line !== 'string') {
            return sendJson(res, 400, { error: 'Each item in lines must have a "line" string field' });
          }
        }

        if (!db[brand]) {
          db[brand] = { logo: body.logo || null, cigars: [] };
        }

        const existingCigars = db[brand].cigars || [];
        for (const incoming of lines) {
          const existingIdx = existingCigars.findIndex(c => c.line === incoming.line);
          if (existingIdx >= 0) {
            existingCigars[existingIdx] = { ...existingCigars[existingIdx], ...incoming };
          } else {
            existingCigars.push(incoming);
            linesAdded++;
          }
        }
        db[brand].cigars = existingCigars;
        if (body.logo !== undefined) {
          db[brand].logo = body.logo;
        }

      } else if (action === 'remove_lines') {
        if (!db[brand]) {
          return sendJson(res, 400, { error: `Brand "${brand}" not found in database` });
        }

        const lineNamesToRemove = new Set(lines.map(l => (typeof l === 'string' ? l : l.line)));
        const before = db[brand].cigars.length;
        db[brand].cigars = db[brand].cigars.filter(c => !lineNamesToRemove.has(c.line));
        linesRemoved = before - db[brand].cigars.length;

        // Remove brand entirely if no lines remain
        if (db[brand].cigars.length === 0) {
          delete db[brand];
        }
      }

      // Write updated DB to disk
      fs.writeFileSync(cigarDbPath, JSON.stringify(db, null, 2), 'utf8');
      console.log(`[CigarDB] Updated disk: brand="${brand}" action=${action} +${linesAdded} -${linesRemoved}`);

      // Sync to OpenAI vector store
      const keys = getOpenAIKeys();
      if (keys.length === 0) {
        return sendJson(res, 200, {
          success: true,
          brand,
          linesAdded,
          linesRemoved,
          newFileId: null,
          warning: 'No OpenAI keys configured; disk updated but vector store not synced'
        });
      }

      // Read current file_id from backup
      let oldFileId = null;
      let backupData = {};
      try {
        backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        oldFileId = backupData.file_id || null;
      } catch (_) {}

      // Build multipart form data for file upload
      const fileContent = Buffer.from(fs.readFileSync(cigarDbPath, 'utf8'), 'utf8');
      const boundary = `----FormBoundary${Date.now()}`;
      const CRLF = '\r\n';
      const header = Buffer.from(
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="file"; filename="cigar_db.json"${CRLF}` +
        `Content-Type: application/json${CRLF}` +
        CRLF
      );
      const purposePart = Buffer.from(
        CRLF +
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="purpose"${CRLF}` +
        CRLF +
        `assistants` +
        CRLF +
        `--${boundary}--${CRLF}`
      );
      const formBody = Buffer.concat([header, fileContent, purposePart]);

      // Upload file using key failover
      let newFileId = null;
      let uploadError = null;

      const startIdx = global.openaiKeyIndex;
      for (let attempt = 0; attempt < keys.length; attempt++) {
        const keyIdx = (startIdx + attempt) % keys.length;
        const apiKey = keys[keyIdx];
        try {
          const uploadRes = await serverFetchWithTimeout('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body: formBody,
          }, 60000);

          const uploadData = await uploadRes.json();
          if (uploadData.error) {
            const errCode = uploadData.error.code || uploadData.error.type || '';
            if (errCode === 'invalid_api_key' || errCode === 'insufficient_quota' || uploadRes.status === 401 || uploadRes.status === 429) {
              global.openaiKeyIndex = (keyIdx + 1) % keys.length;
              uploadError = uploadData.error;
              continue;
            }
            throw new Error(uploadData.error.message || 'File upload error');
          }

          newFileId = uploadData.id;
          global.openaiKeyIndex = keyIdx;
          console.log(`[CigarDB] Uploaded new file to OpenAI: ${newFileId} using key ${keyIdx + 1}`);
          break;
        } catch (err) {
          uploadError = err;
          global.openaiKeyIndex = (keyIdx + 1) % keys.length;
        }
      }

      if (!newFileId) {
        const errMsg = uploadError?.message || 'Failed to upload file to OpenAI';
        console.error('[CigarDB] File upload failed:', errMsg);
        return sendJson(res, 500, { error: `Disk updated but OpenAI upload failed: ${errMsg}` });
      }

      // Attach new file to vector store — with key failover
      let attachError = null;
      let attachedKey = null;
      const attachStartIdx = global.openaiKeyIndex;
      for (let attempt = 0; attempt < keys.length; attempt++) {
        const keyIdx = (attachStartIdx + attempt) % keys.length;
        const apiKey = keys[keyIdx];
        try {
          const attachRes = await serverFetchWithTimeout(
            `https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2',
              },
              body: JSON.stringify({ file_id: newFileId }),
            },
            30000
          );
          const attachData = await attachRes.json();
          if (attachData.error) {
            const errCode = attachData.error.code || attachData.error.type || '';
            if (errCode === 'invalid_api_key' || errCode === 'insufficient_quota' || attachRes.status === 401 || attachRes.status === 429) {
              global.openaiKeyIndex = (keyIdx + 1) % keys.length;
              attachError = attachData.error;
              continue;
            }
            throw new Error(attachData.error.message || 'Vector store attach error');
          }
          global.openaiKeyIndex = keyIdx;
          attachedKey = apiKey;
          console.log(`[CigarDB] Attached ${newFileId} to vector store ${VECTOR_STORE_ID} using key ${keyIdx + 1}`);
          break;
        } catch (err) {
          attachError = err;
          global.openaiKeyIndex = (keyIdx + 1) % keys.length;
        }
      }
      if (!attachedKey) {
        const errMsg = attachError?.message || 'Failed to attach file to vector store';
        console.error('[CigarDB] Vector store attach failed:', errMsg);
        return sendJson(res, 500, { error: `File uploaded (${newFileId}) but vector store attach failed: ${errMsg}` });
      }
      const vsApiKey = attachedKey;

      // Delete old file from vector store + files (best-effort, don't fail if this errors)
      if (oldFileId && oldFileId !== newFileId) {
        try {
          await serverFetchWithTimeout(
            `https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files/${oldFileId}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${vsApiKey}`,
                'OpenAI-Beta': 'assistants=v2',
              },
            },
            15000
          );
          console.log(`[CigarDB] Removed old file ${oldFileId} from vector store`);
        } catch (delErr) {
          console.warn('[CigarDB] Could not remove old file from vector store:', delErr.message);
        }
        try {
          await serverFetchWithTimeout(
            `https://api.openai.com/v1/files/${oldFileId}`,
            {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${vsApiKey}` },
            },
            15000
          );
          console.log(`[CigarDB] Deleted old OpenAI file: ${oldFileId}`);
        } catch (delErr) {
          console.warn('[CigarDB] Could not delete old OpenAI file:', delErr.message);
        }
      }

      // Update assistant_backup.json with new file_id
      backupData.file_id = newFileId;
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
      console.log(`[CigarDB] Updated assistant_backup.json with file_id: ${newFileId}`);

      return sendJson(res, 200, {
        success: true,
        brand,
        linesAdded,
        linesRemoved,
        newFileId,
      });

    } catch (err) {
      console.error('[CigarDB] webhook error:', err.message);
      return sendJson(res, 500, { error: err.message });
    }
  }

  return false; // Not an API route
}

const proxy = httpProxy.createProxyServer({
  target: METRO_URL,
  ws: true,
  changeOrigin: true
});

proxy.on('proxyReq', (proxyReq) => {
  proxyReq.removeHeader('origin');
  proxyReq.removeHeader('referer');
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
  '.map': 'application/json',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
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

    // If not found in dist, fall back to public/ (covers video, icons, etc.)
    if (!(fs.existsSync(filePath) && fs.statSync(filePath).isFile())) {
      const publicPath = path.join(__dirname, 'public', url);
      if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
        filePath = publicPath;
      }
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

      // Stream video files with range-request support so browsers can seek/play
      if (ext === '.mp4' || ext === '.webm' || ext === '.ogg') {
        const fileSize = fs.statSync(filePath).size;
        const rangeHeader = req.headers['range'];
        if (rangeHeader) {
          const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
          const start = parseInt(startStr, 10);
          const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
          const chunkSize = end - start + 1;
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': contentType,
            'Cache-Control': cacheControl,
          });
          fs.createReadStream(filePath, { start, end }).pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Accept-Ranges': 'bytes',
            'Content-Type': contentType,
            'Cache-Control': cacheControl,
          });
          fs.createReadStream(filePath).pipe(res);
        }
        return;
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

function spawnExpo() {
  if (isProduction) {
    console.log('Production mode: serving static dist/, skipping Expo spawn');
    return;
  }

  const expoEnv = {
    ...process.env,
    EXPO_NO_ORIGIN_CHECK: 'true',
    BROWSER: 'none',
  };

  let restartCount = 0;
  const MAX_RESTARTS = 10;
  const RESTART_WINDOW_MS = 60000;
  let lastRestartTime = Date.now();

  let currentExpo = null;

  function launch() {
    console.log('Spawning Expo web server...');
    const expo = spawn('npx', ['expo', 'start', '--web', '--port', '8081'], {
      env: expoEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });
    currentExpo = expo;

    expo.stdout.on('data', (data) => {
      process.stdout.write(`[expo] ${data}`);
    });

    expo.stderr.on('data', (data) => {
      process.stderr.write(`[expo] ${data}`);
    });

    expo.on('error', (err) => {
      console.error('Failed to start Expo:', err.message);
    });

    expo.on('exit', (code, signal) => {
      console.warn(`Expo exited (code=${code}, signal=${signal}). Proxy remains running.`);
      currentExpo = null;

      const now = Date.now();
      if (now - lastRestartTime > RESTART_WINDOW_MS) {
        restartCount = 0;
        lastRestartTime = now;
      }
      restartCount++;

      if (restartCount > MAX_RESTARTS) {
        console.error(`Expo crashed ${MAX_RESTARTS} times in ${RESTART_WINDOW_MS / 1000}s, not restarting. Proxy still serving API routes.`);
        return;
      }

      const delay = Math.min(2000 * restartCount, 15000);
      console.log(`Restarting Expo in ${delay / 1000}s (attempt ${restartCount}/${MAX_RESTARTS})...`);
      setTimeout(launch, delay);
    });
  }

  function shutdownExpo() {
    if (currentExpo) {
      currentExpo.kill('SIGTERM');
    }
    setTimeout(() => process.exit(0), 3000);
  }

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down Expo and proxy...');
    shutdownExpo();
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down...');
    shutdownExpo();
  });

  launch();
}

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
    
    spawnExpo();
  });
})();
