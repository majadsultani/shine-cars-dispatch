import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const SECRET = process.env.CUSTOMER_JWT_SECRET || "shine-cars-customer-secret-2024";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let customerId: string;
  try {
    const p = jwt.verify(auth.slice(7), SECRET) as { id: string };
    customerId = p.id;
  } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const { invoiceId } = await req.json();
    if (!invoiceId) return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId, customerId },
      include: { customer: { select: { name: true, companyName: true, email: true } } },
    });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (invoice.status === "paid") return NextResponse.json({ error: "Already paid" }, { status: 400 });

    const key = process.env.STRIPE_SECRET_KEY!;
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("payment_method_types[0]", "card");
    params.append("line_items[0][price_data][currency]", "gbp");
    params.append("line_items[0][price_data][product_data][name]", `Invoice #${invoice.id.slice(-6).toUpperCase()}`);
    params.append("line_items[0][price_data][product_data][description]", `${invoice.weekStart} — ${invoice.weekEnd} | ${invoice.customer?.companyName || invoice.customer?.name || "Customer"}`);
    params.append("line_items[0][price_data][unit_amount]", String(Math.round(invoice.total * 100)));
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", `https://dispatch.shinecars.co.uk/api/customer-stripe/invoice-success?session_id={CHECKOUT_SESSION_ID}`);
    params.append("cancel_url", "https://shinecars.co.uk");
    params.append("metadata[type]", "invoice");
    params.append("metadata[invoiceId]", invoice.id);
    params.append("metadata[customerId]", customerId);
    if (invoice.customer?.email) params.append("customer_email", invoice.customer.email);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await res.json();
    if (data.url) return NextResponse.json({ url: data.url });
    return NextResponse.json({ error: data.error?.message || "Stripe error" }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
