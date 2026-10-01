import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import {
  ChevronLeft, MapPin, Clock, Share2, Flag, MessageSquare, HandHeart,
  Check, X, Shield, Award, Phone, MessageCircle, Star, Bookmark, AlertCircle, Navigation
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import StatusBadge, { TypeBadge } from "@/components/StatusBadge";
import {
  CATEGORY_MAP, HOLDER_TYPES, getStatusInfo, distanceMeters, formatDistance,
  timeAgo, maskPhone, REVIEW_TAGS, REPORT_REASONS
} from "@/lib/constants";
import { CategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

const pinIcon = (color) => L.divIcon({
  className: "findit-pin",
  html: `<svg width="36" height="44" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))"><path d="M16 0C7.16 0 0 7.16 0 16c0 11 16 24 16 24s16-13 16-24C32 7.16 24.84 0 16 0z" fill="${color}"/><circle cx="16" cy="16" r="11" fill="white"/></svg>`,
  iconSize: [36, 44], iconAnchor: [18, 44],
});

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, 15); }, [center]);
  return null;
}

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [claims, setClaims] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [activeImg, setActiveImg] = useState(0);
  const [showClaim, setShowClaim] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [saved, setSaved] = useState(false);
  const [claimForm, setClaimForm] = useState({ lost_location: "", lost_time: "", verification_answer: "", distinguishing_marks: "", proof_image_url: "" });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "", tags: [] });

  const load = async () => {
    setLoading(true);
    try {
      const p = await base44.entities.Post.get(id);
      setPost(p);
      const [evs, cls, all] = await Promise.all([
        base44.entities.PostEvent.filter({ post_id: id }),
        base44.entities.Claim.filter({ post_id: id }),
        base44.entities.Post.list("-created_date", 100),
      ]);
      setEvents(evs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
      setClaims(cls);
      // nearby matches: opposite type, within 3km, same category
      const opp = all.filter((o) => o.id !== id && o.post_type !== p.post_type && o.category === p.category && o.public_latitude);
      const matched = opp.map((o) => ({
        ...o,
        dist: p.public_latitude ? distanceMeters(p.public_latitude, p.public_longitude, o.public_latitude, o.public_longitude) : 99999,
      })).filter((o) => o.dist <= 3000).sort((a, b) => a.dist - b.dist).slice(0, 4);
      setNearby(matched);
      if (user) {
        const sv = await base44.entities.SavedPost.filter({ user_id: user.id, post_id: id });
        setSaved(sv.length > 0);
      }
    } catch { toast.error("โหลดประกาศไม่สำเร็จ"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const isOwner = user && post?.created_by_id === user.id;
  const isFound = post?.post_type === "FOUND";
  const cat = post ? CATEGORY_MAP[post.category] : null;
  const acceptedClaim = claims.find((c) => c.status === "ACCEPTED");

  const submitClaim = async () => {
    if (!user) { navigate("/login"); return; }
    try {
      await base44.entities.Claim.create({
        post_id: id, claimant_user_id: user.id, claimant_name: user.full_name || user.email,
        lost_location: claimForm.lost_location, lost_time: claimForm.lost_time,
        verification_answer: claimForm.verification_answer,
        distinguishing_marks: claimForm.distinguishing_marks,
        proof_image_url: claimForm.proof_image_url,
        status: "PENDING",
      });
      await base44.entities.Post.update(id, { status: isFound ? "CLAIM_REQUESTED" : "POSSIBLE_MATCH" });
      await base44.entities.PostEvent.create({ post_id: id, event_type: "CLAIM_CREATED", user_id: user.id, user_name: user.full_name, description: "มีคนแจ้ง Claim ของ" });
      if (post.created_by_id) {
        await base44.entities.Notification.create({ user_id: post.created_by_id, type: "CLAIM", title: "มีคน Claim ของของคุณ", body: `${user.full_name} แจ้งว่าเป็นเจ้าของ ${post.title}`, reference_id: id });
      }
      toast.success("ส่งคำขอ Claim แล้ว รอเจ้าของตรวจสอบ");
      setShowClaim(false);
      load();
    } catch (e) { toast.error(e.message || "ส่ง Claim ไม่สำเร็จ"); }
  };

  const acceptClaim = async (claimId) => {
    try {
      await base44.entities.Claim.update(claimId, { status: "ACCEPTED", reviewed_at: new Date().toISOString() });
      await base44.entities.Post.update(id, { status: "ARRANGING_RETURN" });
      await base44.entities.PostEvent.create({ post_id: id, event_type: "CLAIM_ACCEPTED", user_id: user.id, user_name: user.full_name, description: "อนุมัติ Claim" });
      toast.success("อนุมัติ Claim แล้ว");
      load();
    } catch { toast.error("อนุมัติไม่สำเร็จ"); }
  };

  const rejectClaim = async (claimId) => {
    try {
      await base44.entities.Claim.update(claimId, { status: "REJECTED", reviewed_at: new Date().toISOString() });
      await base44.entities.PostEvent.create({ post_id: id, event_type: "CLAIM_REJECTED", user_id: user.id, user_name: user.full_name, description: "ปฏิเสธ Claim" });
      toast.success("ปฏิเสธ Claim แล้ว");
      load();
    } catch { toast.error("ปฏิเสธไม่สำเร็จ"); }
  };

  const confirmReturn = async () => {
    try {
      await base44.entities.Post.update(id, { status: "RETURNED", returned_at: new Date().toISOString(), closed_at: new Date().toISOString() });
      await base44.entities.PostEvent.create({ post_id: id, event_type: "RETURNED", user_id: user.id, user_name: user.full_name, description: "ส่งคืนสำเร็จ" });
      toast.success("ยืนยันส่งคืนสำเร็จ");
      load();
    } catch { toast.error("ยืนยันไม่สำเร็จ"); }
  };

  const toggleSave = async () => {
    if (!user) { navigate("/login"); return; }
    try {
      if (saved) {
        const sv = await base44.entities.SavedPost.filter({ user_id: user.id, post_id: id });
        if (sv[0]) await base44.entities.SavedPost.delete(sv[0].id);
        setSaved(false);
      } else {
        await base44.entities.SavedPost.create({ user_id: user.id, post_id: id });
        setSaved(true);
      }
    } catch {}
  };

  const startChat = async () => {
    if (!user) { navigate("/login"); return; }
    if (isOwner) return;
    try {
      const existing = await base44.entities.Conversation.filter({ post_id: id });
      const mine = existing.find((c) => c.participant_ids?.includes(user.id));
      if (mine) { navigate(`/messages/${mine.id}`); return; }
      const conv = await base44.entities.Conversation.create({
        post_id: id, post_title: post.title,
        participant_ids: [user.id, post.created_by_id],
        participant_names: [user.full_name || "ผู้ใช้", post.created_by_id],
      });
      navigate(`/messages/${conv.id}`);
    } catch { toast.error("เปิดแชทไม่สำเร็จ"); }
  };

  const submitReport = async (reason) => {
    if (!user) { navigate("/login"); return; }
    try {
      await base44.entities.Report.create({ reporter_id: user.id, target_type: "POST", target_id: id, reason, status: "PENDING" });
      toast.success("ส่งรายงานแล้ว ทีมงานจะตรวจสอบ");
      setShowReport(false);
    } catch { toast.error("ส่งรายงานไม่สำเร็จ"); }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto w-full px-4 py-6 animate-pulse">
        <div className="h-6 bg-accent rounded w-32 mb-4" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="aspect-square bg-accent rounded-2xl" />
          <div className="space-y-3"><div className="h-8 bg-accent rounded" /><div className="h-4 bg-accent rounded w-2/3" /><div className="h-32 bg-accent rounded" /></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return <div className="max-w-2xl mx-auto px-4 py-16 text-center"><p className="text-muted-foreground">ไม่พบประกาศ</p><Link to="/" className="text-primary font-semibold">กลับหน้าแผนที่</Link></div>;
  }

  const isReturned = post.status === "RETURNED";

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-4">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ChevronLeft className="w-4 h-4" /> ย้อนกลับ</button>

      {isReturned && (
        <div className="mb-4 p-5 rounded-2xl bg-found/10 border border-found/20 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-found/15 flex items-center justify-center mx-auto mb-2"><Check className="w-6 h-6 text-found" /></div>
          <h2 className="font-bold text-found">ของชิ้นนี้ถูกส่งคืนเจ้าของแล้ว</h2>
          {post.returned_at && <p className="text-xs text-muted-foreground mt-1">คืนเมื่อ {new Date(post.returned_at).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}</p>}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Images */}
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden border border-border bg-accent">
            {post.images?.length > 0 ? (
              <img src={post.images[activeImg]} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-accent"><CategoryIcon id={cat?.id} className="w-12 h-12 text-muted-foreground/40" /></div>
            )}
          </div>
          {post.images?.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
              {post.images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={cn("w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0", activeImg === i ? "border-primary" : "border-border")}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TypeBadge type={post.post_type} />
            <StatusBadge status={post.status} postType={post.post_type} />
          </div>
          <h1 className="text-xl font-extrabold leading-tight mb-1">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {post.place_name || "ไม่ระบุ"}</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {new Date(post.event_date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}{post.event_time_from ? ` · ${post.event_time_from}${post.event_time_to && post.event_time_to !== post.event_time_from ? `-${post.event_time_to}` : ""}` : ""}</span>
          </div>

          {post.reward_enabled && post.reward_text && (
            <div className="mb-4 p-3 rounded-xl bg-warning/10 border border-warning/20 flex items-center gap-2">
              <Award className="w-5 h-5 text-warning" />
              <span className="text-sm font-semibold">รางวัล: {post.reward_text}</span>
            </div>
          )}

          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {cat && <div><span className="text-muted-foreground">หมวดหมู่:</span> <span className="font-medium">{cat.name}</span></div>}
              {post.brand && <div><span className="text-muted-foreground">แบรนด์:</span> <span className="font-medium">{post.brand}</span></div>}
              {post.model && <div><span className="text-muted-foreground">รุ่น:</span> <span className="font-medium">{post.model}</span></div>}
              {post.color && <div><span className="text-muted-foreground">สี:</span> <span className="font-medium">{post.color}</span></div>}
              {post.pet_name && <div><span className="text-muted-foreground">ชื่อสัตว์เลี้ยง:</span> <span className="font-medium">{post.pet_name}</span></div>}
              {post.pet_breed && <div><span className="text-muted-foreground">สายพันธุ์:</span> <span className="font-medium">{post.pet_breed}</span></div>}
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">รายละเอียด</div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.description}</p>
            </div>
            {post.landmark && (
              <div className="flex items-start gap-1.5 text-sm"><MapPin className="w-4 h-4 text-muted-foreground mt-0.5" /> <span>{post.landmark}</span></div>
            )}
          </div>

          {/* Holder info (FOUND only) */}
          {isFound && post.current_holder_type && (
            <div className="mb-4 p-3 rounded-xl bg-accent border border-border">
              <div className="text-xs text-muted-foreground mb-1">ตอนนี้ของอยู่ที่</div>
              <div className="text-sm font-semibold">{HOLDER_TYPES[post.current_holder_type]?.label}</div>
              {post.current_holder_type === "DEPOSITED" && (post.holder_location_name || post.holder_counter_name) && (
                <div className="text-sm mt-1">{post.holder_location_name} {post.holder_counter_name && `· ${post.holder_counter_name}`}</div>
              )}
              {post.current_holder_type === "TAKEN_BY_OTHER" && post.holder_name && (
                <div className="text-sm mt-1">
                  ผู้รับของ: {post.holder_role || ""} {post.holder_name}
                  {post.holder_phone && <div className="text-xs text-muted-foreground mt-0.5">เบอร์: {maskPhone(post.holder_phone)} (ติดต่อผ่านผู้แจ้ง)</div>}
                </div>
              )}
            </div>
          )}

          {/* Map preview */}
          {post.public_latitude && (
            <div className="mb-4 rounded-2xl overflow-hidden border border-border" style={{ height: 180 }}>
              <MapContainer center={[post.public_latitude, post.public_longitude]} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false} scrollWheelZoom={false}>
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" />
                <Marker position={[post.public_latitude, post.public_longitude]} icon={pinIcon(isFound ? "#16A34A" : "#DC2626")} />
              </MapContainer>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {!isOwner && !isReturned && isFound && (
              <button onClick={() => setShowClaim(true)} className="flex-1 min-w-[140px] px-4 py-3 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/90"><HandHeart className="w-4 h-4" /> นี่คือของของฉัน</button>
            )}
            {!isOwner && !isReturned && (
              <button onClick={startChat} className="flex-1 min-w-[120px] px-4 py-3 rounded-full border border-border text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-accent"><MessageSquare className="w-4 h-4" /> ส่งข้อความ</button>
            )}
            <button onClick={toggleSave} className={cn("p-3 rounded-full border", saved ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent")}><Bookmark className={cn("w-4 h-4", saved && "fill-current")} /></button>
            <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success("คัดลอกลิงก์แล้ว"); }} className="p-3 rounded-full border border-border hover:bg-accent"><Share2 className="w-4 h-4" /></button>
            {!isOwner && <button onClick={() => setShowReport(true)} className="p-3 rounded-full border border-border hover:bg-accent"><Flag className="w-4 h-4" /></button>}
          </div>

          {isOwner && (post.status === "ARRANGING_RETURN" || post.status === "CLAIM_REQUESTED") && (
            <button onClick={confirmReturn} className="w-full mt-3 px-4 py-3 rounded-full bg-found text-white text-sm font-semibold flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> ยืนยันส่งคืนสำเร็จ</button>
          )}

          {/* Contact card after accepted claim */}
          {acceptedClaim && isOwner && (
            <div className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/20">
              <div className="text-sm font-semibold mb-2">ติดต่อผู้ Claim</div>
              <div className="text-sm">{acceptedClaim.claimant_name}</div>
              <div className="flex gap-2 mt-2">
                <button onClick={startChat} className="px-3 py-1.5 rounded-full bg-primary text-white text-xs font-semibold flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> ส่งข้อความ</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Claims management (owner) */}
      {isOwner && claims.length > 0 && (
        <div className="mt-6 p-4 rounded-2xl border border-border bg-card">
          <h3 className="font-bold mb-3">คำขอ Claim ({claims.length})</h3>
          <div className="space-y-3">
            {claims.map((c) => (
              <div key={c.id} className={cn("p-3 rounded-xl border", c.status === "ACCEPTED" ? "border-found bg-found/5" : c.status === "REJECTED" ? "border-border opacity-60" : "border-warning/30 bg-warning/5")}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{c.claimant_name}</span>
                  <span className={cn("text-xs font-semibold", c.status === "ACCEPTED" ? "text-found" : c.status === "REJECTED" ? "text-muted-foreground" : "text-warning")}>{c.status === "ACCEPTED" ? "อนุมัติแล้ว" : c.status === "REJECTED" ? "ปฏิเสธแล้ว" : "รอตรวจสอบ"}</span>
                </div>
                <div className="text-xs space-y-1 text-muted-foreground">
                  {c.lost_location && <div>ทำหายที่: {c.lost_location}</div>}
                  {c.lost_time && <div>เวลา: {c.lost_time}</div>}
                  {c.verification_answer && <div>คำตอบยืนยัน: {c.verification_answer}</div>}
                  {c.distinguishing_marks && <div>จุดสังเกต: {c.distinguishing_marks}</div>}
                </div>
                {c.status === "PENDING" && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => acceptClaim(c.id)} className="px-3 py-1.5 rounded-full bg-found text-white text-xs font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> อนุมัติ</button>
                    <button onClick={() => rejectClaim(c.id)} className="px-3 py-1.5 rounded-full border border-border text-xs font-semibold flex items-center gap-1"><X className="w-3.5 h-3.5" /> ปฏิเสธ</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {events.length > 0 && (
        <div className="mt-6 p-4 rounded-2xl border border-border bg-card">
          <h3 className="font-bold mb-3">ไทม์ไลน์</h3>
          <div className="space-y-3">
            {events.map((e) => (
              <div key={e.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1" />
                  {events.indexOf(e) < events.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
                </div>
                <div className="pb-1">
                  <div className="text-sm font-medium">{e.description}</div>
                  <div className="text-xs text-muted-foreground">{new Date(e.created_date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })} · {new Date(e.created_date).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}{e.user_name ? ` · ${e.user_name}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nearby matches */}
      {nearby.length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold mb-3">{isFound ? "ของหายใกล้เคียง" : "ของที่พบใกล้เคียง"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {nearby.map((n) => (
              <Link key={n.id} to={`/post/${n.id}`} className="block bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 hover:shadow-md transition">
                <div className="aspect-square bg-accent">{n.images?.[0] ? <img src={n.images[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><CategoryIcon id={n.category} className="w-8 h-8 text-muted-foreground/40" /></div>}</div>
                <div className="p-2.5">
                  <div className="text-sm font-semibold line-clamp-1">{n.title}</div>
                  <div className="text-xs text-primary font-medium mt-0.5">{formatDistance(n.dist)} จากจุดของคุณ</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Claim modal */}
      {showClaim && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowClaim(false)}>
          <div className="bg-card w-full md:max-w-lg rounded-t-3xl md:rounded-3xl p-5 max-h-[90vh] overflow-y-auto animate-slide-up md:animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">ยืนยันความเป็นเจ้าของ</h2>
              <button onClick={() => setShowClaim(false)} className="p-2 rounded-full hover:bg-accent"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex gap-2 items-start p-3 rounded-xl bg-primary/5 border border-primary/20 mb-4">
              <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">ข้อมูลติดต่อจะไม่ถูกส่งให้ผู้พบของจนกว่า Claim จะได้รับการอนุมัติ ตอบคำถามให้ชัดเจนเพื่อยืนยันตัวตน</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold mb-1 block">1. ทำของหายที่ไหน?</label>
                <input value={claimForm.lost_location} onChange={(e) => setClaimForm({ ...claimForm, lost_location: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">2. ทำหายประมาณกี่โมง?</label>
                <input value={claimForm.lost_time} onChange={(e) => setClaimForm({ ...claimForm, lost_time: e.target.value })} placeholder="เช่น 18:30" className="w-full px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">3. จุดสังเกตที่ไม่ได้อยู่ในประกาศ?</label>
                <textarea value={claimForm.distinguishing_marks} onChange={(e) => setClaimForm({ ...claimForm, distinguishing_marks: e.target.value })} rows={2} placeholder="เช่น ในเคสมี Sticker สีเหลือง" className="w-full px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">4. ตอบคำถามยืนยัน (ถ้ามี)</label>
                <input value={claimForm.verification_answer} onChange={(e) => setClaimForm({ ...claimForm, verification_answer: e.target.value })} placeholder="คำตอบสำหรับข้อมูลลับ" className="w-full px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <button onClick={submitClaim} className="w-full mt-4 px-4 py-3 rounded-full bg-primary text-white text-sm font-semibold">ส่งคำขอ Claim</button>
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowReport(false)}>
          <div className="bg-card w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-5 animate-slide-up md:animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">รายงานประกาศ</h2>
              <button onClick={() => setShowReport(false)} className="p-2 rounded-full hover:bg-accent"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-1">
              {REPORT_REASONS.map((r) => (
                <button key={r} onClick={() => submitReport(r)} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-accent text-sm">{r}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
