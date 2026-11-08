"use client";

import { useState, useEffect, useCallback } from "react";
import { X, MapPin, Navigation, Loader2, Plus } from "lucide-react";
import { motion } from "framer-motion";
import DispatchAddressInput, { type PlaceData } from "@/components/dispatch/DispatchAddressInput";
import AddCompanyModal from "@/components/dispatch/AddCompanyModal";
import { calculateFare, isInMarchArea, isSundayOrHoliday, metersToMiles, DEFAULT_SURCHARGE, type VehicleType, type SurchargeConfig } from "@/lib/fare";

interface Company { id: string; name: string; companyName: string | null; phone: string }
const ALL_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function CreateRecurringModal({ onClose }: { onClose: () => void }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [pickup, setPickup] = useState<PlaceData | null>(null);
  const [dropoff, setDropoff] = useState<PlaceData | null>(null);
  const [pickupText, setPickupText] = useState(""); const [dropoffText, setDropoffText] = useState("");
  const [time, setTime] = useState(""); const [vehicle, setVehicle] = useState<VehicleType>("car");
  const [fare, setFare] = useState(0); const [distance, setDistance] = useState(0);
  const [fareManual, setFareManual] = useState(false);
  const [days, setDays] = useState<string[]>([]);
  const [frequency, setFrequency] = useState("weekly");
  const [startDate, setStartDate] = useState(""); const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false); const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");
  const [marchSurchargeOn, setMarchSurchargeOn] = useState(true);
  const [surchargeConfig, setSurchargeConfig] = useState<SurchargeConfig>(DEFAULT_SURCHARGE);

  useEffect(() => {
    fetch("/api/customers?type=company").then((r) => r.json()).then((d) => setCompanies(d.customers || [])).catch(() => {});
    fetch("/api/settings/march-surcharge").then((r) => r.json())
      .then((d) => setMarchSurchargeOn(d.enabled !== false)).catch(() => {});
    fetch("/api/settings/area-surcharge").then((r) => r.json())
      .then((d) => setSurchargeConfig({ radiusMiles: d.radiusMiles ?? 3, perMile: d.perMile ?? 1 })).catch(() => {});
  }, []);

  useEffect(() => {
    if (!pickup || !dropoff || !window.google?.maps) return;
    setCalculating(true);
    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      { origins: [{ lat: pickup.lat, lng: pickup.lng }], destinations: [{ lat: dropoff.lat, lng: dropoff.lng }],
        travelMode: google.maps.TravelMode.DRIVING, unitSystem: google.maps.UnitSystem.IMPERIAL },
      (res, status) => {
        setCalculating(false);
        if (status !== "OK" || !res?.rows[0]?.elements[0]?.distance) return;
        const miles = metersToMiles(res.rows[0].elements[0].distance.value);
        setDistance(miles);
        const skipSurcharge = !marchSurchargeOn && isInMarchArea(pickup.lat, pickup.lng);
        if (!fareManual) setFare(calculateFare(miles, pickup.lat, pickup.lng, vehicle, false, skipSurcharge, surchargeConfig));
      }
    );
  }, [pickup, dropoff, vehicle, marchSurchargeOn, surchargeConfig]);

  const toggleDay = (d: string) => setDays((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d]);

  const handlePickup = useCallback((addr: string, place?: PlaceData) => { setPickupText(addr); if (place) setPickup(place); }, []);
  const handleDropoff = useCallback((addr: string, place?: PlaceData) => { setDropoffText(addr); if (place) setDropoff(place); }, []);

  const handleSubmit = async () => {
    if (!customerId || !pickupText || !dropoffText || !time || !fare || !days.length || !name || !phone) {
      setError("Fill all fields and select at least one day"); return;
    }
    setSaving(true); setError("");
    const res = await fetch("/api/recurring", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, pickup: pickupText, dropoff: dropoffText, time, vehicle, fare, distance, days, name, phone, frequency, startDate: startDate || null, endDate: endDate || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.recurring) onClose(); else setError(data.error || "Failed to create");
  };

  const fieldCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-crimson/50";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-navy">New Recurring Booking</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"><X className="w-5 h-5 text-navy/40" /></button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-navy/60 font-medium">Company</label>
            <div className="flex gap-2">
              <select value={customerId} onChange={(e) => {
                setCustomerId(e.target.value);
                const c = companies.find((x) => x.id === e.target.value);
                if (c) { setName(c.companyName || c.name); setPhone(c.phone); }
              }} className={`${fieldCls} flex-1`}>
                <option value="">Select company...</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
              </select>
              <button type="button" onClick={() => setShowAddCompany(true)}
                className="px-3 py-2.5 rounded-xl bg-crimson/10 text-crimson text-xs font-bold hover:bg-crimson/20 transition-colors cursor-pointer shrink-0 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-navy/60 font-medium">Passenger Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} placeholder="Name" /></div>
            <div><label className="text-xs text-navy/60 font-medium">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldCls} placeholder="Phone" /></div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-5 shrink-0 text-green-500" />
            <div className="flex-1"><DispatchAddressInput value="" onChange={handlePickup} label="Pickup" placeholder="Search pickup address..." /></div>
          </div>
          <div className="flex items-start gap-2">
            <Navigation className="w-4 h-4 mt-5 shrink-0 text-crimson" />
            <div className="flex-1"><DispatchAddressInput value="" onChange={handleDropoff} label="Drop-off" placeholder="Search drop-off address..." /></div>
          </div>

          <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
            {calculating ? (
              <div className="flex items-center gap-2 text-navy/40 text-xs"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculating fare...</div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-navy/40 text-[10px]">Distance</p><p className="text-navy font-bold text-sm">{distance > 0 ? `${distance.toFixed(1)} mi` : "—"}</p></div>
                <div className="text-right">
                  <p className="text-navy/40 text-[10px]">Fare (£) {fareManual && <span className="text-amber-500">Manual</span>}</p>
                  <input type="number" step="0.01" min="0" value={fare || ""} onChange={(e) => { setFare(parseFloat(e.target.value) || 0); setFareManual(true); }}
                    className="w-24 text-right text-crimson font-bold text-lg bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-crimson/50" placeholder="0.00" />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-navy/60 font-medium">Time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={fieldCls} /></div>
            <div><label className="text-xs text-navy/60 font-medium">Vehicle</label>
              <select value={vehicle} onChange={(e) => setVehicle(e.target.value as VehicleType)} className={fieldCls}>
                <option value="car">Car</option><option value="mpv">MPV</option>
              </select></div>
          </div>

          <div>
            <label className="text-xs text-navy/60 font-medium">Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={fieldCls}>
              <option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-navy/60 font-medium">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldCls} /></div>
            <div><label className="text-xs text-navy/60 font-medium">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={fieldCls} /></div>
          </div>
          <div>
            <label className="text-xs text-navy/60 font-medium mb-1.5 block">Days</label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((d) => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    days.includes(d) ? "bg-crimson/10 text-crimson border border-crimson/30" : "bg-gray-100 text-navy/50 border border-transparent"
                  }`}>{d.slice(0, 3).toUpperCase()}</button>
              ))}
            </div>
          </div>
          {error && <p className="text-crimson text-xs">{error}</p>}
        </div>

        <div className="p-5 border-t border-gray-100">
          <button onClick={handleSubmit} disabled={saving || calculating}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-crimson to-crimson-dark text-white font-bold text-sm cursor-pointer disabled:opacity-60">
            {saving ? "Creating..." : "Create Recurring Booking"}
          </button>
        </div>
      </motion.div>

      {showAddCompany && (
        <AddCompanyModal onClose={() => setShowAddCompany(false)} onCreated={(c) => {
          setCompanies((prev) => [c, ...prev]);
          setCustomerId(c.id);
          setName(c.companyName || c.name);
          setPhone(c.phone);
          setShowAddCompany(false);
        }} />
      )}
    </motion.div>
  );
}
