import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 as appClient } from "@/api/supabaseAdapter";
import { Mail, ArrowLeft, Loader2, Send } from "lucide-react";
import TurnstileChallenge, { turnstileSiteKey } from "@/components/TurnstileChallenge";

const fieldClass = "h-12 w-full rounded-xl border border-slate-200 bg-white px-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function ForgotPassword() {
  const location = useLocation();
  const [email, setEmail] = useState(() => location.state?.email || "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (turnstileSiteKey && !captchaToken) {
      setCaptchaError("กรุณายืนยันความปลอดภัยก่อนส่งคำขอ");
      return;
    }
    setCaptchaError("");
    setLoading(true);
    try {
      await appClient.auth.resetPasswordRequest(email, captchaToken || undefined);
    } catch {
      // Always show success regardless
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-slate-100 text-slate-900 lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,.92fr)]">
      <aside className="relative hidden min-h-[100dvh] overflow-hidden bg-[#10213d] p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -left-20 top-20 h-80 w-80 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
        <Link to="/" className="relative inline-flex items-center gap-3 self-start font-bold tracking-tight">
          <img src="/pobjer-icon.png" alt="PobJer" className="h-10 w-10 rounded-xl object-cover" />
          PobJer
        </Link>
        <div className="relative my-auto max-w-xl">
          <p className="mb-5 text-xs font-semibold tracking-[.18em] text-cyan-200">LOST & FOUND COMMUNITY</p>
          <h1 className="text-5xl font-bold leading-[1.13] tracking-tight">ทุกการตามหา<br />เริ่มต้นจากการแจ้งที่ถูกที่</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-slate-300">ปักหมุดเหตุการณ์ สื่อสารกับชุมชน และจัดการการส่งคืนได้ในพื้นที่เดียว</p>
        </div>
      </aside>

      <main className="flex min-h-[100dvh] min-w-0 items-center justify-center bg-white px-5 py-10 sm:px-10">
        <section className="w-full max-w-[400px]">
          <Link to="/login" state={{ email }} className="mb-12 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> กลับไปเข้าสู่ระบบ</Link>
          <div className="mb-8 lg:hidden"><img src="/pobjer-icon.png" alt="PobJer" className="mb-5 h-11 w-11 rounded-xl object-cover" /><p className="font-bold tracking-tight">PobJer</p></div>
          <div className="mb-8">
            <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><Mail className="h-5 w-5" /></div>
            <h1 className="text-3xl font-bold tracking-tight">ลืมรหัสผ่าน</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้หากอีเมลนี้มีบัญชีอยู่</p>
          </div>

          {sent ? (
            <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm leading-6 text-slate-700">
              หากอีเมลนี้มีบัญชีอยู่ คุณจะได้รับลิงก์ตั้งรหัสผ่านใหม่ในอีเมล โปรดตรวจกล่องจดหมายและจดหมายขยะ
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {captchaError && <p role="alert" className="text-sm text-red-600">{captchaError}</p>}
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">อีเมล</span>
                <span className="relative block"><Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className={fieldClass} type="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></span>
              </label>
              <TurnstileChallenge onToken={setCaptchaToken} />
              <button type="submit" disabled={loading} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#10213d] px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{loading ? "กำลังส่งลิงก์" : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}</button>
            </form>
          )}
          <p className="mt-8 text-center text-sm text-slate-500">จำรหัสผ่านได้แล้ว? <Link to="/login" state={{ email }} className="font-semibold text-blue-600 hover:text-blue-700">เข้าสู่ระบบ</Link></p>
        </section>
      </main>
    </div>
  );
}
