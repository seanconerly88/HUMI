import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  ActivityIndicator,
  Platform,
  Dimensions
} from 'react-native';
import Icon from './components/Icon';
import { db } from '../config/firebaseConfig';
import { collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';

const { width: screenWidth } = Dimensions.get('window');

const SOCIAL_PLATFORMS = {
  instagram: { name: 'Instagram', icon: 'logo-instagram', baseUrl: 'https://instagram.com/' },
  facebook: { name: 'Facebook', icon: 'logo-facebook', baseUrl: 'https://facebook.com/' },
  tiktok: { name: 'TikTok', icon: 'musical-notes', baseUrl: 'https://tiktok.com/@' },
  twitter: { name: 'X/Twitter', icon: 'logo-twitter', baseUrl: 'https://twitter.com/' }
};

const formatDate = (date) => {
  if (!date) return '';
  const d = date instanceof Timestamp ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatDateRange = (startDate, endDate) => {
  const start = startDate instanceof Timestamp ? startDate.toDate() : new Date(startDate);
  const end = endDate instanceof Timestamp ? endDate.toDate() : new Date(endDate);
  
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
};

const getMonthKey = (date) => {
  const d = date instanceof Timestamp ? date.toDate() : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabel = (monthKey) => {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const EventCard = ({ event, isEventOfWeek = false }) => {
  const handleWebsitePress = () => {
    if (event.websiteUrl) {
      Linking.openURL(event.websiteUrl);
    }
  };

  const handleSocialPress = () => {
    const platform = SOCIAL_PLATFORMS[event.socialPlatform];
    if (platform && event.socialHandle) {
      const handle = event.socialHandle.replace('@', '');
      Linking.openURL(`${platform.baseUrl}${handle}`);
    }
  };

  return (
    <View style={[styles.eventCard, isEventOfWeek && styles.eventOfWeekCard]}>
      {isEventOfWeek && (
        <View style={styles.eventOfWeekBadge}>
          <Icon name="star" size={12} color="#fff" />
          <Text style={styles.eventOfWeekBadgeText}>Event of the Week</Text>
        </View>
      )}
      
      <Text style={styles.eventName}>{event.name}</Text>
      
      <View style={styles.eventDateRow}>
        <Icon name="calendar-outline" size={16} color="#8B4513" />
        <Text style={styles.eventDate}>
          {formatDateRange(event.startDate, event.endDate)}
        </Text>
      </View>
      
      {event.location && (
        <View style={styles.eventLocationRow}>
          <Icon name="location-outline" size={16} color="#666" />
          <Text style={styles.eventLocation}>{event.location}</Text>
        </View>
      )}
      
      <Text style={styles.eventSynopsis}>{event.synopsis}</Text>
      
      <View style={styles.eventActions}>
        {event.socialHandle && (
          <TouchableOpacity style={styles.socialButton} onPress={handleSocialPress}>
            <Icon 
              name={SOCIAL_PLATFORMS[event.socialPlatform]?.icon || 'logo-instagram'} 
              size={18} 
              color="#8B4513" 
            />
            <Text style={styles.socialButtonText}>@{event.socialHandle.replace('@', '')}</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.ctaButton} onPress={handleWebsitePress}>
          <Text style={styles.ctaButtonText}>Claim Your Spot</Text>
          <Icon name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const MonthSection = ({ monthKey, events }) => {
  const eventOfWeek = events.find(e => e.isEventOfWeek);
  const regularEvents = events.filter(e => !e.isEventOfWeek);
  const sortedEvents = eventOfWeek ? [eventOfWeek, ...regularEvents] : events;

  return (
    <View style={styles.monthSection}>
      <Text style={styles.monthTitle}>{getMonthLabel(monthKey)}</Text>
      {sortedEvents.map((event) => (
        <EventCard 
          key={event.id} 
          event={event} 
          isEventOfWeek={event.isEventOfWeek}
        />
      ))}
    </View>
  );
};

export default function EventsScreen() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      
      const eventsRef = collection(db, 'events');
      const q = query(eventsRef, orderBy('startDate', 'asc'));

      const querySnapshot = await getDocs(q);
      const fetchedEvents = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const endDate = data.endDate instanceof Timestamp ? data.endDate.toDate() : new Date(data.endDate);
        
        if (endDate >= now) {
          fetchedEvents.push({
            id: doc.id,
            ...data,
            monthKey: getMonthKey(data.startDate)
          });
        }
      });

      setEvents(fetchedEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      if (err.code === 'permission-denied') {
        setError('Permission denied. Please check Firestore rules.');
      } else if (err.code === 'unavailable') {
        setError('Network error. Please check your connection.');
      } else {
        setError('Unable to load events. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const groupedEvents = events.reduce((acc, event) => {
    const key = event.monthKey;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(event);
    return acc;
  }, {});

  const sortedMonths = Object.keys(groupedEvents).sort();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B4513" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color="#8B4513" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchEvents}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events</Text>
        <Text style={styles.headerSubtitle}>Discover cigar gatherings near you</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sortedMonths.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Upcoming Events</Text>
            <Text style={styles.emptyText}>
              Check back soon for cigar events in your area
            </Text>
          </View>
        ) : (
          sortedMonths.map((monthKey) => (
            <MonthSection 
              key={monthKey} 
              monthKey={monthKey} 
              events={groupedEvents[monthKey]} 
            />
          ))
        )}
        
        <View style={styles.submitEventContainer}>
          <Text style={styles.submitEventTitle}>Have an event?</Text>
          <Text style={styles.submitEventText}>
            Want your cigar event featured on HUMI? Get in touch!
          </Text>
          <TouchableOpacity 
            style={styles.submitEventButton}
            onPress={() => Linking.openURL('mailto:events@gethumi.co')}
          >
            <Icon name="mail-outline" size={18} color="#8B4513" />
            <Text style={styles.submitEventButtonText}>Contact Us</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 10,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  monthSection: {
    marginBottom: 24,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 12,
    paddingLeft: 4,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  eventOfWeekCard: {
    borderColor: '#8B4513',
    borderWidth: 2,
    backgroundColor: '#fffbf5',
  },
  eventOfWeekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B4513',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
    gap: 4,
  },
  eventOfWeekBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '600',
  },
  eventLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  eventLocation: {
    fontSize: 13,
    color: '#666',
  },
  eventSynopsis: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 16,
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f0eb',
    borderRadius: 20,
  },
  socialButtonText: {
    fontSize: 13,
    color: '#8B4513',
    fontWeight: '500',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8B4513',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  submitEventContainer: {
    backgroundColor: '#f5f0eb',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  submitEventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8,
  },
  submitEventText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  submitEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  submitEventButtonText: {
    color: '#8B4513',
    fontSize: 14,
    fontWeight: '600',
  },
});
