import { Star, ChevronRight } from "lucide-react";

const cigars = [
  { id: 1, name: "Arturo Fuente Opus X", rating: 4.8, logged: "2 days ago" },
  { id: 2, name: "Padron 1964 Anniversary", rating: 4.9, logged: "5 days ago" },
  { id: 3, name: "My Father Le Bijou 1922", rating: 4.7, logged: "1 week ago" },
  { id: 4, name: "Davidoff Winston Churchill", rating: 4.5, logged: "2 weeks ago" },
  { id: 5, name: "Liga Privada No. 9", rating: 4.6, logged: "3 weeks ago" },
];

export function Humidor() {
  return (
    <div style={{ fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto", height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f9f9f9" }}>

      {/* ── ACTUAL HUMI HEADER (brown bar, HUMI white centered) ── */}
      <div style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 16px",
        paddingTop: 50,
        backgroundColor: "#8B4513",
      }}>
        <div style={{ width: 36 }} />
        <span style={{
          flex: 1,
          textAlign: "center",
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: "0.18em",
          color: "white",
        }}>HUMI</span>
        <div style={{
          width: 36,
          height: 36,
          backgroundColor: "white",
          borderRadius: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          color: "#8B4513",
          fontWeight: "bold",
          cursor: "pointer",
        }}>+</div>
      </div>

      {/* Content below — unchanged */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 80px" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          {[{n:"47",l:"Logged"},{n:"4.7",l:"Avg Rating"},{n:"3",l:"This Week"}].map(s => (
            <div key={s.l} style={{ flex: 1, background: "#fff", borderRadius: 12, padding: "10px 8px", textAlign: "center", border: "1px solid #efe8e0" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#8B4513" }}>{s.n}</div>
              <div style={{ fontSize: 10, color: "#a08070", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: "#a08070", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Recently Logged</div>
        {cigars.map(c => (
          <div key={c.id} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: "1px solid #efe8e0", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#faf7f3", border: "1px solid #efe8e0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🍂</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#2a1a0e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 3 }}>
                {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: 10, color: i <= Math.floor(c.rating) ? "#C4781A" : "#e0d4cc" }}>★</span>)}
                <span style={{ fontSize: 10, color: "#a08070", marginLeft: 4 }}>{c.rating}</span>
              </div>
              <div style={{ fontSize: 10, color: "#b89a85", marginTop: 2 }}>{c.logged}</div>
            </div>
            <ChevronRight size={15} color="#c8b8aa" />
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #f0ebe5", display: "flex", justifyContent: "space-around", padding: "8px 0" }}>
        {[{l:"Home",a:false},{l:"Humidor",a:true},{l:"Spots",a:false},{l:"Feed",a:false}].map(t => (
          <div key={t.l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 12px" }}>
            <div style={{ width: 20, height: 20, borderRadius: 4, background: t.a ? "#8B4513" : "#d4c4b8" }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: t.a ? "#8B4513" : "#b0a090" }}>{t.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
