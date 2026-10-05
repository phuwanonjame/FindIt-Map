import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, CheckCheck, ChevronLeft, ChevronRight, CirclePlus, Clock3, FileText, Image as ImageIcon, MapPin, MessageSquare, MoreVertical, Paperclip, Phone, Search, Send } from "lucide-react";
import { toast } from "react-hot-toast";
import { base44 } from "@/api/base44Client";
import { requireSupabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { getChatFileUrl, uploadChatFile, validateChatFile } from "@/lib/chatAttachments";

const formatTime = (value) => value ? new Date(value).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "";
const formatDay = (value) => {
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString() ? "วันนี้" : date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
};
const shortTime = (value) => {
  if (!value) return "";
  const elapsed = Date.now() - new Date(value).getTime();
  if (elapsed < 60 * 60 * 1000) return `${Math.max(1, Math.floor(elapsed / 60000))} นาทีที่แล้ว`;
  if (elapsed < 24 * 60 * 60 * 1000) return `${Math.floor(elapsed / 3600000)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(elapsed / 86400000)} วันที่แล้ว`;
};
const isUsefulName = (value) => Boolean(value && !["ผู้ใช้", "ผู้ประกาศ"].includes(value) && !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value));
const otherName = (conversation, userId, post, creatorNames = {}) => {
  const index = conversation.participant_ids?.indexOf(userId) ?? -1;
  const name = conversation.participant_names?.[index === 0 ? 1 : 0];
  if (isUsefulName(name)) return name;
  const otherId = conversation.participant_ids?.find((participant) => participant !== userId);
  if (post?.created_by_id === otherId) {
    const creatorName = post.created_by_name || creatorNames[post.id];
    if (isUsefulName(creatorName)) return creatorName;
    return post.post_type === "FOUND" ? "ผู้พบของ" : "ผู้แจ้งของหาย";
  }
  return "ผู้ติดต่อ";
};

function Avatar({ name, brand = false, size = "h-12 w-12" }) {
  if (brand) return <img src="/pobjer-icon.png" alt="" className={cn(size, "shrink-0 rounded-full object-cover")} />;
  return <span className={cn(size, "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-sky-50 text-lg font-bold text-blue-700")}>{name?.charAt(0).toUpperCase() || "?"}</span>;
}

