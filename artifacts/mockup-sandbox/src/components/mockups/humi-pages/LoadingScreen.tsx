import { useEffect, useState } from "react";

const LINES = ["Know more.", "Remember everything.", "Smoke better."];

export default function LoadingScreen() {
  const [visible, setVisible] = useState([false, false, false]);
  const [shimmer, setShimmer] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(v => [true, v[1], v[2]]), 400);
    const t2 = setTimeout(() => setVisible(v => [v[0], true, v[2]]), 1100);
    const t3 = setTimeout(() => setVisible(v => [v[0], v[1], true]), 1800);
    const t4 = setTimeout(() => setShimmer(true), 3900);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  return (
    <>
      <style>{`
        @keyframes shimmerSweep {
          0%   { transform: translateX(-260px); }
          100% { transform: translateX(360px); }
        }
        .shimmer-strip {
          animation: shimmerSweep 1.5s linear infinite;
        }
        .line-in {
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
      `}</style>

      <div style={{
        position: "fixed", inset: 0,
        background: "#fff",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <img
          src="/icon.png"
          alt="HUMI"
          style={{ width: 110, height: 110, marginBottom: 36, objectFit: "contain" }}
          onError={e => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

        <div style={{
          position: "relative",
          overflow: "hidden",
          padding: "10px 40px 14px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        }}>
          {LINES.map((line, i) => (
            <div
              key={line}
              className="line-in"
              style={{
                opacity: visible[i] ? 1 : 0,
                transform: visible[i] ? "translateY(0)" : "translateY(10px)",
                fontSize: 27,
                fontWeight: 700,
                color: "#8B4513",
                letterSpacing: 0.3,
                textAlign: "center",
                lineHeight: "38px",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              {line}
            </div>
          ))}

          {shimmer && (
            <div
              className="shimmer-strip"
              style={{
                position: "absolute",
                top: 0, bottom: 0,
                width: 90,
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.75) 50%, transparent 100%)",
                pointerEvents: "none",
                zIndex: 10,
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
