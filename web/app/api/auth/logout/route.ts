import { NextRequest, NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/auth";

export async function POST(_request: NextRequest) {
  const res = NextResponse.json({ ok: true });
  clearAdminCookie(res);
  return res;
}
