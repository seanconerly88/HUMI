const admin = require('firebase-admin');

const featuredContent = [
  {
    title: "How to Properly Light Your Cigar",
    subtitle: "HUMI Featured",
    category: "Tips & Tricks",
    icon: "flame-outline",
    link: "https://www.instagram.com/reel/DTymQK_kXip/?igsh=dXQwbzhvaDZrcm9s",
    experienceLevel: "beginner",
    featured: true,
    priority: 1,
    createdAt: new Date().toISOString()
  },
  {
    title: "How to Properly Cut Your Cigar",
    subtitle: "HUMI Featured",
    category: "Tips & Tricks",
    icon: "cut-outline",
    link: "https://www.instagram.com/reel/DTyltnJkWXN/?igsh=MWk4ODNscmh0M3A0eA==",
    experienceLevel: "beginner",
    featured: true,
    priority: 2,
    createdAt: new Date().toISOString()
  }
];

async function importFeaturedContent() {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (!serviceAccountJson) {
      console.error('Error: FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set');
      process.exit(1);
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    const db = admin.firestore();
    const recommendationsRef = db.collection('recommendations');

    console.log('Importing featured content to Firestore...');

    for (const content of featuredContent) {
      const docId = content.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
      await recommendationsRef.doc(docId).set(content, { merge: true });
      console.log(`Added: ${content.title}`);
    }

    console.log('\nFeatured content import complete!');
    console.log(`Total items added: ${featuredContent.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error importing featured content:', error);
    process.exit(1);
  }
}

importFeaturedContent();
