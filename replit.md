# HUMI - Digital Cigar Lounge

## Overview
HUMI is a Progressive Web App (PWA) for cigar enthusiasts, enabling them to log and rate cigars, connect with a community, and utilize AI-powered cigar scanning. It's designed as a standalone PWA with Stripe payments to offer a tiered access model (Free and Premium). HUMI's vision is to become the "Digital Cigar Lounge" for cigar aficionados.

## User Preferences
I want iterative development.
Ask before making major changes.
I prefer detailed explanations.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.
Never render the "HUMI" wordmark in gold. Use white, cream, or the brown brand color instead.

## System Architecture
HUMI is built using Expo SDK 53 and React Native Web, prioritizing a mobile-first PWA experience with responsive design adapting to web platforms.

**UI/UX Decisions:**
- **Design Philosophy:** Mobile-first, responsive layouts for web (e.g., 2-3 column grids for desktop Humidor and Events).
- **PWA Integration:** Mobile-only PWA install prompts, "Welcome to HUMI" screen for new web users guiding them to "Add to Home Screen."
- **Branding & Aesthetics:** Consistent, premium look with elegant geometric symbols for icons and a light gray (`#f9f9f9`) global background.
- **Layouts:** Responsive login/onboarding, centered card layout for Feed (max-width on desktop), and a two-column desktop home screen with a stats sidebar.

**Technical Implementations:**
- **Core Technologies:** Expo SDK 53, React Native Web.
- **Process Architecture:** A `proxy.js` acts as the single entry point, managing an HTTP proxy/API server and supervising the Expo process with automatic restarts.
- **PWA Enhancements:** Utilizes `manifest.json`, `service-worker.js` for offline caching, and a custom viewport height fix (`--app-height` CSS variable) to address mobile browser UI issues.
- **Authentication & Database:** Firebase Auth for user authentication (Google Sign-in) and Firestore for data storage.
- **State Management:** React Navigation handles application navigation.
- **Responsive Design:** `Platform` and `useWindowDimensions` are used for dynamic styling based on device and screen size.

**Feature Specifications:**
- **Tiered Access:** Free tier (limited AI scans, comments) and Premium tier (unlimited features, monthly/annually priced). New users go through a payment-first onboarding (card on file, 7-day or promo-extended free trial, auto-billed after trial via Stripe). The payment step uses Stripe's `PaymentRequestButton` — on iOS/Android this triggers native Apple Pay (Face ID) or Google Pay with no card form. A card form fallback is shown when native wallets are unavailable. Existing users upgrade via the existing EmbeddedCheckoutModal.
- **AI-Powered Cigar Scanning:** Integrates OpenAI Responses API for unified cigar band image analysis and database matching using `gpt-4o` and a dedicated vector store.
- **Personal Journal Direction:** HUMI has pivoted from a community play to a personal cigar journal. The Feed tab has been removed. The app now focuses on personal tracking, humidor management, and the Top 10 feature.
- **Top 10:** Users can curate a ranked list of their 10 favorite cigars. **Entry is earned:** the only way to add a cigar is to smoke it and give it 4 or 5 stars. After saving a qualifying rating, a bottom sheet prompts "Add to Your Top 10? / Yes / Not this time." If the list has room, the cigar is added and a celebration overlay appears. If the list is full (10/10), the user is shown their current list and must remove one to make room — the new cigar auto-fills that slot. Reorderable via drag-and-drop in the Top 10 tab (hold the ≡ handle on the right side of each row and drag up/down). Data stored in `users/{uid}.top10[]`. When a scanned cigar is in the user's Top 10, the scan result shows a gold banner: "This is your #3 cigar in your Top 10 right now." Service layer: `src/services/top10Service.js`.
- **Gamification (Dev/Testing):** A "Bands" feature for collectible cigar bands earned through app usage, displayed in a trophy case.
- **Events & Content:** Discoverable national cigar events, a "Cigar of the Month" feature with educational content and affiliate links.
- **Referral Program:** Users can share unique referral codes for subscription extensions for referrers and discounts for new users.
- **VIP Bypass Codes:** Special codes that skip the payment screen entirely. The code `GTT 2026` (5 uses max, 48-hour access) is configured for VIP demos. When entered on the payment screen, Firestore is checked atomically (`promoCodes/GTT2026`), premium access is granted, and the user is taken directly to a personalized `VIPWelcomeStep` ("Greetings, Mr. Johnson."). Config: `src/services/subscriptionService.js` → `VIP_BYPASS_CODES`. To add new codes: add to `VIP_BYPASS_CODES` and create a Firestore `promoCodes/{id}` doc with `maxUses`, `uses:[]`, `durationHours`, `active:true`.
- **Admin Moderation:** Super admins can soft-delete posts and comments with an audit trail.
- **Analytics:** Backend-only `cigars` collection for master catalog tracking and `cigar_activity` for cross-user analytics.
- **Brand Spotlight Partners:** When a brand becomes a Spotlight Partner, any scan of their cigars shows a ✦ Brand Spotlight badge on the HUMI Found It result (all users). The humidor cigar detail page shows the full Brand Spotlight card with curated videos and social links at the bottom (all users). Data lives in Firestore `brandSpotlights/{brandKey}` + Firebase Storage `brand-spotlights/{brandKey}/`. First partner: Guido Cigars. To add a partner: add a Firestore doc + upload videos to Storage — no code deploy needed.

## Beta Tester System
New in-progress features are gated behind an email allowlist so they can be tested with full Firebase integration before general release.
- **Config:** `config/devConfig.js` → `BETA_TESTERS` array (list of allowed emails)
- **Hook:** `src/hooks/useBetaTester.js` → `useBetaTester()` returns `true` if the signed-in user's email is in the list
- **Usage:** `const isBeta = useBetaTester(); if (!isBeta) return <ComingSoon />;`
- **Preview mode:** `?preview=lounges` (and similar) bypasses auth entirely for unauthenticated UI testing
- **Current beta features:** None — Smoke Spots launched publicly (April 2026). All users see the Spots tab with full check-in functionality.

## External Dependencies
- **Firebase:** Authentication and Firestore database.
- **Stripe:** Payment processing and subscription management.
- **OpenAI:** AI-powered cigar scanning and content generation.
- **Brave API:** Web search functionalities.
- **React Navigation:** Application navigation.
- **expo-sharing & expo-media-library:** Mobile photo download and sharing.