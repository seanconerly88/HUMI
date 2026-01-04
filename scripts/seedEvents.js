const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, Timestamp, getDocs, query } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SEED_EVENTS = [
  { name: 'Smokers & Jokers', startDate: '2026-01-30', endDate: '2026-02-01', synopsis: 'An exclusive weekend of premium cigars, poker, and networking with fellow enthusiasts.', websiteUrl: 'https://smokersandjokers.com', socialHandle: 'smokersandjokers_weekend', socialPlatform: 'instagram', location: 'Las Vegas, NV' },
  { name: 'Cigar Safari', startDate: '2026-02-13', endDate: '2026-02-17', synopsis: 'Journey to Nicaragua for an immersive experience at world-renowned cigar factories and tobacco farms.', websiteUrl: 'https://cigarsafari.com', socialHandle: 'cigarsafari', socialPlatform: 'instagram', location: 'Estelí, Nicaragua' },
  { name: 'Cigar Safari', startDate: '2026-02-27', endDate: '2026-03-03', synopsis: 'Journey to Nicaragua for an immersive experience at world-renowned cigar factories and tobacco farms.', websiteUrl: 'https://cigarsafari.com', socialHandle: 'cigarsafari', socialPlatform: 'instagram', location: 'Estelí, Nicaragua' },
  { name: 'San Antonio Cigar Festival', startDate: '2026-03-12', endDate: '2026-03-15', synopsis: 'One of the premier cigar events in Texas, featuring top manufacturers, exclusive releases, and live entertainment.', websiteUrl: 'https://www.sacigarfestival.com', socialHandle: 'sacigarfestival', socialPlatform: 'instagram', location: 'San Antonio, TX' },
  { name: 'Cigar Safari', startDate: '2026-03-13', endDate: '2026-03-17', synopsis: 'Journey to Nicaragua for an immersive experience at world-renowned cigar factories and tobacco farms.', websiteUrl: 'https://cigarsafari.com', socialHandle: 'cigarsafari', socialPlatform: 'instagram', location: 'Estelí, Nicaragua' },
  { name: 'Tampa Cigar Week', startDate: '2026-03-18', endDate: '2026-03-22', synopsis: 'A week-long celebration of Tampa\'s cigar heritage with factory tours, tastings, and special releases in Ybor City.', websiteUrl: 'https://tampacigarweek.com', socialHandle: 'tampacigarweek', socialPlatform: 'instagram', location: 'Tampa, FL' },
  { name: 'Puffn Duchess Women\'s Conference', startDate: '2026-03-26', endDate: '2026-03-29', synopsis: 'An empowering gathering for women cigar enthusiasts featuring networking, education, and exclusive experiences.', websiteUrl: 'https://puffnduchess.com', socialHandle: 'puffnduchess', socialPlatform: 'instagram', location: 'Location TBA' },
  { name: 'Orlando Cigar Festival', startDate: '2026-04-01', endDate: '2026-04-04', synopsis: 'Florida\'s premier spring cigar event with manufacturers, retailers, and enthusiasts from around the world.', websiteUrl: 'https://orlandocigarfestival.com', socialHandle: 'orlandocigarfestival', socialPlatform: 'instagram', location: 'Orlando, FL' },
  { name: 'Charlotte Cigar Week', startDate: '2026-04-20', endDate: '2026-04-26', synopsis: 'A week of curated cigar experiences across Charlotte\'s finest lounges and venues.', websiteUrl: 'https://charlottecigarweek.com', socialHandle: 'charlottecigarweek', socialPlatform: 'instagram', location: 'Charlotte, NC' },
  { name: 'Charleston Smoke Out', startDate: '2026-04-30', endDate: '2026-05-03', synopsis: 'Southern charm meets cigar culture in historic Charleston with pairings, tours, and exclusive tastings.', websiteUrl: 'https://chssmokeout.com', socialHandle: 'chssmokeout', socialPlatform: 'instagram', location: 'Charleston, SC' },
  { name: 'Pensacola Cigar Weekend', startDate: '2026-05-01', endDate: '2026-05-03', synopsis: 'Gulf Coast cigar celebration featuring beachside smoking, pairings, and regional exclusives.', websiteUrl: 'https://pensacolacigarweekend.com', socialHandle: 'pensacola_cigar_weekend', socialPlatform: 'instagram', location: 'Pensacola, FL' },
  { name: 'Houston Cigar Week', startDate: '2026-05-19', endDate: '2026-05-24', synopsis: 'Texas-sized cigar celebration with exclusive releases, VIP experiences, and industry legends.', websiteUrl: 'https://houstoncigarweek.com', socialHandle: 'houstoncigarweek', socialPlatform: 'instagram', location: 'Houston, TX', isEventOfWeek: true },
  { name: 'Oak City Cigar Festival', startDate: '2026-06-04', endDate: '2026-06-07', synopsis: 'Raleigh\'s signature cigar event bringing together brands, retailers, and enthusiasts.', websiteUrl: 'https://oceg-nc.com', socialHandle: 'OCEG_nc', socialPlatform: 'instagram', location: 'Raleigh, NC' },
  { name: 'Puffin All Week #313', startDate: '2026-06-11', endDate: '2026-06-14', synopsis: 'Detroit\'s celebration of cigar culture with local lounges, live music, and community vibes.', websiteUrl: 'https://puffinwmp.com', socialHandle: 'puffinwmp', socialPlatform: 'instagram', location: 'Detroit, MI' },
  { name: 'Rose City Cigar & Soul', startDate: '2026-07-09', endDate: '2026-07-12', synopsis: 'Where cigar culture meets soul music in an unforgettable weekend experience.', websiteUrl: 'https://rosecitycigarandsoul.com', socialHandle: 'rosecitycigarandsoul', socialPlatform: 'instagram', location: 'Portland, OR' },
  { name: 'Chicago Cigar Week', startDate: '2026-07-22', endDate: '2026-07-26', synopsis: 'The Windy City\'s premier cigar event with world-class lounges, exclusive releases, and networking.', websiteUrl: 'https://chicagocigarweek.com', socialHandle: 'chicagocigarweek', socialPlatform: 'instagram', location: 'Chicago, IL' },
  { name: 'MKE Cigar Weekend', startDate: '2026-07-31', endDate: '2026-08-02', synopsis: 'Milwaukee\'s annual gathering of cigar lovers with local breweries, lounges, and lakefront events.', websiteUrl: 'https://mkecigarweekend.com', socialHandle: 'Mke_cigar_weekend', socialPlatform: 'instagram', location: 'Milwaukee, WI' },
  { name: 'Smoke en Blanc', startDate: '2026-08-30', endDate: '2026-08-30', synopsis: 'An elegant all-white attire cigar soirée celebrating sophistication and community.', websiteUrl: 'https://smokeenblanc.com', socialHandle: 'smokeenblanc', socialPlatform: 'instagram', location: 'Location TBA' },
  { name: 'Midwest Cigar Lounge Crawl', startDate: '2026-10-01', endDate: '2026-10-03', synopsis: 'Hop between the Midwest\'s finest cigar lounges in this unique crawl experience.', websiteUrl: 'https://midwestcigarlougecrawl.com', socialHandle: 'midwest.cigar.lounge.crawl', socialPlatform: 'instagram', location: 'Midwest Region' },
  { name: 'Smoke & Ashes Festival', startDate: '2026-10-03', endDate: '2026-10-03', synopsis: 'A one-day celebration of cigars, food, and fellowship.', websiteUrl: 'https://smokeashescigarfestival.com', socialHandle: 'smokeashescigarfestival', socialPlatform: 'instagram', location: 'Location TBA' },
  { name: 'Smoke \'N The Desert', startDate: '2026-10-08', endDate: '2026-10-11', synopsis: 'Phoenix\'s desert oasis for cigar enthusiasts with southwestern hospitality and premium smokes.', websiteUrl: 'https://phxcigarweek.com', socialHandle: 'phxcigarweek', socialPlatform: 'instagram', location: 'Phoenix, AZ' },
  { name: 'Alton Cigar Event #9', startDate: '2026-10-17', endDate: '2026-10-17', synopsis: 'The ninth edition of this beloved community cigar gathering.', websiteUrl: 'https://altoncigarevent.com', socialHandle: 'altoncigarevent9', socialPlatform: 'instagram', location: 'Alton, IL' }
];

