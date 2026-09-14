"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, UserCheck, Pencil } from "lucide-react";
import StatusBadge from "@/components/dispatch/StatusBadge";
import BookingInfoRows from "@/components/dispatch/BookingInfoRows";
import BookingEditFields, { BookingEdits } from "@/components/dispatch/BookingEditFields";
import { PlaceData } from "@/components/dispatch/DispatchAddressInput";
import { calculateFare, isInMarchArea, isSundayOrHoliday, metersToMiles, DEFAULT_SURCHARGE, type VehicleType, type SurchargeConfig } from "@/lib/fare";

interface Booking {
  id: string; name: string; phone: string;
  pickup: string; dropoff: string; stops?: string | null;
  date: string; time: string;
  distance: number; fare: number;
  vehicle?: string; paymentMethod?: string; paymentStatus?: string;
  buildingInfo?: string | null;
  status: string; createdAt: string; notes: string | null;
  driverId?: string | null;
  driver?: { id: string; name: string } | null;
}

interface Driver { id: string; name: string; isAvailable: boolean; hasActiveRide?: boolean; }

const statuses = ["pending", "confirmed", "assigned", "accepted", "arrived", "in-progress", "completed", "cancelled"];

function toISODate(d: string) { const p = d.split("/"); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d; }
function toDisplayDate(d: string) { const p = d.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; }

export default function BookingDetail({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const [status, setStatus] = useState(booking.status);
  const [notes, setNotes] = useState(booking.notes?.startsWith("stripe:") ? "" : (booking.notes || ""));
  const [driverId, setDriverId] = useState(booking.driverId || "");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [marchSurchargeOn, setMarchSurchargeOn] = useState(true);
  const [surchargeConfig, setSurchargeConfig] = useState<SurchargeConfig>(DEFAULT_SURCHARGE);
  const places = useRef<{ pickup?: PlaceData; dropoff?: PlaceData }>({});
  const parsedStops: string[] = booking.stops ? (() => { try { return JSON.parse(booking.stops); } catch { return []; } })() : [];
  const [edits, setEdits] = useState<BookingEdits>({
    pickup: booking.pickup, dropoff: booking.dropoff,
    stops: parsedStops,
    date: toISODate(booking.date), time: booking.time,
    fare: booking.fare.toFixed(2), distance: booking.distance.toFixed(1),
    vehicle: booking.vehicle || "car",
    fareType: (booking as unknown as Record<string, unknown>).fareType as string || "fixed",
    paymentMethod: booking.paymentMethod || "cash",
    paymentStatus: booking.paymentStatus || "unpaid",
    buildingInfo: booking.buildingInfo || "",
  });

  useEffect(() => {
    fetch("/api/drivers?status=approved").then((r) => r.json()).then((d) => setDrivers(d.drivers || [])).catch(() => {});
    fetch("/api/settings/march-surcharge").then((r) => r.json())
      .then((d) => setMarchSurchargeOn(d.enabled !== false)).catch(() => {});
    fetch("/api/settings/area-surcharge").then((r) => r.json())
      .then((d) => setSurchargeConfig({ radiusMiles: d.radiusMiles ?? 3, perMile: d.perMile ?? 1 })).catch(() => {});
  }, []);

  const handlePlaceChange = (type: "pickup" | "dropoff", place: PlaceData) => {
    places.current[type] = place;
    const p = places.current.pickup, d = places.current.dropoff;
    if (!p || !d || !window.google?.maps) return;
    setCalculating(true);
    new google.maps.DistanceMatrixService().getDistanceMatrix(
      { origins: [{ lat: p.lat, lng: p.lng }], destinations: [{ lat: d.lat, lng: d.lng }], travelMode: google.maps.TravelMode.DRIVING, unitSystem: google.maps.UnitSystem.IMPERIAL },
      (res, st) => {
        setCalculating(false);
        if (st !== "OK" || !res?.rows[0]?.elements[0]?.distance) return;
        const miles = metersToMiles(res.rows[0].elements[0].distance.value);
        const skipSurcharge = !marchSurchargeOn && isInMarchArea(p.lat, p.lng);
        const fare = calculateFare(miles, p.lat, p.lng, edits.vehicle as VehicleType, isSundayOrHoliday(edits.date), skipSurcharge, surchargeConfig);
        setEdits((prev) => ({ ...prev, distance: miles.toFixed(1), fare: fare.toFixed(2) }));
      }
    );
  };

  const save = async () => {
    setSaving(true);
    const body: Record<string, unknown> = { status, notes };
    if (driverId !== (booking.driverId || "")) body.driverId = driverId || null;
    if (editing) {
      body.pickup = edits.pickup; body.dropoff = edits.dropoff;
      body.stops = edits.stops.filter(Boolean).length ? JSON.stringify(edits.stops.filter(Boolean)) : null;
      body.date = toDisplayDate(edits.date); body.time = edits.time;
      body.fare = parseFloat(edits.fare) || booking.fare;
      body.distance = parseFloat(edits.distance) || booking.distance;
      body.vehicle = edits.vehicle; body.fareType = edits.fareType; body.paymentMethod = edits.paymentMethod; body.paymentStatus = edits.paymentStatus; body.buildingInfo = edits.buildingInfo || null;
    }
    await fetch(`/api/bookings/${booking.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false); onClose();
  };

  const selectClass = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy outline-none focus:border-crimson/50";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-navy">Booking Details</h3>
            <p className="text-navy/40 text-xs mt-0.5">ID: {booking.id.slice(0, 8)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(!editing)}
              className={`p-2 rounded-lg cursor-pointer transition-colors ${editing ? "bg-crimson/10 text-crimson" : "hover:bg-gray-100 text-navy/40"}`}>
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-navy/40 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-navy/50 text-xs">Current:</span>
            <StatusBadge status={booking.status} />
          </div>

          {editing ? (
            <BookingEditFields edits={edits} calculating={calculating}
              onChange={(k, v) => setEdits((p) => ({ ...p, [k]: v }))}
              onStopsChange={(s) => setEdits((p) => ({ ...p, stops: s }))}
              onPlaceChange={handlePlaceChange} />
          ) : (
            <BookingInfoRows booking={booking} />
          )}

          <div>
            <label className="block text-navy/60 text-xs font-medium mb-1.5">
              <UserCheck className="w-3.5 h-3.5 inline mr-1" />Assign Driver
            </label>
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className={selectClass}>
              <option value="">Unassigned</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name} {!d.isAvailable ? "(Offline)" : d.hasActiveRide ? "(Busy)" : "(Available)"}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-navy/60 text-xs font-medium mb-1.5">Update Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
              {statuses.map((s) => (<option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-navy/60 text-xs font-medium mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Add notes about this booking..."
              className={`${selectClass} resize-none`} />
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-navy/60 font-medium text-sm hover:bg-gray-50 cursor-pointer">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-crimson to-crimson-dark text-white font-bold text-sm cursor-pointer disabled:opacity-60">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
