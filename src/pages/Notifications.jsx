import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { timeAgo } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    try {
      const d = await base44.entities.Notification.filter({ user_id: user.id });
      d.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      setNotifs(d);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const markRead = async (n) => {
    if (n.read_at) return;
    await base44.entities.Notification.update(n.id, { read_at: new Date().toISOString() });
    window.dispatchEvent(new Event("pobjer:notifications-changed"));
    load();
  };

  const markAll = async () => {
    const unread = notifs.filter((n) => !n.read_at);
    for (const n of unread) await base44.entities.Notification.update(n.id, { read_at: new Date().toISOString() });
    window.dispatchEvent(new Event("pobjer:notifications-changed"));
    load();
  };

  if (!user) return <div className="max-w-md mx-auto px-4 py-16 text-center"><Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">เข้าสู่ระบบเพื่อดูการแจ้งเตือน</p><Link to="/login" className="text-primary font-semibold">เข้าสู่ระบบ</Link></div>;

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">การแจ้งเตือน</h1>
        {notifs.some((n) => !n.read_at) && <button onClick={markAll} className="text-sm text-primary font-semibold flex items-center gap-1"><Check className="w-4 h-4" /> อ่านทั้งหมด</button>}
      </div>
      {loading ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-card rounded-2xl border border-border animate-pulse" />)}</div> : notifs.length === 0 ? (
        <div className="text-center py-16"><Bell className="mx-auto mb-3 h-12 w-12 text-muted-foreground" /><p className="text-muted-foreground">ยังไม่มีการแจ้งเตือน</p></div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <Link key={n.id} to={n.type === "MESSAGE" || n.type === "RETURN_HANDOVER" ? `/messages/${n.conversation_id || n.reference_id}` : n.reference_id ? `/post/${n.reference_id}` : "#"} onClick={() => markRead(n)} className={cn("w-full text-left flex gap-3 p-3 rounded-2xl border transition", n.read_at ? "bg-card border-border" : "bg-primary/5 border-primary/20")}>
              <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", n.read_at ? "bg-transparent" : "bg-primary")} />
              <div className="flex-1">
                <div className="font-semibold text-sm">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_date)}</div>
              </div>
              {n.reference_id && <span className="text-xs text-primary self-center">ดู →</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
