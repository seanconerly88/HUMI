# HUMI - Cigar Logging & Collection App

## Overview

HUMI is a React Native mobile application built with Expo that helps cigar enthusiasts log, track, and collect information about their cigar experiences. The app uses AI-powered image recognition to identify cigars from photos of their bands, maintains a personal "humidor" of logged cigars, and rewards users with collectible digital bands based on their activity patterns.

Key features:
- AI-powered cigar band recognition using OpenAI Vision API
- Personal cigar logging with ratings and notes
- Digital band collection ("Vault") with achievement-based unlocks
- User profiles with statistics tracking
- In-app purchases for premium features
- Firebase backend for authentication, data storage, and file uploads

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React Native with Expo SDK 53, using the standard React Native navigation pattern (not Expo Router for the main app flow).

**Navigation Structure**:
- Root `App.js` manages authentication state and conditional rendering
- `MainTabNavigator.js` provides bottom tab navigation for authenticated users
- Screens: Home (index), Humidor (cigar logging), Vault (band collection), Profile

**State Management**: Local component state with React hooks. No global state library - Firebase handles data persistence.

**Key UI Patterns**:
- Modal-based workflows for adding cigars and viewing details
- Pull-to-refresh on list screens
- Animated modals for band achievement notifications

### Backend Architecture

**Firebase Services**:
- **Authentication**: Email/password, Google Sign-In, Apple Sign-In with AsyncStorage persistence
- **Firestore**: User data, cigar logs, earned bands, and user statistics
- **Cloud Storage**: Cigar images and band artwork

**Data Structure** (Firestore):
```
users/{userId}/
  ├── cigarLogs/{logId}     # Individual cigar entries
  ├── bands/{bandId}        # Earned achievement bands
  └── stats/{statsId}       # Aggregated user statistics
```

### AI Integration

**OpenAI GPT-4 Vision**: Analyzes uploaded cigar band images to identify brand, line, and provide tasting notes. The flow:
1. Image captured/selected → converted to base64
2. Vision API describes the band visually
3. OpenAI Assistant provides detailed cigar information
4. Results displayed for user confirmation/editing

**Local Cigar Database**: `cigar_db.json` contains structured data for 100+ cigar brands with line names and band descriptions, used with Fuse.js for fuzzy search matching.

### Achievement System

Band achievements are defined in `assets/bandRules.json` with trigger conditions:
- Activity-based: log count, consecutive days, weekly frequency
- Preference-based: cigar body types, countries, pairings

The `bands.js` service evaluates rules against user stats after each log entry.

### Build & Deployment

**EAS Build**: Configured for iOS and Android with three profiles:
- `development`: Simulator builds with dev client
- `preview`: Internal distribution
- `production`: App Store/Play Store submission with auto-increment versioning

**OTA Updates**: Expo Updates enabled for production channel, allowing code pushes without store review.

## External Dependencies

### Third-Party Services

| Service | Purpose | Configuration |
|---------|---------|---------------|
| Firebase Auth | User authentication | `config/firebaseConfig.js` |
| Firebase Firestore | NoSQL database | Same config file |
| Firebase Storage | Image/asset storage | Bucket: `humi-75da3.firebasestorage.app` |
| OpenAI API | GPT-4 Vision for cigar recognition | API key via env vars |
| OpenAI Assistants | Structured cigar information | Assistant ID via env vars |
| Brave Search API | Web search fallback | API key via env vars |

### Key NPM Packages

- **expo-camera**: Cigar band photo capture
- **expo-image-picker**: Gallery image selection
- **expo-in-app-purchases**: Subscription handling
- **fuse.js**: Fuzzy search for cigar database
- **react-native-webview**: Embedded video content
- **@react-native-firebase/crashlytics**: Error tracking

### Environment Variables

Required in `.env` for development and EAS secrets for builds:
- `OPENAI_API_KEY`: OpenAI API access
- `ASSISTANT_ID`: OpenAI Assistant identifier
- `BRAVE_API_KEY`: Brave Search API access

Firebase configuration is hardcoded in `config/firebaseConfig.js` (standard practice for client-side Firebase).