function ConversationList({ conversations, posts, creatorNames, unread, user, selectedId, loading, mobileHidden }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const unreadTotal = Object.values(unread).reduce((total, count) => total + count, 0);
  const visible = useMemo(() => conversations.filter((conversation) => {
    const post = posts[conversation.post_id];
    const matchesSearch = `${otherName(conversation, user.id, post, creatorNames)} ${conversation.post_title || ""} ${conversation.last_message || ""}`.toLocaleLowerCase().includes(search.toLocaleLowerCase());
    return matchesSearch && (filter === "all" || (filter === "unread" && unread[conversation.id]) || post?.post_type === filter);
  }), [conversations, posts, creatorNames, unread, user.id, search, filter]);

  return (
    <aside className={cn("flex min-h-0 w-full flex-col overflow-hidden rounded-[20px] border border-[#e5ecf6] bg-white shadow-[0_12px_36px_rgba(25,63,108,0.06)] lg:w-[31.8%] lg:shrink-0", mobileHidden && "hidden lg:flex")}>
      <div className="border-b border-[#edf1f7] px-5 pb-4 pt-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-[26px] font-extrabold tracking-tight text-[#0e1b39]">ข้อความ</h1>
          <button type="button" onClick={() => { toast("เลือกประกาศที่ต้องการติดต่อเพื่อเริ่มแชท"); navigate("/search"); }} className="inline-flex items-center gap-2 rounded-2xl bg-[#0876f9] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"><CirclePlus className="h-5 w-5" /> ข้อความใหม่</button>
        </div>
        <label className="flex h-[54px] items-center gap-3 rounded-2xl border border-[#dce5f1] bg-white px-4 text-[#7587a3] focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
          <Search className="h-5 w-5 shrink-0" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาข้อความ ชื่อผู้ใช้ หรือรายการของ..." className="min-w-0 flex-1 bg-transparent text-sm text-[#14213c] outline-none placeholder:text-[#8292ac]" />
        </label>
        <div className="mt-4 grid grid-cols-4 gap-1.5">
          {[["all", "ทั้งหมด"], ["unread", "ยังไม่อ่าน"], ["LOST", "ของหาย"], ["FOUND", "พบของ"]].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={cn("min-w-0 rounded-full px-2 py-2.5 text-xs font-semibold transition sm:text-sm", filter === value ? "bg-[#e8f2ff] text-[#0964e8] ring-1 ring-[#bfdaff]" : "bg-[#f3f6fa] text-[#52627c] hover:bg-[#e9f1fb]")}>
              {label}{value === "unread" && unreadTotal > 0 && <span className="ml-1 inline-flex min-w-5 justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">{unreadTotal}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}</div> : visible.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-slate-500">{search || filter !== "all" ? "ไม่พบแชทที่ตรงกับตัวกรอง" : "ยังไม่มีข้อความ ลองเปิดประกาศแล้วติดต่อเจ้าของได้เลย"}</div>
        ) : visible.map((conversation) => {
          const name = otherName(conversation, user.id, posts[conversation.post_id], creatorNames);
          const count = unread[conversation.id] || 0;
          return <Link key={conversation.id} to={`/messages/${conversation.id}`} className={cn("flex min-h-[96px] items-center gap-3 border-b border-[#eef2f6] px-5 py-3 transition hover:bg-[#f3f8ff]", selectedId === conversation.id && "bg-[#e9f3ff]")}>
            <Avatar name={name} size="h-14 w-14" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-bold text-[#101d3a]">{name}</div>
              <div className="mt-1 truncate text-[13px] text-[#60718c]">{conversation.last_message || conversation.post_title || "เริ่มแชท"}</div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="text-[11px] text-[#8292aa]">{shortTime(conversation.last_message_at || conversation.created_date)}</span>
              {count > 0 && <span className="inline-flex min-w-5 justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">{count}</span>}
            </div>
          </Link>;
        })}
      </div>
    </aside>
  );
}

function ChatPanel({ conversation, post, creatorNames, user, onRead, mobileVisible }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [readMessageIds, setReadMessageIds] = useState(new Set());
  const [fileUrls, setFileUrls] = useState({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInput = useRef(null);
  const cameraInput = useRef(null);
  const endRef = useRef(null);
  const lastScrolled = useRef(null);
  const conversationId = conversation.id;
  const contactName = otherName(conversation, user.id, post, creatorNames);

  const refresh = useCallback(async () => {
    try {
      const [rows, notifications] = await Promise.all([
        base44.entities.Message.filter({ conversation_id: conversationId }),
        base44.entities.Notification.filter({ conversation_id: conversationId }),
      ]);
      rows.sort((a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime());
      setMessages((current) => [...rows, ...current.filter((message) => message.pending)]);
      setReadMessageIds(new Set(notifications.filter((notification) => notification.user_id !== user.id && notification.message_id && notification.read_at).map((notification) => notification.message_id)));
      const unread = notifications.filter((notification) => notification.user_id === user.id && !notification.read_at);
      if (unread.length) {
        await Promise.all(unread.map((notification) => base44.entities.Notification.update(notification.id, { read_at: new Date().toISOString() })));
        onRead();
        window.dispatchEvent(new Event("pobjer:notifications-changed"));
      }
    } catch { /* Keep existing messages during a transient network error. */ }
    finally { setLoading(false); }
  }, [conversationId, user.id, onRead]);

  useEffect(() => {
    setMessages([]);
    setReadMessageIds(new Set());
    setFileUrls({});
    setLoading(true);
    refresh();
    const timer = window.setInterval(refresh, 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const client = requireSupabase();
    const channel = client.channel(`pobjer-messages-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "app_records", filter: "entity=eq.Message" }, (payload) => {
        if (payload.new?.data?.conversation_id === conversationId) refresh();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "app_records", filter: "entity=eq.Notification" }, (payload) => {
        if (payload.new?.data?.conversation_id === conversationId && payload.new?.owner_id === user.id) refresh();
      })
      .subscribe();
    return () => { client.removeChannel(channel); };
  }, [conversationId, refresh, user.id]);

  useEffect(() => {
    const missing = messages.filter((message) => message.attachment_path && !(message.attachment_path in fileUrls));
    if (!missing.length) return undefined;
    let active = true;
    Promise.all(missing.map(async (message) => {
      try { return [message.attachment_path, await getChatFileUrl(message.attachment_path)]; }
      catch { return [message.attachment_path, null]; }
    })).then((pairs) => { if (active) setFileUrls((current) => ({ ...current, ...Object.fromEntries(pairs) })); });
    return () => { active = false; };
  }, [messages, fileUrls]);

  useEffect(() => {
    const newestId = messages[messages.length - 1]?.id;
    if (newestId && newestId !== lastScrolled.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      lastScrolled.current = newestId;
    }
  }, [messages]);

  const send = async (file = null, overrideText = null) => {
    const body = (overrideText ?? text).trim();
    if ((!body && !file) || sending) return;
    const temporaryId = `pending-${crypto.randomUUID()}`;
    setMessages((current) => [...current, {
      id: temporaryId,
      sender_id: user.id,
      sender_name: user.full_name || "ผู้ใช้",
      message_type: file ? (file.type.startsWith("image/") ? "IMAGE" : "FILE") : "TEXT",
      message: body || (file ? `กำลังส่ง ${file.name}` : ""),
      created_date: new Date().toISOString(),
      pending: true,
    }]);
    setText("");
    setSending(true);
    let created;
    try {
      if (file) validateChatFile(file);
      const attachmentPath = file ? await uploadChatFile(conversationId, user.id, file) : null;
      const type = file ? (file.type.startsWith("image/") ? "IMAGE" : "FILE") : "TEXT";
      created = await base44.entities.Message.create({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_name: user.full_name || "ผู้ใช้",
        message_type: type,
        message: body,
        ...(file ? { attachment_path: attachmentPath, attachment_name: file.name, attachment_mime: file.type, attachment_size: file.size } : {}),
      });
      setMessages((current) => current.some((message) => message.id === temporaryId)
        ? current.map((message) => message.id === temporaryId ? created : message).filter((message, index, all) => all.findIndex((item) => item.id === message.id) === index)
        : current.some((message) => message.id === created.id) ? current : [...current, created]);
      const preview = body || (type === "IMAGE" ? "ส่งรูปภาพ" : `ส่งไฟล์ ${file.name}`);
      try {
        await base44.entities.Conversation.update(conversationId, { last_message: preview, last_message_at: new Date().toISOString() });
        await Promise.all(conversation.participant_ids.filter((participant) => participant !== user.id).map((recipient) => base44.entities.Notification.create({
          user_id: recipient, type: "MESSAGE", title: `ข้อความใหม่จาก ${user.full_name || "ผู้ใช้"}`,
          body: preview.slice(0, 140), reference_id: conversationId, conversation_id: conversationId, message_id: created.id,
        })));
      } catch { toast.error("ส่งข้อความแล้ว แต่การแจ้งเตือนอาจล่าช้า"); }
    } catch (error) {
      setMessages((current) => current.filter((message) => message.id !== temporaryId));
      if (!file && overrideText === null) setText((current) => current || body);
      toast.error(error.message || "ส่งข้อความไม่สำเร็จ");
    }
    finally {
      setSending(false);
      if (fileInput.current) fileInput.current.value = "";
      if (cameraInput.current) cameraInput.current.value = "";
    }
  };

  const shareLocation = () => {
    if (!window.confirm("ส่งตำแหน่งปัจจุบันให้คู่สนทนาใช่ไหม?")) return;
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => send(null, `ตำแหน่งของฉัน: https://www.openstreetmap.org/?mlat=${coords.latitude.toFixed(6)}&mlon=${coords.longitude.toFixed(6)}#map=16/${coords.latitude.toFixed(6)}/${coords.longitude.toFixed(6)}`),
      () => toast.error("ไม่สามารถเข้าถึงตำแหน่งปัจจุบัน"),
    );
  };

  return <section className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-[#e5ecf6] bg-white shadow-[0_12px_36px_rgba(25,63,108,0.06)]", !mobileVisible && "hidden lg:flex")}>
    <header className="flex min-h-[88px] items-center gap-3 border-b border-[#e9eef5] px-5 py-3">
      <button type="button" onClick={() => navigate("/messages")} className="rounded-full p-2 text-[#61738f] hover:bg-blue-50 lg:hidden" aria-label="กลับไปรายการแชท"><ChevronLeft className="h-5 w-5" /></button>
      <Avatar name={contactName} size="h-14 w-14" />
      <div className="min-w-0 flex-1"><div className="truncate text-lg font-extrabold text-[#101d3a]">{contactName}</div><div className="mt-0.5 text-xs text-[#72839c]">สนทนาเกี่ยวกับ {conversation.post_title || "ประกาศ"}</div></div>
      <button type="button" disabled title="โทรศัพท์ยังไม่พร้อมใช้งานในแชท" className="rounded-full p-2 text-[#71829d] disabled:cursor-not-allowed disabled:opacity-40"><Phone className="h-6 w-6" /></button>
      <div className="relative"><button type="button" onClick={() => setMenuOpen((open) => !open)} className="rounded-full p-2 text-[#71829d] hover:bg-blue-50" aria-label="ตัวเลือกแชท"><MoreVertical className="h-5 w-5" /></button>{menuOpen && <div className="absolute right-0 top-full z-20 w-40 rounded-xl border border-[#dce5f1] bg-white p-1.5 shadow-lg"><Link to={`/post/${conversation.post_id}`} className="block rounded-lg px-3 py-2 text-sm text-[#14213c] hover:bg-blue-50">ดูประกาศ</Link></div>}</div>
    </header>

    <Link to={`/post/${conversation.post_id}`} className="mx-4 mt-4 flex items-center gap-4 rounded-2xl border border-[#dce5f1] bg-white p-3 transition hover:border-blue-300 md:mx-5">
      {post?.images?.[0] ? <img src={post.images[0]} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover" /> : <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><ImageIcon className="h-7 w-7" /></div>}
      <div className="min-w-0 flex-1"><div className="truncate text-base font-bold text-[#112142]">{post?.title || conversation.post_title}</div><div className="mt-1 flex items-center gap-1 truncate text-xs text-[#5e708d]"><MapPin className="h-4 w-4 shrink-0" />{post?.place_name || "ไม่ระบุสถานที่"}</div><div className="mt-1 truncate text-[11px] text-[#8292ac]">{post?.post_type === "LOST" ? "ประกาศของหาย" : post?.post_type === "FOUND" ? "ประกาศพบของ" : "ประกาศที่เกี่ยวข้อง"} · {post?.created_date ? new Date(post.created_date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : ""}</div></div>
      {post?.post_type && <span className="hidden rounded-full bg-[#e9f3ff] px-3 py-2 text-xs font-semibold text-[#1067dc] sm:inline">{post.post_type === "LOST" ? "ของหาย" : "พบของ"}</span>}<ChevronRight className="h-5 w-5 shrink-0 text-[#71829d]" />
    </Link>

    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 md:px-5">
      {loading && <div className="mx-auto h-8 w-32 animate-pulse rounded-full bg-slate-100" />}
      {!loading && messages.length === 0 && <div className="py-12 text-center text-sm text-slate-500">เริ่มสนทนาเกี่ยวกับประกาศนี้ได้เลย</div>}
      {messages.map((message, index) => {
        const mine = message.sender_id === user.id;
        const previousDay = index ? new Date(messages[index - 1].created_date).toDateString() : null;
        const currentDay = new Date(message.created_date).toDateString();
        const url = fileUrls[message.attachment_path];
        return <React.Fragment key={message.id}>
          {previousDay !== currentDay && <div className="flex justify-center py-1"><span className="rounded-full bg-[#f0f3f7] px-4 py-1 text-xs text-[#61718a]">{formatDay(message.created_date)}</span></div>}
          <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
            {!mine && <Avatar name={contactName} size="h-8 w-8" />}
            <div className={cn("max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm md:max-w-[65%]", mine ? "rounded-br-md bg-[#2183fa] text-white" : "rounded-bl-md bg-[#f0f2f5] text-[#13203d]")}>
              {message.attachment_path && (message.attachment_mime?.startsWith("image/") ? (url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={message.attachment_name || "รูปภาพที่แนบ"} className="max-h-72 max-w-full rounded-xl object-contain" /></a> : <span>กำลังโหลดรูปภาพ...</span>) : (url ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 underline"><FileText className="h-5 w-5" />{message.attachment_name || "เปิดไฟล์แนบ"}</a> : <span>ไม่สามารถเปิดไฟล์แนบได้</span>))}
              {message.message && <div className={cn("whitespace-pre-wrap break-words", message.attachment_path && "mt-2")}>{message.message}</div>}
            </div>
            <span className="flex shrink-0 items-center gap-1 pb-1 text-[11px] text-[#93a0b4]">{formatTime(message.created_date)}{mine && (message.pending ? <Clock3 className="h-3 w-3" aria-label="กำลังส่ง" /> : readMessageIds.has(message.id) ? <CheckCheck className="h-3.5 w-3.5 text-blue-500" aria-label="อ่านแล้ว" /> : <Check className="h-3 w-3 text-blue-500" aria-label="ส่งแล้ว" />)}</span>
          </div>
        </React.Fragment>;
      })}
      <div ref={endRef} />
    </div>

    <div className="border-t border-[#e9eef5] bg-white px-4 py-3 md:px-5">
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(event) => event.target.files?.[0] && send(event.target.files[0])} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => event.target.files?.[0] && send(event.target.files[0])} />
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center rounded-[20px] border border-[#dbe5f1] bg-white px-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
          <button type="button" disabled={sending} onClick={() => fileInput.current?.click()} className="rounded-full p-2.5 text-[#6d819e] hover:bg-blue-50 disabled:opacity-50" aria-label="แนบไฟล์"><Paperclip className="h-5 w-5" /></button>
          <input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); send(); } }} placeholder="พิมพ์ข้อความ..." className="min-w-0 flex-1 bg-white px-2 py-3.5 text-sm text-[#14213c] outline-none placeholder:text-[#8b9ab0]" />
          <button type="button" disabled={sending} onClick={() => cameraInput.current?.click()} className="rounded-full p-2.5 text-[#6d819e] hover:bg-blue-50 disabled:opacity-50" aria-label="ถ่ายรูปหรือเลือกรูป"><ImageIcon className="h-5 w-5" /></button>
          <button type="button" disabled={sending} onClick={shareLocation} className="rounded-full p-2.5 text-[#6d819e] hover:bg-blue-50 disabled:opacity-50" aria-label="ส่งตำแหน่ง"><MapPin className="h-5 w-5" /></button>
        </div>
        <button type="button" disabled={sending || !text.trim()} onClick={() => send()} className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[#0876f9] text-white transition hover:bg-blue-700 disabled:opacity-50" aria-label="ส่งข้อความ"><Send className="h-5 w-5" /></button>
      </div>
    </div>
  </section>;
}

export default function Messenger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  const [conversations, setConversations] = useState([]);
  const [unread, setUnread] = useState({});
  const [posts, setPosts] = useState({});
  const [creatorNames, setCreatorNames] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!user) return;
    base44.entities.PostEvent.filter({ event_type: "POST_CREATED" }).then((events) => {
      setCreatorNames(Object.fromEntries(events.filter((event) => event.post_id && event.user_name).map((event) => [event.post_id, event.user_name])));
    }).catch(() => {});
  }, [user?.id]);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const [all, notifications, listings] = await Promise.all([
        base44.entities.Conversation.list(),
        base44.entities.Notification.filter({ user_id: user.id }),
        base44.entities.Post.list(),
      ]);
      setConversations(all.filter((conversation) => conversation.participant_ids?.includes(user.id)).sort((a, b) => new Date(b.last_message_at || b.created_date).getTime() - new Date(a.last_message_at || a.created_date).getTime()));
      setPosts(Object.fromEntries(listings.map((post) => [post.id, post])));
      const counts = {};
      notifications.filter((notification) => notification.type === "MESSAGE" && !notification.read_at).forEach((notification) => {
        const conversationId = notification.conversation_id || notification.reference_id;
        counts[conversationId] = (counts[conversationId] || 0) + 1;
      });
      setUnread(counts);
    } catch { /* Keep last loaded conversations. */ }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!user) return undefined;
    const client = requireSupabase();
    const channel = client.channel(`pobjer-inbox-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_records", filter: "entity=eq.Conversation" }, (payload) => {
        if (payload.new?.data?.participant_ids?.includes(user.id)) refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "app_records", filter: "entity=eq.Notification" }, (payload) => {
        if (payload.new?.data?.user_id === user.id) {
          refresh();
          window.dispatchEvent(new Event("pobjer:notifications-changed"));
        }
      })
      .subscribe();
    return () => { client.removeChannel(channel); };
  }, [user?.id, refresh]);

  useEffect(() => {
    if (desktop && !id && conversations[0]) navigate(`/messages/${conversations[0].id}`, { replace: true });
  }, [desktop, id, conversations, navigate]);

  if (!user) return <div className="mx-auto max-w-md px-4 py-16 text-center"><MessageSquare className="mx-auto mb-3 h-12 w-12 text-slate-400" /><p className="text-slate-600">เข้าสู่ระบบเพื่อใช้ข้อความ</p><Link to="/login" className="font-semibold text-blue-600">เข้าสู่ระบบ</Link></div>;

  const selectedId = id || (desktop ? conversations[0]?.id : null);
  const selected = conversations.find((conversation) => conversation.id === selectedId);
  return <div className="w-full flex-1 bg-[#f2f7fe] px-3 py-4 md:px-6 lg:px-9">
    <div className="mx-auto flex h-[calc(100dvh-164px)] max-w-[1850px] gap-5 lg:h-[calc(100dvh-104px)] lg:min-h-[520px]">
      <ConversationList conversations={conversations} posts={posts} creatorNames={creatorNames} unread={unread} user={user} selectedId={selectedId} loading={loading} mobileHidden={Boolean(id)} />
      {selected ? <ChatPanel key={selected.id} conversation={selected} post={posts[selected.post_id]} creatorNames={creatorNames} user={user} onRead={refresh} mobileVisible={Boolean(id)} /> : <div className={cn("flex min-w-0 flex-1 items-center justify-center rounded-[20px] border border-[#e5ecf6] bg-white text-sm text-slate-500", !id && "hidden lg:flex")}>{loading ? "กำลังโหลดแชท..." : "เลือกบทสนทนาหรือเริ่มข้อความใหม่"}</div>}
    </div>
  </div>;
}
