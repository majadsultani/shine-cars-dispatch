"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, Users, MapPin, LogOut, Menu, X, UserCheck, MessageCircle, Receipt, Repeat, BarChart3, Zap, FileText,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/map", label: "Driver Map", icon: MapPin },
  { href: "/customers", label: "Customers", icon: UserCheck },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/driver-invoices", label: "Driver Invoices", icon: FileText },
  { href: "/events", label: "Event Pricing", icon: Zap },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pendingDrivers, setPendingDrivers] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);
  const [newRecurring, setNewRecurring] = useState(0);
  const lastRecIdRef = useCallback(() => ({ current: "" }), [])();

  const fetchBadges = useCallback(async () => {
    try {
      const [dr, ch, rec] = await Promise.all([
        fetch("/api/drivers/pending-count").then((r) => r.json()),
        fetch("/api/chat/unread-count").then((r) => r.json()),
        fetch("/api/recurring?limit=1").then((r) => r.json()),
      ]);
      setPendingDrivers(dr.count || 0);
      setUnreadChats(ch.count || 0);
      const latestRecId = rec.items?.[0]?.id || "";
      if (!lastRecIdRef.current) {
        lastRecIdRef.current = latestRecId;
      } else if (latestRecId && latestRecId !== lastRecIdRef.current) {
        lastRecIdRef.current = latestRecId;
        setNewRecurring((p) => p + 1);
      }
    } catch {}
  }, [lastRecIdRef]);

  useEffect(() => {
    fetchBadges();
    const iv = setInterval(fetchBadges, 10_000);
    return () => clearInterval(iv);
  }, [fetchBadges]);

  useEffect(() => {
    if (pathname === "/drivers") setPendingDrivers(0);
    if (pathname === "/chat") setUnreadChats(0);
    if (pathname === "/recurring") setNewRecurring(0);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const nav = (
    <nav className="flex flex-col h-full">
      <div className="p-5 border-b border-white/10 flex items-center gap-3">
        <Image src="/logo-dark.png" alt="Shine Cars" width={40} height={40} className="rounded-lg" />
        <div>
          <h2 className="text-white font-bold text-sm">Shine Cars</h2>
          <p className="text-white/40 text-xs">Dispatch Panel</p>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-crimson/20 text-crimson"
                  : "text-white hover:bg-white/5"
              }`}>
              <Icon className="w-4.5 h-4.5" />
              {label}
              {label === "Drivers" && pendingDrivers > 0 && pathname !== "/drivers" && (
                <span className="ml-auto bg-crimson text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {pendingDrivers}
                </span>
              )}
              {label === "Chat" && unreadChats > 0 && pathname !== "/chat" && (
                <span className="ml-auto bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadChats}
                </span>
              )}
              {label === "Recurring" && newRecurring > 0 && pathname !== "/recurring" && (
                <span className="ml-auto bg-crimson text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {newRecurring}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/10">
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all w-full cursor-pointer">
          <LogOut className="w-4.5 h-4.5" />
          Logout
        </button>
      </div>
    </nav>
  );

  return (
    <>
      <button onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-navy p-2 rounded-lg text-white cursor-pointer">
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 z-40 w-64 h-screen bg-navy border-r border-white/10 transition-transform lg:translate-x-0 overflow-y-auto ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}>
        {nav}
      </aside>
    </>
  );
}
