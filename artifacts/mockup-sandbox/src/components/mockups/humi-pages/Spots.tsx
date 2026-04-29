import { MapPin, Star, ChevronRight } from "lucide-react";

const spots = [
  { id: 1, name: "Grand Havana Room", city: "New York, NY", rating: 4.8, checkins: 142, type: "Cigar Lounge" },
  { id: 2, name: "Casa de Montecristo", city: "Chicago, IL", rating: 4.7, checkins: 89, type: "Cigar Bar" },
  { id: 3, name: "Davidoff of Geneva", city: "New York, NY", rating: 4.6, checkins: 201, type: "Cigar Shop + Lounge" },
  { id: 4, name: "The Cigar Bar & Grill", city: "San Francisco, CA", rating: 4.4, checkins: 67, type: "Bar + Lounge" },
];

export function Spots() {
  return (
    <div style={{ fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto", height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f5ede3" }}>

      {/* ── ACTUAL HUMI HEADER (brown bar, HUMI white centered) ── */}
      <div style={{
        backgroundColor: "#8B4513",
        paddingTop: 58,
        paddingBottom: 20,
        paddingLeft: 22,
        paddingRight: 22,
      }}>
        {/* Top row: centered HUMI + tab toggle on right */}
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{
              fontSize: 22,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "0.18em",
              textAlign: "center",
            }}>HUMI</span>
          </div>
          {/* Search / My Spots toggle */}
          <div style={{ display: "flex", flexDirection: "row", backgroundColor: "rgba(0,0,0,0.25)", borderRadius: 12, padding: 4, gap: 3 }}>
            {["Search", "My Spots"].map((label, i) => (
              <div key={label} style={{
                paddingHorizontal: 12, padding: "5px 12px",
                borderRadius: 9,
                backgroundColor: i === 0 ? "rgba(255,255,255,0.22)" : "transparent",
                fontSize: 12,
                fontWeight: 600,
                color: "#fff",
                cursor: "pointer",
              }}>{label}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 80px" }}>
        <div style={{ fontSize: 10, color: "#a08070", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Popular Spots</div>
        {spots.map(spot => (
          <div key={spot.id} style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 10, border: "1px solid #efe8e0", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(139,69,19,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MapPin size={18} color="#8B4513" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#2a1a0e" }}>{spot.name}</div>
              <div style={{ fontSize: 11, color: "#C4781A", fontWeight: 600 }}>{spot.type}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5 }}>
                <span style={{ fontSize: 11, color: "#4a3828", fontWeight: 600 }}>★ {spot.rating}</span>
                <span style={{ fontSize: 11, color: "#a08070" }}>{spot.city}</span>
                <span style={{ fontSize: 11, color: "#b89a85" }}>{spot.checkins} check-ins</span>
              </div>
            </div>
            <ChevronRight size={15} color="#c8b8aa" style={{ marginTop: 4 }} />
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #f0ebe5", display: "flex", justifyContent: "space-around", padding: "8px 0" }}>
        {[{l:"Home",a:false},{l:"Humidor",a:false},{l:"Spots",a:true},{l:"Feed",a:false}].map(t => (
          <div key={t.l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 12px" }}>
            <div style={{ width: 20, height: 20, borderRadius: 4, background: t.a ? "#8B4513" : "#d4c4b8" }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: t.a ? "#8B4513" : "#b0a090" }}>{t.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
