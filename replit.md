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
- **Design:** Mobile-first, adaptable to web with responsive layouts. Desktop web uses 2-3 column grids for Humidor and Events.
- **PWA Prompt:** Only shown to mobile users (not desktop browsers).
- **Branding:** Consistent, premium look with elegant geometric symbols for icons.
- **Color Scheme:** Light gray (`#f9f9f9`) for global background, with specific components styled for visual appeal.
- **PWA Prompt:** "Welcome to HUMI" screen for new web users, highlighting key features and guiding them to "Add to Home Screen."
- **Login/Onboarding:** Responsive layouts; split-screen on desktop for login, card-based grid with numbered progress for onboarding.
- **Feed:** Centered card layout with a max-width on desktop, similar to Instagram Reels, ensuring comfortable reading.
- **Home Screen:** Two-column design on desktop with a stats sidebar and activity area, while mobile preserves a single-column layout.

**Technical Implementations:**
- **Framework:** Expo SDK 53 with React Native Web.
- **Entry Points:** `index.js` (main entry), `App.js` (root component for auth/navigation), `proxy.js` (reverse proxy).
- **PWA Features:** `manifest.json`, `service-worker.js` for offline caching and home screen installation, `index.html` for custom meta tags and viewport height fix.
- **Viewport Height Fix:** Uses CSS variable `--app-height` set via JavaScript (`visualViewport.height` with `innerHeight` fallback) to handle iOS Safari address bar show/hide. Prevents white bar at bottom of screen on all browsers.
- **Authentication:** Firebase Auth with Google Sign-in.
- **Database:** Firestore for data storage.
- **State Management:** Uses React Navigation for app navigation.
- **Iconography:** Custom `Icon.js` component with symbol fallbacks for web compatibility and brand consistency.
- **Responsive Design:** Utilizes `Platform` and `useWindowDimensions` for breakpoint detection and applying platform-specific styles.

**Feature Specifications:**
- **Tier Structure:** Free tier (limited AI scans, comments) and Premium tier (unlimited features, priced monthly/annually).
- **Freemium Limits:**
  - **AI Scans:** 5/month for free users (tracked in `users/{uid}/usage/{YYYY-MM}` documents via scanUsageService.js)
  - **Comments:** 10/month for free users (tracked in same usage documents)
  - **UpgradeModal:** Shows when limits reached, with plan selection (monthly $5.99/yearly $29.99), promo code input, and Stripe checkout
- **Welcome Trial System (5-Day Premium Trial):**
  - **New Users:** Automatically receive 5-day trial when selecting "Free" tier during onboarding
  - **Existing Free Users:** Automatically receive 5-day trial on next login with ThankYouTrialModal showing benefits
  - **Trial Expiration:** TrialEndedModal appears with "Continue to HUMI" (free tier) or "Upgrade HUMI" options
  - **Tracking:** Uses `welcomeTrialGranted`, `trialEndDate`, `trialExpiryAcknowledged` flags in user document
  - **Promo Compatibility:** Users on welcome trial can still redeem promo codes (CREATOR2026, INNERCIRCLE2026)
  - **Trial Benefits:** Trial users get unlimited AI scans and access to HUMI Insights (not penalized for prior scan usage)
- **HUMI Insights Gating:**
  - **Premium/Trial Users:** See full AI-generated insights for each cigar
  - **Free Users (no trial):** See blurred insights with lock icon and "Unlock Insights" CTA that opens UpgradeModal
- **AI-Powered Cigar Scanning:** Uses OpenAI Responses API with unified scan (Feb 2026). Single API call sends the cigar band image directly to the Responses API with `input_image` + `file_search` tool, combining vision analysis and cigar database matching in one step. Uses gpt-4o model with the Cigar Database vector store (`vs_683ce63a617c819184d6c5591c8ce6aa`). Text-only reanalyze mode uses separate `/api/openai/assistant` endpoint with gpt-4o-mini. Backup of original assistant config saved in `scripts/assistant_backup.json`.
- **Community Features:** Feed with posts, comments (with limits for free users), and "Share in the Moment" functionality to add cigars to personal humidors.
- **Feed Delay:** New posts have a 3-minute delay before appearing in the feed (using `visibleAt` timestamp). If a user corrects a post via "Fix Issue", the timer resets. Deleted posts are removed immediately.
- **Personal Collection:** "Smoke Shots" photo gallery for user's cigar photos, with download functionality.
- **Subscription Management:** Stripe integration for web payments and subscription tracking.
- **Events Feature:** Discover national cigar events organized by month. Events auto-hide after end date. Features "Event of the Week" spotlight ($250 premium) and social media links to organizers. CTA button "Claim Your Spot" links to event websites.
- **Events Data Management:** Events are seeded directly to Firestore using the `scripts/importEvents.js` script with Firebase Admin SDK. Requires `FIREBASE_SERVICE_ACCOUNT_JSON` secret.
- **Cigar of the Month (COTM):** Featured cigar on home page with two-column layout (image left, writeup right on desktop, stacked on mobile). February 2025 features My Father Blue. Includes educational writeup about the cigar's Honduran heritage, CT Broadleaf Rosado wrapper, and flavor profile. "Get Yours" CTA button links to Cigars International with Firebase click tracking stored in `cotm_clicks/{cigar_id}` collection.
- **Referral Program ("Grow the Lounge"):**
  - Each user gets a unique referral code (e.g., HUMI-ABC123) stored in their profile and `referral_codes` collection
  - ReferralCard component on home page with copy/share functionality
  - New users enter referral codes in UpgradeModal promo code field
  - **Referrer Reward:** 30 days added to subscription (via Stripe trial extension)
  - **New User Reward:** 10% off annual plan ($26.99 instead of $29.99) via Stripe coupon REFERRAL_10_OFF
  - Referrals tracked in `referrals` Firestore collection with status
  - Stats shown on ReferralCard ("Friends Invited: X")
