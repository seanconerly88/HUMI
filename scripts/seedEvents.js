const admin = require('firebase-admin');

const events = [
  {
    name: 'San Antonio Cigar Festival',
    startDate: new Date('2026-03-12'),
    endDate: new Date('2026-03-15'),
    synopsis: 'One of the premier cigar events in Texas, featuring top manufacturers, exclusive releases, and live entertainment.',
    websiteUrl: 'https://www.sacigarfestival.com',
    socialHandle: 'sacigarfestival',
    socialPlatform: 'instagram',
    location: 'San Antonio, TX',
    isEventOfWeek: false
  },
  {
    name: 'Tampa Cigar Week',
    startDate: new Date('2026-03-18'),
    endDate: new Date('2026-03-22'),
    synopsis: 'A week-long celebration of Tampa\'s cigar heritage with factory tours, tastings, and special releases in Ybor City.',
    websiteUrl: 'https://tampacigarweek.com',
    socialHandle: 'tampacigarweek',
    socialPlatform: 'instagram',
    location: 'Tampa, FL',
    isEventOfWeek: false
  },
  {
    name: 'Puffn Duchess Women\'s Conference',
    startDate: new Date('2026-03-26'),
    endDate: new Date('2026-03-29'),
    synopsis: 'An empowering gathering for women cigar enthusiasts featuring networking, education, and exclusive experiences.',
    websiteUrl: 'https://puffnduchess.com',
    socialHandle: 'puffnduchess',
    socialPlatform: 'instagram',
    location: 'Location TBA',
    isEventOfWeek: false
  },
  {
    name: 'Orlando Cigar Festival',
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-04-04'),
    synopsis: 'Florida\'s premier spring cigar event with manufacturers, retailers, and enthusiasts from around the world.',
    websiteUrl: 'https://orlandocigarfestival.com',
    socialHandle: 'orlandocigarfestival',
    socialPlatform: 'instagram',
    location: 'Orlando, FL',
    isEventOfWeek: false
  },
  {
    name: 'Charlotte Cigar Week',
    startDate: new Date('2026-04-20'),
    endDate: new Date('2026-04-26'),
    synopsis: 'A week of curated cigar experiences across Charlotte\'s finest lounges and venues.',
    websiteUrl: 'https://charlottecigarweek.com',
    socialHandle: 'charlottecigarweek',
    socialPlatform: 'instagram',
    location: 'Charlotte, NC',
    isEventOfWeek: false
  },
  {
    name: 'Charleston Smoke Out',
    startDate: new Date('2026-04-30'),
    endDate: new Date('2026-05-03'),
    synopsis: 'Southern charm meets cigar culture in historic Charleston with pairings, tours, and exclusive tastings.',
    websiteUrl: 'https://chssmokeout.com',
    socialHandle: 'chssmokeout',
    socialPlatform: 'instagram',
    location: 'Charleston, SC',
    isEventOfWeek: false
  },
  {
    name: 'Pensacola Cigar Weekend',
    startDate: new Date('2026-05-01'),
    endDate: new Date('2026-05-03'),
    synopsis: 'Gulf Coast cigar celebration featuring beachside smoking, pairings, and regional exclusives.',
    websiteUrl: 'https://pensacolacigarweekend.com',
    socialHandle: 'pensacola_cigar_weekend',
    socialPlatform: 'instagram',
    location: 'Pensacola, FL',
    isEventOfWeek: false
  },
  {
    name: 'Houston Cigar Week',
    startDate: new Date('2026-05-19'),
    endDate: new Date('2026-05-24'),
    synopsis: 'Texas-sized cigar celebration with exclusive releases, VIP experiences, and industry legends.',
    websiteUrl: 'https://houstoncigarweek.com',
    socialHandle: 'houstoncigarweek',
    socialPlatform: 'instagram',
    location: 'Houston, TX',
    isEventOfWeek: true
  },
  {
    name: 'Oak City Cigar Festival',
    startDate: new Date('2026-06-04'),
    endDate: new Date('2026-06-07'),
    synopsis: 'Raleigh\'s signature cigar event bringing together brands, retailers, and enthusiasts.',
    websiteUrl: 'https://oceg-nc.com',
    socialHandle: 'OCEG_nc',
    socialPlatform: 'instagram',
    location: 'Raleigh, NC',
    isEventOfWeek: false
  },
  {
    name: 'Puffin All Week #313',
    startDate: new Date('2026-06-11'),
    endDate: new Date('2026-06-14'),
    synopsis: 'Detroit\'s celebration of cigar culture with local lounges, live music, and community vibes.',
    websiteUrl: 'https://puffinwmp.com',
    socialHandle: 'puffinwmp',
    socialPlatform: 'instagram',
    location: 'Detroit, MI',
    isEventOfWeek: false
  },
  {
    name: 'Rose City Cigar & Soul',
    startDate: new Date('2026-07-09'),
    endDate: new Date('2026-07-12'),
    synopsis: 'Where cigar culture meets soul music in an unforgettable weekend experience.',
    websiteUrl: 'https://rosecitycigarandsoul.com',
    socialHandle: 'rosecitycigarandsoul',
    socialPlatform: 'instagram',
    location: 'Portland, OR',
    isEventOfWeek: false
  },
  {
    name: 'Chicago Cigar Week',
    startDate: new Date('2026-07-22'),
    endDate: new Date('2026-07-26'),
    synopsis: 'The Windy City\'s premier cigar event with world-class lounges, exclusive releases, and networking.',
    websiteUrl: 'https://chicagocigarweek.com',
    socialHandle: 'chicagocigarweek',
    socialPlatform: 'instagram',
    location: 'Chicago, IL',
    isEventOfWeek: false
  },
  {
    name: 'MKE Cigar Weekend',
    startDate: new Date('2026-07-31'),
    endDate: new Date('2026-08-02'),
    synopsis: 'Milwaukee\'s annual gathering of cigar lovers with local breweries, lounges, and lakefront events.',
    websiteUrl: 'https://mkecigarweekend.com',
    socialHandle: 'Mke_cigar_weekend',
    socialPlatform: 'instagram',
    location: 'Milwaukee, WI',
    isEventOfWeek: false
  },
  {
    name: 'Smoke en Blanc',
    startDate: new Date('2026-08-30'),
    endDate: new Date('2026-08-30'),
    synopsis: 'An elegant all-white attire cigar soirée celebrating sophistication and community.',
    websiteUrl: 'https://smokeenblanc.com',
    socialHandle: 'smokeenblanc',
    socialPlatform: 'instagram',
    location: 'Location TBA',
    isEventOfWeek: false
  },
  {
    name: 'Midwest Cigar Lounge Crawl',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-03'),
    synopsis: 'Hop between the Midwest\'s finest cigar lounges in this unique crawl experience.',
    websiteUrl: 'https://midwestcigarlougecrawl.com',
    socialHandle: 'midwest.cigar.lounge.crawl',
    socialPlatform: 'instagram',
    location: 'Midwest Region',
    isEventOfWeek: false
  },
  {
    name: 'Smoke & Ashes Festival',
    startDate: new Date('2026-10-03'),
    endDate: new Date('2026-10-03'),
    synopsis: 'A one-day celebration of cigars, food, and fellowship.',
    websiteUrl: 'https://smokeashescigarfestival.com',
    socialHandle: 'smokeashescigarfestival',
    socialPlatform: 'instagram',
    location: 'Location TBA',
    isEventOfWeek: false
  },
  {
    name: 'Smoke \'N The Desert',
    startDate: new Date('2026-10-08'),
    endDate: new Date('2026-10-11'),
    synopsis: 'Phoenix\'s desert oasis for cigar enthusiasts with southwestern hospitality and premium smokes.',
    websiteUrl: 'https://phxcigarweek.com',
    socialHandle: 'phxcigarweek',
    socialPlatform: 'instagram',
    location: 'Phoenix, AZ',
    isEventOfWeek: false
  },
  {
    name: 'Alton Cigar Event #9',
    startDate: new Date('2026-10-17'),
    endDate: new Date('2026-10-17'),
    synopsis: 'The ninth edition of this beloved community cigar gathering.',
    websiteUrl: 'https://altoncigarevent.com',
    socialHandle: 'altoncigarevent9',
    socialPlatform: 'instagram',
    location: 'Alton, IL',
    isEventOfWeek: false
  }
];

console.log('Events to seed:', JSON.stringify(events, null, 2));
console.log('\nTo seed these events, use the admin interface at /admin/events');
console.log('or manually add them via Firestore console.');
