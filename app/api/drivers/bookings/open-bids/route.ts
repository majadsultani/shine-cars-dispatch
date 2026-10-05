import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "shine-cars-dispatch-secret-2024";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    jwt.verify(auth.slice(7), JWT_SECRET) as { id: string };

    const bookings = await prisma.booking.findMany({
      where: {
        isOpenBid: true,
        status: "open-bid",
        driverId: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        bids: {
          select: { driverId: true },
        },
      },
    });

    return NextResponse.json({ success: true, bookings });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to fetch open bids" }, { status: 500 });
  }
}
