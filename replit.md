# HUMI - Cigar Tracking Application

## Overview
HUMI is an Expo SDK 53 React Native mobile application for cigar enthusiasts to log, rate, and track their cigar experiences. The app uses Firebase for authentication and Firestore for data storage.

## Current State
- **Branch**: layout-ordering
- **Framework**: Expo SDK 53 with React Native
- **Platform**: Web (via Metro bundler with reverse proxy)
- **Status**: Fully functional - login screen displaying correctly

## Project Architecture

### Entry Points
- `index.js` - Main entry point that registers App.js
- `App.js` - Root component handling authentication flow and navigation

### Key Directories
- `app/` - Screen components (home, login, onboarding, etc.)
- `config/` - Firebase configuration
- `src/navigation/` - React Navigation setup

### Technical Setup
- **Web Server**: Reverse proxy on port 5000 forwarding to Metro bundler on port 8081
- **Bundler**: Metro (Expo SDK 53 default for web)
- **Authentication**: Firebase Auth with Google Sign-in support
- **Database**: Firestore

## Running the Application

### Development
The app runs via the "Expo Web" workflow which:
1. Starts the reverse proxy on port 5000
2. Launches Metro bundler on port 8081
3. Serves the web application

### Environment Variables (Optional)
- `OPENAI_API_KEY` - For AI-powered recommendations
- `ASSISTANT_ID` - OpenAI Assistant configuration
- `BRAVE_API_KEY` - For web search features

## Recent Changes
- **Dec 1, 2025**: Initial Replit setup from layout-ordering branch
- Updated all Expo packages to SDK 53 compatible versions
- Created reverse proxy solution for Replit's port 5000 requirement
- Configured app.config.js with web platform settings

## Dependencies
Key dependencies include:
- expo@53.0.24
- react-native@0.79.6
- firebase@11.7.1
- @react-navigation/native@7.1.8
- react-native-gesture-handler@2.24.0

## Notes
- The app shows a white/loading screen on initial load while Firebase auth initializes
- Firebase credentials are stored in `config/firebaseConfig.js`
- App supports iOS, Android, and Web platforms
