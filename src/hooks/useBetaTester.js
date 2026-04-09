import { useState, useEffect } from 'react';
import { auth } from '../../config/firebaseConfig';
import { BETA_TESTERS } from '../../config/devConfig';

/**
 * Returns whether the currently signed-in user is a beta tester.
 *
 * Beta testers get full Firebase-integrated access to in-progress features.
 * Add emails to BETA_TESTERS in config/devConfig.js to grant access.
 *
 * Usage:
 *   const isBeta = useBetaTester();
 *   if (!isBeta) return <ComingSoon />;
 */
export default function useBetaTester() {
  const [isBeta, setIsBeta] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user?.email && BETA_TESTERS.includes(user.email.toLowerCase())) {
        setIsBeta(true);
      } else {
        setIsBeta(false);
      }
    });
    return unsubscribe;
  }, []);

  return isBeta;
}
