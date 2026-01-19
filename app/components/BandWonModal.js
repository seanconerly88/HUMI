// app/components/BandWonModal.js
import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  Animated,
  Easing
} from 'react-native';
import Icon from './Icon';

const BandWonModal = ({ visible, band, onClose }) => {
  const scaleAnim = new Animated.Value(0.5);
  const opacityAnim = new Animated.Value(0);
  
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.elastic(1),
          useNativeDriver: true
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true
        })
      ]).start();
    } else {
      // Reset animations when modal closes
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
    }
  }, [visible]);
  
  if (!band) return null;
  
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackground}>
        <Animated.View 
          style={[
            styles.modalContent,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim
            }
          ]}
        >
          <View style={styles.badgeContainer}>
            <Text style={styles.congratsText}>Congratulations!</Text>
            
            <View style={styles.badgeImageContainer}>
              <Image 
                source={{ uri: band.image || 'https://via.placeholder.com/200x100?text=Band' }} 
                style={styles.badgeImage}
                resizeMode="contain"
              />
              <View style={styles.badgeGlow} />
            </View>
            
            <Text style={styles.badgeName}>{band.name}</Text>
            <Text style={styles.badgeDescription}>{band.description}</Text>
          </View>
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Continue</Text>
            <Icon name="chevron-forward" size={20} color="white" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(248, 248, 248, 0.92)',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 24,
    paddingTop: 32,
    paddingBottom: 50,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderBottomWidth: 0,
    marginBottom: 0
  },
  congratsText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center'
  },
  badgeContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  badgeImageContainer: {
    position: 'relative',
    marginBottom: 20
  },
  badgeImage: {
    width: 240,
    height: 120,
    zIndex: 2
  },
  badgeGlow: {
    position: 'absolute',
    width: 220,
    height: 100,
    backgroundColor: 'rgba(139, 69, 19, 0.4)',
    borderRadius: 60,
    top: 10,
    left: 10,
    zIndex: 1,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10
  },
  badgeName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 12
  },
  badgeDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22
  },
  closeButton: {
    flexDirection: 'row',
    backgroundColor: '#8B4513',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 4
  }
});

export default BandWonModal;