import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform
} from 'react-native';

const GOLD = '#D4AF37';
const DARK = '#111111';
const CARD = '#1a1a1a';
const STAR_LABELS = ['Poor', 'Fair', 'Good', 'Great', 'Outstanding'];

function StarRow({ rating, onSelect }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => onSelect(n)}
          activeOpacity={0.7}
          style={styles.starButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          focusable={false}
        >
          <Text style={[styles.starGlyph, rating >= n && styles.starGlyphActive]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function FeedbackSurveyModal({ visible, onComplete }) {
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetState = () => {
    setRating(null);
    setComment('');
    setSubmitting(false);
  };

  const handleOutcome = async (outcome) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onComplete({
        rating: outcome === 'submitted' ? rating : null,
        comment: outcome === 'submitted' ? (comment.trim() || null) : null,
        outcome
      });
    } finally {
      resetState();
    }
  };

  const handleSubmit = () => handleOutcome('submitted');
  const handleSkip = () => handleOutcome('skipped');

  const starLabel = rating ? STAR_LABELS[rating - 1] : null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>

          <Text style={styles.eyebrow}>MEMBER EXPERIENCE</Text>

          <View style={styles.divider} />

          <Text style={styles.headline}>How are we doing?</Text>
          <Text style={styles.subheadline}>
            Share your honest experience with the HUMI lounge.
          </Text>

          <StarRow rating={rating} onSelect={setRating} />

          {starLabel ? (
            <Text style={styles.starLabel}>{starLabel}</Text>
          ) : (
            <Text style={styles.starLabelPlaceholder}>Tap a star to rate</Text>
          )}

          <Text style={styles.inputLabel}>Your thoughts (optional)</Text>

          <TextInput
            style={styles.textInput}
            placeholder="What's working well? What would make HUMI better? Any features you'd love to see?"
            placeholderTextColor="#555"
            multiline={true}
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Sending...' : 'Submit'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
            disabled={submitting}
          >
            <Text style={styles.skipButtonText}>Maybe Later</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    ...Platform.select({
      web: { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' },
      default: {}
    })
  },
  container: {
    backgroundColor: CARD,
    borderRadius: 16,
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.5)',
    ...Platform.select({
      web: {
        boxShadow: '0 0 60px rgba(212, 175, 55, 0.15), 0 20px 60px rgba(0,0,0,0.6)'
      },
      default: {
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 12
      }
    })
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.85
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: GOLD,
    opacity: 0.4,
    marginBottom: 20
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f0f0f0',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5
  },
  subheadline: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12
  },
  starButton: {
    padding: 4
  },
  starGlyph: {
    fontSize: 38,
    color: '#333'
  },
  starGlyphActive: {
    color: GOLD
  },
  starLabel: {
    fontSize: 13,
    color: GOLD,
    letterSpacing: 1,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 24,
    opacity: 0.9
  },
  starLabelPlaceholder: {
    fontSize: 13,
    color: '#444',
    marginBottom: 24,
    fontStyle: 'italic'
  },
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8
  },
  textInput: {
    width: '100%',
    backgroundColor: '#141414',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    padding: 14,
    color: '#d0d0d0',
    fontSize: 14,
    minHeight: 90,
    marginBottom: 24,
    lineHeight: 20
  },
  submitButton: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
    marginBottom: 14
  },
  submitButtonDisabled: {
    opacity: 0.35
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  skipButton: {
    paddingVertical: 6
  },
  skipButtonText: {
    fontSize: 13,
    color: '#555',
    letterSpacing: 0.5
  }
});
