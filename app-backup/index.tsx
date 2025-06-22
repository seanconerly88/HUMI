import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Page() {
  const router = useRouter();
  const [recentCigars, setRecentCigars] = useState([
    {
      id: '1',
      cigarName: 'Montecristo No. 2',
      imageUrl: 'https://via.placeholder.com/100?text=Monte',
      dateDisplay: 'Yesterday',
      overall: 4
    },
    {
      id: '2',
      cigarName: 'Cohiba Robusto',
      imageUrl: 'https://via.placeholder.com/100?text=Cohiba',
      dateDisplay: '2 days ago',
      overall: 5
    }
  ]);
  
  const [stats, setStats] = useState({
    totalCigars: 32,
    badges: 12,
    avgRating: 4.2
  });
  
  const [latestBadge, setLatestBadge] = useState({
    id: 'first-ash',
    name: 'First Ash',
    description: 'Completed your first full cigar journal entry',
    date: 'April 28, 2025',
    image: 'https://via.placeholder.com/200x100?text=First+Ash'
  });
  
  const navigateToHumidor = () => {
    router.push('/humidor');
  };
  
  const navigateToAddCigar = () => {
    // This will pass the action parameter to the humidor screen
    router.navigate({
      pathname: '/humidor',
      params: { action: 'add' }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>HUMI</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="search" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="notifications-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back, Alex</Text>
          <Text style={styles.dateText}>Wednesday, April 30, 2025</Text>
        </View>
        
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalCigars}</Text>
            <Text style={styles.statLabel}>Cigars Logged</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.badges}</Text>
            <Text style={styles.statLabel}>Badges Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.avgRating}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>
        
        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={navigateToHumidor}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.activityCardContainer}>
          {recentCigars.length > 0 ? (
            recentCigars.map((cigar) => (
              <TouchableOpacity 
                key={cigar.id} 
                style={styles.activityCard}
                onPress={() => router.push(`/humidor/${cigar.id}` as any)}
              >
                <Image 
                  source={{ uri: cigar.imageUrl }}
                  style={styles.activityImage}
                />
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{cigar.cigarName}</Text>
                  <Text style={styles.activityDate}>{cigar.dateDisplay}</Text>
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons 
                        key={star}
                        name={star <= cigar.overall ? "star" : "star-outline"} 
                        size={16} 
                        color="#8B4513" 
                      />
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No cigars logged yet</Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={navigateToAddCigar}
              >
                <Text style={styles.emptyStateButtonText}>Add Your First Cigar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Latest Badge */}
        {latestBadge && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Latest Badge</Text>
            </View>
            
            <View style={styles.badgeContainer}>
              <Image 
                source={{ uri: latestBadge.image }}
                style={styles.badgeImage}
              />
              <Text style={styles.badgeTitle}>{latestBadge.name}</Text>
              <Text style={styles.badgeDescription}>{latestBadge.description}</Text>
              <Text style={styles.badgeDate}>Earned on {latestBadge.date}</Text>
            </View>
          </>
        )}
        
        {/* Recommendations */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended For You</Text>
        </View>
        
        <ScrollView horizontal={true} style={styles.recommendationsContainer} showsHorizontalScrollIndicator={false}>
          <TouchableOpacity style={styles.recommendationCard}>
            <Image 
              source={{ uri: 'https://via.placeholder.com/150?text=Article' }}
              style={styles.recommendationImage}
            />
            <Text style={styles.recommendationTitle}>How to Cut a Torpedo</Text>
            <Text style={styles.recommendationSubtitle}>Tips & Tricks</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.recommendationCard}>
            <Image 
              source={{ uri: 'https://via.placeholder.com/150?text=Pairing' }}
              style={styles.recommendationImage}
            />
            <Text style={styles.recommendationTitle}>Perfect Whiskey Pairings</Text>
            <Text style={styles.recommendationSubtitle}>Lifestyle</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.recommendationCard}>
            <Image 
              source={{ uri: 'https://via.placeholder.com/150?text=Event' }}
              style={styles.recommendationImage}
            />
            <Text style={styles.recommendationTitle}>Upcoming Cigar Events</Text>
            <Text style={styles.recommendationSubtitle}>Community</Text>
          </TouchableOpacity>
        </ScrollView>
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.quickAddButton}
        onPress={navigateToAddCigar}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#8B4513',
    paddingTop: 50, // Extra padding for status bar
  },
  headerText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
  },
  headerIcons: {
    flexDirection: 'row',
  },
  headerIcon: {
    marginLeft: 15,
  },
  scrollView: {
    flex: 1,
  },
  welcomeSection: {
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#8B4513',
  },
  activityCardContainer: {
    paddingHorizontal: 16,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  activityImage: {
    width: 80,
    height: 80,
  },
  activityContent: {
    flex: 1,
    padding: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  activityDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
  },
  badgeContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeImage: {
    width: 200,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  badgeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  badgeDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  badgeDate: {
    fontSize: 12,
    color: '#999',
  },
  recommendationsContainer: {
    paddingLeft: 16,
    paddingBottom: 30,
  },
  recommendationCard: {
    width: 180,
    backgroundColor: 'white',
    borderRadius: 10,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  recommendationImage: {
    width: 180,
    height: 100,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    padding: 10,
    paddingBottom: 4,
  },
  recommendationSubtitle: {
    fontSize: 12,
    color: '#8B4513',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  quickAddButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#8B4513',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    margin: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});