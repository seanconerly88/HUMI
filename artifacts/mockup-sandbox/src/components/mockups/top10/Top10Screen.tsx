import { useState, useRef } from "react";

const HUMI_BROWN = "#8B4513";
const HUMI_GOLD = "#C4781A";
const HUMI_CREAM = "#faf7f3";
const HUMI_BG = "#f9f9f9";
const HUMI_DARK = "#1A1A1A";

const PLACEHOLDER_CIGARS = [
  {
    cigarId: "1",
    cigarName: "Padron 1964 Anniversary",
    cigarBrand: "Padron",
    overall: 97,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&h=80&fit=crop",
  },
  {
    cigarId: "2",
    cigarName: "Cohiba Behike 54",
    cigarBrand: "Cohiba",
    overall: 96,
    image: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=80&h=80&fit=crop",
  },
  {
    cigarId: "3",
    cigarName: "Arturo Fuente OpusX",
    cigarBrand: "Arturo Fuente",
    overall: 95,
    image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=80&h=80&fit=crop",
  },
  {
    cigarId: "4",
    cigarName: "My Father Le Bijou 1922",
    cigarBrand: "My Father Cigars",
    overall: 94,
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=80&h=80&fit=crop",
  },
  {
    cigarId: "5",
    cigarName: "Davidoff Millennium Blend",
    cigarBrand: "Davidoff",
    overall: 93,
    image: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=80&h=80&fit=crop",
  },
  {
    cigarId: "6",
    cigarName: "Liga Privada No. 9",
    cigarBrand: "Drew Estate",
    overall: 92,
    image: "https://images.unsplash.com/photo-1571019613576-2b22c76fd955?w=80&h=80&fit=crop",
  },
];

type Cigar = (typeof PLACEHOLDER_CIGARS)[number];

function RankBadge({ rank }: { rank: number }) {
  const gold = rank === 1;
  const silver = rank === 2;
  const bronze = rank === 3;
  const bg = gold
    ? "#D4A853"
    : silver
    ? "#A8A9AD"
    : bronze
    ? "#CD7F32"
    : HUMI_BROWN;
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color: "#fff",
          fontWeight: "700",
          fontSize: rank > 9 ? 12 : 14,
          fontFamily: "Georgia, serif",
        }}
      >
        {rank}
      </span>
    </div>
  );
}

function CigarRow({
  cigar,
  rank,
  onRemove,
  isDragging,
}: {
  cigar: Cigar;
  rank: number;
  onRemove: () => void;
  isDragging: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: isDragging ? "#f0e6d8" : "#fff",
        borderRadius: 12,
        marginBottom: 10,
        padding: "10px 12px",
        boxShadow: isDragging
          ? "0 4px 16px rgba(139,69,19,0.18)"
          : "0 1px 4px rgba(0,0,0,0.07)",
        gap: 10,
        transition: "box-shadow 0.15s, background 0.15s",
        cursor: isDragging ? "grabbing" : "default",
        userSelect: "none",
      }}
    >
      <RankBadge rank={rank} />

      <img
        src={cigar.image}
        alt={cigar.cigarName}
        style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          objectFit: "cover",
          flexShrink: 0,
          border: "1px solid #e8ddd4",
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: "600",
            fontSize: 13,
            color: HUMI_DARK,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontFamily: "Georgia, serif",
          }}
        >
          {cigar.cigarName}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#888",
            marginTop: 1,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {cigar.cigarBrand}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 3,
          }}
        >
          <span style={{ color: HUMI_GOLD, fontSize: 11 }}>★</span>
          <span
            style={{
              fontSize: 11,
              color: HUMI_BROWN,
              fontWeight: "600",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {cigar.overall}
          </span>
        </div>
      </div>

      <button
        onClick={onRemove}
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          border: "none",
          backgroundColor: "#ffeaea",
          color: "#cc4444",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          fontSize: 14,
          fontWeight: "bold",
          lineHeight: 1,
        }}
        title="Remove from Top 10"
      >
        ×
      </button>

      <div
        style={{
          width: 24,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          alignItems: "center",
          cursor: "grab",
          flexShrink: 0,
          padding: "4px 0",
        }}
        title="Hold to drag and reorder"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 16,
              height: 2,
              backgroundColor: "#ccc",
              borderRadius: 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function EmptySlot({ rank }: { rank: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        borderRadius: 12,
        marginBottom: 10,
        padding: "10px 12px",
        border: "1.5px dashed #d8c9bc",
        backgroundColor: HUMI_CREAM,
        gap: 10,
        opacity: 0.7,
      }}
    >
      <RankBadge rank={rank} />
      <div
        style={{
          flex: 1,
          fontSize: 12,
          color: "#aaa",
          fontStyle: "italic",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Open Humidor to add
      </div>
    </div>
  );
}

