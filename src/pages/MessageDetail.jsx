import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Send, ImagePlus, MapPin } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

export default function MessageDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const c = await base44.entities.Conversation.get(id);
      setConv(c);
      const msgs = await base44.entities.Message.filter({ conversation_id: id });
      msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setMessages(msgs);
    } catch { toast.error("โหลดข้อความไม่สำเร็จ"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !user) return;
    const msg = { conversation_id: id, sender_id: user.id, sender_name: user.full_name || "ผู้ใช้", message_type: "TEXT", message: text };
    setText("");
    try {
      const created = await base44.entities.Message.create(msg);
      setMessages((m) => [...m, created]);
      await base44.entities.Conversation.update(id, { last_message: msg.message, last_message_at: new Date().toISOString() });
    } catch { toast.error("ส่งไม่สำเร็จ"); }
  };

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-6"><div className="h-16 bg-card rounded-2xl animate-pulse" /></div>;
  if (!conv) return <div className="text-center py-16 text-muted-foreground">ไม่พบแชท</div>;

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-4 flex flex-col" style={{ minHeight: "calc(100vh - 8rem)" }}>
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-accent"><ChevronLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <div className="font-semibold text-sm">{conv.post_title}</div>
          <Link to={`/post/${conv.post_id}`} className="text-xs text-primary">ดูประกาศ →</Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pb-2">
        {messages.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">เริ่มสนทนาได้เลย</div>}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] px-3.5 py-2 rounded-2xl text-sm", mine ? "bg-primary text-white rounded-br-md" : "bg-card border border-border rounded-bl-md")}>
                {!mine && <div className="text-xs font-semibold opacity-70 mb-0.5">{m.sender_name}</div>}
                <div>{m.message}</div>
                <div className={cn("text-[10px] mt-0.5", mine ? "text-white/60" : "text-muted-foreground")}>{new Date(m.created_date).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="พิมพ์ข้อความ..." className="flex-1 px-4 py-2.5 rounded-full bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <button onClick={send} className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center shrink-0"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  );
}