import { useEffect, useState } from "react";

const LINES = ["Know more.", "Remember everything.", "Smoke better."];

export default function LoadingScreen() {
  const [phase, setPhase] = useState(0);
  // phase 0 = all hidden
  // phase 1/2/3 = lines appearing one by one
  // phase 4 = glimmer active on letters

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 1150);
    const t3 = setTimeout(() => setPhase(3), 1800);
    const t4 = setTimeout(() => setPhase(4), 3900);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  return (
    <>
      <style>{`
        @keyframes glimmer {
          0%   { background-position: -200% center; }
          50%  { background-position: 200% center; }
          100% { background-position: 200% center; }
        }
        .glimmer-text {
          background: linear-gradient(
            90deg,
            #8B4513 0%,
            #8B4513 32%,
            #A85C1A 42%,
            #C98840 47%,
            #E8C880 50%,
            #C98840 53%,
            #A85C1A 58%,
            #8B4513 68%,
            #8B4513 100%
          );
          background-size: 400% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          color: transparent;
          animation: glimmer 3s linear infinite;
        }
        .plain-text {
          color: #8B4513;
        }
        .line {
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .logo-wrap {
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
      `}</style>

      <div style={{
        position: "fixed",
        inset: 0,
        background: "#faf7f3",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>

        {/* Real HUMI icon */}
        <div
          className="logo-wrap"
          style={{
            marginBottom: 40,
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? "translateY(0)" : "translateY(10px)",
          }}
        >
          <img
            src="/__mockup/icon.png"
            alt="HUMI"
            style={{
              width: 110,
              height: 110,
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        {/* Three lines */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}>
          {LINES.map((line, i) => {
            const visible = phase >= i + 1;
            const glimmering = phase >= 4;
            return (
              <div
                key={line}
                className={`line ${glimmering ? "glimmer-text" : "plain-text"}`}
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0px)" : "translateY(14px)",
                  fontSize: 26,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                  textAlign: "center",
                  lineHeight: "38px",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