- **Social Follow Card:** "Join the Community" card on home page encouraging users to follow @humi_cigar_community on Instagram and TikTok. Features branded icon buttons linking to respective platforms.
- **Feature Intro Tour:** 4-card swipeable introduction shown to new users after onboarding on first home screen visit. Cards introduce: Your Lounge (home/activity), Events (cigar events discovery), HUMI Feed (community sharing), and Your Humidor (AI-powered logging). Last card has "Log Your First Cigar" CTA that navigates to Humidor with add cigar modal open. Tracked via `hasSeenFeatureIntro` in user document.
- **Promo Codes:**
  - `CREATOR2026`: 7-day free trial, shows CreatorWelcomeModal (3 swipeable cards). After expiry, user is downgraded to free tier with PromoTrialEndedModal notification. userType changes from 'creator' to 'expired_creator'.
  - `LSV2026`: 7-day free trial for Lakeshore Village community members, shows LSVWelcomeModal (green theme, 3 swipeable cards). After expiry, user is downgraded to free tier. userType changes from 'lsv' to 'expired_lsv'.
  - `INNERCIRCLE2026`: Lifetime premium access, shows InnerCircleWelcomeModal (gold/dark theme, 3 swipeable cards with "never charged" messaging)
- **Creator Upgrade Script:** `scripts/upgradeCreatorsToInnerCircle.js` - One-time script to upgrade all current Creator users to Inner Circle status. Sets `upgradedFromCreator: true` flag so they see InnerCircleWelcomeModal on next login.
- **Dev Mode Testing:** Toggle `__DEV_MODE_FLAG = true` in `src/services/devModeData.js` to bypass Firebase auth and load mock cigar data for UI testing. Provides mock premium user, 3 cigar logs with full scorecard data (humiBlurb, peopleSaying, pairings), and mock feed posts. Two safety nets: 1) `__DEV__` guard ensures it's always off in production builds, 2) build script (`scripts/build-web.sh`) fails if the flag is left on. Affects: App.js (auth bypass), humidor.js (mock logs), stories.js (mock feed), index.tsx (mock home data), profile.js (mock stats).
- **Super Admin Moderation:** Admin (Conerly.sean@gmail.com) can soft-delete posts (swipe left) and comments (delete icon) from the feed. Soft deletes set `isPublic: false` for posts and `isDeleted: true` for comments, with audit trail (deletedAt, deletedBy, deletedByEmail).
- **Featured Content System:** Curated content (like Instagram reels) in the `recommendations` Firestore collection with `featured: true` and `priority` fields. First-time beginners see 2 featured items + 1 regular item. Tracked via `hasSeenFeaturedContent` flag in user document. Featured cards display a star badge (HUMI brown #8B4513 background) in the top-right corner. Content seeded via `scripts/importFeaturedContent.js`.
- **GHL CRM Integration:** Webhook fires to GoHighLevel on new user signup (after onboarding completes). Sends: email, name, experience level, interests, smoking frequency, subscription tier, and user ID.
- **Cigar Tracking System (Backend Only):**
  - Shared top-level `cigars` Firestore collection acts as a master catalog of every unique cigar logged in HUMI
  - Each entry has: `cigarId` (e.g., HUMI-A1B2C3), `name`, `brand`, `normalizedName`, `normalizedBrand`, `logCount`, `createdAt`, `lastLoggedAt`
  - Matching uses normalized (lowercase, trimmed) name + brand to deduplicate
  - When any user logs a cigar, `cigarTrackingService.js` finds or creates the catalog entry and increments `logCount`
  - Each user's log document also stores the `cigarId` linking it to the master catalog
  - Reanalysis ("Fix Issue") also updates tracking if the cigar name changes
  - **Not visible to users** — purely backend data for analytics
  - Backfill script: `scripts/backfillCigarIds.js` processes all existing user logs (use `--logs-only` flag to skip cigars collection recreation)
  - Initial backfill: 3,177 logs across 821 users → 1,847 unique cigars identified
- **Cigar Activity Collection (Analytics):**
  - Top-level `cigar_activity` Firestore collection for cross-user analytics queries
  - Each document: `userId`, `cigarId`, `cigarName`, `brand`, `overall` (star rating), `notes` (user's review text), `submittedDate`, `createdAt`
  - Written on every cigar log (scan, manual save, offline sync), updated when user adds rating/notes, deleted when user deletes a log
  - Service: `src/services/cigarActivityService.js` — `recordCigarActivity()`, `updateCigarActivity()`, `deleteCigarActivity()`
  - Backfill script: `scripts/backfillCigarActivity.js` (use `--clear` flag to wipe and rebuild)
  - Initial backfill: 3,324 logs across 832 users
  - Enables queries like "most logged cigar in February" or "highest rated cigar this month with user reviews"

## Deployment Process
The app is deployed as a static PWA. When you click "Publish":
1. The build script `scripts/build-web.sh` runs automatically
2. It runs `npx expo export --platform web --clear` to generate fresh bundles
3. Files from `public/` (manifest.json, service-worker.js) are copied to `dist/`
4. The service worker's `__HUMI_BUILD_VERSION__` placeholder is replaced with a unique timestamp (e.g., `build-1770499146`)
5. `dist/version.json` is generated with the build timestamp
6. A verification step ensures no unresolved placeholders remain

**Important:** The `__HUMI_BUILD_VERSION__` placeholder in `public/service-worker.js` must NOT be changed. The build script replaces it with a unique cache-busting version on each deploy, ensuring users get the latest code. Without this, old cached versions persist indefinitely on users' devices.

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