"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
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
  const [incoming, setIncoming] = useState<CallerInfo | null>(null);
  const lastNotifiedRef = useRef<number>(0);

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

  const handleDismiss = useCallback(async () => {
    setIncoming(null);
    try { await fetch("/api/incoming-notification", { method: "DELETE" }); } catch {}
  }, []);

  // Poll for incoming call notifications
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/incoming-notification");
        const data = await res.json();
        if (data.call && data.call.timestamp !== lastNotifiedRef.current) {
          lastNotifiedRef.current = data.call.timestamp;
          const info = await lookupCaller(data.call.number);
          setIncoming(info);
        }
      } catch {}
    };

    const interval = setInterval(poll, 3000);
    poll();
    return () => clearInterval(interval);
  }, [lookupCaller]);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          Phone Online
        </div>
      </div>

      <AnimatePresence>
        {incoming && (
          <IncomingCall
            caller={incoming}
            onDismiss={handleDismiss}
          />
        )}
      </AnimatePresence>
    </>
  );
}
