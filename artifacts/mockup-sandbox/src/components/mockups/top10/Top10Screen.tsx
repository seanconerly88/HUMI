import { useState, useRef, useCallback, useEffect } from "react";

// Exact values from app/humidor.js + app/top10.js
const BROWN = "#8B4513";
const CREAM = "#faf7f3";
const BORDER = "#e0d5c8";
const MUTED = "#888";
const DARK = "#1A1A1A";
const BG = "#f9f9f9";
const ITEM_HEIGHT = 80;
const LONG_PRESS_MS = 480;

const CIGARS = [
  {
    cigarId: "1",
    cigarName: "Padron 1964 Anniversary",
    cigarBrand: "Padron",
    overall: 5,
    image: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=200&h=240&fit=crop&crop=center",
  },
  {
    cigarId: "2",
    cigarName: "Cohiba Behike 54",
    cigarBrand: "Cohiba",
    overall: 5,
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=240&fit=crop&crop=center",
  },
  {
    cigarId: "3",
    cigarName: "Arturo Fuente OpusX",
    cigarBrand: "Arturo Fuente",
    overall: 5,
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=240&fit=crop&crop=center",
  },
  {
    cigarId: "4",
    cigarName: "My Father Le Bijou 1922",
    cigarBrand: "My Father Cigars",
    overall: 4,
    image: "https://images.unsplash.com/photo-1571204829887-3b8d69e4094d?w=200&h=240&fit=crop&crop=center",
  },
  {
    cigarId: "5",
    cigarName: "Liga Privada No. 9",
    cigarBrand: "Drew Estate",
    overall: 4,
    image: "https://images.unsplash.com/photo-1612196808214-b7e239e5f6dc?w=200&h=240&fit=crop&crop=center",
  },
  {
    cigarId: "6",
    cigarName: "Davidoff Millennium Blend",
    cigarBrand: "Davidoff",
    overall: 4,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=240&fit=crop&crop=center",
  },
];

type Cigar = (typeof CIGARS)[number];

function Stars({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 1, marginTop: 3 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ fontSize: 10, color: s <= rating ? "#b8860b" : "#ddd", lineHeight: 1 }}>★</span>
      ))}
    </div>
  );
}

function ReorderIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {[6, 11, 16].map((y) => (
        <line key={y} x1="3" y1={y} x2="19" y2={y} stroke={active ? BROWN : "#bbb"} strokeWidth="2" strokeLinecap="round" />
      ))}
    </svg>
  );
}

