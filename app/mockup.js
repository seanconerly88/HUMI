import React from 'react';
import { View, Text, ScrollView, StyleSheet, Image, useWindowDimensions, Platform } from 'react-native';

const placeholderCigar = {
  name: "Padrón 1964 Anniversary Series",
  image: "https://images.unsplash.com/photo-1589578527966-fdac0f44566c?w=400",
  humiDetails: "Crafted in Nicaragua's Jalapa Valley since 1994, this box-pressed masterpiece celebrates the family's 30-year anniversary. The Nicaraguan sun-grown maduro wrapper delivers exceptional complexity with a medium-full body that has earned it a 95-point rating from Cigar Aficionado.",
  tastingNotes: [
    "Rich espresso",
    "Dark chocolate",
    "Toasted cedar",
    "Subtle leather",
    "Black pepper finish"
  ],
  pairings: [
    "Aged rum (Zacapa 23)",
    "Single malt scotch",
    "Cold brew coffee",
    "Dark chocolate (70%+)",
    "Aged cheddar"
  ],
  rating: 4.5,
  strength: "Medium-Full",
  origin: "Nicaragua"
};

export default function MockupScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const cardWidth = isDesktop ? Math.min(500, width - 48) : width - 32;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerTitle}>Design Mockup</Text>
      <Text style={styles.headerSubtitle}>New HUMI Details Layout</Text>

      <View style={[styles.cigarCard, { width: cardWidth }]}>
        <Image 
          source={{ uri: placeholderCigar.image }}
          style={styles.cigarImage}
          resizeMode="cover"
        />
        
        <View style={styles.cigarHeader}>
          <Text style={styles.cigarName}>{placeholderCigar.name}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>{placeholderCigar.strength}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>{placeholderCigar.origin}</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ {placeholderCigar.rating}</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📖</Text>
            <Text style={styles.sectionTitle}>HUMI Details</Text>
          </View>
          <Text style={styles.detailsText}>{placeholderCigar.humiDetails}</Text>
        </View>

        <View style={styles.cardsRow}>
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🍂</Text>
              <Text style={styles.cardTitle}>Tasting Notes</Text>
            </View>
            <View style={styles.cardContent}>
              {placeholderCigar.tastingNotes.map((note, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.listText}>{note}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🥃</Text>
              <Text style={styles.cardTitle}>Pairs With</Text>
            </View>
            <View style={styles.cardContent}>
              {placeholderCigar.pairings.map((pairing, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.listText}>{pairing}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.designNotes}>
        Design Elements:{'\n'}
        • Soft shadows for floating card effect{'\n'}
        • Left accent border on info cards{'\n'}
        • Icon badges for visual hierarchy{'\n'}
        • Generous whitespace{'\n'}
        • Two-column layout for notes & pairings
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8B4513',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  cigarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 24,
  },
  cigarImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
  },
  cigarHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cigarName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2c2c2c',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaBadge: {
    backgroundColor: '#f5f0eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B4513',
  },
  ratingBadge: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  detailsSection: {
    padding: 16,
    backgroundColor: '#fdfcfb',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B4513',
    letterSpacing: 0.5,
  },
  detailsText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#444',
    fontStyle: 'normal',
  },
  cardsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#8B4513',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  cardIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5c4033',
    letterSpacing: 0.3,
  },
  cardContent: {
    padding: 12,
    paddingTop: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bulletPoint: {
    fontSize: 12,
    color: '#8B4513',
    marginRight: 8,
    marginTop: 1,
  },
  listText: {
    fontSize: 13,
    color: '#555',
    flex: 1,
    lineHeight: 18,
  },
  designNotes: {
    fontSize: 14,
    color: '#888',
    textAlign: 'left',
    lineHeight: 22,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    maxWidth: 400,
  },
});
