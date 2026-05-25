import React from "react";

export default function Living3B() {
  return (
    <section className="premium-panel">
      <p className="eyebrow">3B vivant</p>
      <h2>Signature animée</h2>

      <div
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "220px",
          borderRadius: "28px",
          border: "1px solid rgba(230, 189, 100, 0.45)",
          background:
            "radial-gradient(circle, rgba(230, 189, 100, 0.18), rgba(0, 0, 0, 0.72))",
        }}
      >
        <span
          style={{
            color: "#fff0a5",
            fontSize: "clamp(72px, 12vw, 160px)",
            fontWeight: "1000",
            letterSpacing: "-0.14em",
            textShadow:
              "0 0 22px rgba(230, 189, 100, 0.52), 0 0 48px rgba(0, 213, 255, 0.22)",
          }}
        >
          3B
        </span>
      </div>
    </section>
  );
}