import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { sendCustomerPushNotification } from "@/lib/sendCustomerNotification";

const JWT_SECRET = process.env.JWT_SECRET || "shine-cars-dispatch-secret-2024";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as { id: string };
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ success: false, message: "Missing bookingId" }, { status: 400 });
    }

    // Record the bid attempt regardless of outcome
    await prisma.bid.create({
      data: { bookingId, driverId: decoded.id, isWinner: false },
    });

    // Atomic lock: only succeeds if booking is still open-bid with no driver
    const result = await prisma.booking.updateMany({
      where: {
        id: bookingId,
        isOpenBid: true,
        status: "open-bid",
        driverId: null,
      },
      data: {
        driverId: decoded.id,
        status: "assigned",
        assignedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return NextResponse.json({
        success: false,
        message: "Job already accepted by another driver.",
      });
    }

    // Mark this bid as winner
    await prisma.bid.updateMany({
      where: { bookingId, driverId: decoded.id },
      data: { isWinner: true },
    });

    // Notify customer about assignment
    sendCustomerPushNotification(bookingId, "assigned");

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    return NextResponse.json({ success: true, booking });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to place bid" }, { status: 500 });
  }
}
