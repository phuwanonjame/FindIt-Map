import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, KeyRound, Loader2, LockKeyhole, Mail, MapPinned, ShieldCheck, UserPlus } from "lucide-react";
import { base44 as appClient } from "@/api/supabaseAdapter";
import GoogleIcon from "@/components/GoogleIcon";

const fieldClass = "h-12 w-full rounded-xl border border-slate-200 bg-white px-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function SidePanel() {
  return <aside className="relative hidden min-h-[100dvh] overflow-hidden bg-[#10213d] p-12 text-white lg:flex lg:flex-col"><div className="absolute -left-20 top-20 h-80 w-80 rounded-full bg-blue-500/25 blur-3xl" /><div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" /><Link to="/" className="relative inline-flex items-center gap-3 self-start font-bold tracking-tight"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300 text-[#10213d]"><MapPinned className="h-5 w-5" /></span>FindIt Map</Link><div className="relative my-auto max-w-xl"><p className="mb-5 text-xs font-semibold tracking-[.18em] text-cyan-200">LOST & FOUND COMMUNITY</p><h1 className="text-5xl font-bold leading-[1.13] tracking-tight">เริ่มช่วยกันตามหา<br />ได้ในไม่กี่นาที</h1><p className="mt-6 max-w-md text-base leading-7 text-slate-300">สร้างบัญชีเพื่อแจ้งของหาย พบของ และช่วยส่งสิ่งสำคัญกลับคืนสู่เจ้าของ</p></div></aside>;
}

export default function RegisterNew() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [verifyMode, setVerifyMode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const register = async (event) => {
    event.preventDefault(); setError("");
    if (password !== confirmPassword) return setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
    if (password.length < 6) return setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    setLoading(true);
    try {
      const result = await appClient.auth.register({ email, password });
      // Supabase returns a session immediately when email confirmation is off.
      // In that mode there is no OTP email to wait for.
      if (result.session) window.location.assign("/");
      else setVerifyMode(true);
    }
    catch (err) { setError(err.message || "ไม่สามารถสร้างบัญชีได้"); }
    finally { setLoading(false); }
  };
  const verify = async (event) => {
    event.preventDefault(); setError(""); setLoading(true);
    try { await appClient.auth.verifyOtp({ email, otpCode: otp }); window.location.assign("/"); }
    catch (err) { setError(err.message || "รหัสยืนยันไม่ถูกต้อง"); setLoading(false); }
  };
  const google = async () => {
    setError(""); setLoading(true);
    try { await appClient.auth.loginWithProvider("google", window.location.origin); }
    catch (err) { setError(err.message || "ไม่สามารถสมัครด้วย Google ได้"); setLoading(false); }
  };
  const resend = async () => { try { await appClient.auth.resendOtp(email); } catch (err) { setError(err.message || "ไม่สามารถส่งรหัสใหม่ได้"); } };

  const heading = verifyMode ? "ยืนยันอีเมล" : "สร้างบัญชีใหม่";
  const subheading = verifyMode ? `กรอกรหัส 8 หลักที่ส่งไปยัง ${email}` : "เริ่มแจ้งประกาศและช่วยให้สิ่งสำคัญกลับคืนสู่เจ้าของ";
  return <div className="min-h-[100dvh] overflow-x-hidden bg-slate-100 text-slate-900 lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,.92fr)]"><SidePanel /><main className="flex min-h-[100dvh] min-w-0 items-center justify-center overflow-y-auto bg-white px-5 py-6 sm:px-10 sm:py-8"><section className="w-full max-w-[400px]"><Link to="/" className="mb-12 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> กลับสู่หน้าแรก</Link><div className="mb-8 lg:hidden"><div className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-[#10213d] text-cyan-300"><MapPinned className="h-5 w-5" /></div><p className="font-bold tracking-tight">FindIt Map</p></div><div className="mb-8"><div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700">{verifyMode ? <ShieldCheck className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}</div><h2 className="text-3xl font-bold tracking-tight">{heading}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{subheading}</p></div>{error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {verifyMode ? <form onSubmit={verify} className="space-y-5"><label className="block"><span className="mb-2 block text-sm font-semibold">รหัสยืนยัน 8 หลัก</span><span className="relative block"><KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className={fieldClass + " tracking-[.35em]"} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength="8" autoFocus placeholder="12345678" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} required /></span></label><button type="submit" disabled={loading || otp.length !== 8} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#10213d] px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{loading ? "กำลังยืนยัน" : "ยืนยันอีเมล"}</button><p className="text-center text-sm text-slate-500">ไม่ได้รับรหัส? <button type="button" onClick={resend} className="font-semibold text-blue-600 hover:text-blue-700">ส่งอีกครั้ง</button></p></form> : <><form onSubmit={register} className="space-y-5"><label className="block"><span className="mb-2 block text-sm font-semibold">อีเมล</span><span className="relative block"><Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className={fieldClass} type="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></span></label><label className="block"><span className="mb-2 block text-sm font-semibold">รหัสผ่าน</span><span className="relative block"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className={fieldClass} type="password" autoComplete="new-password" placeholder="อย่างน้อย 6 ตัวอักษร" value={password} onChange={(event) => setPassword(event.target.value)} required /></span></label><label className="block"><span className="mb-2 block text-sm font-semibold">ยืนยันรหัสผ่าน</span><span className="relative block"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className={fieldClass} type="password" autoComplete="new-password" placeholder="พิมพ์รหัสผ่านอีกครั้ง" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></span></label><button type="submit" disabled={loading} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#10213d] px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}{loading ? "กำลังสร้างบัญชี" : "สร้างบัญชี"}</button></form><div className="my-7 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />หรือ<span className="h-px flex-1 bg-slate-200" /></div><button type="button" onClick={google} disabled={loading} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"><GoogleIcon className="h-5 w-5" />สมัครด้วย Google</button><p className="mt-8 text-center text-sm text-slate-500">มีบัญชีอยู่แล้ว? <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">เข้าสู่ระบบ</Link></p></>}</section></main></div>;
}
