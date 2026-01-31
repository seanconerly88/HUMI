const admin = require('firebase-admin');

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!serviceAccountJson) {
  console.error('Error: FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set');
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountJson);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function upgradeCreatorsToInnerCircle() {
  console.log('Starting upgrade of Creator users to Inner Circle...\n');

  try {
    const usersRef = db.collection('users');
    const creatorsSnapshot = await usersRef.where('userType', '==', 'creator').get();

    if (creatorsSnapshot.empty) {
      console.log('No Creator users found to upgrade.');
      return;
    }

    console.log(`Found ${creatorsSnapshot.size} Creator user(s) to upgrade.\n`);

    const batch = db.batch();
    let count = 0;

    creatorsSnapshot.forEach((doc) => {
      const userData = doc.data();
      console.log(`Upgrading user: ${userData.email || doc.id}`);
      
      batch.update(doc.ref, {
        userType: 'inner_circle',
        subscriptionStatus: 'lifetime',
        tier: 'premium',
        upgradedFromCreator: true,
        upgradedFromCreatorAt: new Date().toISOString(),
        previousUserType: 'creator',
        innerCircleWelcomeSeen: false
      });
      
      count++;
    });

    await batch.commit();
    console.log(`\nSuccessfully upgraded ${count} Creator user(s) to Inner Circle!`);
    console.log('They will see the Inner Circle welcome modal on their next login.');
    
  } catch (error) {
    console.error('Error upgrading users:', error);
    process.exit(1);
  }
}

upgradeCreatorsToInnerCircle()
  .then(() => {
    console.log('\nScript completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
