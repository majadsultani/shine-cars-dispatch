import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

function randomPassword(length = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, email, phone, companyName } = body;

    if (!name || !email || !phone || !companyName) {
      return NextResponse.json({ error: "Name, email, phone, and company name are required" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(randomPassword());

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        accountType: "company",
        companyName,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        accountType: true,
        companyName: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === "P2002") {
      return NextResponse.json({ error: "A customer with this email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
