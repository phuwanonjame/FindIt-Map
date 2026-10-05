import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { timeAgo } from "@/lib/constants";

export default function Messages() {
  const { user } = useAuth();
  const [convs, setConvs] = useState([]);
  const [unreadByConversation, setUnreadByConversation] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let active = true;
    const refresh = async () => {
      try {
        const [all, notifications] = await Promise.all([
          base44.entities.Conversation.list(),
          base44.entities.Notification.filter({ user_id: user.id }),
        ]);
        if (!active) return;
        setConvs(all.filter((conversation) => conversation.participant_ids?.includes(user.id)).sort((a, b) => new Date(b.last_message_at || b.created_date).getTime() - new Date(a.last_message_at || a.created_date).getTime()));
        const counts = {};
        notifications.filter((notification) => notification.type === "MESSAGE" && !notification.read_at).forEach((notification) => {
          const conversationId = notification.conversation_id || notification.reference_id;
          counts[conversationId] = (counts[conversationId] || 0) + 1;
        });
        setUnreadByConversation(counts);
      } catch { /* Keep the previous list if offline. */ }
      finally { if (active) setLoading(false); }
    };
    refresh();
    const timer = window.setInterval(refresh, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [user?.id]);

  if (!user) {
    return <div className="max-w-md mx-auto px-4 py-16 text-center"><MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">เข้าสู่ระบบเพื่อใช้ข้อความ</p><Link to="/login" className="text-primary font-semibold">เข้าสู่ระบบ</Link></div>;
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-4">
      <h1 className="text-xl font-bold mb-4">ข้อความ</h1>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-card rounded-2xl border border-border animate-pulse" />)}</div>
      ) : convs.length === 0 ? (
        <div className="text-center py-16"><MessageSquare className="mx-auto mb-3 h-12 w-12 text-muted-foreground" /><p className="text-muted-foreground">ยังไม่มีข้อความ</p></div>
      ) : (
        <div className="space-y-2">
          {convs.map((c) => (
            <Link key={c.id} to={`/messages/${c.id}`} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-accent transition">
              <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">{(c.post_title || "?").charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{c.post_title}</div>
                <div className="text-xs text-muted-foreground truncate">{c.last_message || "เริ่มแชท"}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">{c.last_message_at ? timeAgo(c.last_message_at) : ""}</div>
                {unreadByConversation[c.id] > 0 && <span className="inline-flex min-w-5 justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{unreadByConversation[c.id]}</span>}
                <ChevronRight className="w-4 h-4 text-muted-foreground inline" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
