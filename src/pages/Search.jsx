import React, { useState, useEffect, useMemo } from "react";
import { Search as SearchIcon, Map as MapIcon, List, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PostCard from "@/components/PostCard";
import MapView from "@/components/MapView";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function Search() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState("ALL");
  const [cat, setCat] = useState("ALL");
  const [view, setView] = useState("list");

  useEffect(() => {
    base44.entities.Post.list("-created_date", 200).then((d) => { setPosts(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    let r = posts;
    if (q.trim()) {
      const s = q.toLowerCase();
      r = r.filter((p) => [p.title, p.description, p.place_name, p.brand, p.model].some((v) => v?.toLowerCase().includes(s)));
    }
    if (type !== "ALL") r = r.filter((p) => p.post_type === type);
    if (cat !== "ALL") r = r.filter((p) => p.category === cat);
    return r;
  }, [posts, q, type, cat]);

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา ชื่อ สถานที่ แบรนด์..." className="w-full pl-10 pr-10 py-2.5 rounded-full bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1"><X className="w-4 h-4 text-muted-foreground" /></button>}
        </div>
        <div className="flex rounded-full border border-border p-0.5 bg-card">
          <button onClick={() => setView("list")} className={cn("p-2 rounded-full", view === "list" ? "bg-primary text-white" : "text-muted-foreground")}><List className="w-4 h-4" /></button>
          <button onClick={() => setView("map")} className={cn("p-2 rounded-full", view === "map" ? "bg-primary text-white" : "text-muted-foreground")}><MapIcon className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
        {[{ v: "ALL", l: "ทั้งหมด" }, { v: "LOST", l: "ของหาย" }, { v: "FOUND", l: "ของที่พบ" }].map((t) => (
          <button key={t.v} onClick={() => setType(t.v)} className={cn("px-3.5 py-1.5 rounded-full text-xs font-semibold border shrink-0", type === t.v ? "bg-primary text-white border-primary" : "bg-card border-border")}>{t.l}</button>
        ))}
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setCat(cat === c.id ? "ALL" : c.id)} className={cn("px-3.5 py-1.5 rounded-full text-xs font-medium border shrink-0", cat === c.id ? "bg-primary text-white border-primary" : "bg-card border-border")}>{c.name}</button>
        ))}
      </div>

      {view === "map" ? (
        <div className="rounded-2xl overflow-hidden border border-border" style={{ height: "60vh" }}>
          <MapView posts={results} center={[13.7563, 100.5018]} onSelect={() => {}} height="100%" />
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-card rounded-2xl border border-border animate-pulse aspect-[3/4]" />)}</div>
      ) : results.length === 0 ? (
        <div className="text-center py-16"><SearchIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground" /><p className="text-muted-foreground">ไม่พบผลลัพธ์</p></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">{results.map((p) => <PostCard key={p.id} post={p} />)}</div>
      )}
    </div>
  );
}
