"use client";

import { motion } from "framer-motion";
import { Phone, PhoneOff, User, MapPin, Navigation, Building2, X } from "lucide-react";
import { startNotificationLoop, stopNotificationLoop } from "@/components/dispatch/NotificationSound";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface BookingSummary {
  id: string; pickup: string; dropoff: string; stops?: string | null; date: string; time: string; status: string; fare: number;
}

interface CallerInfo {
  number: string;
  name?: string;
  lastPickup?: string;
  totalTrips?: number;
  activeBookings?: BookingSummary[];
  customerId?: string;
  accountType?: string;
}

interface Props {
  caller: CallerInfo;
  onAccept: () => void;
  onReject: () => void;
  onDismiss: () => void;
}

export default function IncomingCall({ caller, onAccept, onReject, onDismiss }: Props) {
  const router = useRouter();

  useEffect(() => {
    startNotificationLoop();
    return () => stopNotificationLoop();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-navy rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden text-center">
        {/* Pulsing ring */}
        <div className="pt-10 pb-6 relative">
          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-green-500/20" />
          <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-green-500/10" />
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto relative">
            <motion.div animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}>
              <Phone className="w-8 h-8 text-green-400" />
            </motion.div>
          </div>
        </div>

        <p className="text-green-400 text-xs font-semibold tracking-wider uppercase mb-2">Incoming Call</p>

        <h3 className="text-white text-2xl font-bold mb-1 flex items-center justify-center gap-2">
          {caller.customerId ? (
            <button onClick={() => { onDismiss(); router.push(`/customers?open=${caller.customerId}`); }} className="hover:text-amber-400 transition-colors cursor-pointer underline decoration-white/20 hover:decoration-amber-400">
              {caller.name || "Unknown Caller"}
            </button>
          ) : (caller.name || "Unknown Caller")}
          {caller.accountType === "company" && (
            <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
              <Building2 className="w-3 h-3" /> Company
            </span>
          )}
        </h3>
        <p className="text-white/50 text-sm mb-1">{caller.number}</p>

        {caller.totalTrips !== undefined && (
          <div className="flex items-center justify-center gap-4 text-white/40 text-xs mt-3 mb-2">
            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {caller.totalTrips} {caller.totalTrips === 1 ? "trip" : "trips"}</span>
            {caller.lastPickup && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {caller.lastPickup}</span>
            )}
          </div>
        )}

        {/* Bookings */}
        {caller.activeBookings && caller.activeBookings.length > 0 && (
          <div className="mx-6 mb-2 max-h-40 overflow-y-auto space-y-2">
            {caller.activeBookings.map((b) => (
              <button key={b.id} onClick={() => { onDismiss(); router.push(`/bookings?open=${b.id}`); }}
                className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left hover:bg-amber-500/20 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-amber-400 text-[10px] font-bold uppercase tracking-wider">{b.status}</p>
                  <p className="text-amber-400 text-[11px] font-bold">&pound;{b.fare.toFixed(2)}</p>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 mt-0.5 text-green-400 shrink-0" />
                    <div>
                      <p className="text-white/40 text-[10px]">Pickup</p>
                      <p className="text-white/70">{b.pickup}</p>
                    </div>
                  </div>
                  {b.stops && (() => { try { const s: string[] = JSON.parse(b.stops); return s.map((addr, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <MapPin className="w-3 h-3 mt-0.5 text-amber-400 shrink-0" />
                      <div>
                        <p className="text-white/40 text-[10px]">Stop {i + 1}</p>
                        <p className="text-white/70">{addr}</p>
                      </div>
                    </div>
                  )); } catch { return null; } })()}
                  <div className="flex items-start gap-2">
                    <Navigation className="w-3 h-3 mt-0.5 text-red-400 shrink-0" />
                    <div>
                      <p className="text-white/40 text-[10px]">Drop-off</p>
                      <p className="text-white/70">{b.dropoff}</p>
                    </div>
                  </div>
                  <p className="text-white/30 text-[10px] mt-1">{b.date} at {b.time}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Accept / Reject / Dismiss */}
        <div className="p-8 pt-6 space-y-3">
          <div className="flex gap-3">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onAccept}
              className="flex-1 py-3 rounded-xl bg-green-500 text-white font-medium text-sm hover:bg-green-600 transition-colors cursor-pointer flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" /> Accept
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onReject}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-colors cursor-pointer flex items-center justify-center gap-2">
              <PhoneOff className="w-4 h-4" /> Reject
            </motion.button>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onDismiss}
            className="w-full py-2.5 rounded-xl bg-white/10 text-white/70 font-medium text-sm hover:bg-white/20 transition-colors cursor-pointer flex items-center justify-center gap-2">
            <X className="w-4 h-4" /> Dismiss
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
