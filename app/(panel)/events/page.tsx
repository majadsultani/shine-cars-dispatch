"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, AlertTriangle, MapPin, Power, PoundSterling } from "lucide-react";
import EventPricingForm from "@/components/dispatch/EventPricingForm";
import EventPricingList from "@/components/dispatch/EventPricingList";

interface Event {
  id: string; name: string; startDate: string; startTime: string;
  endDate: string; endTime: string; increasePercent: number;
  isActive: boolean; createdAt: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [priorityEnabled, setPriorityEnabled] = useState(true);
  const [priorityLoading, setPriorityLoading] = useState(false);
  const [marchSurchargeOn, setMarchSurchargeOn] = useState(true);
  const [marchLoading, setMarchLoading] = useState(false);
  const [systemOpen, setSystemOpen] = useState(true);
  const [systemLoading, setSystemLoading] = useState(false);
  const [reopeningTime, setReopeningTime] = useState("08:00");
  const [licenceFee, setLicenceFee] = useState("3");
  const [licenceSaving, setLicenceSaving] = useState(false);
  const [surchargeRadius, setSurchargeRadius] = useState("3");
  const [surchargeRate, setSurchargeRate] = useState("1");
  const [surchargeSaving, setSurchargeSaving] = useState(false);

  const load = useCallback(() => {
    fetch("/api/events").then((r) => r.json()).then((d) => setEvents(d.events || [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/settings/priority").then((r) => r.json()).then((d) => setPriorityEnabled(d.enabled)).catch(() => {});
    fetch("/api/settings/march-surcharge").then((r) => r.json()).then((d) => setMarchSurchargeOn(d.enabled !== false)).catch(() => {});
    fetch("/api/settings/system-status").then((r) => r.json()).then((d) => { setSystemOpen(d.open); setReopeningTime(d.reopeningTime || "08:00"); }).catch(() => {});
    fetch("/api/settings/licence-fee").then((r) => r.json()).then((d) => setLicenceFee(String(d.fee ?? 3))).catch(() => {});
    fetch("/api/settings/area-surcharge").then((r) => r.json()).then((d) => { setSurchargeRadius(String(d.radiusMiles ?? 3)); setSurchargeRate(String(d.perMile ?? 1)); }).catch(() => {});
  }, []);

  const togglePriority = async () => {
    setPriorityLoading(true);
    const res = await fetch("/api/settings/priority", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !priorityEnabled }),
    });
    const d = await res.json();
    setPriorityEnabled(d.enabled);
    setPriorityLoading(false);
  };

