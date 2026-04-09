// Development configuration flags
export const DEV_MODE = false; // Set to false for production
export const SKIP_AUTH = false; // Change this to false to see the login screen

// Beta tester allowlist — users in this list get early access to in-progress features
// with full Firebase integration (real Firestore reads/writes, real auth).
// Everyone else either doesn't see the feature or sees a placeholder.
export const BETA_TESTERS = [
  'conerly.sean@gmail.com',
];