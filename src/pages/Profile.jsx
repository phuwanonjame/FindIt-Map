import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bookmark, CalendarDays, Camera, ClipboardList, FileText, LogOut, MapPin, Plus, Search, ShoppingBag, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import StatusBadge, { TypeBadge } from "@/components/StatusBadge";
import { CATEGORY_MAP } from "@/lib/constants";
import { CategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "posts", label: "ประกาศของฉัน" },
  { id: "lost", label: "ของหาย" },
  { id: "found", label: "ของที่พบ" },
  { id: "saved", label: "บันทึก" },
];

const EMPTY = {
  posts: { Icon: ClipboardList, title: "ยังไม่มีประกาศ", detail: "เริ่มสร้างประกาศตามหาของหาย หรือแจ้งของที่พบได้เลย" },
  lost: { Icon: Search, title: "ยังไม่มีรายการของหาย", detail: "รายการของหายที่คุณแจ้งจะแสดงที่นี่" },
  found: { Icon: ShoppingBag, title: "ยังไม่มีรายการของที่พบ", detail: "รายการของที่คุณแจ้งพบจะแสดงที่นี่" },
  saved: { Icon: Bookmark, title: "ยังไม่มีรายการที่บันทึก", detail: "บันทึกประกาศที่สนใจเพื่อกลับมาดูภายหลัง" },
};

function StatCard({ Icon, value, label, tone }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-900/[0.02]"><div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full", tone)}><Icon className="h-5 w-5" /></div><div className="min-w-0"><div className="text-2xl font-bold leading-none text-slate-950">{value}</div><div className="mt-1 truncate text-sm text-slate-500">{label}</div></div></div>;
}

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    const load = async () => {
      try {
        const [allPosts, savedRecords] = await Promise.all([base44.entities.Post.list("-created_date", 100), base44.entities.SavedPost.filter({ user_id: user.id })]);
        setPosts(allPosts.filter((post) => post.created_by_id === user.id));
        const savedIds = new Set(savedRecords.map((record) => record.post_id));
        setSaved(allPosts.filter((post) => savedIds.has(post.id)));
      } finally { setLoading(false); }
    };
    load();
  }, [navigate, user]);

  const lost = useMemo(() => posts.filter((post) => post.post_type === "LOST"), [posts]);
  const found = useMemo(() => posts.filter((post) => post.post_type === "FOUND"), [posts]);
  const display = tab === "posts" ? posts : tab === "lost" ? lost : tab === "found" ? found : saved;
  const initial = (user?.full_name || user?.email || "P").trim().charAt(0).toUpperCase();
  const joined = user?.created_at || user?.created_date;
  const joinedLabel = joined ? new Date(joined).toLocaleDateString("th-TH", { month: "short", year: "numeric" }) : "สมาชิกใหม่";
  const empty = EMPTY[tab];
  if (!user) return null;

  return <div className="min-h-full bg-[radial-gradient(circle_at_50%_0%,#edf5ff_0%,#f8fafc_42%,#f8fafc_100%)] px-4 py-6 sm:px-6 lg:py-8"><main className="mx-auto max-w-6xl rounded-[24px] border border-slate-200/90 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
    <section className="relative isolate overflow-hidden rounded-[20px] border border-slate-100 bg-[linear-gradient(115deg,#f8fbff_0%,#eef6ff_55%,#e0efff_100%)] px-6 py-7 sm:px-9 sm:py-8">
      <div className="absolute bottom-0 right-0 h-44 w-2/3 bg-[radial-gradient(ellipse_at_bottom_right,rgba(147,197,253,.55),transparent_62%)]" /><div className="absolute -bottom-16 right-16 h-36 w-80 rotate-[-12deg] rounded-[100%] border-t-[26px] border-blue-100/80" /><MapPin className="absolute right-16 top-5 h-24 w-24 fill-blue-200/70 text-blue-200/70 sm:right-20" strokeWidth={1.2} />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center"><div className="relative shrink-0"><div className="grid h-28 w-28 place-items-center rounded-full border-4 border-white bg-[linear-gradient(145deg,#e9f1ff,#dce9ff)] text-5xl font-bold text-blue-600 shadow-sm">{initial}</div><button type="button" aria-label="เปลี่ยนรูปโปรไฟล์" className="absolute bottom-0 right-0 grid h-10 w-10 place-items-center rounded-full border-4 border-white bg-blue-600 text-white shadow-md"><Camera className="h-4 w-4" /></button></div><div className="min-w-0"><h1 className="truncate text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{user.full_name || user.email?.split("@")[0] || "ผู้ใช้ FindIt Map"}</h1><p className="mt-1 truncate text-lg text-slate-500">{user.email}</p><div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-slate-500"><span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-amber-600"><Star className="h-4 w-4 fill-amber-500 text-amber-500" /> สมาชิก</span><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" /> สมาชิกตั้งแต่ {joinedLabel}</span></div></div></div>
    </section>

    <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><StatCard Icon={FileText} value={posts.length} label="ประกาศของฉัน" tone="bg-blue-50 text-blue-600" /><StatCard Icon={Search} value={lost.length} label="ของหาย" tone="bg-rose-50 text-rose-500" /><StatCard Icon={ShoppingBag} value={found.length} label="ของที่พบ" tone="bg-emerald-50 text-emerald-600" /><StatCard Icon={Bookmark} value={saved.length} label="รายการที่บันทึก" tone="bg-violet-50 text-violet-600" /></section>

    <section className="mt-7 border-b border-slate-200"><div className="flex gap-2 overflow-x-auto pb-3">{TABS.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={cn("shrink-0 rounded-full border px-6 py-2.5 text-sm font-semibold transition", tab === item.id ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/25" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50")}>{item.label}</button>)}</div></section>

    <section className="mt-5">{loading ? <div className="grid min-h-[300px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" /></div> : display.length === 0 ? <div className="grid min-h-[318px] place-items-center rounded-2xl border border-dashed border-blue-100 bg-[radial-gradient(circle_at_50%_35%,#f2f7ff_0%,#fff_58%)] px-6 text-center"><div><div className="relative mx-auto mb-4 grid h-24 w-24 place-items-center rounded-full bg-blue-50 text-blue-600"><empty.Icon className="h-12 w-12" strokeWidth={1.55} /><span className="absolute -right-1 top-1 h-3 w-3 rounded-full bg-blue-400 ring-4 ring-white" /></div><h2 className="text-2xl font-bold text-slate-950">{empty.title}</h2><p className="mt-2 text-slate-500">{empty.detail}</p>{tab !== "saved" && <button type="button" onClick={() => navigate("/post/new")} className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"><Plus className="h-5 w-5" /> แจ้งประกาศแรกของคุณ</button>}</div></div> : <div className="grid gap-3 sm:grid-cols-2">{display.map((post) => { const category = CATEGORY_MAP[post.category]; return <Link key={post.id} to={`/post/${post.id}`} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:shadow-md"><div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">{post.images?.[0] ? <img src={post.images[0]} alt="" className="h-full w-full object-cover" /> : <CategoryIcon id={category?.id} className="h-6 w-6 text-slate-400" />}</div><div className="min-w-0"><TypeBadge type={post.post_type} /><h3 className="mt-1 truncate font-semibold text-slate-900">{post.title}</h3><StatusBadge status={post.status} postType={post.post_type} /></div></Link>; })}</div>}</section>
    <button type="button" onClick={() => logout()} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"><LogOut className="h-5 w-5" /> ออกจากระบบ</button>
  </main></div>;
}
