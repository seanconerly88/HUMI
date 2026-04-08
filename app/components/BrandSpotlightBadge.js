// app/components/BrandSpotlightBadge.js
// Small teaser shown on the scan result card when a brand spotlight exists.
// Tells the user something special is waiting in their humidor — no videos here.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BrandSpotlightBadge({ brandName, accentColor }) {
  const accent = accentColor || '#C4781A';

  return (
    <View style={[s.badge, { borderColor: accent }]}>
      <Text style={[s.star, { color: accent }]}>✦</Text>
      <View style={s.text}>
        <Text style={[s.label, { color: accent }]}>BRAND SPOTLIGHT</Text>
        <Text style={s.sub}>
          {brandName} has a curated story in your Humidor
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 12,
    backgroundColor: 'rgba(196, 120, 26, 0.06)',
  },
  star: {
    fontSize: 16,
    fontWeight: '700',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  sub: {
    fontSize: 12,
    color: '#555',
    lineHeight: 16,
  },
});
