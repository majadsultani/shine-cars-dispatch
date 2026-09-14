import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const row = await prisma.siteSetting.findUnique({ where: { key: "incomingCallNotification" } });
  if (!row) return NextResponse.json({ call: null });

  const data = JSON.parse(row.value);
  // Only show if within last 30 seconds
  if (Date.now() - data.timestamp > 30000) return NextResponse.json({ call: null });

  return NextResponse.json({ call: data });
}

export async function DELETE() {
  await prisma.siteSetting.deleteMany({ where: { key: "incomingCallNotification" } });
  return NextResponse.json({ ok: true });
}
