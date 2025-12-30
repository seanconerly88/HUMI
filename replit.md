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
- **Dec 30, 2025**: Brown bleeding fix, Add to Humidor simplified, original color restored
  - Reverted back to original brown (#8B4513) as requested
  - Fixed brown bleeding: Changed App.js loading screens from brown to light gray (#f9f9f9)
  - GestureHandlerRootView now has light gray background to prevent any color bleed
  - Simplified Add to Humidor: Removed complex transaction, just does simple addDoc to user's logs
  - HUMI Insights fallback: If `insights` field missing, tries aiRawResponseSnapshot fields then description
  - Version 2025.12.30.10 deployed with cache v22
- **Dec 30, 2025**: Premium styling improvements to match Apple app quality
  - Login page: Larger logo (52px) and tagline (17px), improved spacing with flex layout
  - Tab icons: Created separate `tabIconMap` in Icon.js that uses Ionicons for premium look
  - Tab bar: Better styling with proper height, padding, subtle border, improved label fonts
  - Background: Changed global background from brown (#8B4513) to light gray (#f9f9f9) to prevent brown bleeding at bottom
  - Icon component refactor: Separated `tabIconMap` (Ionicons names) from `brandIconMap` (Unicode symbols) to fix rendering issue
- **Dec 30, 2025**: Simplified Feed "Share in the Moment" feature
  - Removed modal popup entirely (~400+ lines of code removed)
  - HUMI Insights now displayed inline in feed cards (below photos, before reactions)
  - Shows tasting notes and pairings inline when available
  - Replaced modal with simple "Add to my HUMI" button in the card
  - Insights data now extracted at feed load time (not on button click)
  - Uses cross-platform alerts (window.alert for web, Alert.alert for native)
  - Per-item loading state for add button
  - Cleaner UX: users see cigar info immediately without opening a popup
- **Dec 30, 2025**: iOS Safari blank screen fix and PWA prompt improvements
  - Root cause: iOS Safari requires explicit height on html/body/#root for flex layouts
  - Updated public/index.html CSS with full-height flex layout for #root and Expo wrappers
  - Added min-height: 0 to nested flex containers (critical for iOS Safari)
  - Changed GestureHandlerRootView to use flex:1 instead of height:'100%' (conflicting style)
  - PWA prompt now uses AsyncStorage for persistent dismissal tracking
  - PWA prompt shows for ANY web user not in standalone mode (not just unauthenticated)
  - Added error state with retry button to HomeScreen for better debugging
  - Background color changed to #f9f9f9 for consistent app appearance
- **Dec 30, 2025**: PWA Install Prompt restored and login improvements
  - Created PWAInstallPrompt component showing "Welcome to HUMI" screen
  - Features: AI-Powered Cigar Analysis, Cigar Community, Expert Recommendations, Personal Collection Tracking
  - "Show Instructions" button reveals iOS Add to Home Screen steps
  - "Continue in browser" skip option for users who prefer web
  - Shows before login for web visitors not in standalone mode (already installed PWA skips prompt)
  - Fixed login screen mobile layout with minHeight: 100vh
  - Google OAuth redirect URI now uses window.location.origin for production domain support
  - Fixed missing icon.png and favicon.png assets
  - Note: For Google Sign-in on production domain (app.gethumi.co), user must add redirect URI to Google Cloud Console OAuth settings
- **Dec 30, 2025**: Added "Smoke Shots" - Photo Gallery feature
  - New screen accessible from hamburger menu on Home screen
  - Displays grid of all user's cigar photos (initial scans + moments)
  - Shows photo count with newest-first sorting
  - Tap to view full-size with cigar name, date, and type badge
  - Download functionality: Web uses browser download, mobile saves to camera roll
  - Responsive grid: 4 columns on desktop, 3 on mobile
  - Uses expo-sharing and expo-media-library for mobile downloads
  - Navigation: Added stack navigator wrapping tab navigator in App.js
- **Dec 30, 2025**: Fixed HUMI Insights not displaying in Feed modal
  - Root cause: Firebase security rules blocked cross-user access to `users/{ownerId}/logs/{logId}`
  - Solution: Insights data now stored directly on `logsMomentsImages` documents
  - Updated saveProcessedCigarToFirebase (humidor.js and humtets.js) to save initial images to `logsMomentsImages` with insights
  - Updated saveDetailChanges to backfill insights on existing images when owners edit/save
  - Updated fetchPostInsights to prioritize reading from image document first
  - Data preservation: Only writes non-empty values to avoid overwriting existing data
  - Note: Existing posts need owner to edit/save to trigger backfill (consider migration script for full coverage)
- **Dec 25, 2025**: "Share in the Moment" feature for Feed posts
  - Added "Share in the Moment" button on each Feed post card
  - Modal popup shows cigar name, brand, HUMI Insights, tasting notes, and pairings
  - "Add This to My Humidor" button copies cigar entry to user's humidor (fresh entry)
  - Social proof counter shows "Added by X people" on each post
  - Prevents duplicate adds (one user = one add per cigar)
  - Data stored in `postStats/{logId}` for tracking adds count and users
  - Fetches insights from original humidor entry or image data
- **Dec 25, 2025**: Tier comparison screen in onboarding + UX improvements
  - Added step 4 "Choose Your Experience" showing Free vs Premium side-by-side
  - Free tier: 5 AI scans/month, 10 comments/month, basic features listed
  - Premium tier: $5.99/month or $29.99/year with unlimited access, "BEST VALUE" badge
  - Desktop: Two-column card layout with feature checklists (checkmarks/X icons)
  - Mobile: Stacked cards with Premium promoted first (scrollable)
  - "Continue Free" and "Go Premium" buttons for clear selection
  - Removed "X free comments remaining" counter from Feed comments (no nagging)
  - Design philosophy: Inform limits upfront, no constant reminders during usage
  - Onboarding flow now 6 steps: 0-3 preferences, 4 tier comparison, 5 QuickStart Guide
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