  const toggleMarchSurcharge = async () => {
    setMarchLoading(true);
    const res = await fetch("/api/settings/march-surcharge", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !marchSurchargeOn }),
    });
    const d = await res.json();
    setMarchSurchargeOn(d.enabled);
    setMarchLoading(false);
  };

  const toggleSystem = async () => {
    setSystemLoading(true);
    const res = await fetch("/api/settings/system-status", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ open: !systemOpen, reopeningTime }),
    });
    const d = await res.json();
    setSystemOpen(d.open);
    setSystemLoading(false);
  };

  const updateReopeningTime = async (t: string) => {
    setReopeningTime(t);
    await fetch("/api/settings/system-status", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reopeningTime: t }),
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-crimson" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy">Special Event Pricing</h1>
          <p className="text-navy/50 text-xs sm:text-sm">Set time-based fare increases for events and holidays.</p>
        </div>
      </div>

      {/* System Open/Close Toggle */}
      <div className={`rounded-2xl border p-5 ${systemOpen ? "bg-white border-gray-100" : "bg-red-50 border-red-200"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${systemOpen ? "bg-green-100" : "bg-red-100"}`}>
              <Power className={`w-5 h-5 ${systemOpen ? "text-green-600" : "text-red-500"}`} />
            </div>
            <div>
              <h3 className="text-navy font-bold text-sm">Booking System</h3>
              <p className="text-navy/50 text-xs">{systemOpen ? "System is OPEN — customers can book" : "System is CLOSED — only future dates allowed"}</p>
            </div>
          </div>
          <button onClick={toggleSystem} disabled={systemLoading}
            className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${systemOpen ? "bg-green-500" : "bg-red-400"}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${systemOpen ? "translate-x-6.5" : "translate-x-0.5"}`} />
          </button>
        </div>
        {!systemOpen && (
          <div className="mt-3 pt-3 border-t border-red-200/50 flex items-center gap-3">
            <label className="text-navy/60 text-xs font-medium whitespace-nowrap">Reopening at</label>
            <input type="time" value={reopeningTime} onChange={(e) => updateReopeningTime(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-navy font-medium outline-none focus:border-crimson/40" />
            <p className="text-navy/40 text-xs">Shown to customers</p>
          </div>
        )}
      </div>

      {/* Priority Booking Toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="text-navy font-bold text-sm">Priority Booking</h3>
            <p className="text-navy/50 text-xs">Extra £5 (≤3 miles) or £10 (&gt;3 miles) for priority rides</p>
          </div>
        </div>
        <button onClick={togglePriority} disabled={priorityLoading}
          className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${priorityEnabled ? "bg-orange-500" : "bg-gray-300"}`}>
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${priorityEnabled ? "translate-x-6.5" : "translate-x-0.5"}`} />
        </button>
      </div>

      {/* March Outside Area Surcharge Toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-navy font-bold text-sm">March Outside Area Charge</h3>
            <p className="text-navy/50 text-xs">Extra charge for pickups outside the base area in March</p>
          </div>
        </div>
        <button onClick={toggleMarchSurcharge} disabled={marchLoading}
          className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${marchSurchargeOn ? "bg-blue-500" : "bg-gray-300"}`}>
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${marchSurchargeOn ? "translate-x-6.5" : "translate-x-0.5"}`} />
        </button>
      </div>

      {/* Area Surcharge Settings */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="text-navy font-bold text-sm">Area Surcharge Settings</h3>
            <p className="text-navy/50 text-xs">Configure the free zone radius and surcharge rate per mile</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-navy/60 text-xs font-medium whitespace-nowrap">Free Radius</label>
            <input type="number" value={surchargeRadius} onChange={(e) => setSurchargeRadius(e.target.value)}
              className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-navy font-bold outline-none focus:border-crimson/40 text-center" min="0" step="0.5" />
            <span className="text-navy/40 text-xs">miles</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-navy/60 text-xs font-medium whitespace-nowrap">Rate</label>
            <span className="text-navy/40 text-sm">£</span>
            <input type="number" value={surchargeRate} onChange={(e) => setSurchargeRate(e.target.value)}
              className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-navy font-bold outline-none focus:border-crimson/40 text-center" min="0" step="0.5" />
            <span className="text-navy/40 text-xs">/mile</span>
          </div>
          <button disabled={surchargeSaving} onClick={async () => {
            setSurchargeSaving(true);
            await fetch("/api/settings/area-surcharge", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ radiusMiles: Number(surchargeRadius), perMile: Number(surchargeRate) }) });
            setSurchargeSaving(false);
          }} className="text-xs text-white bg-purple-500 hover:bg-purple-600 px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors">
            {surchargeSaving ? "..." : "Save"}
          </button>
        </div>
      </div>

      {/* Driver Licence Fee */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <PoundSterling className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-navy font-bold text-sm">Driver Licence Fee</h3>
              <p className="text-navy/50 text-xs">Weekly fee charged to drivers on each invoice</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-navy/40 text-sm">£</span>
            <input type="number" value={licenceFee} onChange={(e) => setLicenceFee(e.target.value)}
              className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-navy font-bold outline-none focus:border-crimson/40 text-center" min="0" step="0.5" />
            <span className="text-navy/40 text-xs">/week</span>
            <button disabled={licenceSaving} onClick={async () => {
              setLicenceSaving(true);
              await fetch("/api/settings/licence-fee", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fee: licenceFee }) });
              setLicenceSaving(false);
            }} className="text-xs text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors">
              {licenceSaving ? "..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      <EventPricingForm onCreated={load} />
      <EventPricingList events={events} onRefresh={load} />
    </div>
  );
}
