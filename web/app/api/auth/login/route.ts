import { NextRequest, NextResponse } from "next/server";
import { setAdminCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json(
        { error: "Server is not configured" },
        { status: 500 }
      );
    }
    if (password !== adminPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    setAdminCookie(res);
    return res;
  } catch (error) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
