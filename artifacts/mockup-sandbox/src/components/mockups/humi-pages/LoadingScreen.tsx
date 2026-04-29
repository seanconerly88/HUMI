import { useEffect, useState } from "react";

const LINES = ["Know more.", "Remember everything.", "Smoke better."];

export default function LoadingScreen() {
  const [logoVisible, setLogoVisible] = useState(false);
  const [visible, setVisible] = useState([false, false, false]);

  useEffect(() => {
    const t0 = setTimeout(() => setLogoVisible(true), 300);
    const t1 = setTimeout(() => setVisible(v => [true,  v[1], v[2]]), 900);
    const t2 = setTimeout(() => setVisible(v => [v[0], true,  v[2]]), 2300);
    const t3 = setTimeout(() => setVisible(v => [v[0], v[1], true]),  3700);
    return () => [t0, t1, t2, t3].forEach(clearTimeout);
  }, []);

  return (
    <>
      <style>{`
        .humi-line {
          transition: opacity 1.1s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 1.1s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .humi-logo {
          transition: opacity 1s ease, transform 1s ease;
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

        <div
          className="humi-logo"
          style={{
            marginBottom: 44,
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? "translateY(0)" : "translateY(8px)",
          }}
        >
          <img
            src="/__mockup/icon.png"
            alt="HUMI"
            style={{ width: 110, height: 110, objectFit: "contain", display: "block" }}
          />
        </div>

        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}>
          {LINES.map((line, i) => (
            <div
              key={line}
              className="humi-line"
              style={{
                opacity: visible[i] ? 1 : 0,
                transform: visible[i] ? "translateY(0px)" : "translateY(16px)",
                fontSize: 26,
                fontWeight: 500,
                color: "#8B4513",
                letterSpacing: 0.3,
                textAlign: "center",
                lineHeight: "40px",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