export function Top10Screen() {
  const [cigars, setCigars] = useState<Cigar[]>(PLACEHOLDER_CIGARS);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const emptySlots = 10 - cigars.length;

  function handleRemove(idx: number) {
    const next = cigars.filter((_, i) => i !== idx);
    setCigars(next);
    triggerSave();
  }

  function triggerSave() {
    setSaving(true);
    setSaved(false);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }, 700);
  }

  // Simple swap demo on drag start (visual only — shows the concept)
  function handleDragStart(idx: number) {
    setDraggingIdx(idx);
  }

  function handleDragEnd() {
    setDraggingIdx(null);
  }

  function handleDragOver(idx: number) {
    if (draggingIdx === null || draggingIdx === idx) return;
    const next = [...cigars];
    const [moved] = next.splice(draggingIdx, 1);
    next.splice(idx, 0, moved);
    setCigars(next);
    setDraggingIdx(idx);
    triggerSave();
  }

  return (
    <div
      style={{
        width: 390,
        minHeight: 844,
        backgroundColor: HUMI_BG,
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: HUMI_BROWN,
          paddingTop: 54,
          paddingBottom: 16,
          paddingLeft: 20,
          paddingRight: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: "#fff",
              letterSpacing: 1.5,
              fontFamily: "Georgia, serif",
            }}
          >
            MY TOP 10
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.65)",
              marginTop: 2,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {cigars.length}/10 cigars ranked
          </div>
        </div>

        {/* Trophy icon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          🏆
        </div>
      </div>

      {/* Save status banner */}
      {(saving || saved) && (
        <div
          style={{
            backgroundColor: saving ? "#f5ede2" : "#e8f5e9",
            padding: "6px 16px",
            fontSize: 12,
            color: saving ? HUMI_BROWN : "#2e7d32",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <span>{saving ? "⏳" : "✓"}</span>
          <span>{saving ? "Saving your Top 10…" : "Saved to your profile"}</span>
        </div>
      )}

      {/* Instruction tip */}
      <div
        style={{
          margin: "14px 16px 4px",
          padding: "8px 12px",
          backgroundColor: "#fff",
          borderRadius: 10,
          border: "1px solid #ecddd1",
          fontSize: 12,
          color: "#888",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span>≡</span>
        <span>Hold the drag handle to reorder your favorites</span>
      </div>

      {/* List */}
      <div style={{ padding: "10px 16px 24px" }}>
        {cigars.map((cigar, idx) => (
          <div
            key={cigar.cigarId}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => {
              e.preventDefault();
              handleDragOver(idx);
            }}
          >
            <CigarRow
              cigar={cigar}
              rank={idx + 1}
              onRemove={() => handleRemove(idx)}
              isDragging={draggingIdx === idx}
            />
          </div>
        ))}

        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} rank={cigars.length + i + 1} />
        ))}
      </div>

      {/* Bottom hint */}
      {cigars.length < 10 && (
        <div
          style={{
            margin: "0 16px 32px",
            padding: "14px 16px",
            backgroundColor: "#fff",
            borderRadius: 12,
            border: `1.5px solid ${HUMI_GOLD}22`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: `${HUMI_GOLD}22`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 18,
            }}
          >
            📦
          </div>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: HUMI_DARK,
                fontFamily: "Georgia, serif",
              }}
            >
              Add more from your Humidor
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#888",
                marginTop: 2,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Open any cigar → tap ★ Add to My Top 10
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar simulation */}
      <div
        style={{
          marginTop: "auto",
          borderTop: "1px solid #e0d5cb",
          backgroundColor: "#fff",
          display: "flex",
          padding: "8px 0 20px",
        }}
      >
        {[
          { icon: "🏠", label: "Home", active: false },
          { icon: "📦", label: "Humidor", active: false },
          { icon: "📍", label: "Spots", active: false },
          { icon: "🏆", label: "Top 10", active: true },
        ].map((tab) => (
          <div
            key={tab.label}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              cursor: "pointer",
              opacity: tab.active ? 1 : 0.45,
            }}
          >
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span
              style={{
                fontSize: 10,
                color: tab.active ? HUMI_BROWN : "#888",
                fontWeight: tab.active ? "600" : "400",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {tab.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
