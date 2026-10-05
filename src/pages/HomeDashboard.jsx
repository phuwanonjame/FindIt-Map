import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Bookmark, BriefcaseBusiness,
  ChevronLeft, ChevronRight, CircleHelp, Crosshair, FileText, Grid2X2,
  Handshake, KeyRound, List, Map as MapIcon, MapPin, Navigation, Package,
  Search, ShieldCheck, Smartphone, Star, X,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import MapView from "@/components/MapView";
import { CategoryIcon } from "@/lib/categoryIcons";
import { distanceMeters, formatDistance } from "@/lib/constants";
import { cn } from "@/lib/utils";

const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;
const closed = (post) => post.status === "RETURNED" || post.status === "CLOSED";
const coords = (post) => [Number(post.public_latitude ?? post.latitude), Number(post.public_longitude ?? post.longitude)];
const hasCoords = (post) => coords(post).every(Number.isFinite);
const categoryGroups = [
  { id: "ALL", label: "ทั้งหมด", Icon: Grid2X2, tone: "blue" },
  { id: "phone", label: "โทรศัพท์", Icon: Smartphone, tone: "blue" },
  { id: "bag", label: "กระเป๋า/กระเป๋าสตางค์", Icon: BriefcaseBusiness, tone: "rose", includes: ["bag", "wallet"] },
  { id: "key", label: "กุญแจ", Icon: KeyRound, tone: "green" },
  { id: "document", label: "บัตร/เอกสาร", Icon: FileText, tone: "amber", includes: ["card", "document"] },
  { id: "other", label: "ยานพาหนะ", Icon: Navigation, tone: "blue", includes: ["vehicle"] },
  { id: "electronics", label: "อุปกรณ์อิเล็กทรอนิกส์", Icon: Smartphone, tone: "blue" },
  { id: "misc", label: "อื่นๆ", Icon: CircleHelp, tone: "purple", includes: ["pet", "jewelry", "other"] },
];

const toneClasses = {
  blue: "bg-blue-50 text-blue-600",
  rose: "bg-rose-50 text-rose-500",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-500",
  purple: "bg-violet-50 text-violet-600",
};

function typeLabel(post) {
  if (closed(post)) return "ส่งคืนแล้ว";
  return post.post_type === "LOST" ? "ของหาย" : "พบของ";
}

function typeTone(post) {
  if (closed(post)) return "bg-blue-50 text-blue-700";
  return post.post_type === "LOST" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700";
}

function PostImage({ post, className = "" }) {
  return post.images?.[0]
    ? <img src={post.images[0]} alt="" className={cn("object-cover", className)} />
    : <div className={cn("grid place-items-center bg-slate-100", className)}><CategoryIcon id={post.category} className="h-6 w-6 text-slate-400" /></div>;
}

function StatCard({ Icon, label, value, tone, helper }) {
  return <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#e2eaf4] bg-white px-4 py-3 shadow-[0_5px_22px_rgba(31,77,134,0.04)]">
    <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", toneClasses[tone])}><Icon className="h-6 w-6" /></span>
    <span className="min-w-0"><span className="block truncate text-[11px] font-semibold text-slate-500">{label}</span><span className="flex items-baseline gap-2"><strong className={cn("text-[27px] leading-tight", tone === "rose" ? "text-rose-500" : tone === "green" ? "text-emerald-600" : "text-blue-700")}>{value}</strong>{helper && <small className="truncate text-[10px] text-slate-400">{helper}</small>}</span></span>
  </div>;
}

