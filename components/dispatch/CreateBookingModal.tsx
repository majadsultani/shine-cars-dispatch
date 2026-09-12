"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, MapPin, Navigation, Loader2, Plus, CircleDot } from "lucide-react";
import CustomerPicker from "@/components/dispatch/CustomerPicker";
import DispatchAddressInput, { PlaceData } from "@/components/dispatch/DispatchAddressInput";
import { calculateFare, isInMarchArea, isSundayOrHoliday, metersToMiles, type VehicleType } from "@/lib/fare";

function applyEventSurcharge(fare: number, percent: number) {
  return Math.round(fare * (1 + percent / 100) * 100) / 100;
}

interface CustomerData { id?: string; name: string; phone: string; email: string; }
interface ActiveEvent { id: string; name: string; increasePercent: number; }

export default function CreateBookingModal({ onClose }: { onClose: () => void }) {
  const [customer, setCustomer] = useState<CustomerData>({ name: "", phone: "", email: "" });
  const [pickup, setPickup] = useState<PlaceData | null>(null);
  const [dropoff, setDropoff] = useState<PlaceData | null>(null);
  const [pickupText, setPickupText] = useState(""); const [dropoffText, setDropoffText] = useState("");
  const [stops, setStops] = useState<string[]>([]);
  const [date, setDate] = useState(""); const [time, setTime] = useState("");
  const [vehicle, setVehicle] = useState<VehicleType>("car");
  const [fare, setFare] = useState(0); const [distance, setDistance] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [fareType, setFareType] = useState<"fixed" | "meter">("fixed");
  const [notes, setNotes] = useState(""); const [buildingInfo, setBuildingInfo] = useState(""); const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false); const [error, setError] = useState("");
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [marchSurchargeOn, setMarchSurchargeOn] = useState(true);

  useEffect(() => {
    fetch("/api/settings/march-surcharge").then((r) => r.json())
      .then((d) => setMarchSurchargeOn(d.enabled !== false)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!date || !time) { setActiveEvent(null); return; }
    fetch(`/api/events/check?date=${date}&time=${time}`).then((r) => r.json())
      .then((d) => setActiveEvent(d.event || null)).catch(() => setActiveEvent(null));
  }, [date, time]);

  useEffect(() => {
    if (!pickup || !dropoff || !window.google?.maps) return;
    setCalculating(true);
    const ds = new google.maps.DirectionsService();
    ds.route({ origin: { lat: pickup.lat, lng: pickup.lng }, destination: { lat: dropoff.lat, lng: dropoff.lng },
      waypoints: stops.filter(Boolean).map((s) => ({ location: s, stopover: true })), travelMode: google.maps.TravelMode.DRIVING,
    }, (res, status) => {
      setCalculating(false);
      if (status !== "OK" || !res?.routes[0]) return;
      const miles = metersToMiles(res.routes[0].legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0));
      const skipSurcharge = !marchSurchargeOn && isInMarchArea(pickup.lat, pickup.lng);
      setDistance(miles); setFare(calculateFare(miles, pickup.lat, pickup.lng, vehicle, isSundayOrHoliday(date), skipSurcharge));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, dropoff, vehicle, JSON.stringify(stops), marchSurchargeOn]);

  const inputClass = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy outline-none focus:border-crimson/50";
  const displayFare = activeEvent ? applyEventSurcharge(fare, activeEvent.increasePercent) : fare;

  const save = async () => {
    if (!customer.name || !customer.phone) { setError("Customer name and phone required."); return; }
    if (!pickupText || !dropoffText) { setError("Pickup and drop-off required."); return; }
    if (!date || !time) { setError("Date and time required."); return; }
    if (!fare) { setError("Select valid addresses to calculate fare."); return; }
    setError(""); setSaving(true);
    const [y, m, d] = date.split("-");
    try {
      const res = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id || null, name: customer.name, phone: customer.phone, email: customer.email,
          pickup: pickupText, dropoff: dropoffText, stops: stops.filter(Boolean), date: `${d}/${m}/${y}`, time, fare: displayFare, distance,
          vehicle, paymentMethod, fareType, notes, buildingInfo: buildingInfo || null, eventPricingId: activeEvent?.id || null,
          eventSurcharge: activeEvent ? displayFare - fare : null }) });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Failed"); setSaving(false); return; }
      onClose();
    } catch { setError("Network error"); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-navy">Create Booking</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-navy/40 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div><p className="text-navy/60 text-xs font-medium mb-2">Customer</p><CustomerPicker onSelect={setCustomer} /></div>
          <div className="flex items-start gap-3"><MapPin className="w-4 h-4 mt-7 shrink-0 text-green-500" />
            <div className="flex-1"><DispatchAddressInput value="" onChange={(addr, place) => { setPickupText(addr); if (place) setPickup(place); }} label="Pickup" placeholder="Enter pickup address..." /></div></div>
          <div className="ml-7"><p className="text-navy/40 text-xs mb-1">Building / House Info</p>
            <input type="text" value={buildingInfo} onChange={(e) => setBuildingInfo(e.target.value)} placeholder="House no, flat, building name (optional)" className={inputClass} /></div>
          {stops.map((s, i) => (
            <div key={i} className="flex items-start gap-3"><CircleDot className="w-4 h-4 mt-7 shrink-0 text-amber-500" />
              <div className="flex-1 relative">
                <DispatchAddressInput value={s} onChange={(addr) => { const n = [...stops]; n[i] = addr; setStops(n); }} label={`Stop ${i + 1}`} placeholder={`Stop ${i + 1} address...`} />
                <button type="button" onClick={() => setStops((prev) => prev.filter((_, j) => j !== i))} className="absolute top-0 right-0 p-1 text-navy/30 hover:text-crimson cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div></div>))}
          {stops.length < 5 && (
            <button type="button" onClick={() => setStops((s) => [...s, ""])}
              className="flex items-center gap-1.5 text-xs text-crimson/70 hover:text-crimson font-medium cursor-pointer py-0.5 ml-7"><Plus className="w-3.5 h-3.5" /> Add a stop</button>)}
          <div className="flex items-start gap-3"><Navigation className="w-4 h-4 mt-7 shrink-0 text-crimson" />
            <div className="flex-1"><DispatchAddressInput value="" onChange={(addr, place) => { setDropoffText(addr); if (place) setDropoff(place); }} label="Drop-off" placeholder="Enter drop-off address..." /></div></div>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-navy/40 text-xs mb-1">Date</p><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></div>
            <div><p className="text-navy/40 text-xs mb-1">Time</p><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} /></div>
          </div>
          <button type="button" onClick={() => { const now = new Date(); const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, "0"), d = String(now.getDate()).padStart(2, "0"); setDate(`${y}-${m}-${d}`); setTime(now.toTimeString().slice(0, 5)); }}
            className="text-xs text-crimson/70 hover:text-crimson font-medium cursor-pointer -mt-2 ml-1">Set to Now</button>
          <div className="grid grid-cols-3 gap-3">
            <div><p className="text-navy/40 text-xs mb-1">Vehicle</p>
              <select value={vehicle} onChange={(e) => setVehicle(e.target.value as VehicleType)} className={inputClass}>
                <option value="car">CAR (4)</option><option value="mpv">MPV (6)</option></select></div>
            <div><p className="text-navy/40 text-xs mb-1">Fare Type</p>
              <select value={fareType} onChange={(e) => { const v = e.target.value as "fixed"|"meter"; setFareType(v); if (v === "meter") setPaymentMethod("cash"); }} className={inputClass}>
                <option value="fixed">FIXED</option><option value="meter">METER</option></select></div>
            <div><p className="text-navy/40 text-xs mb-1">Payment</p>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} disabled={fareType === "meter"} className={`${inputClass} disabled:opacity-50`}>
                <option value="cash">CASH</option><option value="card">CARD</option></select></div>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
            {calculating ? (<div className="flex items-center gap-2 text-navy/40 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Calculating fare...</div>
            ) : fare > 0 ? (<div className="space-y-2">
              <div className="flex items-center justify-between">
                <div><p className="text-navy/40 text-xs">Distance</p><p className="text-navy font-bold">{distance.toFixed(1)} miles</p></div>
                <div className="text-right"><p className="text-navy/40 text-xs">{fareType === "meter" ? "Estimated Range" : "Estimated Fare"}</p>
                  {fareType === "meter" ? <p className="text-crimson font-bold text-xl">&pound;{displayFare.toFixed(2)} – £{(displayFare * 1.1).toFixed(2)}</p>
                    : <p className="text-crimson font-bold text-xl">&pound;{displayFare.toFixed(2)}</p>}</div>
              </div>
              {activeEvent && (<div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-amber-600 text-xs font-bold">EVENT: {activeEvent.name}</span>
                  <span className="text-amber-500 text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 rounded-full">+{activeEvent.increasePercent}%</span></div>
                <p className="text-amber-700/70 text-[11px]">Normal: £{fare.toFixed(2)} + Surcharge: £{(displayFare - fare).toFixed(2)}</p>
              </div>)}
            </div>) : (<p className="text-navy/30 text-xs text-center">Select pickup & drop-off to calculate fare</p>)}
          </div>
          <div><p className="text-navy/40 text-xs mb-1">Notes</p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes..." className={`${inputClass} resize-none`} /></div>
          {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-navy/60 font-medium text-sm hover:bg-gray-50 cursor-pointer">Cancel</button>
          <button onClick={save} disabled={saving || calculating}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-crimson to-crimson-dark text-white font-bold text-sm cursor-pointer disabled:opacity-60">
            {saving ? "Creating..." : "Create Booking"}</button>
        </div>
      </motion.div>
    </div>
  );
}
