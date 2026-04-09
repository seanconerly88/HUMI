import { useState, useEffect } from 'react';
import { auth } from '../../config/firebaseConfig';
import { BETA_TESTERS } from '../../config/devConfig';

function checkEmail(user) {
  return !!(user?.email && BETA_TESTERS.includes(user.email.toLowerCase()));
}

/**
 * Returns whether the currently signed-in user is a beta tester.
 *
 * Initial state is computed synchronously from auth.currentUser so there is
 * no flash/flicker when the tab navigator first renders (auth is already
 * resolved by the time MainTabNavigator mounts inside the authenticated app).
 *
 * Add emails to BETA_TESTERS in config/devConfig.js to grant access.
 *
 * Usage:
 *   const isBeta = useBetaTester();
 *   if (!isBeta) return <ComingSoon />;
 */
export default function useBetaTester() {
  const [isBeta, setIsBeta] = useState(() => checkEmail(auth.currentUser));

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsBeta(checkEmail(user));
    });
    return unsubscribe;
  }, []);

  return isBeta;
}
