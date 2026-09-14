import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";

const VoiceResponse = twilio.twiml.VoiceResponse;
const TWILIO_NUMBER = "+441945660700";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const from = formData.get("From") as string || "";
  const to = formData.get("To") as string || "";

  const response = new VoiceResponse();

  if (to === TWILIO_NUMBER || to === "client:dispatch-operator" || !to) {
    // Incoming call — save notification for dispatch, reject so physical phone rings
    try {
      await prisma.siteSetting.upsert({
        where: { key: "incomingCallNotification" },
        update: { value: JSON.stringify({ number: from, timestamp: Date.now() }) },
        create: { key: "incomingCallNotification", value: JSON.stringify({ number: from, timestamp: Date.now() }) },
      });
    } catch {}
    response.reject({ reason: "busy" });
  } else {
    // Outbound call from dispatcher
    const dial = response.dial({ callerId: TWILIO_NUMBER });
    dial.number(to);
  }

  return new NextResponse(response.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
