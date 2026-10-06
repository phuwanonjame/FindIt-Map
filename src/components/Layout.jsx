import React, { useEffect, useRef, useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { House, Map as MapIcon, Search, MessageSquare, User, Bell, Menu, X, LogIn, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const NAV = [
  { to: "/", label: "หน้าแรก", icon: House },
  { to: "/map#findit-map-panel", label: "แผนที่", icon: MapIcon },
  { to: "/search", label: "ค้นหาของ", icon: Search },
  { to: "/messages", label: "ข้อความ", icon: MessageSquare },
];
const isNavActive = (pathname, to) => {
  const path = to.split("#")[0];
  return path === "/" ? pathname === "/" || pathname === "/post/new" : pathname === path || pathname.startsWith(`${path}/`);
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const userMenuRef = useRef(null);
  const userMenuButtonRef = useRef(null);

  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const closeOutside = (event) => {
      if (!userMenuRef.current?.contains(event.target)) setUserMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        userMenuButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) { setUnreadCount(0); setUnreadMessages(0); return undefined; }
    let active = true;
    const refresh = async () => {
      try {
        const rows = await base44.entities.Notification.filter({ user_id: user.id });
        if (!active) return;
        const unread = rows.filter((row) => !row.read_at);
        setUnreadCount(unread.length);
        setUnreadMessages(unread.filter((row) => row.type === "MESSAGE").length);
      } catch { /* Keep the previous badge when temporarily offline. */ }
    };
    refresh();
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener("pobjer:notifications-changed", refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("pobjer:notifications-changed", refresh); };
  }, [user?.id]);

  useEffect(() => {
    if (location.hash !== "#findit-map-panel") return undefined;
    const timer = window.setTimeout(() => document.getElementById("findit-map-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => window.clearTimeout(timer);
  }, [location.hash, location.pathname]);

  return (
    <div className="min-h-screen bg-[#f7faff] flex flex-col">
      <header className="sticky top-0 z-40 border-b border-[#e5ebf3] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-4 px-4 lg:px-7">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <img src="/pobjer-icon.png" alt="PobJer" className="h-11 w-11 object-contain" />
            <span><span className="block text-[21px] font-extrabold leading-tight tracking-tight text-[#0b1c43]">Pob<span className="text-blue-600">Jer</span></span><span className="hidden text-[10px] leading-tight text-slate-500 sm:block">เจอของหาย ให้กลับมาหาเจ้าของ</span></span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => {
              const active = isNavActive(location.pathname, item.to);
              return (
                <Link key={item.to} to={item.to} aria-current={active ? "page" : undefined} className={cn("inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition", active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700")}>
                  <item.icon className="w-4 h-4" /> {item.label}
                  {item.to === "/messages" && unreadMessages > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] text-white">{unreadMessages > 99 ? "99+" : unreadMessages}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link to="/notifications" aria-current={location.pathname === "/notifications" ? "page" : undefined} className={cn("relative rounded-lg p-2 transition", location.pathname === "/notifications" ? "bg-blue-50 text-blue-700" : "text-muted-foreground hover:bg-accent")}>
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
            </Link>
            {user ? (
              <div ref={userMenuRef} className="relative">
                <button ref={userMenuButtonRef} type="button" onClick={() => setUserMenuOpen((open) => !open)} className={cn("flex items-center gap-1 rounded-full p-0.5 transition hover:bg-accent", location.pathname === "/profile" && "ring-2 ring-blue-500 ring-offset-2")} aria-label="เปิดเมนูผู้ใช้" aria-expanded={userMenuOpen}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{(user.full_name || user.email || "U").charAt(0).toUpperCase()}</span>
                  <ChevronDown className={cn("hidden h-4 w-4 text-muted-foreground transition md:block", userMenuOpen && "rotate-180")} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-60 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-xl shadow-slate-900/10">
                    <div className="border-b border-border px-3 py-2.5"><div className="truncate text-sm font-semibold">{user.full_name || "ผู้ใช้ PobJer"}</div><div className="truncate text-xs text-muted-foreground">{user.email}</div></div>
                    <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent"><User className="h-4 w-4" /> โปรไฟล์</Link>
                    <button type="button" onClick={() => { setUserMenuOpen(false); logout(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10"><LogOut className="h-4 w-4" /> ออกจากระบบ</button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => navigate("/login")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition">
                <LogIn className="w-4 h-4" /> เข้าสู่ระบบ
              </button>
            )}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-accent lg:hidden">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-border bg-card animate-fade-in lg:hidden">
            {NAV.map((item) => (
              <Link key={item.to} to={item.to} aria-current={isNavActive(location.pathname, item.to) ? "page" : undefined} onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-3 border-b border-border/50 px-4 py-3 text-sm font-medium", isNavActive(location.pathname, item.to) ? "bg-blue-50 text-blue-700" : "hover:bg-accent")}>
                <item.icon className="w-5 h-5" /> {item.label}
                {item.to === "/messages" && unreadMessages > 0 && <span className="ml-auto rounded-full bg-red-500 px-1.5 text-[10px] text-white">{unreadMessages > 99 ? "99+" : unreadMessages}</span>}
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col pb-16 md:pb-0">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border">
        <div className="grid grid-cols-4 h-16">
          {NAV.map((item) => {
            const active = isNavActive(location.pathname, item.to);
            return (
              <Link key={item.to} to={item.to} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                <span className="relative"><item.icon className="w-5 h-5" />{item.to === "/messages" && unreadMessages > 0 && <span className="absolute -right-2 -top-2 h-2.5 w-2.5 rounded-full bg-red-500" />}</span> {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
