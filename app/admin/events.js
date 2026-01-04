import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import Icon from '../components/Icon';
import { auth, db } from '../../config/firebaseConfig';
import { 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc, 
  getDocs, 
  query, 
  orderBy,
  Timestamp,
  getDoc
} from 'firebase/firestore';

const ADMIN_EMAILS = ['paula@gethumi.co', 'admin@gethumi.co'];

const SEED_EVENTS = [
  { name: 'San Antonio Cigar Festival', startDate: '2026-03-12', endDate: '2026-03-15', synopsis: 'One of the premier cigar events in Texas, featuring top manufacturers, exclusive releases, and live entertainment.', websiteUrl: 'https://www.sacigarfestival.com', socialHandle: 'sacigarfestival', socialPlatform: 'instagram', location: 'San Antonio, TX' },
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

const SOCIAL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'twitter', label: 'X/Twitter' }
];

export default function AdminEventsScreen() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    synopsis: '',
    websiteUrl: '',
    socialHandle: '',
    socialPlatform: 'instagram',
    location: '',
    isEventOfWeek: false
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      const hasAdminEmail = ADMIN_EMAILS.includes(user.email?.toLowerCase());
      const hasAdminRole = userData?.role === 'admin';
      
      if (hasAdminEmail || hasAdminRole) {
        setIsAdmin(true);
        await fetchEvents();
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const eventsRef = collection(db, 'events');
      const q = query(eventsRef, orderBy('startDate', 'asc'));
      const querySnapshot = await getDocs(q);
      
      const fetchedEvents = [];
      querySnapshot.forEach((doc) => {
        fetchedEvents.push({ id: doc.id, ...doc.data() });
      });
      
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      Alert.alert('Error', 'Failed to load events');
    }
  };

  const handleSeedEvents = async () => {
    Alert.alert(
      'Seed Events',
      `This will add ${SEED_EVENTS.length} events from the 2026 cigar calendar. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Seed Events',
          onPress: async () => {
            try {
              setSubmitting(true);
              let added = 0;
              
              for (const event of SEED_EVENTS) {
                const eventData = {
                  name: event.name,
                  startDate: Timestamp.fromDate(new Date(event.startDate)),
                  endDate: Timestamp.fromDate(new Date(event.endDate)),
                  synopsis: event.synopsis,
                  websiteUrl: event.websiteUrl,
                  socialHandle: event.socialHandle,
                  socialPlatform: event.socialPlatform,
                  location: event.location,
                  isEventOfWeek: event.isEventOfWeek || false,
                  createdAt: Timestamp.now(),
                  updatedAt: Timestamp.now(),
                  createdBy: auth.currentUser?.uid || 'admin'
                };
                
                await addDoc(collection(db, 'events'), eventData);
                added++;
              }
              
              Alert.alert('Success', `Added ${added} events successfully!`);
              await fetchEvents();
            } catch (error) {
              console.error('Error seeding events:', error);
              Alert.alert('Error', 'Failed to seed events. Please try again.');
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      startDate: '',
      endDate: '',
      synopsis: '',
      websiteUrl: '',
      socialHandle: '',
      socialPlatform: 'instagram',
      location: '',
      isEventOfWeek: false
    });
    setEditingEvent(null);
    setShowForm(false);
  };

  const handleEdit = (event) => {
    const startDate = event.startDate instanceof Timestamp 
      ? event.startDate.toDate().toISOString().split('T')[0]
      : event.startDate;
    const endDate = event.endDate instanceof Timestamp 
      ? event.endDate.toDate().toISOString().split('T')[0]
      : event.endDate;

    setFormData({
      name: event.name || '',
      startDate: startDate,
      endDate: endDate,
      synopsis: event.synopsis || '',
      websiteUrl: event.websiteUrl || '',
      socialHandle: event.socialHandle || '',
      socialPlatform: event.socialPlatform || 'instagram',
      location: event.location || '',
      isEventOfWeek: event.isEventOfWeek || false
    });
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleDelete = async (eventId) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'events', eventId));
              await fetchEvents();
              Alert.alert('Success', 'Event deleted');
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event');
            }
          }
        }
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Start Date, End Date)');
      return;
    }
    
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      Alert.alert('Error', 'Please enter valid dates in YYYY-MM-DD format');
      return;
    }
    
    if (startDate > endDate) {
      Alert.alert('Error', 'Start date must be before or equal to end date');
      return;
    }

    try {
      setSubmitting(true);

      const eventData = {
        name: formData.name.trim(),
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        synopsis: formData.synopsis.trim(),
        websiteUrl: formData.websiteUrl.trim(),
        socialHandle: formData.socialHandle.trim().replace('@', ''),
        socialPlatform: formData.socialPlatform,
        location: formData.location.trim(),
        isEventOfWeek: formData.isEventOfWeek,
        updatedAt: Timestamp.now()
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), eventData);
        Alert.alert('Success', 'Event updated successfully');
      } else {
        eventData.createdAt = Timestamp.now();
        eventData.createdBy = auth.currentUser?.uid || 'admin';
        await addDoc(collection(db, 'events'), eventData);
        Alert.alert('Success', 'Event added successfully');
      }

      resetForm();
      await fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      Alert.alert('Error', 'Failed to save event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDisplayDate = (date) => {
    if (!date) return '';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8B4513" />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Icon name="lock-closed-outline" size={64} color="#ccc" />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>
            You don't have permission to access this page.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Event Management</Text>
        <View style={styles.headerButtons}>
          {events.length === 0 && (
            <TouchableOpacity 
              style={styles.seedButton}
              onPress={handleSeedEvents}
              disabled={submitting}
            >
              <Icon name="cloud-download" size={20} color="#8B4513" />
              <Text style={styles.seedButtonText}>Seed</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowForm(!showForm)}
          >
            <Icon name={showForm ? 'close' : 'add'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {editingEvent ? 'Edit Event' : 'Add New Event'}
            </Text>

            <Text style={styles.label}>Event Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="e.g., Tampa Cigar Week"
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Start Date *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.startDate}
                  onChangeText={(text) => setFormData({ ...formData, startDate: text })}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>End Date *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.endDate}
                  onChangeText={(text) => setFormData({ ...formData, endDate: text })}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              placeholder="e.g., Tampa, FL"
            />

            <Text style={styles.label}>Synopsis</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.synopsis}
              onChangeText={(text) => setFormData({ ...formData, synopsis: text })}
              placeholder="Brief description of the event..."
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Event Website URL</Text>
            <TextInput
              style={styles.input}
              value={formData.websiteUrl}
              onChangeText={(text) => setFormData({ ...formData, websiteUrl: text })}
              placeholder="https://example.com"
              keyboardType="url"
              autoCapitalize="none"
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Social Handle</Text>
                <TextInput
                  style={styles.input}
                  value={formData.socialHandle}
                  onChangeText={(text) => setFormData({ ...formData, socialHandle: text })}
                  placeholder="@username"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Platform</Text>
                <View style={styles.platformButtons}>
                  {SOCIAL_PLATFORMS.map((platform) => (
                    <TouchableOpacity
                      key={platform.id}
                      style={[
                        styles.platformButton,
                        formData.socialPlatform === platform.id && styles.platformButtonActive
                      ]}
                      onPress={() => setFormData({ ...formData, socialPlatform: platform.id })}
                    >
                      <Text style={[
                        styles.platformButtonText,
                        formData.socialPlatform === platform.id && styles.platformButtonTextActive
                      ]}>
                        {platform.label.substring(0, 2)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setFormData({ ...formData, isEventOfWeek: !formData.isEventOfWeek })}
            >
              <View style={[styles.checkbox, formData.isEventOfWeek && styles.checkboxChecked]}>
                {formData.isEventOfWeek && <Icon name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>Event of the Week ($250 premium)</Text>
            </TouchableOpacity>

            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingEvent ? 'Update Event' : 'Add Event'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>All Events ({events.length})</Text>

        {events.map((event) => (
          <View key={event.id} style={[styles.eventCard, event.isEventOfWeek && styles.eventOfWeekCard]}>
            {event.isEventOfWeek && (
              <View style={styles.eventOfWeekBadge}>
                <Text style={styles.eventOfWeekBadgeText}>Event of Week</Text>
              </View>
            )}
            <Text style={styles.eventName}>{event.name}</Text>
            <Text style={styles.eventDate}>
              {formatDisplayDate(event.startDate)} - {formatDisplayDate(event.endDate)}
            </Text>
            {event.location && <Text style={styles.eventLocation}>{event.location}</Text>}
            
            <View style={styles.eventActions}>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => handleEdit(event)}
              >
                <Icon name="create-outline" size={18} color="#8B4513" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDelete(event.id)}
              >
                <Icon name="trash-outline" size={18} color="#e74c3c" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {events.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="calendar-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No events yet. Add your first event above!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  accessDeniedText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 10,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  seedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f5f0eb',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  seedButtonText: {
    color: '#8B4513',
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#8B4513',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  platformButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  platformButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  platformButtonActive: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  platformButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  platformButtonTextActive: {
    color: '#fff',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#8B4513',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#8B4513',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  eventOfWeekCard: {
    borderColor: '#8B4513',
    borderWidth: 2,
  },
  eventOfWeekBadge: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  eventOfWeekBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 13,
    color: '#8B4513',
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 13,
    color: '#666',
  },
  eventActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
});
