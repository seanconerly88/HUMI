import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  PanResponder, ScrollView, ActivityIndicator, Platform,
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

const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

function DraggableRow({ item, rank, isDragging, onDragStartRef, onDragMoveRef, onDragEndRef, onRemove }) {
  const panRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 3,
      onPanResponderGrant: () => onDragStartRef.current(item.cigarId),
      onPanResponderMove: (_, gs) => onDragMoveRef.current(gs.dy),
      onPanResponderRelease: () => onDragEndRef.current(),
      onPanResponderTerminate: () => onDragEndRef.current(),
    })
  ).current;

  return (
    <View style={[styles.row, isDragging && styles.rowDragging]}>
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

      <View style={styles.handle} {...panRef.panHandlers}>
        <Ionicons name="reorder-three-outline" size={24} color="#bbb" />
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
  const [draggingId, setDraggingId] = useState(null);

  const itemsRef = useRef([]);
  const draggingIdRef = useRef(null);
  const lastSwapDyRef = useRef(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const list = await getTop10();
      setItems(list);
      itemsRef.current = list;
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
    const updated = itemsRef.current.filter(c => c.cigarId !== cigarId);
    itemsRef.current = updated;
    setItems([...updated]);
    await commitOrder(updated);
  };

  const onDragStartRef = useRef(null);
  const onDragMoveRef = useRef(null);
  const onDragEndRef = useRef(null);

  onDragStartRef.current = (id) => {
    draggingIdRef.current = id;
    lastSwapDyRef.current = 0;
    setDraggingId(id);
  };

  onDragMoveRef.current = (dy) => {
    const netDy = dy - lastSwapDyRef.current;
    if (Math.abs(netDy) < ITEM_HEIGHT * 0.55) return;
    const direction = netDy > 0 ? 1 : -1;
    const list = itemsRef.current;
    const currentIdx = list.findIndex(c => c.cigarId === draggingIdRef.current);
    if (currentIdx === -1) return;
    const targetIdx = Math.max(0, Math.min(list.length - 1, currentIdx + direction));
    if (targetIdx === currentIdx) return;
    const newList = [...list];
    const [moved] = newList.splice(currentIdx, 1);
    newList.splice(targetIdx, 0, moved);
    itemsRef.current = newList;
    lastSwapDyRef.current = dy;
    setItems([...newList]);
  };

  onDragEndRef.current = () => {
    draggingIdRef.current = null;
    setDraggingId(null);
    commitOrder(itemsRef.current);
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
        scrollEnabled={!draggingId}
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
          <DraggableRow
            key={item.cigarId}
            item={item}
            rank={index + 1}
            isDragging={draggingId === item.cigarId}
            onDragStartRef={onDragStartRef}
            onDragMoveRef={onDragMoveRef}
            onDragEndRef={onDragEndRef}
            onRemove={() => handleRemove(item.cigarId)}
          />
        ))}

        {Array.from({ length: emptyCount }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} rank={items.length + i + 1} />
        ))}

        {items.length > 0 ? (
          <View style={styles.hint}>
            <Text style={styles.hintText}>Hold ≡ and drag to reorder · Manage from your Humidor</Text>
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
    paddingTop: Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 14 : 44,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2.5,
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
  rowDragging: {
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
    borderColor: BROWN,
    backgroundColor: CREAM,
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
  handle: {
    width: 48,
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#f0ece6',
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