async function checkExistingEvents() {
  const eventsRef = collection(db, 'events');
  const q = query(eventsRef);
  const snapshot = await getDocs(q);
  return snapshot.size;
}

async function seedEvents() {
  try {
    console.log('Checking for existing events...');
    const existingCount = await checkExistingEvents();
    
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing events. Skipping seed to avoid duplicates.`);
      console.log('Delete existing events first if you want to re-seed.');
      process.exit(0);
    }
    
    console.log(`Seeding ${SEED_EVENTS.length} events...`);
    
    for (const event of SEED_EVENTS) {
      const eventData = {
        name: event.name,
        startDate: Timestamp.fromDate(new Date(event.startDate + 'T00:00:00')),
        endDate: Timestamp.fromDate(new Date(event.endDate + 'T23:59:59')),
        synopsis: event.synopsis,
        websiteUrl: event.websiteUrl,
        socialHandle: event.socialHandle,
        socialPlatform: event.socialPlatform,
        location: event.location,
        isEventOfWeek: event.isEventOfWeek || false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: 'admin-seed'
      };
      
      const docRef = await addDoc(collection(db, 'events'), eventData);
      console.log(`Added: ${event.name} (${docRef.id})`);
    }
    
    console.log(`\nSuccessfully seeded ${SEED_EVENTS.length} events!`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding events:', error);
    process.exit(1);
  }
}

seedEvents();
