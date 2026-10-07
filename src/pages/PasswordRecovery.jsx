import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, KeyRound, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { base44 as appClient } from "@/api/supabaseAdapter";
import { requireSupabase } from "@/api/supabaseClient";

const fieldClass = "h-12 w-full rounded-xl border border-slate-200 bg-white px-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function PasswordRecovery() {
  const [status, setStatus] = useState("checking");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const urlError = query.get("error") || query.get("error_code")
      || fragment.get("error") || fragment.get("error_code");
    if (urlError) {
      setStatus("invalid");
      return undefined;
    }

    // A custom recovery link is verified only after the person presses the
    // button below. Email security scanners can safely preview the GET URL.
    if (fragment.get("recovery_token") || query.get("token_hash")) {
      setStatus("confirm");
      return undefined;
    }

    const client = requireSupabase();
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (active && event === "PASSWORD_RECOVERY" && session) setStatus("ready");
    });
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (active) setStatus(!sessionError && data.session ? "ready" : "invalid");
    }).catch(() => {
      if (active) setStatus("invalid");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleVerify = async () => {
    const tokenHash = new URLSearchParams(window.location.hash.slice(1)).get("recovery_token")
      || new URLSearchParams(window.location.search).get("token_hash");
    if (!tokenHash) {
      setStatus("invalid");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error: verificationError } = await requireSupabase().auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });
      if (verificationError) throw verificationError;
      window.history.replaceState(window.history.state, "", "/reset-password");
      setStatus("ready");
    } catch {
      window.history.replaceState(window.history.state, "", "/reset-password");
      setStatus("invalid");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (newPassword.length < 8) return setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
    if (newPassword !== confirmPassword) return setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");

    setLoading(true);
    try {
      await appClient.auth.resetPassword({ newPassword });
      await requireSupabase().auth.signOut({ scope: "local" }).catch(() => {});
      setStatus("success");
    } catch (err) {
      setError(err.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setLoading(false);
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
          <p className="mb-5 text-xs font-semibold tracking-[.18em] text-cyan-200">ACCOUNT SECURITY</p>
          <h1 className="text-5xl font-bold leading-[1.13] tracking-tight">ตั้งรหัสผ่านใหม่<br />กลับมาใช้งาน PobJer</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-slate-300">รักษาบัญชีของคุณให้ปลอดภัย เพื่อให้ประกาศและบทสนทนายังอยู่กับคุณเสมอ</p>
        </div>
      </aside>

      <main className="flex min-h-[100dvh] items-center justify-center bg-white px-5 py-10 sm:px-10">
        <section className="w-full max-w-[400px]">
          <Link to="/login" className="mb-12 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> กลับไปเข้าสู่ระบบ</Link>
          <div className="mb-8 lg:hidden"><img src="/pobjer-icon.png" alt="PobJer" className="mb-5 h-11 w-11 rounded-xl object-cover" /><p className="font-bold tracking-tight">PobJer</p></div>

          {status === "checking" && <div role="status" className="flex items-center gap-3 text-sm text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /> กำลังตรวจสอบลิงก์รีเซ็ตรหัสผ่าน...</div>}

          {status === "confirm" && <>
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-700"><KeyRound className="h-6 w-6" /></div>
            <h1 className="text-3xl font-bold tracking-tight">ยืนยันการตั้งรหัสผ่านใหม่</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">กดปุ่มด้านล่างเพื่อยืนยันลิงก์จากอีเมล แล้วตั้งรหัสผ่านใหม่ของคุณ</p>
            <button type="button" onClick={handleVerify} disabled={loading} className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#10213d] px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{loading && <Loader2 className="h-4 w-4 animate-spin" />}{loading ? "กำลังยืนยันลิงก์..." : "ยืนยันและตั้งรหัสผ่านใหม่"}</button>
          </>}

          {status === "invalid" && <>
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-amber-50 text-amber-600"><KeyRound className="h-6 w-6" /></div>
            <h1 className="text-3xl font-bold tracking-tight">ลิงก์ใช้งานไม่ได้</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">ลิงก์อาจหมดอายุ ถูกใช้ไปแล้ว หรือยังไม่ได้เปิดจากอีเมลรีเซ็ตรหัสผ่าน กรุณาขอลิงก์ใหม่</p>
            <Link to="/forgot-password" className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#10213d] px-4 text-sm font-semibold text-white hover:bg-slate-800">ขอลิงก์ใหม่</Link>
          </>}

          {status === "success" && <>
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck className="h-6 w-6" /></div>
            <h1 className="text-3xl font-bold tracking-tight">เปลี่ยนรหัสผ่านแล้ว</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที</p>
            <a href="/login" className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#10213d] px-4 text-sm font-semibold text-white hover:bg-slate-800">เข้าสู่ระบบ</a>
          </>}

          {status === "ready" && <>
            <div className="mb-8"><div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><LockKeyhole className="h-5 w-5" /></div><h1 className="text-3xl font-bold tracking-tight">ตั้งรหัสผ่านใหม่</h1><p className="mt-2 text-sm leading-6 text-slate-500">เลือกรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร แล้วเข้าสู่ระบบอีกครั้ง</p></div>
            {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block"><span className="mb-2 block text-sm font-semibold">รหัสผ่านใหม่</span><span className="relative block"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className={fieldClass} type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></span></label>
              <label className="block"><span className="mb-2 block text-sm font-semibold">ยืนยันรหัสผ่านใหม่</span><span className="relative block"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className={fieldClass} type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></span></label>
              <button type="submit" disabled={loading} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#10213d] px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{loading ? "กำลังเปลี่ยนรหัสผ่าน..." : "บันทึกรหัสผ่านใหม่"}</button>
            </form>
          </>}
        </section>
      </main>
    </div>
  );
}
