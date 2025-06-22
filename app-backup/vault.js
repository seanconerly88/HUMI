import React from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBands } from './services/bands';

export default function VaultScreen() {
  // Get bands from the bands service
  const bands = getBands();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Your Band Vault</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.bandsGrid}>
          {bands.map(band => (
            <TouchableOpacity key={band.id} style={styles.bandCard}>
              <Image source={{ uri: band.image }} style={styles.bandImage} />
              <Text style={styles.bandName}>{band.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    padding: 16,
    backgroundColor: '#8B4513',
    paddingTop: 50, // Extra padding for status bar
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    padding: 16,
  },
  bandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bandCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bandImage: {
    width: '100%',
    height: 80,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  bandName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  }
});