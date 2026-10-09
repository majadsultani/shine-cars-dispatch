import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const SECRET = process.env.CUSTOMER_JWT_SECRET || "shine-cars-customer-secret-2024";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, pickup, dropoff, stops, date, time, distance, fare, vehicle, pickupDetails, dropoffDetails, buildingInfo } = body;

    if (!name || !phone || !pickup || !dropoff || !date || !time || !fare) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const key = process.env.STRIPE_SECRET_KEY!;
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("payment_method_types[0]", "card");
    params.append("line_items[0][price_data][currency]", "gbp");
    params.append("line_items[0][price_data][product_data][name]", `Taxi Ride — ${vehicle === "mpv" ? "MPV" : "Car"}`);
    const routeDesc = stops?.length ? `${pickup} → ${stops.join(" → ")} → ${dropoff}` : `${pickup} → ${dropoff}`;
    params.append("line_items[0][price_data][product_data][description]", `${routeDesc} on ${date} at ${time}`);
    params.append("line_items[0][price_data][unit_amount]", String(Math.round(parseFloat(fare) * 100)));
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", "https://dispatch.shinecars.co.uk/api/customer-stripe/success?session_id={CHECKOUT_SESSION_ID}");
    params.append("cancel_url", "https://shinecars.co.uk");
    params.append("metadata[name]", name);
    params.append("metadata[phone]", phone);
    params.append("metadata[pickup]", pickup);
    params.append("metadata[dropoff]", dropoff);
    params.append("metadata[date]", date);
    params.append("metadata[time]", time);
    params.append("metadata[distance]", String(distance || 0));
    params.append("metadata[fare]", String(fare));
    params.append("metadata[vehicle]", vehicle || "car");
    params.append("metadata[source]", "app");
    if (stops?.length) params.append("metadata[stops]", JSON.stringify(stops));
    if (pickupDetails) params.append("metadata[pickupDetails]", pickupDetails);
    if (dropoffDetails) params.append("metadata[dropoffDetails]", dropoffDetails);
    if (buildingInfo) params.append("metadata[buildingInfo]", buildingInfo);

    // Get customer ID from Bearer token
    const auth = req.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      try {
        const p = jwt.verify(auth.slice(7), SECRET) as { id: string };
        params.append("metadata[customerId]", p.id);
      } catch {}
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json();
    if (data.url) return NextResponse.json({ url: data.url });
    return NextResponse.json({ error: data.error?.message || "Stripe error" }, { status: 500 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
