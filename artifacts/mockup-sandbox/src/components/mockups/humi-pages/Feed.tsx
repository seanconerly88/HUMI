import { Heart, MessageCircle, Star } from "lucide-react";

const posts = [
  { id: 1, user: "Carlos M.", initials: "CM", cigar: "Padron 1964 Exclusivo", rating: 5, notes: "Absolutely incredible smoke. Dark chocolate and leather on the draw.", likes: 24, comments: 7, time: "42 min ago", color: "#8B4513" },
  { id: 2, user: "Sarah T.", initials: "ST", cigar: "Arturo Fuente Opus X", rating: 4, notes: "First time with the OpusX — it lived up to the hype. Cedar and pepper.", likes: 18, comments: 3, time: "1.5 hrs ago", color: "#C4781A" },
  { id: 3, user: "Mike R.", initials: "MR", cigar: "Liga Privada No. 9", rating: 5, notes: "This one just hits different. Perfect for a rainy evening.", likes: 31, comments: 12, time: "3 hrs ago", color: "#6B3A2A" },
];

export function Feed() {
  return (
    <div style={{ fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto", height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f9f9f9", position: "relative" }}>

      {/* ── ACTUAL HUMI HEADER (brown bar, HUMI white centered) ── */}
      <div style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        padding: "16px",
        paddingTop: 50,
        backgroundColor: "#8B4513",
      }}>
        <span style={{
          flex: 1,
          textAlign: "center",
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: "0.18em",
          color: "white",
        }}>HUMI</span>
      </div>

      {/* Posts */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 80px" }}>
        {posts.map(post => (
          <div key={post.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #efe8e0", marginBottom: 14, overflow: "hidden" }}>
            {/* Post header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 14px 10px" }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: post.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{post.initials}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#2a1a0e" }}>{post.user}</div>
                <div style={{ fontSize: 10, color: "#b89a85" }}>{post.time}</div>
              </div>
            </div>
            {/* Photo placeholder */}
            <div style={{ margin: "0 12px", borderRadius: 12, background: "linear-gradient(135deg, #faf7f3 0%, #f0e8de 100%)", height: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 40 }}>🍂</div>
              <div style={{ fontSize: 10, color: "#b89a85", fontWeight: 600, marginTop: 4 }}>Humi Moment</div>
            </div>
            {/* Content */}
            <div style={{ padding: "12px 14px 8px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#2a1a0e", marginBottom: 4 }}>{post.cigar}</div>
              <div style={{ display: "flex", gap: 1, marginBottom: 6 }}>
                {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: 13, color: i <= post.rating ? "#C4781A" : "#e0d4cc" }}>★</span>)}
              </div>
              <p style={{ fontSize: 13, color: "#4a3828", lineHeight: 1.6, margin: 0 }}>{post.notes}</p>
            </div>
            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px 12px", borderTop: "1px solid #f8f3ef" }}>
              <button style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#a08070", fontSize: 12 }}>
                <Heart size={15} /> {post.likes}
              </button>
              <button style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#a08070", fontSize: 12 }}>
                <MessageCircle size={15} /> {post.comments}
              </button>
              <button style={{ marginLeft: "auto", background: "#faf7f3", border: "1px solid #efe8e0", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "#8B4513", fontWeight: 600, cursor: "pointer" }}>
                + Add to my HUMI
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #f0ebe5", display: "flex", justifyContent: "space-around", padding: "8px 0" }}>
        {[{l:"Home",a:false},{l:"Humidor",a:false},{l:"Spots",a:false},{l:"Feed",a:true}].map(t => (
          <div key={t.l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 12px" }}>
            <div style={{ width: 20, height: 20, borderRadius: 4, background: t.a ? "#8B4513" : "#d4c4b8" }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: t.a ? "#8B4513" : "#b0a090" }}>{t.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
