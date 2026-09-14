"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Device, Call } from "@twilio/voice-sdk";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import IncomingCall from "@/components/dispatch/IncomingCall";

interface BookingSummary {
  id: string; pickup: string; dropoff: string; date: string; time: string; status: string; fare: number;
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

export default function SIPPhone() {
  const deviceRef = useRef<Device | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  const [status, setStatus] = useState<"disconnected" | "connecting" | "registered" | "error">("disconnected");
  const [incoming, setIncoming] = useState<CallerInfo | null>(null);
  const [activeCall, setActiveCall] = useState<{ caller: CallerInfo; startTime: number } | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  const lookupCaller = useCallback(async (number: string): Promise<CallerInfo> => {
    try {
      const clean = number.replace(/[^0-9+]/g, "");
      const searchDigits = clean.slice(-10);

      let customerId: string | undefined;
      let customerName: string | undefined;
      let accountType: string | undefined;
      try {
        const custRes = await fetch(`/api/customers?search=${encodeURIComponent(searchDigits)}`);
        const custData = await custRes.json();
        const cust = custData.customers?.find((c: { phone: string }) =>
          c.phone.replace(/[^0-9+]/g, "").includes(searchDigits) ||
          searchDigits.includes(c.phone.replace(/[^0-9+]/g, "").slice(-10))
        );
        if (cust) {
          customerId = cust.id;
          customerName = cust.name;
          accountType = cust.accountType;
        }
      } catch {}

      const res = await fetch(`/api/bookings?limit=100`);
      const data = await res.json();
      const customerBookings = data.bookings?.filter((b: { phone: string }) =>
        b.phone.replace(/[^0-9+]/g, "").includes(searchDigits) ||
        searchDigits.includes(b.phone.replace(/[^0-9+]/g, "").slice(-10))
      ) || [];

      const match = customerBookings[0];
      const name = customerName || match?.name;

      if (name || customerId) {
        const allBookings = customerBookings.map((b: { id: string; pickup: string; dropoff: string; stops?: string | null; date: string; time: string; status: string; fare: number }) => ({
          id: b.id, pickup: b.pickup, dropoff: b.dropoff, stops: b.stops, date: b.date, time: b.time, status: b.status, fare: b.fare,
        }));
        return {
          number: clean, name, lastPickup: match?.pickup,
          totalTrips: customerBookings.length, activeBookings: allBookings.length ? allBookings : undefined,
          customerId, accountType,
        };
      }
      return { number: clean };
    } catch {
      return { number };
    }
  }, []);

  const fetchToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/twilio/token");
      const data = await res.json();
      return data.token || null;
    } catch {
      return null;
    }
  }, []);

  const clearCall = useCallback(() => {
    activeCallRef.current = null;
    setIncoming(null);
    setActiveCall(null);
    setCallDuration(0);
    setMuted(false);
  }, []);

  const handleAccept = useCallback(() => {
    const call = activeCallRef.current;
    if (!call) return;
    const callerInfo = incoming;
    try {
      call.accept();
    } catch {}
    setIncoming(null);
    if (callerInfo) setActiveCall({ caller: callerInfo, startTime: Date.now() });
  }, [incoming]);

  const handleReject = useCallback(() => {
    const call = activeCallRef.current;
    if (!call) { clearCall(); return; }
    try {
      call.reject();
    } catch {}
    clearCall();
  }, [clearCall]);

  const handleHangup = useCallback(() => {
    const call = activeCallRef.current;
    if (call) {
      try { call.disconnect(); } catch {}
    }
    clearCall();
  }, [clearCall]);

  const handleMute = useCallback(() => {
    const call = activeCallRef.current;
    if (call) {
      const newMuted = !muted;
      call.mute(newMuted);
      setMuted(newMuted);
    }
  }, [muted]);

  const setupDevice = useCallback(async () => {
    try {
      setStatus("connecting");

      const token = await fetchToken();
      if (!token) { setStatus("error"); return; }

      const device = new Device(token, {
        logLevel: 1,
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
      });

      device.on("registered", () => setStatus("registered"));
      device.on("unregistered", () => setStatus("disconnected"));
      device.on("error", () => setStatus("error"));

      device.on("incoming", async (call: Call) => {
        activeCallRef.current = call;
        const callerNumber = call.parameters.From || "Unknown";
        const info = await lookupCaller(callerNumber);
        setIncoming(info);

        call.on("cancel", () => clearCall());
        call.on("disconnect", () => clearCall());
        call.on("reject", () => clearCall());
      });

      device.on("tokenWillExpire", async () => {
        const newToken = await fetchToken();
        if (newToken) device.updateToken(newToken);
      });

      await device.register();
      deviceRef.current = device;
    } catch {
      setStatus("error");
    }
  }, [lookupCaller, fetchToken]);

  useEffect(() => {
    setupDevice();
    return () => {
      deviceRef.current?.destroy();
    };
  }, [setupDevice]);

  // Call duration timer
  useEffect(() => {
    if (!activeCall) return;
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - activeCall.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
          status === "registered" ? "bg-green-500/20 text-green-400" :
          status === "connecting" ? "bg-amber-500/20 text-amber-400" :
          status === "error" ? "bg-red-500/20 text-red-400" :
          "bg-white/10 text-white/40"
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            status === "registered" ? "bg-green-400" :
            status === "connecting" ? "bg-amber-400 animate-pulse" :
            status === "error" ? "bg-red-400" :
            "bg-white/30"
          }`} />
          {status === "registered" ? "Phone Online" :
           status === "connecting" ? "Connecting..." :
           status === "error" ? "Phone Offline" :
           "Disconnected"}
        </div>
      </div>

      <AnimatePresence>
        {incoming && (
          <IncomingCall
            caller={incoming}
            onAccept={handleAccept}
            onReject={handleReject}
            onDismiss={() => setIncoming(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeCall && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-14 right-4 z-50 bg-navy border border-green-500/30 rounded-2xl p-4 shadow-2xl min-w-[260px]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{activeCall.caller.name || "Unknown"}</p>
                <p className="text-white/50 text-xs">{activeCall.caller.number}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-green-400 text-sm font-mono font-bold">{formatDuration(callDuration)}</span>
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.9 }} onClick={handleMute}
                  className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors ${muted ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white/60 hover:bg-white/20"}`}>
                  {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={handleHangup}
                  className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer hover:bg-red-600">
                  <PhoneOff className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
