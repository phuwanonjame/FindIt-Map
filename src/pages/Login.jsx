import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, KeyRound, Loader2, LockKeyhole, Mail } from "lucide-react";
import { base44 as appClient } from "@/api/supabaseAdapter";
import GoogleIcon from "@/components/GoogleIcon";

const fieldClass = "h-12 w-full rounded-xl border border-slate-200 bg-white px-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function Login() {
  const location = useLocation();
  const requestedNext = new URLSearchParams(location.search).get("next");
  const nextPath = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.includes("\\") ? requestedNext : "/";
  useEffect(() => {
    if (nextPath !== "/") window.sessionStorage.setItem("pobjer:auth-next", nextPath);
  }, [nextPath]);
  const [email, setEmail] = useState(() => location.state?.email || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async (event) => {
    event.preventDefault();
    setError(""); setLoading(true);
    try {
      await appClient.auth.loginViaEmailPassword(email, password);
      window.sessionStorage.removeItem("pobjer:auth-next");
      window.location.assign(nextPath);
    } catch (err) {
      setError(err.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      setLoading(false);
    }
  };

  const signInGoogle = async () => {
    setError(""); setLoading(true);
    try {
      if (nextPath !== "/") window.sessionStorage.setItem("pobjer:auth-next", nextPath);
      await appClient.auth.loginWithProvider("google", window.location.origin);
    }
    catch (err) { window.sessionStorage.removeItem("pobjer:auth-next"); setError(err.message || "ไม่สามารถเข้าสู่ระบบด้วย Google ได้"); setLoading(false); }
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

      <main className="flex min-h-[100dvh] items-center justify-center bg-white px-5 py-10 sm:px-10">
        <section className="w-full max-w-[400px]">
          <Link to="/" className="mb-12 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> กลับสู่หน้าแรก</Link>
          <div className="mb-8 lg:hidden"><img src="/pobjer-icon.png" alt="PobJer" className="mb-5 h-11 w-11 rounded-xl object-cover" /><p className="font-bold tracking-tight">PobJer</p></div>
          <div className="mb-8"><h2 className="text-3xl font-bold tracking-tight">เข้าสู่ระบบ</h2><p className="mt-2 text-sm leading-6 text-slate-500">เข้าสู่ระบบเพื่อแจ้งประกาศและติดตามสิ่งที่คุณกำลังตามหา</p></div>
          {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={signIn} className="space-y-5">
            <label className="block"><span className="mb-2 block text-sm font-semibold">อีเมล</span><span className="relative block"><Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className={fieldClass} type="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></span></label>
            <label className="block"><span className="mb-2 flex items-center justify-between text-sm font-semibold">รหัสผ่าน <Link to="/forgot-password" state={{ email }} className="font-medium text-blue-600 hover:text-blue-700">ลืมรหัสผ่าน?</Link></span><span className="relative block"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className={fieldClass} type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} required /></span></label>
            <button type="submit" disabled={loading} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#10213d] px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{loading ? "กำลังเข้าสู่ระบบ" : "เข้าสู่ระบบ"}</button>
          </form>
          <div className="my-7 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />หรือ<span className="h-px flex-1 bg-slate-200" /></div>
          <button type="button" onClick={signInGoogle} disabled={loading} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"><GoogleIcon className="h-5 w-5" />ดำเนินการต่อด้วย Google</button>
          <p className="mt-8 text-center text-sm text-slate-500">ยังไม่มีบัญชี? <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">สมัครสมาชิก</Link></p>
        </section>
      </main>
    </div>
  );
}
