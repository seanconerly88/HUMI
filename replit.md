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
- **Dec 25, 2025**: Comments feature for Feed posts
  - Users can leave comments on any public post
  - Free tier: 10 comments per month, Premium: unlimited
  - Thumbs up on comments visible to everyone (public count)
  - Thumbs down on comments only visible to the user who tapped it (private)
  - Expand/collapse comments with toggle button on each post
  - Monthly comment usage tracked in Firestore (users/{userId}/usage/{monthKey})
  - Comments stored in Firestore (postComments/{postId}/comments/{commentId})
- **Dec 25, 2025**: Responsive web-optimized Feed screen (Reddit/Instagram style)
  - Centered card layout with max-width 500px on desktop (like Instagram Reels)
  - Cards don't stretch full-width - centered in viewport for comfortable reading
  - Larger header with subtitle "See what the community is smoking"
  - Responsive cardWidth calculation: min(500, width - 48) on desktop
  - FlatList contentContainerStyle centers items on desktop
  - Mobile layout preserved with full-width cards
- **Dec 25, 2025**: Responsive web-optimized HomeScreen design
  - Added Platform and useWindowDimensions for responsive detection (768px breakpoint)
  - Desktop layout: Two-column design with stats sidebar (left) and activity area (right)
  - Desktop "Log New Cigar" button replaces mobile floating action button
  - Recommendations grid layout on desktop (vs horizontal scroll on mobile)
  - Larger typography and cards for web with centered max-width container (1200px)
  - Updated tab icons: Home→lounge (◈), Humidor→cigar-box (▣), Feed→stories (▤)
  - Separate webStyles StyleSheet for clean organization
  - Mobile layout preserved unchanged
- **Dec 25, 2025**: Fixed blank Home screen and tab navigation on web
  - Added `height: '100%'` to GestureHandlerRootView for proper web viewport filling
  - Bottom tabs now render correctly at the bottom of the screen on web
  - Tab navigation (Home, Humidor, Feed) now works properly
  - Added web-specific tabBarStyle for consistent appearance
- **Dec 25, 2025**: Brand-consistent icons and gender selection in onboarding
  - Updated Icon component with elegant geometric symbols for premium brand look
  - Added gender selection as step 4 of onboarding (Male, Female, Prefer not to say)
  - Gender saved to Firebase users collection under `gender` field
  - Login screen updated to use Icon component for consistent branding
- **Dec 25, 2025**: Cross-platform Icon component for PWA compatibility
  - Created `app/components/Icon.js` with symbol fallbacks for web
  - Replaced all Ionicons usage with the new Icon component throughout the app
  - Comprehensive symbol map covering 200+ icon names
  - TabIcon variant for navigation tabs with opacity states
  - Fixes icon rendering issues where web showed empty boxes instead of icons
- **Dec 25, 2025**: Web-optimized responsive login and onboarding screens
  - Login: Split-screen layout on web with branding panel (left) and form (right)
  - Onboarding: Card-based grid layout with numbered progress indicator for desktop
  - Platform detection using `Platform.OS === 'web'` and dimension tracking
  - Separate `webStyles` and mobile `styles` StyleSheet objects for clean organization
  - Mobile layouts preserved unchanged
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
