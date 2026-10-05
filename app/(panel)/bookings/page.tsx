"use client";

import { useState, Suspense } from "react";
import { Search } from "lucide-react";
import BookingTable from "@/components/dispatch/BookingTable";

const tabs = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "in-progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "open-bid", label: "Open Bids" },
  { key: "recurring", label: "Recurring" },
];

export default function BookingsPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy">Bookings</h1>
          <p className="text-navy/50 text-xs sm:text-sm mt-1">Manage and track all bookings.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy/30" />
          <input type="text" placeholder="Search name, phone, address..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-crimson/50 focus:ring-1 focus:ring-crimson/20" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1 p-4 border-b border-gray-100 overflow-x-auto">
          {tabs.map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                filter === key
                  ? "bg-crimson/10 text-crimson"
                  : "text-navy/50 hover:bg-gray-50"
              }`}>
              {label}
            </button>
          ))}
        </div>
        <div className="p-4">
          <Suspense><BookingTable filter={filter} search={search} /></Suspense>
        </div>
      </div>
    </div>
  );
}
