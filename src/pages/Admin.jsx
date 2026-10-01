import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, Flag, Users, BarChart3, Check, X, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { CATEGORY_MAP, getStatusInfo } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

export default function Admin() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Post.list("-created_date", 200),
      base44.entities.Report.filter({ status: "PENDING" }),
    ]).then(([p, r]) => { setPosts(p); setReports(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const stats = {
    activeLost: posts.filter((p) => p.post_type === "LOST" && p.status !== "RETURNED" && p.status !== "CLOSED").length,
    activeFound: posts.filter((p) => p.post_type === "FOUND" && p.status !== "RETURNED" && p.status !== "CLOSED").length,
    returned: posts.filter((p) => p.status === "RETURNED").length,
    reports: reports.length,
  };

  const byCategory = CATEGORY_MAP && Object.keys(CATEGORY_MAP).map((id) => ({
    name: CATEGORY_MAP[id].name,
    count: posts.filter((p) => p.category === id).length,
  })).filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
  const maxCat = Math.max(...byCategory.map((c) => c.count), 1);

  const deletePost = async (id) => {
    if (!confirm("ลบประกาศนี้?")) return;
    try { await base44.entities.Post.delete(id); setPosts(posts.filter((p) => p.id !== id)); toast.success("ลบแล้ว"); } catch { toast.error("ลบไม่สำเร็จ"); }
  };

  const resolveReport = async (id) => {
    try { await base44.entities.Report.update(id, { status: "RESOLVED", resolved_at: new Date().toISOString() }); setReports(reports.filter((r) => r.id !== id)); toast.success("จัดการแล้ว"); } catch {}
  };

  if (user?.role !== "admin") {
    return <div className="max-w-md mx-auto px-4 py-16 text-center"><Shield className="w-12 h-12 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p></div>;
  }

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-4">
      <h1 className="text-xl font-bold mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> แดชบอร์ดผู้ดูแล</h1>

      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {[{ id: "overview", label: "ภาพรวม" }, { id: "posts", label: "ประกาศ" }, { id: "reports", label: `รายงาน (${stats.reports})` }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("px-3.5 py-1.5 rounded-full text-xs font-semibold border shrink-0", tab === t.id ? "bg-primary text-white border-primary" : "bg-card border-border")}>{t.label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "ของหายที่ใช้งาน", value: stats.activeLost, color: "text-lost" },
              { label: "พบของที่ใช้งาน", value: stats.activeFound, color: "text-found" },
              { label: "ส่งคืนแล้ว", value: stats.returned, color: "text-primary" },
              { label: "รายงานรอตรวจ", value: stats.reports, color: "text-warning" },
            ].map((s) => (
              <div key={s.label} className="bg-card rounded-2xl p-4 border border-border">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className={cn("text-2xl font-extrabold mt-0.5", s.color)}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <h3 className="font-bold mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> การกระจายตามหมวดหมู่</h3>
            <div className="space-y-2">
              {byCategory.map((c) => (
                <div key={c.name} className="flex items-center gap-2">
                  <div className="w-24 text-xs text-muted-foreground shrink-0">{c.name}</div>
                  <div className="flex-1 h-5 bg-accent rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(c.count / maxCat) * 100}%` }} />
                  </div>
                  <div className="w-8 text-xs font-semibold text-right">{c.count}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "posts" && (
        <div className="space-y-2">
          {posts.map((p) => {
            const c = CATEGORY_MAP[p.category];
            return (
              <div key={p.id} className="flex gap-3 p-3 rounded-2xl bg-card border border-border">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-accent shrink-0">{p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}</div>
                <div className="flex-1 min-w-0">
                  <Link to={`/post/${p.id}`} className="font-semibold text-sm hover:text-primary">{p.title}</Link>
                  <div className="text-xs text-muted-foreground">{c?.name} · {p.post_type === "LOST" ? "ของหาย" : "พบของ"} · {getStatusInfo(p.status, p.post_type).label}</div>
                </div>
                <button onClick={() => deletePost(p.id)} className="p-2 rounded-full hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-2">
          {reports.length === 0 ? <div className="text-center py-12 text-sm text-muted-foreground">ไม่มีรายงานรอตรวจสอบ</div> : reports.map((r) => (
            <div key={r.id} className="p-3 rounded-2xl bg-card border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Flag className="w-4 h-4 text-warning" /><span className="font-semibold text-sm">{r.reason}</span></div>
                <span className="text-xs text-muted-foreground">{r.target_type}</span>
              </div>
              {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
              <div className="flex gap-2 mt-2">
                <Link to={`/post/${r.target_id}`} className="px-3 py-1.5 rounded-full border border-border text-xs font-semibold">ดูประกาศ</Link>
                <button onClick={() => resolveReport(r.id)} className="px-3 py-1.5 rounded-full bg-found text-white text-xs font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> จัดการแล้ว</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}