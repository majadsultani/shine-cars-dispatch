"use client";

import { useState, useEffect, useCallback } from "react";
import { X, MapPin, Navigation, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import DispatchAddressInput, { type PlaceData } from "@/components/dispatch/DispatchAddressInput";
import { calculateFare, isInMarchArea, metersToMiles, DEFAULT_SURCHARGE, type VehicleType, type SurchargeConfig } from "@/lib/fare";

interface RecurringBooking {
  id: string; name: string; phone: string; pickup: string; dropoff: string;
  time: string; vehicle: string; fare: number; distance: number; days: string; isActive: boolean;
  frequency?: string; startDate?: string | null; endDate?: string | null;
}

const ALL_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function EditRecurringModal({ item, onClose }: { item: RecurringBooking; onClose: () => void }) {
  const parsedDays: string[] = (() => { try { return JSON.parse(item.days); } catch { return []; } })();

  const [name, setName] = useState(item.name);
  const [phone, setPhone] = useState(item.phone);
  const [pickup, setPickup] = useState<PlaceData | null>(null);
  const [dropoff, setDropoff] = useState<PlaceData | null>(null);
  const [pickupText, setPickupText] = useState(item.pickup);
  const [dropoffText, setDropoffText] = useState(item.dropoff);
  const [time, setTime] = useState(item.time);
  const [vehicle, setVehicle] = useState<VehicleType>(item.vehicle as VehicleType);
  const [fare, setFare] = useState(item.fare);
  const [distance, setDistance] = useState(item.distance);
  const [days, setDays] = useState<string[]>(parsedDays);
  const [frequency, setFrequency] = useState(item.frequency || "weekly");
  const [startDate, setStartDate] = useState(item.startDate || "");
  const [endDate, setEndDate] = useState(item.endDate || "");
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");
  const [marchSurchargeOn, setMarchSurchargeOn] = useState(true);
  const [surchargeConfig, setSurchargeConfig] = useState<SurchargeConfig>(DEFAULT_SURCHARGE);

  useEffect(() => {
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
        setFare(calculateFare(miles, pickup.lat, pickup.lng, vehicle, false, skipSurcharge, surchargeConfig));
      }
    );
  }, [pickup, dropoff, vehicle, marchSurchargeOn, surchargeConfig]);

  const toggleDay = (d: string) => setDays((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d]);

  const handlePickup = useCallback((addr: string, place?: PlaceData) => { setPickupText(addr); if (place) setPickup(place); }, []);
  const handleDropoff = useCallback((addr: string, place?: PlaceData) => { setDropoffText(addr); if (place) setDropoff(place); }, []);

  const handleSubmit = async () => {
    if (!pickupText || !dropoffText || !time || !fare || !days.length || !name || !phone) {
      setError("Fill all fields and select at least one day"); return;
    }
    setSaving(true); setError("");
    const res = await fetch(`/api/recurring/${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickup: pickupText, dropoff: dropoffText, time, vehicle, fare, distance, days, name, phone, frequency, startDate: startDate || null, endDate: endDate || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.recurring) onClose(); else setError(data.error || "Failed to update");
  };

  const fieldCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-crimson/50";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-navy">Edit Recurring Booking</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"><X className="w-5 h-5 text-navy/40" /></button>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-navy/60 font-medium">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} /></div>
            <div><label className="text-xs text-navy/60 font-medium">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldCls} /></div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-5 shrink-0 text-green-500" />
            <div className="flex-1"><DispatchAddressInput value={item.pickup} onChange={handlePickup} label="Pickup" placeholder="Search pickup..." /></div>
          </div>
          <div className="flex items-start gap-2">
            <Navigation className="w-4 h-4 mt-5 shrink-0 text-crimson" />
            <div className="flex-1"><DispatchAddressInput value={item.dropoff} onChange={handleDropoff} label="Drop-off" placeholder="Search drop-off..." /></div>
          </div>

          <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
            {calculating ? (
              <div className="flex items-center gap-2 text-navy/40 text-xs"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculating...</div>
            ) : (
              <div className="flex items-center justify-between">
                <div><p className="text-navy/40 text-[10px]">Distance</p><p className="text-navy font-bold text-sm">{distance.toFixed(1)} mi</p></div>
                <div className="text-right"><p className="text-navy/40 text-[10px]">Fare</p><p className="text-crimson font-bold text-lg">&pound;{fare.toFixed(2)}</p></div>
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
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
