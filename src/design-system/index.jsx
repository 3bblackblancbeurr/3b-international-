import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export function Button({
  type = "button",
  variant = "champagne",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`gm-button gm-button--${variant} gm-button--${size} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? "Chargement…" : children}
    </button>
  );
}

export function Card({ hero = false, className = "", children, ...props }) {
  return (
    <section className={`gm-card ${hero ? "gm-card--hero" : ""} ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({ className = "", ...props }) {
  return <div className={`gm-card__header ${className}`.trim()} {...props} />;
}

export function CardBody({ className = "", ...props }) {
  return <div className={`gm-card__body ${className}`.trim()} {...props} />;
}

export function CardFooter({ className = "", ...props }) {
  return <div className={`gm-card__footer ${className}`.trim()} {...props} />;
}

export function Badge({ tone = "neutral", className = "", ...props }) {
  return <span className={`gm-badge gm-badge--${tone} ${className}`.trim()} {...props} />;
}

export function Progress({ value = 0, tone = "champagne", label = "Progression", className = "" }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div
      className={`gm-progress gm-progress--${tone} ${className}`.trim()}
      role="progressbar"
      aria-label={label}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={safeValue}
      style={{ "--3b-progress-value": `${safeValue}%` }}
    >
      <div className="gm-progress__fill" />
    </div>
  );
}

export function Stat({ label, value, detail, className = "" }) {
  return (
    <div className={`gm-stat ${className}`.trim()}>
      {label ? <div className="gm-stat__label">{label}</div> : null}
      <div className="gm-stat__value">{value}</div>
      {detail ? <div className="gm-stat__detail">{detail}</div> : null}
    </div>
  );
}

export function Tabs({ items = [], value, onChange = () => {}, label = "Navigation", className = "" }) {
  return (
    <div className={`gm-tabs ${className}`.trim()} role="tablist" aria-label={label}>
      {items.map((item) => {
        const itemValue = typeof item === "string" ? item : item.value;
        const itemLabel = typeof item === "string" ? item : item.label;
        const active = itemValue === value;

        return (
          <button
            key={itemValue}
            type="button"
            role="tab"
            aria-selected={active}
            className="gm-tab"
            onClick={() => onChange(itemValue)}
          >
            {itemLabel}
          </button>
        );
      })}
    </div>
  );
}

export function Toast({ tone = "neutral", role = "status", className = "", ...props }) {
  return (
    <div
      className={`gm-toast gm-toast--${tone} ${className}`.trim()}
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      {...props}
    />
  );
}

export function Avatar({ src, alt = "", size = 48, fallback = "3B", className = "" }) {
  return (
    <span className={`gm-avatar ${className}`.trim()} style={{ width: size, height: size }}>
      {src ? <img src={src} alt={alt} /> : <span aria-hidden="true">{fallback}</span>}
    </span>
  );
}

export function VideoPlayer({ title = "Lecteur vidéo 3B", className = "", ...props }) {
  return <video className={`gm-video ${className}`.trim()} aria-label={title} controls playsInline {...props} />;
}

export function Modal({ open, title, children, onClose, className = "" }) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="gm-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        className={`gm-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Fenêtre 3B"}
      >
        {children}
      </section>
    </div>,
    document.body,
  );
}

export { goldMasterTokens, GOLD_MASTER_STATES, GOLD_MASTER_VERSION } from "./tokens.js";
