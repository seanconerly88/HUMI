import { useEffect, useState, useRef } from "react";

const LINES = ["Know more.", "Remember everything.", "Smoke better."];

export default function LoadingScreen() {
  const [phase, setPhase] = useState(0); // 0=nothing, 1=line1, 2=line2, 3=line3, 4=shimmer
  const shimmerRef = useRef<number | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => setPhase(3), 1900);
    const t4 = setTimeout(() => setPhase(4), 4000);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  return (
    <>
      <style>{`
        @keyframes shimmerMove {
          0%   { transform: translateX(-220px); }
          100% { transform: translateX(420px); }
        }
        .shimmer {
          animation: shimmerMove 1.6s ease-in-out infinite;
        }
        .line {
          transition: opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>

      <div style={{
        position: "fixed", inset: 0,
        background: "#faf7f3",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>

        {/* HUMI Wordmark — stands in for the icon */}
        <div style={{
          marginBottom: 48,
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
        }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "#8B4513",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
            boxShadow: "0 4px 24px rgba(139,69,19,0.22)",
          }}>
            <span style={{
              color: "#fff",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 4,
              fontFamily: "Georgia, serif",
            }}>H</span>
          </div>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 6,
            color: "#8B4513",
            textTransform: "uppercase" as const,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}>HUMI</span>
        </div>

        {/* Three lines */}
        <div style={{
          position: "relative",
          overflow: "hidden",
          paddingLeft: 32,
          paddingRight: 32,
          paddingTop: 6,
          paddingBottom: 6,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}>
          {LINES.map((line, i) => {
            const visible = phase >= i + 1;
            return (
              <div
                key={line}
                className="line"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0px)" : "translateY(12px)",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#8B4513",
                  letterSpacing: 0.4,
                  textAlign: "center" as const,
                  lineHeight: "40px",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              >
                {line}
              </div>
            );
          })}

          {/* Shimmer sweep */}
          {phase >= 4 && (
            <div
              className="shimmer"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: 100,
                background: "linear-gradient(90deg, transparent 0%, rgba(196,120,26,0.18) 40%, rgba(255,220,150,0.38) 50%, rgba(196,120,26,0.18) 60%, transparent 100%)",
                pointerEvents: "none",
                zIndex: 10,
                borderRadius: 4,
              }}
            />
          )}
        </div>

        {/* Subtle rule below */}
        <div style={{
          width: 32,
          height: 2,
          background: "rgba(139,69,19,0.18)",
          borderRadius: 2,
          marginTop: 32,
          opacity: phase >= 3 ? 1 : 0,
          transition: "opacity 0.8s ease 0.3s",
        }} />
      </div>
    </>
  );
}
