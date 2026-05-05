import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTop10, saveTop10 } from '../src/services/top10Service';

const BROWN = '#8B4513';
const CREAM = '#faf7f3';
const BORDER = '#e0d5c8';
const MUTED = '#888';
const DARK = '#1A1A1A';
const BG = '#f9f9f9';
const ITEM_HEIGHT = 80;
const MAX_ITEMS = 10;

function Row({ item, rank, total, onMoveUp, onMoveDown, onRemove }) {
  return (
    <View style={styles.row}>
      <View style={styles.rankWrap}>
        <Text style={styles.rankNum}>{rank}</Text>
      </View>

      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.thumb} />
      ) : (
        <View style={styles.thumbEmpty}>
          <Text style={{ fontSize: 18, color: '#ccc' }}>◈</Text>
        </View>
      )}

      <View style={styles.rowInfo}>
        <Text style={styles.cigarName} numberOfLines={1}>{item.cigarName}</Text>
        {item.cigarBrand ? (
          <Text style={styles.cigarBrand} numberOfLines={1}>{item.cigarBrand}</Text>
        ) : null}
        {item.overall ? (
          <View style={{ flexDirection: 'row', marginTop: 3, gap: 1 }}>
            {[1, 2, 3, 4, 5].map(s => (
              <Text key={s} style={{ fontSize: 10, color: s <= item.overall ? '#b8860b' : '#ddd' }}>★</Text>
            ))}
          </View>
        ) : null}
      </View>

      <TouchableOpacity onPress={onRemove} style={styles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}>
        <Ionicons name="close" size={15} color="#ccc" />
      </TouchableOpacity>

      <View style={styles.arrowCol}>
        <TouchableOpacity
          onPress={onMoveUp}
          disabled={rank === 1}
          style={[styles.arrowBtn, rank === 1 && styles.arrowDisabled]}
          hitSlop={{ top: 4, bottom: 4, left: 6, right: 6 }}
        >
          <Ionicons name="chevron-up" size={18} color={rank === 1 ? '#ddd' : BROWN} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onMoveDown}
          disabled={rank === total}
          style={[styles.arrowBtn, rank === total && styles.arrowDisabled]}
          hitSlop={{ top: 4, bottom: 4, left: 6, right: 6 }}
        >
          <Ionicons name="chevron-down" size={18} color={rank === total ? '#ddd' : BROWN} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptySlot({ rank }) {
  return (
    <View style={styles.emptyRow}>
      <View style={styles.rankWrap}>
        <Text style={[styles.rankNum, { color: '#ccc' }]}>{rank}</Text>
      </View>
      <View style={styles.thumbEmpty}>
        <Text style={{ fontSize: 16, color: '#d5cfc8' }}>+</Text>
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

  useEffect(() => {
    loadData();
  }, []);

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
        <Text style={styles.headerTitle}>MY TOP 10</Text>
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
    height: ITEM_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    overflow: 'hidden',
  },
  rankWrap: { width: 32, alignItems: 'center' },
  rankNum: {
    fontSize: 18,
    fontWeight: '800',
    color: BROWN,
    fontVariant: ['tabular-nums'],
  },
  thumb: {
    width: 46,
    height: 58,
    borderRadius: 7,
    marginLeft: 8,
  },
  thumbEmpty: {
    width: 46,
    height: 58,
    borderRadius: 7,
    marginLeft: 8,
    backgroundColor: '#f0ece6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  cigarName: { fontSize: 14, fontWeight: '700', color: DARK, letterSpacing: 0.1 },
  cigarBrand: { fontSize: 12, color: MUTED, marginTop: 2 },
  removeBtn: { paddingHorizontal: 8, paddingVertical: 12 },
  arrowCol: {
    width: 44,
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#f0ece6',
    gap: 0,
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
    height: ITEM_HEIGHT,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 16,
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
