import { useEffect, useRef, useState } from "react";

export const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || "";

let scriptPromise;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile unavailable"));
      script.onerror = () => reject(new Error("Turnstile unavailable"));
      document.head.appendChild(script);
    }).catch((error) => {
      scriptPromise = undefined;
      throw error;
    });
  }
  return scriptPromise;
}

export default function TurnstileChallenge({ onToken, resetKey = 0 }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const onTokenRef = useRef(onToken);
  const [failed, setFailed] = useState(false);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!turnstileSiteKey) return;
    let active = true;
    loadTurnstile().then((turnstile) => {
      if (!active || !containerRef.current) return;
      widgetRef.current = turnstile.render(containerRef.current, {
        sitekey: turnstileSiteKey,
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
      });
    }).catch(() => { if (active) setFailed(true); });
    return () => {
      active = false;
      if (widgetRef.current !== null && window.turnstile) window.turnstile.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey && widgetRef.current !== null && window.turnstile) {
      window.turnstile.reset(widgetRef.current);
      onTokenRef.current("");
    }
  }, [resetKey]);

  if (!turnstileSiteKey) return null;
  return <div className="flex min-h-[65px] flex-col items-start justify-center overflow-hidden">
    <div ref={containerRef} />
    {failed && <p role="alert" className="text-sm text-red-600">ไม่สามารถโหลดการยืนยันความปลอดภัยได้ กรุณาลองใหม่อีกครั้ง</p>}
  </div>;
}