export default function HomeDashboard() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  const [category, setCategory] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [view, setView] = useState("map");
  const [nearbyOffset, setNearbyOffset] = useState(0);
  const [radius, setRadius] = useState("ALL");

  useEffect(() => {
    let active = true;
    base44.entities.Post.list("-created_date", 200).then((result) => {
      if (active) setPosts(result);
    }).catch(() => {
      if (active) setLoadError("โหลดประกาศไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationStatus("unsupported"); return; }
    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition((position) => {
      setUserPos([position.coords.latitude, position.coords.longitude, position.coords.accuracy]);
      setSelectedPlace(null);
      setLocationStatus("granted");
    }, () => setLocationStatus("denied"), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };

  useEffect(() => { requestLocation(); }, []);

  useEffect(() => {
    const query = search.trim();
    if (!GEOAPIFY_KEY || query.length < 3 || selectedPlace?.label === query) {
      setPlaceSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ text: query, format: "json", limit: "5", filter: "countrycode:th", apiKey: GEOAPIFY_KEY });
        if (userPos) params.set("bias", `proximity:${userPos[1]},${userPos[0]}`);
        const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error("search failed");
        const data = await response.json();
        if (!controller.signal.aborted) setPlaceSuggestions(data.results || []);
      } catch (error) { if (error.name !== "AbortError") setPlaceSuggestions([]); }
    }, 400);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [search, selectedPlace, userPos]);

  const filtered = useMemo(() => posts.filter((post) => {
    if (typeFilter === "LOST" && (post.post_type !== "LOST" || closed(post))) return false;
    if (typeFilter === "FOUND" && (post.post_type !== "FOUND" || closed(post))) return false;
    if (typeFilter === "RETURNED" && !closed(post)) return false;
    if (category !== "ALL") {
      const group = categoryGroups.find((item) => item.id === category);
      if (!(group?.includes || [group?.id]).includes(post.category)) return false;
    }
    if (search.trim() && !selectedPlace) {
      const query = search.trim().toLocaleLowerCase();
      if (![post.title, post.description, post.place_name, post.brand, post.model].some((field) => field?.toLocaleLowerCase().includes(query))) return false;
    }
    return true;
  }), [posts, typeFilter, category, search, selectedPlace]);

  const stats = useMemo(() => ({
    lost: posts.filter((post) => post.post_type === "LOST" && !closed(post)).length,
    found: posts.filter((post) => post.post_type === "FOUND" && !closed(post)).length,
    returned: posts.filter(closed).length,
  }), [posts]);

  const center = useMemo(() => selectedPlace?.position || (userPos ? userPos.slice(0, 2) : null), [selectedPlace, userPos]);
  const nearby = useMemo(() => {
    const items = [...filtered];
    if (!center) return items;
    return items.sort((a, b) => {
      const da = hasCoords(a) ? distanceMeters(center[0], center[1], ...coords(a)) : Infinity;
      const db = hasCoords(b) ? distanceMeters(center[0], center[1], ...coords(b)) : Infinity;
      return da - db;
    });
  }, [filtered, center?.[0], center?.[1]]);
  const nearbyInRadius = center && radius !== "ALL" ? nearby.filter((post) => hasCoords(post) && distanceMeters(center[0], center[1], ...coords(post)) <= radius) : nearby;
  const visibleNearby = nearbyInRadius.slice(nearbyOffset, nearbyOffset + 6);

  const choosePlace = (place) => {
    const position = [Number(place.lat), Number(place.lon)];
    setSelectedPlace({ label: place.formatted, position });
    setSearch(place.formatted);
    setPlaceSuggestions([]);
    setView("map");
  };

  return <div className="min-h-full bg-[#f7faff] px-3 pb-10 pt-3 text-[#0b1c43] sm:px-5 lg:px-7">
    <div className="mx-auto max-w-[1440px] space-y-3">
      <section className="relative z-30 flex flex-wrap items-center gap-3 rounded-2xl border border-[#e3eaf5] bg-[#f2f6fb] p-3 shadow-[0_6px_24px_rgba(42,82,134,0.04)]">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setSelectedPlace(null); }} placeholder="ค้นหาของหาย เช่น โทรศัพท์, กระเป๋า, กุญแจ, บัตร, ป้ายทะเบียน..." className="h-12 w-full rounded-xl border border-[#dae4f1] bg-white pl-12 pr-10 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" autoComplete="off" />
          {search && <button type="button" onClick={() => { setSearch(""); setSelectedPlace(null); setPlaceSuggestions([]); }} aria-label="ล้างคำค้นหา" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>}
          {placeSuggestions.length > 0 && <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-[#dce6f2] bg-white py-1 shadow-xl">{placeSuggestions.map((place) => <button type="button" key={`${place.place_id}-${place.lat}`} onClick={() => choosePlace(place)} className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm hover:bg-blue-50"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><span>{place.formatted}</span></button>)}<div className="border-t px-4 py-1.5 text-[11px] text-slate-500">สถานที่โดย Geoapify © OpenStreetMap contributors</div></div>}
        </div>
        <button type="button" onClick={requestLocation} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#dae4f1] bg-white px-5 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50"><Crosshair className={cn("h-5 w-5", locationStatus === "requesting" && "animate-pulse")} /><span className="hidden sm:inline">ใช้ตำแหน่งปัจจุบัน</span></button>
        <button type="button" onClick={() => { setPlaceSuggestions([]); document.getElementById("findit-map-panel")?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className="inline-flex h-12 min-w-28 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-600/15 hover:bg-blue-700"><Search className="h-5 w-5" /> ค้นหา</button>
      </section>

      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard Icon={Bookmark} label="ของหายที่ยังไม่เจอ" value={stats.lost} tone="rose" />
        <StatCard Icon={ShieldCheck} label="ประกาศพบของ" value={stats.found} tone="green" />
        <StatCard Icon={Handshake} label="ส่งคืนแล้ว" value={stats.returned} tone="blue" />
        <StatCard Icon={Star} label="ผลลัพธ์ที่แสดง" value={filtered.length} tone="amber" helper="รายการทั้งหมด" />
      </section>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2.65fr)_minmax(300px,1fr)]">
        <section id="findit-map-panel" className="relative isolate z-0 h-[380px] scroll-mt-20 overflow-hidden rounded-2xl border border-[#e2eaf4] bg-white shadow-[0_7px_25px_rgba(38,75,124,0.05)] sm:h-[420px]">
          {view === "map" ? <MapView posts={filtered} center={center} focusedPlace={selectedPlace} userPosition={userPos} onSelect={(post) => navigate(`/post/${post.id}`)} height="100%" /> : <div className="h-full overflow-y-auto px-4 pb-4 pt-16"><div className="grid gap-2 sm:grid-cols-2">{filtered.length ? filtered.map((post) => <Link key={post.id} to={`/post/${post.id}`} className="flex gap-3 rounded-xl border border-slate-200 p-2 hover:border-blue-300"><PostImage post={post} className="h-16 w-16 shrink-0 rounded-lg" /><span className="min-w-0"><strong className="block truncate text-sm">{post.title}</strong><small className="block truncate text-slate-500">{post.place_name || "ไม่ระบุสถานที่"}</small><small className="text-blue-600">{typeLabel(post)}</small></span></Link>) : <p className="py-16 text-center text-sm text-slate-500 sm:col-span-2">ไม่พบประกาศที่ตรงกับการค้นหา</p>}</div></div>}
          <div className="absolute left-4 top-4 z-[500] inline-flex rounded-xl border border-[#dce6f2] bg-white p-1 shadow-md"><button type="button" onClick={() => setView("map")} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold", view === "map" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100")}><MapIcon className="h-4 w-4" /> แผนที่</button><button type="button" onClick={() => setView("list")} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold", view === "list" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100")}><List className="h-4 w-4" /> รายการ</button></div>
          <div className="absolute right-4 top-4 z-[500]"><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="กรองประเภทประกาศ" className="h-10 rounded-xl border border-[#dce6f2] bg-white px-3 text-xs font-semibold text-slate-700 shadow-md outline-none"><option value="ALL">ทั้งหมด</option><option value="LOST">ของหาย</option><option value="FOUND">ของที่พบ</option><option value="RETURNED">ส่งคืนแล้ว</option></select></div>
          <div className="pointer-events-none absolute bottom-4 left-4 z-[500] flex flex-wrap gap-3 rounded-xl border border-[#e2eaf4] bg-white/95 px-3 py-2 text-[11px] font-medium shadow-md"><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-rose-500" />ของหาย</span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />ของที่พบ</span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />ส่งคืนแล้ว</span></div>
          {center && <select value={radius} onChange={(event) => { setRadius(event.target.value === "ALL" ? "ALL" : Number(event.target.value)); setNearbyOffset(0); }} aria-label="รัศมีประกาศใกล้เคียง" className="absolute bottom-11 right-4 z-[500] h-9 rounded-xl border border-[#e2eaf4] bg-white px-3 text-xs font-semibold shadow-md"><option value="ALL">รัศมีทั้งหมด</option><option value={1000}>รัศมี 1 กม.</option><option value={3000}>รัศมี 3 กม.</option><option value={5000}>รัศมี 5 กม.</option><option value={10000}>รัศมี 10 กม.</option></select>}
        </section>

        <aside className="rounded-2xl border border-[#e2eaf4] bg-white p-4 shadow-[0_7px_25px_rgba(38,75,124,0.05)] lg:row-span-2"><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold">รายการล่าสุด</h2><Link to="/search" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">ดูทั้งหมด <ArrowRight className="h-4 w-4" /></Link></div>{loading ? <p className="py-16 text-center text-sm text-slate-400">กำลังโหลดประกาศ...</p> : loadError ? <p className="py-16 text-center text-sm text-rose-600">{loadError}</p> : posts.length ? <div className="divide-y divide-[#e9eef6]">{posts.slice(0, 5).map((post) => <Link key={post.id} to={`/post/${post.id}`} className="flex gap-3 py-2 transition hover:bg-slate-50"><PostImage post={post} className="h-16 w-16 shrink-0 rounded-lg" /><span className="min-w-0 flex-1"><strong className="block truncate text-xs font-semibold text-[#12244b]">{post.title}</strong><small className="mt-1 flex items-center gap-1 truncate text-[11px] text-slate-500"><MapPin className="h-3 w-3 shrink-0" />{post.place_name || "ไม่ระบุสถานที่"}</small><small className="mt-1 block text-[10px] text-slate-400">{new Date(post.event_date || post.created_date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</small></span><span className={cn("self-center rounded-full px-2 py-1 text-[10px] font-semibold", typeTone(post))}>{typeLabel(post)}</span></Link>)}</div> : <div className="grid min-h-56 place-items-center text-center"><span><Package className="mx-auto mb-2 h-9 w-9 text-slate-300" /><span className="text-sm text-slate-500">ยังไม่มีประกาศ</span></span></div>}</aside>

        <section className="min-w-0 rounded-2xl border border-[#e2eaf4] bg-white p-3 shadow-[0_7px_25px_rgba(38,75,124,0.05)]"><h2 className="mb-2 text-sm font-bold">ค้นหาตามประเภท</h2><div className="grid grid-cols-4 gap-2 sm:grid-cols-8">{categoryGroups.map((group) => { const count = group.id === "ALL" ? posts.length : posts.filter((post) => (group.includes || [group.id]).includes(post.category)).length; return <button key={group.id} type="button" onClick={() => setCategory(group.id)} className={cn("flex min-h-24 min-w-0 flex-col items-center justify-center rounded-xl border p-1.5 text-center transition", category === group.id ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-500" : "border-[#e3eaf4] hover:border-blue-300 hover:bg-blue-50/40")}><span className={cn("mb-1 grid h-9 w-9 place-items-center rounded-xl", toneClasses[group.tone])}><group.Icon className="h-5 w-5" /></span><span className="line-clamp-2 text-[10px] font-semibold leading-tight text-[#17284d]">{group.label}</span><span className="mt-1 text-[10px] text-slate-400">{count} รายการ</span></button>; })}</div></section>
      </div>

      <section className="rounded-2xl border border-[#e2eaf4] bg-white p-4 shadow-[0_7px_25px_rgba(38,75,124,0.05)]"><div className="mb-3 flex items-center justify-between"><div className="flex flex-wrap items-baseline gap-3"><h2 className="text-base font-bold">ประกาศใกล้เคียง</h2><span className="text-xs text-slate-500">{center ? (radius === "ALL" ? `พบ ${nearbyInRadius.length} รายการ ทุกระยะ` : `พบ ${nearbyInRadius.length} รายการ ในรัศมี ${radius / 1000} กม.`) : `${nearbyInRadius.length} รายการล่าสุด`}</span></div><div className="flex gap-1"><button type="button" aria-label="ก่อนหน้า" disabled={nearbyOffset === 0} onClick={() => setNearbyOffset(Math.max(0, nearbyOffset - 1))} className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button type="button" aria-label="ถัดไป" disabled={nearbyOffset + 6 >= nearbyInRadius.length} onClick={() => setNearbyOffset(nearbyOffset + 1)} className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>{loading ? <div className="h-28 animate-pulse rounded-xl bg-slate-100" /> : visibleNearby.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{visibleNearby.map((post) => <Link key={post.id} to={`/post/${post.id}`} className="min-w-0 overflow-hidden rounded-xl border border-[#e2eaf4] transition hover:border-blue-300 hover:shadow-sm"><div className="relative"><PostImage post={post} className="h-20 w-full" />{center && hasCoords(post) && <span className="absolute right-1 top-1 rounded-full bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold"><MapPin className="mr-0.5 inline h-3 w-3" />{formatDistance(distanceMeters(center[0], center[1], ...coords(post)))}</span>}</div><div className="p-2"><strong className="block truncate text-xs">{post.title}</strong><span className="block truncate text-[10px] text-slate-500">{post.place_name || "ไม่ระบุสถานที่"}</span></div></Link>)}</div> : <p className="py-12 text-center text-sm text-slate-500">ยังไม่มีประกาศในบริเวณนี้</p>}</section>
    </div>
  </div>;
}
