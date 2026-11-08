"use client";

import { Calendar } from "lucide-react";

interface RideRecord { id: string; status: string; date: string; time: string; fare: number }

const statusCls: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-600", confirmed: "bg-blue-50 text-blue-600", assigned: "bg-purple-50 text-purple-600",
  accepted: "bg-indigo-50 text-indigo-600", arrived: "bg-cyan-50 text-cyan-600", "in-progress": "bg-orange-50 text-orange-600",
  completed: "bg-green-50 text-green-600", cancelled: "bg-red-50 text-red-500",
};
const STATUSES = ["pending", "confirmed", "assigned", "accepted", "arrived", "in-progress", "completed", "cancelled"];

export default function RecurringRideHistory({
  rides,
  onStatusChange,
}: {
  rides: RideRecord[];
  onStatusChange: (id: string, status: string) => void;
}) {
  if (!rides.length) return null;
  return (
    <div>
      <p className="text-navy/40 text-xs font-medium mb-2">
        <Calendar className="w-3.5 h-3.5 inline mr-1" />Recent Rides
      </p>
      <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
        {rides.slice(0, 10).map((r) => (
          <div key={r.id} className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-lg text-xs">
            <span className="text-navy/60 shrink-0">
              {new Date(r.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short" })}, {r.date}
            </span>
            <span className="font-bold text-navy shrink-0">&pound;{r.fare.toFixed(2)}</span>
            <select
              value={r.status}
              onChange={(e) => onStatusChange(r.id, e.target.value)}
              className={`text-xs font-semibold px-2 py-1 rounded-md border-0 outline-none cursor-pointer ${statusCls[r.status] || "bg-gray-100 text-gray-500"}`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
