import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Camera, ChevronLeft, FileText, Paperclip, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { getChatFileUrl, uploadChatFile, validateChatFile } from "@/lib/chatAttachments";

export default function MessageDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [fileUrls, setFileUrls] = useState({});
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const lastScrolledMessage = useRef(null);
  const fileInput = useRef(null);
  const cameraInput = useRef(null);

  const load = async () => {
    setLoading(true);
    setConv(null);
    setMessages([]);
    try {
      const c = await base44.entities.Conversation.get(id);
      if (!user || !c.participant_ids?.includes(user.id)) throw new Error("not_a_participant");
      setConv(c);
      const msgs = await base44.entities.Message.filter({ conversation_id: id });
      msgs.sort((a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime());
      setMessages(msgs);
    } catch { toast.error("โหลดข้อความไม่สำเร็จ"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id, user?.id]);
  useEffect(() => {
    const newestId = messages[messages.length - 1]?.id;
    if (newestId && newestId !== lastScrolledMessage.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      lastScrolledMessage.current = newestId;
    }
  }, [messages]);

  useEffect(() => {
    const pending = messages.filter((message) => message.attachment_path && !(message.attachment_path in fileUrls));
    if (!pending.length) return;
    let active = true;
    Promise.all(pending.map(async (message) => {
      try { return [message.attachment_path, await getChatFileUrl(message.attachment_path)]; }
      catch { return [message.attachment_path, null]; }
    })).then((pairs) => {
      if (active) setFileUrls((current) => ({ ...current, ...Object.fromEntries(pairs) }));
    });
    return () => { active = false; };
  }, [messages, fileUrls]);

  useEffect(() => {
    if (!user || !conv) return undefined;
    const refresh = async () => {
      try {
        const rows = await base44.entities.Message.filter({ conversation_id: id });
        rows.sort((a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime());
        setMessages(rows);
        const notifications = await base44.entities.Notification.filter({ user_id: user.id, conversation_id: id });
        const unread = notifications.filter((notification) => !notification.read_at);
        if (unread.length) {
          await Promise.all(unread.map((notification) => base44.entities.Notification.update(notification.id, { read_at: new Date().toISOString() })));
          window.dispatchEvent(new Event("pobjer:notifications-changed"));
        }
      } catch { /* Keep the last visible messages if a refresh fails. */ }
    };
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [id, user?.id, conv?.id]);

  useEffect(() => {
    if (!user || !conv) return;
    base44.entities.Notification.filter({ user_id: user.id, conversation_id: id }).then(async (rows) => {
      await Promise.all(rows.filter((row) => !row.read_at).map((row) => base44.entities.Notification.update(row.id, { read_at: new Date().toISOString() })));
      window.dispatchEvent(new Event("pobjer:notifications-changed"));
    }).catch(() => {});
  }, [id, user?.id, conv?.id]);

  const send = async (file = null) => {
    const body = text.trim();
    if ((!body && !file) || !user || !conv || sending) return;
    setSending(true);
    try {
      if (file) validateChatFile(file);
      const attachmentPath = file ? await uploadChatFile(id, user.id, file) : null;
      const messageType = file ? (file.type.startsWith("image/") ? "IMAGE" : "FILE") : "TEXT";
      const created = await base44.entities.Message.create({
        conversation_id: id,
        sender_id: user.id,
        sender_name: user.full_name || "ผู้ใช้",
        message_type: messageType,
        message: body,
        ...(file ? { attachment_path: attachmentPath, attachment_name: file.name, attachment_mime: file.type, attachment_size: file.size } : {}),
      });
      setMessages((current) => [...current, created]);
      setText("");
      const preview = body || (messageType === "IMAGE" ? "ส่งรูปภาพ" : `ส่งไฟล์ ${file.name}`);
      await base44.entities.Conversation.update(id, { last_message: preview, last_message_at: new Date().toISOString() });
      await Promise.all(conv.participant_ids.filter((participant) => participant !== user.id).map((recipient) => base44.entities.Notification.create({
        user_id: recipient,
        type: "MESSAGE",
        title: `ข้อความใหม่จาก ${user.full_name || "ผู้ใช้"}`,
        body: preview.slice(0, 140),
        reference_id: id,
        conversation_id: id,
      })));
    } catch (error) { toast.error(error.message || "ส่งไม่สำเร็จ"); }
    finally {
      setSending(false);
      if (fileInput.current) fileInput.current.value = "";
      if (cameraInput.current) cameraInput.current.value = "";
    }
  };

  if (!user) return <div className="max-w-md mx-auto px-4 py-16 text-center">เข้าสู่ระบบเพื่อใช้แชท <Link className="text-primary" to="/login">เข้าสู่ระบบ</Link></div>;
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
                {m.attachment_path && (m.attachment_mime?.startsWith("image/") ? (
                  fileUrls[m.attachment_path] ? <a href={fileUrls[m.attachment_path]} target="_blank" rel="noreferrer"><img src={fileUrls[m.attachment_path]} alt={m.attachment_name || "รูปภาพที่แนบ"} className="max-h-72 max-w-full rounded-lg object-contain" /></a> : <span>กำลังโหลดรูปภาพ...</span>
                ) : (
                  fileUrls[m.attachment_path] ? <a href={fileUrls[m.attachment_path]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 underline"><FileText className="h-4 w-4" />{m.attachment_name || "เปิดไฟล์แนบ"}</a> : <span>ไม่สามารถเปิดไฟล์แนบได้</span>
                ))}
                {m.message && <div className={cn("whitespace-pre-wrap break-words", m.attachment_path && "mt-2")}>{m.message}</div>}
                <div className={cn("text-[10px] mt-0.5", mine ? "text-white/60" : "text-muted-foreground")}>{new Date(m.created_date).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && send(e.target.files[0])} />
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && send(e.target.files[0])} />
        <button type="button" disabled={sending} onClick={() => cameraInput.current?.click()} className="rounded-full p-2 text-muted-foreground hover:bg-accent" aria-label="ถ่ายรูป"><Camera className="h-5 w-5" /></button>
        <button type="button" disabled={sending} onClick={() => fileInput.current?.click()} className="rounded-full p-2 text-muted-foreground hover:bg-accent" aria-label="แนบรูปหรือ PDF"><Paperclip className="h-5 w-5" /></button>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="พิมพ์ข้อความ..." className="min-w-0 flex-1 px-4 py-2.5 rounded-full bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <button type="button" disabled={sending || !text.trim()} onClick={() => send()} className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center shrink-0 disabled:opacity-50" aria-label="ส่งข้อความ"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
