"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, ChevronLeft, ChevronRight, Repeat, ToggleLeft, ToggleRight, Plus, Pencil, Eye } from "lucide-react";
import CreateRecurringModal from "@/components/dispatch/CreateRecurringModal";
import EditRecurringModal from "@/components/dispatch/EditRecurringModal";
import RecurringDetail from "@/components/dispatch/RecurringDetail";

interface Driver { id: string; name: string }
interface LatestBooking { id: string; status: string; date: string; time: string; fare: number }
interface RecurringBooking {
  id: string; name: string; phone: string; pickup: string; dropoff: string;
  time: string; vehicle: string; fare: number; distance: number; days: string; isActive: boolean;
  driverStatus?: string | null; frequency?: string; startDate?: string | null; endDate?: string | null;
  customer: { companyName: string | null; accountType: string };
  driver?: Driver | null;
  bookings?: LatestBooking[];
}

export default function RecurringTable({ filter, search }: { filter: string; search?: string }) {
  const [items, setItems] = useState<RecurringBooking[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<RecurringBooking | null>(null);
  const [viewItem, setViewItem] = useState<RecurringBooking | null>(null);

  const load = useCallback(() => {
    const status = filter !== "all" ? `&status=${filter}` : "";
    const q = search ? `&search=${encodeURIComponent(search)}` : "";
    fetch(`/api/recurring?page=${page}&limit=10${status}${q}`)
      .then((r) => r.json())
      .then((d) => { setItems(d.items || []); setPages(d.pages || 1); })
      .catch(() => {});
  }, [filter, page, search]);

  useEffect(() => { setPage(1); }, [filter, search]);
  useEffect(() => {
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, [load]);

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/recurring/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    load();
  };

  const parseDays = (d: string) => { try { let p = JSON.parse(d); if (typeof p === "string") p = JSON.parse(p); return Array.isArray(p) ? p.map((s: string) => s.slice(0, 3).toUpperCase()).join(", ") : d; } catch { return d; } };
  const statusStyle: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-600", confirmed: "bg-blue-50 text-blue-600", assigned: "bg-purple-50 text-purple-600",
    accepted: "bg-indigo-50 text-indigo-600", arrived: "bg-cyan-50 text-cyan-600", "in-progress": "bg-orange-50 text-orange-600",
    completed: "bg-green-50 text-green-600", cancelled: "bg-red-50 text-red-500",
  };

  const createBtn = (
    <button onClick={() => setShowCreate(true)}
      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-crimson to-crimson-dark text-white text-xs font-bold cursor-pointer hover:shadow-lg transition-shadow">
      <Plus className="w-4 h-4" /> New Recurring
    </button>
  );

  if (!items.length) {
    return (
      <div className="text-center py-12">
        <Repeat className="w-12 h-12 text-navy/20 mx-auto mb-3" />
        <p className="text-navy/40 text-sm mb-3">No recurring bookings.</p>
        {createBtn}
        {showCreate && <CreateRecurringModal onClose={() => { setShowCreate(false); load(); }} />}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-3">{createBtn}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-navy/40 font-medium text-xs py-3 px-4">Customer</th>
              <th className="text-left text-navy/40 font-medium text-xs py-3 px-4 hidden md:table-cell">Route</th>
              <th className="text-left text-navy/40 font-medium text-xs py-3 px-4">Time</th>
              <th className="text-left text-navy/40 font-medium text-xs py-3 px-4">Days</th>
              <th className="text-left text-navy/40 font-medium text-xs py-3 px-4">Fare</th>
              <th className="text-left text-navy/40 font-medium text-xs py-3 px-4">Status</th>
              <th className="text-left text-navy/40 font-medium text-xs py-3 px-4">Driver</th>
              <th className="text-left text-navy/40 font-medium text-xs py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((rb, i) => (
              <motion.tr key={rb.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="py-3 px-4">
                  <p className="font-semibold text-navy">{rb.name}</p>
                  <p className="text-navy/40 text-xs">{rb.customer.companyName || rb.phone}</p>
                </td>
                <td className="py-3 px-4 hidden md:table-cell">
                  <p className="text-xs text-navy/60 flex items-center gap-1 truncate max-w-[180px]">
                    <MapPin className="w-3 h-3 text-green-500 shrink-0" /> {rb.pickup}
                  </p>
                  <p className="text-xs text-navy/60 flex items-center gap-1 truncate max-w-[180px] mt-0.5">
                    <Navigation className="w-3 h-3 text-crimson shrink-0" /> {rb.dropoff}
                  </p>
                </td>
                <td className="py-3 px-4 text-navy/60 text-xs">{rb.time}</td>
                <td className="py-3 px-4">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${rb.frequency === "monthly" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>{rb.frequency || "weekly"}</span>
                  <p className="text-navy/60 text-xs mt-0.5">{parseDays(rb.days)}</p>
                  {rb.startDate && <p className="text-navy/30 text-[10px]">{rb.startDate} → {rb.endDate || "∞"}</p>}
                </td>
                <td className="py-3 px-4 font-bold text-navy">&pound;{rb.fare.toFixed(2)}</td>
                <td className="py-3 px-4">
                  {!rb.isActive && rb.endDate && rb.endDate < new Date().toISOString().split("T")[0] ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-gray-100 text-gray-500">Expired</span>
                  ) : rb.driverStatus === "rejected" ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-red-50 text-red-500">Rejected</span>
                  ) : rb.bookings?.[0] ? (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${statusStyle[rb.bookings[0].status] || "bg-gray-50 text-gray-500"}`}>
                      {rb.bookings[0].status.charAt(0).toUpperCase() + rb.bookings[0].status.slice(1)}
                    </span>
                  ) : rb.driverStatus === "accepted" ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-green-50 text-green-600">Accepted</span>
                  ) : rb.driver ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-purple-50 text-purple-600">Assigned</span>
                  ) : <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-yellow-50 text-yellow-600">Pending</span>}
                </td>
                <td className="py-3 px-4">
                  {rb.driver ? (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-lg">{rb.driver.name}</span>
                  ) : (
                    <span className="text-xs text-navy/30">Unassigned</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setViewItem(rb)} className="cursor-pointer p-1.5 hover:bg-blue-50 rounded-lg" title="View & Assign">
                      <Eye className="w-4 h-4 text-blue-500" />
                    </button>
                    <button onClick={() => setEditItem(rb)} className="cursor-pointer p-1.5 hover:bg-gray-100 rounded-lg" title="Edit">
                      <Pencil className="w-4 h-4 text-navy/40" />
                    </button>
                    <button onClick={() => toggleActive(rb.id, rb.isActive)} className="cursor-pointer" title={rb.isActive ? "Deactivate" : "Activate"}>
                      {rb.isActive ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6 text-navy/30" />}
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <p className="text-navy/40 text-xs">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="p-2 rounded-lg border border-gray-200 text-navy/50 disabled:opacity-30 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}
              className="p-2 rounded-lg border border-gray-200 text-navy/50 disabled:opacity-30 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {showCreate && <CreateRecurringModal onClose={() => { setShowCreate(false); load(); }} />}
      {editItem && <EditRecurringModal item={editItem} onClose={() => { setEditItem(null); load(); }} />}
      {viewItem && <RecurringDetail item={viewItem} onClose={() => { setViewItem(null); load(); }} />}
    </>
  );
}
