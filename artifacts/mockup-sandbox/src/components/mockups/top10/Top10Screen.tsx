import { useState, useRef, useEffect, useCallback } from "react";

// Exact colors from app/top10.js
const BROWN = "#8B4513";
const CREAM = "#faf7f3";
const BORDER = "#e0d5c8";
const MUTED = "#888";
const DARK = "#1A1A1A";
const BG = "#f9f9f9";
const ITEM_HEIGHT = 80;

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
    image: "https://images.unsplash.com/photo-1571204829887-3b8d69e4094d?w=200&h=240&fit=crop&crop=center",
  },
  {
    cigarId: "3",
    cigarName: "Arturo Fuente OpusX",
    cigarBrand: "Arturo Fuente",
    overall: 5,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=240&fit=crop&crop=center",
  },
  {
    cigarId: "4",
    cigarName: "My Father Le Bijou 1922",
    cigarBrand: "My Father Cigars",
    overall: 4,
    image: "https://images.unsplash.com/photo-1612196808214-b7e239e5f6dc?w=200&h=240&fit=crop&crop=center",
  },
  {
    cigarId: "5",
    cigarName: "Liga Privada No. 9",
    cigarBrand: "Drew Estate",
    overall: 4,
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=240&fit=crop&crop=center",
  },
  {
    cigarId: "6",
    cigarName: "Davidoff Millennium Blend",
    cigarBrand: "Davidoff",
    overall: 4,
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=240&fit=crop&crop=center",
  },
];

type Cigar = (typeof CIGARS)[number];

