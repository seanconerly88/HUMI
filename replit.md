# HUMI - Digital Cigar Lounge

## Overview
HUMI is a Progressive Web App (PWA) for cigar enthusiasts to log, rate, and connect with fellow enthusiasts. Built with Expo SDK 53 and React Native Web, designed as a mobile-first experience that works seamlessly on both web and as an "Add to Home Screen" app.

## Business Model - "Digital Cigar Lounge"
HUMI is pivoting from native App Store/Play Store distribution to a standalone PWA platform with Stripe payments. This gives full control without platform restrictions.

### Tier Structure (In Development)
- **Free Tier**: 5 AI scans/month, 10 comments/month, view-only access to some features
- **Premium Tier**: $5.99/month or $29.99/year - Unlimited access to all features
- **Promo Code System**: Custom codes for free access, discounts, trials (e.g., CREATOR, APPLEPODCAST, LAUNCH50)

### Payment Strategy
- Stripe for web payments (pending setup)
- Promo code system for creators, partners, and special campaigns
- No Apple/Google IAP dependency

## Current State
- **Branch**: layout-ordering
- **Framework**: Expo SDK 53 with React Native Web
- **Platform**: PWA (Progressive Web App)
- **Status**: PWA foundation implemented, paywall bypassed for development

## Project Architecture

### Entry Points
- `index.js` - Main entry point that registers App.js
- `App.js` - Root component handling authentication flow and navigation
- `proxy.js` - Reverse proxy serving PWA files and forwarding to Metro

### PWA Files
- `public/manifest.json` - PWA manifest (app name, icons, standalone mode)
- `public/service-worker.js` - Service worker for offline caching
- `public/index.html` - Custom HTML template with PWA meta tags

### Key Directories
- `app/` - Screen components (home, login, onboarding, pricing, etc.)
- `config/` - Firebase configuration
- `src/navigation/` - React Navigation setup
- `public/` - PWA static files

### Technical Setup
- **Web Server**: Reverse proxy on port 5000 forwarding to Metro bundler on port 8081
- **Bundler**: Metro (Expo SDK 53 default for web)
- **Authentication**: Firebase Auth with Google Sign-in support
- **Database**: Firestore
- **PWA Features**: Standalone display, offline caching, home screen installation

## Development Flags
- `DEV_BYPASS_AUTH` (App.js) - Set to `true` to skip login
- `DEV_BYPASS_PAYWALL` (App.js) - Set to `true` to skip payment screen

## Running the Application

### Development
The app runs via the "Expo Web" workflow which:
1. Starts the reverse proxy on port 5000
2. Launches Metro bundler on port 8081
3. Serves PWA manifest and service worker
4. Serves the web application

### Environment Variables
- `OPENAI_API_KEY` - For AI-powered cigar scanning
- `ASSISTANT_ID` - OpenAI Assistant configuration
- `BRAVE_API_KEY` - For web search features
- `DEV_BYPASS_PAYWALL` - Development: bypass paywall (`true`/`false`)

## Feature Decision Framework
For every new feature, consider:
1. **Free, Premium, or Promo-gated?**
2. **If Free, should it be limited?** (e.g., 5/month)
3. **What's the upgrade trigger?** (What makes someone want to pay?)

## Recent Changes
- **Dec 25, 2025**: Stripe integration and subscription tracking
  - Added Stripe Checkout backend endpoints in proxy.js
  - Server-side session verification with userId matching (fail-closed security)
  - Subscription service for Firestore read/write
  - App.js checks subscription status on load and after checkout
  - Price IDs configured: monthly (price_1Si5scFToJGJFWPADiZtDgIw), yearly (price_1Si5tVFToJGJFWPARlJoPIZw)
  - Note: For production, implement Stripe webhooks for subscription lifecycle events
- **Dec 22, 2025**: Pivoted to PWA architecture
  - Added PWA manifest, service worker, custom index.html
  - Configured standalone display mode for "Add to Home Screen"
  - Added DEV_BYPASS_PAYWALL flag
  - Updated proxy.js to serve PWA files
- **Dec 1, 2025**: Initial Replit setup from layout-ordering branch

## Dependencies
Key dependencies include:
- expo@53.0.24
- react-native@0.79.6
- react-native-web
- firebase@11.7.1
- @react-navigation/native@7.1.8
- react-native-gesture-handler@2.24.0

## Notes
- PWA mode: App displays fullscreen when added to home screen (no browser chrome)
- Service worker caches assets for faster subsequent loads
- Firebase credentials are stored in `config/firebaseConfig.js`
- Stripe integration pending - currently using dev bypass

## Testing
- **Web Preview**: Use Replit webview (development only)
- **Mobile PWA**: Visit site on phone → "Add to Home Screen" to test standalone mode
- **Full Testing**: Replit → GitHub → local machine → test on phone
