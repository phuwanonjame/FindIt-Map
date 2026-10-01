import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Map as MapIcon, Search, Plus, MessageSquare, User, Bell, Menu, X, LogIn, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "แผนที่", icon: MapIcon },
  { to: "/search", label: "ค้นหา", icon: Search },
  { to: "/post/new", label: "แจ้ง", icon: Plus, primary: true },
  { to: "/messages", label: "ข้อความ", icon: MessageSquare },
  { to: "/profile", label: "โปรไฟล์", icon: User },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/findit-logo.png" alt="FindIt Map" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-bold text-[15px] tracking-tight">FindIt Map</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => {
              const active = location.pathname === item.to;
              if (item.primary) {
                return (
                  <Link key={item.to} to={item.to} className="ml-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition">
                    <Plus className="w-4 h-4" /> แจ้งประกาศ
                  </Link>
                );
              }
              return (
                <Link key={item.to} to={item.to} className={cn("inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition", active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                  <item.icon className="w-4 h-4" /> {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-accent transition">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </Link>
            {user ? (
              <div className="relative">
                <button type="button" onClick={() => setUserMenuOpen((open) => !open)} className="flex items-center gap-1 rounded-full p-0.5 transition hover:bg-accent" aria-label="เปิดเมนูผู้ใช้" aria-expanded={userMenuOpen}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{(user.full_name || user.email || "U").charAt(0).toUpperCase()}</span>
                  <ChevronDown className={cn("hidden h-4 w-4 text-muted-foreground transition md:block", userMenuOpen && "rotate-180")} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-60 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-xl shadow-slate-900/10">
                    <div className="border-b border-border px-3 py-2.5"><div className="truncate text-sm font-semibold">{user.full_name || "ผู้ใช้ FindIt Map"}</div><div className="truncate text-xs text-muted-foreground">{user.email}</div></div>
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
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-accent">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-card animate-fade-in">
            {NAV.map((item) => (
              <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-accent border-b border-border/50">
                <item.icon className="w-5 h-5 text-muted-foreground" /> {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col pb-16 md:pb-0">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border">
        <div className="grid grid-cols-5 h-16">
          {NAV.map((item) => {
            const active = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
            if (item.primary) {
              return (
                <Link key={item.to} to={item.to} className="flex flex-col items-center justify-center">
                  <div className="w-11 h-11 -mt-4 rounded-full bg-primary text-white flex items-center justify-center shadow-md">
                    <item.icon className="w-5 h-5" />
                  </div>
                </Link>
              );
            }
            return (
              <Link key={item.to} to={item.to} className={cn("flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                <item.icon className="w-5 h-5" /> {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
