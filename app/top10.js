import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getTop10, saveTop10 } from '../src/services/top10Service';

const BROWN = '#8B4513';
const BORDER = '#e0d5c8';
const MUTED = '#888';
const DARK = '#1A1A1A';
const BG = '#f9f9f9';
const GOLD = '#b8860b';
const SILVER = '#8a8a8a';
const BRONZE = '#a0522d';
const ITEM_HEIGHT = 112;
const MAX_ITEMS = 10;

function rankColor(rank) {
  if (rank === 1) return GOLD;
  if (rank === 2) return SILVER;
  if (rank === 3) return BRONZE;
  return BROWN;
}

function Row({ item, rank, total, onMoveUp, onMoveDown, onRemove }) {
  const isTop3 = rank <= 3;
  const isFirst = rank === 1;
  const numColor = rankColor(rank);

  return (
    <View style={[
      styles.row,
      isTop3 && styles.rowTop3,
      isFirst && styles.rowFirst,
    ]}>
      <View style={styles.rankWrap}>
        {isFirst ? (
          <Text style={styles.crownIcon}>🏆</Text>
        ) : null}
        <Text style={[styles.rankNum, { color: numColor, fontSize: isFirst ? 42 : 34 }]}>{rank}</Text>
      </View>

      {item.image ? (
        <Image source={{ uri: item.image }} style={[styles.thumb, isFirst && styles.thumbFirst]} />
      ) : (
        <View style={[styles.thumbEmpty, isFirst && styles.thumbFirst]}>
          <Text style={{ fontSize: 22, color: '#ccc' }}>◈</Text>
        </View>
      )}

      <View style={styles.rowInfo}>
        <Text style={[styles.cigarName, isFirst && styles.cigarNameFirst]}>{item.cigarName}</Text>
        {item.cigarBrand ? (
          <Text style={styles.cigarBrand} numberOfLines={1}>{item.cigarBrand}</Text>
        ) : null}
        {item.overall ? (
          <View style={{ flexDirection: 'row', marginTop: 5, gap: 2 }}>
            {[1, 2, 3, 4, 5].map(s => (
              <Text key={s} style={{ fontSize: isFirst ? 15 : 13, color: s <= item.overall ? GOLD : '#ddd' }}>★</Text>
            ))}
          </View>
        ) : null}
      </View>

      <TouchableOpacity onPress={onRemove} style={styles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}>
        <Ionicons name="close" size={16} color="#ccc" />
      </TouchableOpacity>

      <View style={styles.arrowCol}>
        <TouchableOpacity
          onPress={onMoveUp}
          disabled={rank === 1}
          style={[styles.arrowBtn, rank === 1 && styles.arrowDisabled]}
          hitSlop={{ top: 4, bottom: 4, left: 6, right: 6 }}
        >
          <Ionicons name="chevron-up" size={20} color={rank === 1 ? '#ddd' : BROWN} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onMoveDown}
          disabled={rank === total}
          style={[styles.arrowBtn, rank === total && styles.arrowDisabled]}
          hitSlop={{ top: 4, bottom: 4, left: 6, right: 6 }}
        >
          <Ionicons name="chevron-down" size={20} color={rank === total ? '#ddd' : BROWN} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptySlot({ rank }) {
  return (
    <View style={styles.emptyRow}>
      <View style={styles.rankWrap}>
        <Text style={[styles.rankNum, { color: '#ddd' }]}>{rank}</Text>
      </View>
      <View style={styles.thumbEmpty}>
        <Text style={{ fontSize: 24, color: '#d5cfc8' }}>+</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.emptySlotText}>Open Humidor to add</Text>
      </View>
    </View>
  );
}

export default function Top10Screen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const list = await getTop10();
      setItems(list);
    } catch (e) {
      console.error('Top10 load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const commitOrder = async (list) => {
    setSaving(true);
    try {
      await saveTop10(list);
    } catch (e) {
      console.error('Top10 save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (cigarId) => {
    const updated = items.filter(c => c.cigarId !== cigarId);
    setItems(updated);
    await commitOrder(updated);
  };

  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const updated = [...items];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setItems(updated);
    await commitOrder(updated);
  };

  const emptyCount = Math.max(0, MAX_ITEMS - items.length);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BROWN} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerBrand}>HUMI</Text>
          <Text style={styles.headerTitle}>MY TOP 10</Text>
        </View>
        {saving ? (
          <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" style={styles.savingSpinner} />
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Your Top 10 is empty</Text>
            <Text style={styles.emptyStateBody}>
              Open any cigar in your Humidor and tap "Add to Top 10" to start building your list.
            </Text>
          </View>
        ) : null}

        {items.map((item, index) => (
          <Row
            key={item.cigarId}
            item={item}
            rank={index + 1}
            total={items.length}
            onMoveUp={() => handleMove(index, -1)}
            onMoveDown={() => handleMove(index, 1)}
            onRemove={() => handleRemove(item.cigarId)}
          />
        ))}

        {Array.from({ length: emptyCount }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} rank={items.length + i + 1} />
        ))}

        {items.length > 0 ? (
          <View style={styles.hint}>
            <Text style={styles.hintText}>Tap ▲ ▼ to reorder · Remove with ×</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  header: {
    backgroundColor: BROWN,
    paddingTop: Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 60 : 44,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerBrand: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: 3,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 3,
  },
  savingSpinner: {
    position: 'absolute',
    right: 18,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 14, paddingBottom: 48, paddingHorizontal: 14 },
  row: {
    minHeight: ITEM_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    overflow: 'hidden',
  },
  rowTop3: {
    borderColor: '#e8d9be',
    backgroundColor: '#fffdf8',
    shadowColor: GOLD,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rowFirst: {
    borderColor: '#d4af37',
    backgroundColor: '#fffcf0',
    shadowColor: GOLD,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    paddingVertical: 16,
  },
  rankWrap: { width: 44, alignItems: 'center', justifyContent: 'center' },
  crownIcon: { fontSize: 14, marginBottom: 1 },
  rankNum: {
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  thumb: {
    width: 68,
    height: 86,
    borderRadius: 9,
    marginLeft: 10,
  },
  thumbFirst: {
    width: 80,
    height: 100,
    borderRadius: 10,
  },
  thumbEmpty: {
    width: 68,
    height: 86,
    borderRadius: 9,
    marginLeft: 10,
    backgroundColor: '#f0ece6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1, marginLeft: 13, justifyContent: 'center' },
  cigarName: { fontSize: 15, fontWeight: '700', color: DARK, letterSpacing: 0.1, flexWrap: 'wrap' },
  cigarNameFirst: { fontSize: 16, color: '#1a1a1a' },
  cigarBrand: { fontSize: 13, color: MUTED, marginTop: 2 },
  removeBtn: { paddingHorizontal: 8, paddingVertical: 12, alignSelf: 'flex-start', marginTop: 4 },
  arrowCol: {
    width: 44,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#f0ece6',
  },
  arrowBtn: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {
    opacity: 0,
  },
  emptyRow: {
    minHeight: ITEM_HEIGHT,
    borderRadius: 14,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#e8e2da',
    borderStyle: 'dashed',
    backgroundColor: '#fdfcfb',
  },
  emptySlotText: { fontSize: 13, color: '#ccc', fontStyle: 'italic' },
  emptyState: { paddingVertical: 48, paddingHorizontal: 28, alignItems: 'center' },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: DARK, marginBottom: 10 },
  emptyStateBody: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 22 },
  hint: { paddingVertical: 20, alignItems: 'center' },
  hintText: { fontSize: 12, color: '#bbb', letterSpacing: 0.2 },
});
