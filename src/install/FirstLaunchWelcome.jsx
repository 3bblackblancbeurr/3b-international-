import { useEffect, useRef, useState } from "react";
import "./first-launch-welcome.css";

const WELCOME_KEY = "3b-installed-welcome-un-de-plus-v1";

function isInstalledApp() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

function isMobileDevice() {
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function FirstLaunchWelcome() {
  const [open, setOpen] = useState(false);
  const spoken = useRef(false);

  function speakUnDePlus() {
    if (!("speechSynthesis" in window) || spoken.current) return;

    const utterance = new SpeechSynthesisUtterance("Un de plus.");
    const voices = window.speechSynthesis.getVoices();
    const frenchVoices = voices.filter((voice) =>
      voice.lang?.toLowerCase().startsWith("fr")
    );
    const preferred =
      frenchVoices.find((voice) =>
        /google|microsoft|natural|audrey|thomas|amelie|amélie|marie/i.test(voice.name)
      ) || frenchVoices[0];

    if (preferred) utterance.voice = preferred;
    utterance.lang = "fr-FR";
    utterance.rate = 0.78;
    utterance.pitch = 0.74;
    utterance.volume = 1;
    utterance.onstart = () => { spoken.current = true; };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    if (!isInstalledApp() || !isMobileDevice()) return;

    try {
      if (window.localStorage.getItem(WELCOME_KEY) === "1") return;
    } catch {
      // Continue even if local storage is unavailable.
    }

    setOpen(true);
    const timer = window.setTimeout(speakUnDePlus, 500);
    return () => window.clearTimeout(timer);
  }, []);

  function enter3B() {
    // Mobile browsers can block automatic speech until a user gesture.
    // The first tap retries the same phrase if autoplay was blocked.
    if (!spoken.current) speakUnDePlus();

    try {
      window.localStorage.setItem(WELCOME_KEY, "1");
    } catch {
      // Continue even if local storage is unavailable.
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="first-launch-3b" role="dialog" aria-modal="true" aria-labelledby="first-launch-3b-title">
      <div className="first-launch-3b-matrix" aria-hidden="true">
        0101 3B 0011 3B 0101 3B 0011 3B
      </div>
      <section className="first-launch-3b-card">
        <img src="/icons/3b-icon-20260912-192.png" width="92" height="92" alt="" />
        <p className="first-launch-3b-eyebrow">3B International</p>
        <h1 id="first-launch-3b-title">UN DE PLUS.</h1>
        <p>Bienvenue dans l’héritage.</p>
        <button type="button" onClick={enter3B}>ENTRER DANS 3B</button>
      </section>
    </div>
  );
}
