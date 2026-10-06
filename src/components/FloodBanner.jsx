import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

const CAMPAIGN_END = new Date("2026-11-01T00:00:00+07:00");
const DISMISS_COOKIE = "pobjer_flood_banner_2026";

function wasDismissed() {
  return document.cookie.split("; ").some((entry) => entry === `${DISMISS_COOKIE}=1`);
}

export default function FloodBanner() {
  const [visible, setVisible] = useState(() => Date.now() < CAMPAIGN_END.getTime() && !wasDismissed());
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!visible) return undefined;
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();
    const checkExpiry = () => {
      if (Date.now() >= CAMPAIGN_END.getTime()) setVisible(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setVisible(false);
    };
    const timer = window.setInterval(checkExpiry, 60_000);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("keydown", closeOnEscape);
      previouslyFocused?.focus?.();
    };
  }, [visible]);

  const dismissForever = () => {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${DISMISS_COOKIE}=1; expires=${CAMPAIGN_END.toUTCString()}; path=/; SameSite=Lax${secure}`;
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="flood-banner-title">
      <div className="relative my-auto w-full max-w-[1120px] overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
        <h2 id="flood-banner-title" className="sr-only">ร่วมกันตามหาของที่หายในช่วงน้ำท่วม</h2>
        <button ref={closeButtonRef} type="button" onClick={() => setVisible(false)} aria-label="ปิดแบนเนอร์" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-slate-700 shadow-md transition hover:bg-white hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-600">
          <X className="h-5 w-5" />
        </button>
        <img src="/pobjer-flood-banner-2026.png" alt="PobJer ชวนช่วยตามหาของหายในช่วงน้ำท่วม แจ้งของหายหรือแจ้งของที่พบเพื่อเพิ่มโอกาสให้ของกลับถึงเจ้าของ" className="block h-auto w-full" />
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <p className="max-w-xl text-sm leading-6 text-slate-600">ช่วยกันแจ้งของหายหรือของที่พบในช่วงน้ำท่วม เพื่อให้ของสำคัญกลับถึงเจ้าของ</p>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Link to="/post/new?type=LOST" onClick={() => setVisible(false)} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">แจ้งของหาย</Link>
            <Link to="/post/new?type=FOUND" onClick={() => setVisible(false)} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">แจ้งพบของ</Link>
            <button type="button" onClick={dismissForever} className="ml-auto rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline sm:ml-0">ไม่แสดงอีก</button>
          </div>
        </div>
      </div>
    </div>
  );
}
