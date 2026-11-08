"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, UserCheck, CheckCircle, Trash2 } from "lucide-react";
import RecurringEditForm, { EditFields } from "./RecurringEditForm";
import RecurringRideHistory from "./RecurringRideHistory";

interface RideRecord { id: string; status: string; date: string; time: string; fare: number }
interface RecurringBooking {
  id: string; name: string; phone: string; pickup: string; dropoff: string;
  time: string; vehicle: string; fare: number; distance: number; days: string; isActive: boolean;
  frequency?: string; startDate?: string | null; endDate?: string | null;
  customer: { companyName: string | null; accountType: string };
  driver?: { id: string; name: string } | null;
  bookings?: RideRecord[];
}
interface Driver { id: string; name: string; isAvailable: boolean }

const selectCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy outline-none focus:border-crimson/50";

export default function RecurringDetail({
  item, onClose, onDelete,
}: {
  item: RecurringBooking; onClose: () => void; onDelete?: () => void;
}) {
  const parsedDays: string[] = (() => { try { let d = JSON.parse(item.days); if (typeof d === "string") d = JSON.parse(d); return Array.isArray(d) ? d : []; } catch { return []; } })();

  const [fields, setFields] = useState<EditFields>({
    name: item.name, phone: item.phone, pickup: item.pickup, dropoff: item.dropoff,
    time: item.time, vehicle: item.vehicle, fare: String(item.fare),
    days: parsedDays, frequency: item.frequency || "weekly",
    startDate: item.startDate || "", endDate: item.endDate || "",
    isActive: item.isActive,
  });
  const [driverId, setDriverId] = useState(item.driver?.id || "");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [saving, setSaving] = useState(false);
  const [rides, setRides] = useState<RideRecord[]>([]);

  useEffect(() => {
    fetch("/api/drivers?status=approved").then((r) => r.json()).then((d) => setDrivers(d.drivers || [])).catch(() => {});
    fetch(`/api/recurring/${item.id}`).then((r) => r.json()).then((d) => setRides(d.recurring?.bookings || [])).catch(() => {});
  }, [item.id]);

  const patch = (p: Partial<EditFields>) => setFields((f) => ({ ...f, ...p }));

  const save = async () => {
    setSaving(true);
    await fetch(`/api/recurring/${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverId: driverId || null,
        name: fields.name, phone: fields.phone,
        pickup: fields.pickup, dropoff: fields.dropoff,
        time: fields.time, vehicle: fields.vehicle,
        fare: parseFloat(fields.fare) || 0,
        days: fields.days,
        frequency: fields.frequency,
        startDate: fields.startDate || null,
        endDate: fields.endDate || null,
        isActive: fields.isActive,
      }),
    });
    setSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this recurring booking? This cannot be undone.")) return;
    await fetch(`/api/recurring/${item.id}`, { method: "DELETE" });
    onDelete?.();
    onClose();
  };

  const updateRideStatus = async (rideId: string, status: string) => {
    await fetch(`/api/bookings/${rideId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setRides((prev) => prev.map((r) => r.id === rideId ? { ...r, status } : r));
  };

  const completedRides = rides.filter((r) => r.status === "completed").length;
  const dayIndexMap: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const hasDateRange = !!(fields.startDate && fields.endDate);
  const totalExpected = (() => {
    if (hasDateRange) {
      let count = 0;
      const cur = new Date(fields.startDate + "T00:00:00");
      const end = new Date(fields.endDate + "T00:00:00");
      const dayNums = fields.days.map((d) => dayIndexMap[d]);
      while (cur <= end) { if (dayNums.includes(cur.getDay())) count++; cur.setDate(cur.getDate() + 1); }
      return count;
    }
    return fields.days.length;
  })();
  const remaining = Math.max(0, totalExpected - completedRides);
  const pct = totalExpected > 0 ? Math.round((completedRides / totalExpected) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-navy">Recurring Booking</h3>
            <p className="text-navy/40 text-xs mt-0.5">{item.customer.companyName || "Individual"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-navy/40 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Editable fields */}
          <RecurringEditForm fields={fields} onChange={patch} />

          {/* Progress */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><p className="text-navy text-sm font-semibold">Progress</p></div>
              {totalExpected > 0 && <span className="text-xs font-bold text-navy/50">{pct}%</span>}
            </div>
            {totalExpected > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-xl font-bold text-green-600">{completedRides}</p><p className="text-navy/40 text-xs">Completed</p></div>
              <div><p className="text-xl font-bold text-amber-600">{remaining}</p><p className="text-navy/40 text-xs">Remaining</p></div>
              <div><p className="text-xl font-bold text-navy">{totalExpected}</p><p className="text-navy/40 text-xs">{hasDateRange ? "Total Days" : `Per ${(fields.frequency || "week").charAt(0).toUpperCase() + (fields.frequency || "week").slice(1)}`}</p></div>
            </div>
          </div>

          {/* Ride history */}
          <RecurringRideHistory rides={rides} onStatusChange={updateRideStatus} />

          {/* Driver assign */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-navy/60 text-xs font-medium mb-1.5">
              <UserCheck className="w-3.5 h-3.5 inline mr-1" />Assign Driver
            </label>
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className={selectCls}>
              <option value="">Unassigned</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name} {d.isAvailable ? "(Available)" : "(Busy)"}</option>
              ))}
            </select>
            {item.driver && <p className="text-xs text-navy/40 mt-1">Currently: {item.driver.name}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex gap-3 flex-wrap sm:flex-nowrap">
          <button onClick={handleDelete}
            className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-red-50 text-red-500 border border-red-200 font-medium text-sm hover:bg-red-100 cursor-pointer transition-colors shrink-0">
            <Trash2 className="w-4 h-4" />Delete
          </button>
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-navy/60 font-medium text-sm hover:bg-gray-50 cursor-pointer">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-crimson to-crimson-dark text-white font-bold text-sm cursor-pointer disabled:opacity-60">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
