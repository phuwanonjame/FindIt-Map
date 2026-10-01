import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, Award, LogOut, Settings, ChevronRight, Bookmark, ClipboardList } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import StatusBadge, { TypeBadge } from "@/components/StatusBadge";
import { CATEGORY_MAP, timeAgo } from "@/lib/constants";
import { CategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "posts", label: "ประกาศของฉัน" },
  { id: "lost", label: "ของหาย" },
  { id: "found", label: "ของที่พบ" },
  { id: "saved", label: "บันทึก" },
];

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [saved, setSaved] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    const load = async () => {
      try {
        const [allPosts, mySaved, myReviews] = await Promise.all([
          base44.entities.Post.list("-created_date", 100),
          base44.entities.SavedPost.filter({ user_id: user.id }),
          base44.entities.Review.filter({ reviewed_id: user.id }),
        ]);
        setPosts(allPosts.filter((p) => p.created_by_id === user.id));
        const savedIds = mySaved.map((s) => s.post_id);
        setSaved(allPosts.filter((p) => savedIds.includes(p.id)));
        setReviews(myReviews);
      } catch {}
      setLoading(false);
    };
    load();
  }, [user]);

  if (!user) return null;

  const myLost = posts.filter((p) => p.post_type === "LOST");
  const myFound = posts.filter((p) => p.post_type === "FOUND");
  const returnedCount = posts.filter((p) => p.status === "RETURNED").length;
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";

  const display = tab === "posts" ? posts : tab === "lost" ? myLost : tab === "found" ? myFound : saved;

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-4">
      {/* Header */}
      <div className="bg-card rounded-3xl border border-border p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-extrabold">{(user.full_name || user.email || "U").charAt(0).toUpperCase()}</div>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{user.full_name || "ผู้ใช้"}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs">
              <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-warning fill-warning" /> {avgRating}</span>
              <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-found" /> คืนแล้ว {returnedCount}</span>
              <span className="text-muted-foreground">สมาชิกตั้งแต่ {new Date(user.created_date).toLocaleDateString("th-TH", { month: "short", year: "numeric" })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("px-3.5 py-1.5 rounded-full text-xs font-semibold border shrink-0", tab === t.id ? "bg-primary text-white border-primary" : "bg-card border-border")}>{t.label}</button>
        ))}
      </div>

      {/* List */}
      {loading ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-card rounded-2xl border border-border animate-pulse" />)}</div> : display.length === 0 ? (
        <div className="text-center py-12">{tab === "saved" ? <Bookmark className="mx-auto mb-2 h-10 w-10 text-muted-foreground" /> : <ClipboardList className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />}<p className="text-sm text-muted-foreground">{tab === "saved" ? "ยังไม่มีประกาศที่บันทึก" : "ยังไม่มีประกาศ"}</p></div>
      ) : (
        <div className="space-y-2">
          {display.map((p) => {
            const c = CATEGORY_MAP[p.category];
            return (
              <Link key={p.id} to={`/post/${p.id}`} className="flex gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-accent transition">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-accent shrink-0">
                  {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><CategoryIcon id={c?.id} className="h-6 w-6 text-muted-foreground" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5"><TypeBadge type={p.post_type} /></div>
                  <div className="font-semibold text-sm truncate">{p.title}</div>
                  <div className="mt-1"><StatusBadge status={p.status} postType={p.post_type} /></div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground self-center" />
              </Link>
            );
          })}
        </div>
      )}

      <button onClick={() => logout()} className="w-full mt-6 px-4 py-3 rounded-full border border-border text-sm font-semibold flex items-center justify-center gap-2 hover:bg-accent"><LogOut className="w-4 h-4" /> ออกจากระบบ</button>
    </div>
  );
}