export function Top10Screen() {
  const [items, setItems] = useState<Cigar[]>(CIGARS);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaved_] = useState<"saving" | "saved" | null>(null);

  // Refs for drag state — avoid stale closures
  const itemsRef = useRef<Cigar[]>(CIGARS);
  const draggingIdRef = useRef<string | null>(null);
  const lastSwapYRef = useRef(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStartYRef = useRef(0);
  const dragActiveRef = useRef(false);

  const flashSave = useCallback(() => {
    setSaved_("saving");
    setTimeout(() => { setSaved_("saved"); setTimeout(() => setSaved_(null), 1600); }, 550);
  }, []);

  const handleRemove = useCallback((cigarId: string) => {
    const updated = itemsRef.current.filter((c) => c.cigarId !== cigarId);
    itemsRef.current = updated;
    setItems([...updated]);
    flashSave();
  }, [flashSave]);

  // ── Long-press drag via Pointer Events ──────────────────────────────────
  // Pattern: pointerdown on handle → 480ms timer → activate drag
  // If pointer moves > 6px before timer fires → cancel (was a scroll)

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const endDrag = useCallback(() => {
    if (!dragActiveRef.current) return;
    dragActiveRef.current = false;
    draggingIdRef.current = null;
    setDraggingId(null);
    flashSave();
  }, [flashSave]);

  const onHandlePointerDown = useCallback((e: React.PointerEvent, cigarId: string) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointerStartYRef.current = e.clientY;
    dragActiveRef.current = false;

    cancelLongPress();
    longPressTimerRef.current = setTimeout(() => {
      // Activate drag after hold
      dragActiveRef.current = true;
      draggingIdRef.current = cigarId;
      lastSwapYRef.current = pointerStartYRef.current;
      setDraggingId(cigarId);
    }, LONG_PRESS_MS);
  }, [cancelLongPress]);

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    const dy = e.clientY - pointerStartYRef.current;

    // Cancel long-press if moved significantly before timer fires
    if (!dragActiveRef.current) {
      if (Math.abs(dy) > 6) cancelLongPress();
      return;
    }

    // Active drag — swap rows
    const netDy = e.clientY - lastSwapYRef.current;
    if (Math.abs(netDy) < ITEM_HEIGHT * 0.55) return;

    const direction = netDy > 0 ? 1 : -1;
    const list = itemsRef.current;
    const currentIdx = list.findIndex((c) => c.cigarId === draggingIdRef.current);
    if (currentIdx === -1) return;
    const targetIdx = Math.max(0, Math.min(list.length - 1, currentIdx + direction));
    if (targetIdx === currentIdx) return;

    const newList = [...list];
    const [moved] = newList.splice(currentIdx, 1);
    newList.splice(targetIdx, 0, moved);
    itemsRef.current = newList;
    lastSwapYRef.current = e.clientY;
    setItems([...newList]);
  }, [cancelLongPress]);

  const onHandlePointerUp = useCallback(() => {
    cancelLongPress();
    endDrag();
  }, [cancelLongPress, endDrag]);

  // Safety: release drag if pointer leaves window
  useEffect(() => {
    const onUp = () => { cancelLongPress(); endDrag(); };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [cancelLongPress, endDrag]);

  // Non-passive touchmove on document — REQUIRED to call preventDefault()
  // and block the browser's native downward scroll during an active drag.
  // React synthetic events cannot do this (they register as passive).
  useEffect(() => {
    const blockScroll = (e: TouchEvent) => {
      if (dragActiveRef.current) e.preventDefault();
    };
    document.addEventListener("touchmove", blockScroll, { passive: false });
    return () => document.removeEventListener("touchmove", blockScroll);
  }, []);

  const emptyCount = Math.max(0, 10 - items.length);
  const isDraggingAny = draggingId !== null;

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: BG,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Header — matches humidor.js exactly ──────────────────────────── */}
      <div
        style={{
          backgroundColor: BROWN,
          paddingTop: 54,
          paddingBottom: 14,
          paddingLeft: 20,
          paddingRight: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          flexShrink: 0,
          gap: 2,
        }}
      >
        {/* HUMI wordmark — fontSize 22, fontWeight 900, letterSpacing 3 */}
        <span
          style={{
            color: "#fff",
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 3,
            lineHeight: 1,
          }}
        >
          HUMI
        </span>
        {/* Screen subtitle */}
        <span
          style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          My Top 10
        </span>

        {/* Saving indicator */}
        {saving === "saving" && (
          <div style={{
            position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)",
            width: 14, height: 14, border: "2px solid rgba(255,255,255,0.25)",
            borderTopColor: "rgba(255,255,255,0.8)", borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }} />
        )}
        {saving === "saved" && (
          <span style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)",
            color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: 500 }}>
            Saved
          </span>
        )}
      </div>

      {/* ── Drag-active overlay hint ─────────────────────────────────────── */}
      {isDraggingAny && (
        <div style={{
          backgroundColor: `${BROWN}18`,
          borderBottom: `1px solid ${BORDER}`,
          padding: "6px 14px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: BROWN, fontWeight: 600, letterSpacing: 0.2 }}>
            Slide up or down to move · Release to save
          </span>
        </div>
      )}

      {/* ── List ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: isDraggingAny ? "hidden" : "auto",   // freeze scroll during drag
          paddingTop: 14,
          paddingBottom: 48,
          paddingLeft: 14,
          paddingRight: 14,
          WebkitOverflowScrolling: "touch" as any,
        }}
      >
        {items.map((item, index) => {
          const isDragging = draggingId === item.cigarId;
          return (
            <div
              key={item.cigarId}
              style={{
                height: ITEM_HEIGHT,
                backgroundColor: isDragging ? CREAM : "#fff",
                borderRadius: 12,
                marginBottom: 8,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                paddingLeft: 10,
                border: `1px solid ${isDragging ? BROWN : BORDER}`,
                boxShadow: isDragging
                  ? `0 6px 20px rgba(139,69,19,0.22)`
                  : "0 1px 3px rgba(0,0,0,0.06)",
                transition: isDragging ? "none" : "box-shadow 0.2s, border-color 0.2s, background 0.2s",
                overflow: "hidden",
                userSelect: "none",
                WebkitUserSelect: "none" as any,
                zIndex: isDragging ? 10 : 1,
                position: "relative",
                transform: isDragging ? "scale(1.015)" : "scale(1)",
              }}
            >
              {/* Rank */}
              <div style={{ width: 32, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                <span style={{
                  fontSize: 18, fontWeight: 800, color: BROWN,
                  fontVariantNumeric: "tabular-nums", lineHeight: 1,
                }}>
                  {index + 1}
                </span>
              </div>

              {/* Thumbnail */}
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.cigarName}
                  draggable={false}
                  style={{ width: 46, height: 58, borderRadius: 7, marginLeft: 8, objectFit: "cover", flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: 46, height: 58, borderRadius: 7, marginLeft: 8,
                  backgroundColor: "#f0ece6", display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0, fontSize: 18, color: "#d5cfc8",
                }}>◈</div>
              )}

              {/* Info */}
              <div style={{
                flex: 1, marginLeft: 12, display: "flex", flexDirection: "column",
                justifyContent: "center", minWidth: 0, overflow: "hidden",
              }}>
                <span style={{
                  fontSize: 14, fontWeight: 700, color: DARK, letterSpacing: 0.1,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block",
                }}>
                  {item.cigarName}
                </span>
                {item.cigarBrand && (
                  <span style={{
                    fontSize: 12, color: MUTED, marginTop: 2, display: "block",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {item.cigarBrand}
                  </span>
                )}
                {item.overall ? <Stars rating={item.overall} /> : null}
              </div>

              {/* Remove */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => handleRemove(item.cigarId)}
                style={{
                  width: 36, height: ITEM_HEIGHT, border: "none", background: "transparent",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, padding: 0, WebkitTapHighlightColor: "transparent",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <line x1="2" y1="2" x2="12" y2="12" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
                  <line x1="12" y1="2" x2="2" y2="12" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              {/* Drag handle — long press to activate */}
              <div
                onPointerDown={(e) => onHandlePointerDown(e, item.cigarId)}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
                onPointerCancel={onHandlePointerUp}
                style={{
                  width: 48, height: ITEM_HEIGHT,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, borderLeft: "1px solid #f0ece6",
                  cursor: isDragging ? "grabbing" : "grab",
                  touchAction: "none",
                  WebkitTapHighlightColor: "transparent",
                  backgroundColor: isDragging ? `${BROWN}08` : "transparent",
                }}
              >
                <ReorderIcon active={isDragging} />
              </div>
            </div>
          );
        })}

        {/* Empty slots */}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <div
            key={`empty-${i}`}
            style={{
              height: ITEM_HEIGHT, borderRadius: 12, marginBottom: 8,
              display: "flex", flexDirection: "row", alignItems: "center",
              paddingLeft: 10, paddingRight: 16,
              border: "1px dashed #e8e2da", backgroundColor: "#fdfcfb",
            }}
          >
            <div style={{ width: 32, display: "flex", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#ccc", lineHeight: 1 }}>
                {items.length + i + 1}
              </span>
            </div>
            <div style={{
              width: 46, height: 58, borderRadius: 7, marginLeft: 8,
              backgroundColor: "#f0ece6", display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0, fontSize: 16, color: "#d5cfc8",
            }}>+</div>
            <div style={{ flex: 1, marginLeft: 12 }}>
              <span style={{ fontSize: 13, color: "#ccc", fontStyle: "italic" }}>Open Humidor to add</span>
            </div>
          </div>
        ))}

        {/* Hint */}
        {items.length > 0 && !isDraggingAny && (
          <div style={{ paddingTop: 20, paddingBottom: 20, display: "flex", justifyContent: "center" }}>
            <span style={{ fontSize: 12, color: "#bbb", letterSpacing: 0.2, textAlign: "center" }}>
              Hold ≡ and drag to reorder · Manage from your Humidor
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        body { overscroll-behavior: none; }
      `}</style>
    </div>
  );
}
