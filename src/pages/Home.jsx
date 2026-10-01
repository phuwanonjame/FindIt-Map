import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, MapPin, Navigation, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import MapView from "@/components/MapView";
import PostCard from "@/components/PostCard";
import { CATEGORIES, distanceMeters, formatDistance, timeAgo, CATEGORY_MAP } from "@/lib/constants";
import { Image as Img } from "@/components/ui/image";
import { cn } from "@/lib/utils";

const TYPE_FILTERS = [
  { value: "ALL", label: "ทั้งหมด" },
  { value: "LOST", label: "ของหาย" },
  { value: "FOUND", label: "ของที่พบ" },
  { value: "RETURNED", label: "ส่งคืนแล้ว" },
];

const DATE_FILTERS = [
  { value: 0, label: "ทั้งหมด" },
  { value: 1, label: "วันนี้" },
  { value: 3, label: "3 วัน" },
  { value: 7, label: "7 วัน" },
  { value: 30, label: "30 วัน" },
];

const DISTANCE_FILTERS = [
  { value: 500, label: "500 ม." },
  { value: 1000, label: "1 กม." },
  { value: 3000, label: "3 กม." },
  { value: 5000, label: "5 กม." },
  { value: 10000, label: "10 กม." },
];

function SkeletonCard() {
  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border animate-pulse">
      <div className="w-full aspect-[4/3] bg-accent" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-accent rounded w-3/4" />
        <div className="h-3 bg-accent rounded w-1/2" />
        <div className="h-5 bg-accent rounded w-20" />
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState(0);
  const [distanceFilter, setDistanceFilter] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [userPos, setUserPos] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  const [selectedPost, setSelectedPost] = useState(null);
  const [stats, setStats] = useState({ lostToday: 0, foundToday: 0, returned: 0, nearMe: 0 });

  useEffect(() => {
    base44.entities.Post.list("-created_date", 200).then((data) => {
      setPosts(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = posts;
    if (typeFilter === "RETURNED") result = result.filter((p) => p.status === "RETURNED" || p.status === "CLOSED");
    else if (typeFilter !== "ALL") result = result.filter((p) => p.post_type === typeFilter);
    if (categoryFilter !== "ALL") result = result.filter((p) => p.category === categoryFilter);
    if (dateFilter > 0) {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - dateFilter);
      result = result.filter((p) => new Date(p.event_date || p.created_date) >= cutoff);
    }
    if (distanceFilter && userPos) {
      result = result.filter((p) => p.public_latitude && distanceMeters(userPos[0], userPos[1], p.public_latitude, p.public_longitude) <= distanceFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.place_name?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q));
    }
    return result;
  }, [posts, typeFilter, categoryFilter, dateFilter, distanceFilter, userPos, search]);

  useEffect(() => {
    const lostToday = posts.filter((p) => p.post_type === "LOST" && p.status !== "RETURNED" && p.status !== "CLOSED").length;
    const foundToday = posts.filter((p) => p.post_type === "FOUND" && p.status !== "RETURNED" && p.status !== "CLOSED").length;
    const returned = posts.filter((p) => p.status === "RETURNED" || p.status === "CLOSED").length;
    // This is the same result set currently shown below the map, so it stays
    // accurate even before the visitor grants location permission.
    setStats({ lostToday, foundToday, returned, nearMe: filtered.length });
  }, [posts, filtered, userPos]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }
    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy]);
        setLocationStatus("granted");
      },
      () => setLocationStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // The browser displays its native consent prompt. Declining does not block
  // the public map or any other functionality.
  useEffect(() => {
    requestLocation();
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Search + filters bar */}
      <div className="bg-card border-b border-border sticky top-14 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา เช่น กระเป๋าสตางค์, iPhone, กุญแจรถ..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={cn("px-3.5 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition", showFilters ? "bg-primary text-white border-primary" : "bg-card border-border hover:bg-accent")}>
              <SlidersHorizontal className="w-4 h-4" /> <span className="hidden sm:inline">ตัวกรอง</span>
            </button>
            <button onClick={requestLocation} className="px-3.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm font-medium flex items-center gap-1.5 hover:bg-primary/15 transition" aria-label="ใช้ตำแหน่งปัจจุบัน">
              <Navigation className={cn("w-4 h-4", locationStatus === "requesting" && "animate-pulse")} /> <span className="hidden sm:inline">ใกล้ฉัน</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 space-y-3 animate-fade-in">
              <div className="flex flex-wrap gap-2">
                {TYPE_FILTERS.map((t) => (
                  <button key={t.value} onClick={() => setTypeFilter(t.value)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium border transition", typeFilter === t.value ? "bg-primary text-white border-primary" : "bg-card border-border hover:bg-accent")}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.id} onClick={() => setCategoryFilter(categoryFilter === c.id ? "ALL" : c.id)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium border transition", categoryFilter === c.id ? "bg-primary text-white border-primary" : "bg-card border-border hover:bg-accent")}>
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground mr-1">เวลา:</span>
                {DATE_FILTERS.map((d) => (
                  <button key={d.value} onClick={() => setDateFilter(d.value)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium border transition", dateFilter === d.value ? "bg-primary text-white border-primary" : "bg-card border-border hover:bg-accent")}>
                    {d.label}
                  </button>
                ))}
              </div>
              {userPos && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground mr-1">ระยะ:</span>
                  {DISTANCE_FILTERS.map((d) => (
                    <button key={d.value} onClick={() => setDistanceFilter(distanceFilter === d.value ? null : d.value)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium border transition", distanceFilter === d.value ? "bg-primary text-white border-primary" : "bg-card border-border hover:bg-accent")}>
                      {d.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto w-full px-4 pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "ของหายที่เปิดอยู่", value: stats.lostToday, color: "text-lost", dot: "bg-lost" },
            { label: "ประกาศพบของ", value: stats.foundToday, color: "text-found", dot: "bg-found" },
            { label: "ส่งคืนแล้ว", value: stats.returned, color: "text-primary", dot: "bg-primary" },
            { label: "ผลลัพธ์ที่แสดง", value: stats.nearMe, color: "text-foreground", dot: "bg-muted-foreground" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-3.5 border border-border bg-card">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={cn("w-2 h-2 rounded-full", s.dot)} />
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
              <div className={cn("text-2xl font-bold tracking-tight", s.color)}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="max-w-7xl mx-auto w-full px-4 py-4">
        <div className="relative rounded-xl overflow-hidden border border-border map-shadow" style={{ height: "min(60vh, 480px)" }}>
          {loading ? (
            <div className="w-full h-full bg-accent animate-pulse" />
          ) : (
            <MapView posts={filtered} center={userPos?.slice(0, 2)} userPosition={userPos} onSelect={(p) => navigate(`/post/${p.id}`)} height="100%" />
          )}
          {selectedPost && (
            <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-80 bg-card rounded-xl border border-border shadow-lg p-3 animate-fade-in">
              <button onClick={() => setSelectedPost(null)} className="absolute top-2 right-2 p-1 rounded-md hover:bg-accent"><X className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      </div>

      {/* Nearby list */}
      <div className="max-w-7xl mx-auto w-full px-4 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base">ประกาศใกล้เคียง</h2>
          <span className="text-sm text-muted-foreground">{filtered.length} รายการ</span>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mx-auto mb-3">
              <Search className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">ยังไม่มีประกาศในบริเวณนี้</h3>
            <p className="text-sm text-muted-foreground mb-4">ลองขยายระยะค้นหา หรือกลับมาตรวจสอบอีกครั้ง</p>
            {distanceFilter && distanceFilter < 5000 && (
              <button onClick={() => setDistanceFilter(5000)} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">ขยายเป็น 5 กม.</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map((p) => (
              <PostCard key={p.id} post={p} userLat={userPos?.[0]} userLng={userPos?.[1]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
