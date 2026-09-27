import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  goldMasterTokens,
  GOLD_MASTER_STATES,
  GOLD_MASTER_VERSION,
} from "./tokens.js";

function getStateClass(state) {
  if (!GOLD_MASTER_STATES.includes(state) || state === "normal") return "";
  return `gm-state--${state}`;
}

function stateProps(state) {
  return {
    "data-state": state,
    className: getStateClass(state),
  };
}

export function Button({
  as: Tag = "button",
  type = "button",
  variant = "champagne",
  size = "md",
  state = "normal",
  loading = false,
  disabled = false,
  className = "",
  children,
  ...props
}) {
  const visualState = loading ? "loading" : disabled ? "disabled" : state;
  const nativeButton = Tag === "button";
  return (
    <Tag
      {...(nativeButton ? { type, disabled: disabled || loading } : {})}
      className={`gm-button gm-button--${variant} gm-button--${size} ${getStateClass(visualState)} ${className}`.trim()}
      data-state={visualState}
      aria-disabled={!nativeButton && (disabled || loading) ? true : undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? "Chargement…" : children}
    </Tag>
  );
}

export function Card({ as: Tag = "section", hero = false, state = "normal", className = "", children, ...props }) {
  return (
    <Tag
      className={`gm-card ${hero ? "gm-card--hero" : ""} ${getStateClass(state)} ${className}`.trim()}
      data-state={state}
      {...props}
    >
      {children}
    </Tag>
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

export function Badge({ tone = "neutral", state = "normal", className = "", ...props }) {
  return (
    <span
      className={`gm-badge gm-badge--${tone} ${getStateClass(state)} ${className}`.trim()}
      data-state={state}
      {...props}
    />
  );
}

export function Progress({
  value = 0,
  tone = "champagne",
  state = "normal",
  label = "Progression",
  className = "",
}) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div
      className={`gm-progress gm-progress--${tone} ${getStateClass(state)} ${className}`.trim()}
      data-state={state}
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

export function Stat({ label, value, detail, state = "normal", className = "" }) {
  return (
    <div className={`gm-stat ${getStateClass(state)} ${className}`.trim()} data-state={state}>
      {label ? <div className="gm-stat__label">{label}</div> : null}
      <div className="gm-stat__value">{value}</div>
      {detail ? <div className="gm-stat__detail">{detail}</div> : null}
    </div>
  );
}

export function Tabs({
  items = [],
  value,
  onChange = () => {},
  state = "normal",
  label = "Navigation",
  className = "",
}) {
  return (
    <div
      className={`gm-tabs ${getStateClass(state)} ${className}`.trim()}
      data-state={state}
      role="tablist"
      aria-label={label}
    >
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

export function Toast({
  tone = "neutral",
  state = "normal",
  role = "status",
  className = "",
  ...props
}) {
  return (
    <div
      className={`gm-toast gm-toast--${tone} ${getStateClass(state)} ${className}`.trim()}
      data-state={state}
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      {...props}
    />
  );
}

export function Avatar({
  src,
  alt = "",
  size = 48,
  fallback = "3B",
  state = "normal",
  className = "",
}) {
  return (
    <span
      className={`gm-avatar ${getStateClass(state)} ${className}`.trim()}
      data-state={state}
      style={{ width: size, height: size }}
    >
      {src ? <img src={src} alt={alt} /> : <span aria-hidden="true">{fallback}</span>}
    </span>
  );
}

export function VideoPlayer({
  title = "Lecteur vidéo 3B",
  state = "normal",
  className = "",
  ...props
}) {
  return (
    <video
      className={`gm-video ${getStateClass(state)} ${className}`.trim()}
      data-state={state}
      aria-label={title}
      controls
      playsInline
      {...props}
    />
  );
}

export function Modal({
  open,
  title,
  state = "normal",
  children,
  onClose,
  className = "",
}) {
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
        className={`gm-modal ${getStateClass(state)} ${className}`.trim()}
        data-state={state}
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

export { goldMasterTokens, GOLD_MASTER_STATES, GOLD_MASTER_VERSION, getStateClass, stateProps };