function Stars({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 1, marginTop: 3 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          style={{ fontSize: 10, color: s <= rating ? "#b8860b" : "#ddd", lineHeight: 1 }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function ReorderIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <line x1="3" y1="9" x2="21" y2="9" stroke="#bbb" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="13" x2="21" y2="13" stroke="#bbb" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="17" x2="21" y2="17" stroke="#bbb" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <line x1="2" y1="2" x2="13" y2="13" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
      <line x1="13" y1="2" x2="2" y2="13" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Top10Screen() {
  const [items, setItems] = useState<Cigar[]>(CIGARS);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const itemsRef = useRef<Cigar[]>(CIGARS);
  const draggingIdRef = useRef<string | null>(null);
  const startYRef = useRef(0);
  const lastSwapYRef = useRef(0);

  const handleRemove = useCallback((cigarId: string) => {
    const updated = itemsRef.current.filter((c) => c.cigarId !== cigarId);
    itemsRef.current = updated;
    setItems([...updated]);
    flashSave();
  }, []);

  const flashSave = () => {
    setSaving(true);
    setSaved(false);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }, 600);
  };

  const onHandlePointerDown = useCallback((e: React.PointerEvent, cigarId: string) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingIdRef.current = cigarId;
    startYRef.current = e.clientY;
    lastSwapYRef.current = e.clientY;
    setDraggingId(cigarId);
  }, []);

  const onHandlePointerMove = useCallback((e: React.PointerEvent, _cigarId: string) => {
    if (!draggingIdRef.current) return;
    const dy = e.clientY - lastSwapYRef.current;
    if (Math.abs(dy) < ITEM_HEIGHT * 0.55) return;
    const direction = dy > 0 ? 1 : -1;
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
  }, []);

  const onHandlePointerUp = useCallback(() => {
    if (!draggingIdRef.current) return;
    draggingIdRef.current = null;
    setDraggingId(null);
    flashSave();
  }, []);

  const emptyCount = Math.max(0, 10 - items.length);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: BG,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
        display: "flex",
        flexDirection: "column",
        overscrollBehavior: "contain",
      }}
    >
      {/* Header — exact match to app/top10.js */}
      <div
        style={{
          backgroundColor: BROWN,
          paddingTop: 56,
          paddingBottom: 14,
          paddingLeft: 20,
          paddingRight: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 2.5,
            textTransform: "uppercase",
          }}
        >
          My Top 10
        </span>

        {saving && (
          <div
            style={{
              position: "absolute",
              right: 18,
              width: 16,
              height: 16,
              border: "2px solid rgba(255,255,255,0.3)",
              borderTopColor: "rgba(255,255,255,0.8)",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
        )}
        {saved && !saving && (
          <span
            style={{
              position: "absolute",
              right: 18,
              color: "rgba(255,255,255,0.7)",
              fontSize: 12,
            }}
          >
            Saved
          </span>
        )}
      </div>

      {/* Scroll area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingTop: 14,
          paddingBottom: 48,
          paddingLeft: 14,
          paddingRight: 14,
          WebkitOverflowScrolling: "touch" as any,
        }}
      >
        {/* Cigar rows */}
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
                  ? "0 4px 14px rgba(0,0,0,0.18)"
                  : "0 1px 3px rgba(0,0,0,0.06)",
                transition: "box-shadow 0.15s, border-color 0.15s, background 0.15s",
                overflow: "hidden",
                userSelect: "none",
                WebkitUserSelect: "none" as any,
                touchAction: "none",
              }}
            >
              {/* Rank */}
              <div style={{ width: 32, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: BROWN,
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                  }}
                >
                  {index + 1}
                </span>
              </div>

              {/* Thumbnail */}
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.cigarName}
                  style={{
                    width: 46,
                    height: 58,
                    borderRadius: 7,
                    marginLeft: 8,
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                  draggable={false}
                />
              ) : (
                <div
                  style={{
                    width: 46,
                    height: 58,
                    borderRadius: 7,
                    marginLeft: 8,
                    backgroundColor: "#f0ece6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 18,
                    color: "#d5cfc8",
                  }}
                >
                  ◈
                </div>
              )}

              {/* Info */}
              <div
                style={{
                  flex: 1,
                  marginLeft: 12,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: DARK,
                    letterSpacing: 0.1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "block",
                  }}
                >
                  {item.cigarName}
                </span>
                {item.cigarBrand && (
                  <span
                    style={{
                      fontSize: 12,
                      color: MUTED,
                      marginTop: 2,
                      display: "block",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.cigarBrand}
                  </span>
                )}
                {item.overall ? <Stars rating={item.overall} /> : null}
              </div>

              {/* Remove button */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => handleRemove(item.cigarId)}
                style={{
                  width: 36,
                  height: ITEM_HEIGHT,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  padding: 0,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <CloseIcon />
              </button>

              {/* Drag handle */}
              <div
                onPointerDown={(e) => onHandlePointerDown(e, item.cigarId)}
                onPointerMove={(e) => onHandlePointerMove(e, item.cigarId)}
                onPointerUp={onHandlePointerUp}
                onPointerCancel={onHandlePointerUp}
                style={{
                  width: 48,
                  height: ITEM_HEIGHT,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  borderLeft: "1px solid #f0ece6",
                  cursor: "grab",
                  touchAction: "none",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <ReorderIcon />
              </div>
            </div>
          );
        })}

        {/* Empty slots */}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <div
            key={`empty-${i}`}
            style={{
              height: ITEM_HEIGHT,
              borderRadius: 12,
              marginBottom: 8,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              paddingLeft: 10,
              paddingRight: 16,
              border: "1px dashed #e8e2da",
              backgroundColor: "#fdfcfb",
            }}
          >
            <div style={{ width: 32, display: "flex", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#ccc", lineHeight: 1 }}>
                {items.length + i + 1}
              </span>
            </div>
            <div
              style={{
                width: 46,
                height: 58,
                borderRadius: 7,
                marginLeft: 8,
                backgroundColor: "#f0ece6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 16,
                color: "#d5cfc8",
              }}
            >
              +
            </div>
            <div style={{ flex: 1, marginLeft: 12 }}>
              <span style={{ fontSize: 13, color: "#ccc", fontStyle: "italic" }}>
                Open Humidor to add
              </span>
            </div>
          </div>
        ))}

        {/* Hint */}
        {items.length > 0 && (
          <div
            style={{
              paddingTop: 20,
              paddingBottom: 20,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "#bbb", letterSpacing: 0.2, textAlign: "center" }}>
              Hold ≡ and drag to reorder · Manage from your Humidor
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
      `}</style>
    </div>
  );
}
