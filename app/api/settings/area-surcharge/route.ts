import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULTS = { radiusMiles: 3, perMile: 1 };

export async function GET() {
  const [radius, rate] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: "surchargeRadiusMiles" } }),
    prisma.siteSetting.findUnique({ where: { key: "surchargePerMile" } }),
  ]);
  return NextResponse.json({
    radiusMiles: radius ? Number(radius.value) : DEFAULTS.radiusMiles,
    perMile: rate ? Number(rate.value) : DEFAULTS.perMile,
  });
}

export async function PATCH(req: Request) {
  const { radiusMiles, perMile } = await req.json();
  if (radiusMiles !== undefined) {
    await prisma.siteSetting.upsert({
      where: { key: "surchargeRadiusMiles" },
      update: { value: String(radiusMiles) },
      create: { key: "surchargeRadiusMiles", value: String(radiusMiles) },
    });
  }
  if (perMile !== undefined) {
    await prisma.siteSetting.upsert({
      where: { key: "surchargePerMile" },
      update: { value: String(perMile) },
      create: { key: "surchargePerMile", value: String(perMile) },
    });
  }
  return NextResponse.json({
    radiusMiles: radiusMiles ?? DEFAULTS.radiusMiles,
    perMile: perMile ?? DEFAULTS.perMile,
  });
}
