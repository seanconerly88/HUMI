# HUMI - Digital Cigar Lounge

## Overview
HUMI is a Progressive Web App (PWA) designed for cigar enthusiasts. Its primary purpose is to allow users to log and rate cigars, connect with a community of fellow enthusiasts, and access AI-powered cigar scanning. The project is pivoting to a standalone PWA platform with Stripe payments for full control and a tiered access model (Free and Premium). HUMI aims to be the "Digital Cigar Lounge" for cigar aficionados.

## User Preferences
I want iterative development.
Ask before making major changes.
I prefer detailed explanations.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.

## System Architecture
HUMI is built with Expo SDK 53 and React Native Web, focusing on a mobile-first PWA experience.

**UI/UX Decisions:**
- **Design:** Mobile-first, adaptable to web with responsive layouts.
- **Branding:** Consistent, premium look with elegant geometric symbols for icons.
- **Color Scheme:** Light gray (`#f9f9f9`) for global background, with specific components styled for visual appeal.
- **PWA Prompt:** "Welcome to HUMI" screen for new web users, highlighting key features and guiding them to "Add to Home Screen."
- **Login/Onboarding:** Responsive layouts; split-screen on desktop for login, card-based grid with numbered progress for onboarding.
- **Feed:** Centered card layout with a max-width on desktop, similar to Instagram Reels, ensuring comfortable reading.
- **Home Screen:** Two-column design on desktop with a stats sidebar and activity area, while mobile preserves a single-column layout.

**Technical Implementations:**
- **Framework:** Expo SDK 53 with React Native Web.
- **Entry Points:** `index.js` (main entry), `App.js` (root component for auth/navigation), `proxy.js` (reverse proxy).
- **PWA Features:** `manifest.json`, `service-worker.js` for offline caching and home screen installation, `index.html` for custom meta tags.
- **Authentication:** Firebase Auth with Google Sign-in.
- **Database:** Firestore for data storage.
- **State Management:** Uses React Navigation for app navigation.
- **Iconography:** Custom `Icon.js` component with symbol fallbacks for web compatibility and brand consistency.
- **Responsive Design:** Utilizes `Platform` and `useWindowDimensions` for breakpoint detection and applying platform-specific styles.

**Feature Specifications:**
- **Tier Structure:** Free tier (limited AI scans, comments) and Premium tier (unlimited features, priced monthly/annually).
- **AI-Powered Cigar Scanning:** Integrated via OpenAI.
- **Community Features:** Feed with posts, comments (with limits for free users), and "Share in the Moment" functionality to add cigars to personal humidors.
- **Feed Delay:** New posts have a 3-minute delay before appearing in the feed (using `visibleAt` timestamp). If a user corrects a post via "Fix Issue", the timer resets. Deleted posts are removed immediately.
- **Personal Collection:** "Smoke Shots" photo gallery for user's cigar photos, with download functionality.
- **Subscription Management:** Stripe integration for web payments and subscription tracking.
- **Development Flags:** `DEV_BYPASS_AUTH` and `DEV_BYPASS_PAYWALL` for development.

## Deployment Process
The app is deployed as a static PWA. When you click "Publish":
1. The build command runs `npx expo export --platform web --clear` to generate fresh bundles
2. Files from `public/` (manifest.json, version.json, service-worker.js) are copied to `dist/`
3. The service worker gets a unique timestamp-based cache version injected (replaces `BUILD_VERSION`)
4. This ensures old cached versions are invalidated and users get the latest code

**Important:** The service worker automatically invalidates old caches on each deploy. Users should see changes immediately after publishing.

## Project Structure (Clean)
- `app/` - Main app screens (humidor.js, onboarding.js, stories.js, etc.)
- `src/` - Services and navigation components
- `public/` - PWA files (manifest.json, service-worker.js, version.json)
- `assets/` - App icons and images
- `components/` - Shared React components
- `config/` - Firebase and API configuration

**Removed:** android/, ios/, app-backup/, dist-test/ (native build artifacts not needed for PWA)

## External Dependencies
- **Firebase:** Authentication (Firebase Auth) and Database (Firestore).
- **Stripe:** For processing web payments and managing subscriptions.
- **OpenAI:** For AI-powered cigar scanning and generating varied descriptions.
- **Brave API:** For web search features.
- **React Navigation:** For managing application navigation.
- **expo-sharing & expo-media-library:** For mobile photo downloads and sharing.