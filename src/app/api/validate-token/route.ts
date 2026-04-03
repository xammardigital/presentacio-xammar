import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token } = await req.json();

  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken) {
    return NextResponse.json(
      { valid: false, error: "ADMIN_TOKEN no configurado en el servidor." },
      { status: 500 }
    );
  }

  if (token === adminToken) {
    return NextResponse.json({ valid: true });
  }

  return NextResponse.json({ valid: false, error: "Token incorrecto." }, { status: 401 });
}
