"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Device, Call } from "@twilio/voice-sdk";
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
  }, []);

  const handleAccept = useCallback(() => {
    const call = activeCallRef.current;
    if (!call) return;
    try {
      call.accept();
    } catch {}
    setIncoming(null);
  }, []);

  const handleReject = useCallback(() => {
    const call = activeCallRef.current;
    if (!call) { clearCall(); return; }
    try {
      call.reject();
    } catch {}
    clearCall();
  }, [clearCall]);

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
    </>
  );
}
