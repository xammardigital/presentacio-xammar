import { NextRequest, NextResponse } from "next/server";

// Temporary debug endpoint – remove after diagnosis
export async function GET(req: NextRequest) {
  const hasToken = !!process.env.ADMIN_TOKEN;
  const tokenLength = process.env.ADMIN_TOKEN?.length ?? 0;
  return NextResponse.json({ hasToken, tokenLength });
}
