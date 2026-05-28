import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { presentationId, role, viewerName, viewerId } = body;

    if (!presentationId) {
      return NextResponse.json(
        { success: false, error: "Falta el presentationId" },
        { status: 400 }
      );
    }

    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        missingApiKey: true,
        error: "DAILY_API_KEY no está configurada en las variables de entorno. Para activar las funciones de vídeo, añade esta clave en Vercel o en tu .env.local."
      });
    }

    const roomName = `xammar-presentation-${presentationId}`;

    // 1. Check if the room exists on Daily.co
    let roomExists = false;
    let roomData: any = null;
    
    const roomCheckResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (roomCheckResponse.ok) {
      roomExists = true;
      roomData = await roomCheckResponse.json();
    }

    // 2. If it doesn't exist, create it
    if (!roomExists) {
      const roomCreateResponse = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: roomName,
          properties: {
            exp: Math.floor(Date.now() / 1000) + 86400, // Expires in 24 hours
            enable_chat: false,
            enable_people_ui: false,
            start_video_off: true,
            start_audio_off: true,
          },
        }),
      });

      if (!roomCreateResponse.ok) {
        const errorData = await roomCreateResponse.json();
        return NextResponse.json(
          { success: false, error: "Error al crear la sala de vídeo: " + JSON.stringify(errorData) },
          { status: 500 }
        );
      }
      roomData = await roomCreateResponse.json();
    }

    // 3. Generate a Meeting Token with appropriate permissions based on role
    const isOwner = role === "admin";
    const isInteractiveViewer = role === "interactive"; // Audience Q&A speaker

    // Define room properties
    const tokenProperties: Record<string, any> = {
      room_name: roomName,
      is_owner: isOwner,
      user_name: isOwner ? "Presentador (Admin)" : (viewerName || "Espectador"),
      // Silence everyone initially to avoid microphone noise or echo issues
      start_video_off: !isOwner && !isInteractiveViewer,
      start_audio_off: true,
    };

    // If viewer name / ID is provided, bind it
    if (viewerId) {
      tokenProperties.user_id = viewerId;
    }

    const tokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: tokenProperties,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      return NextResponse.json(
        { success: false, error: "Error al generar el token de acceso: " + JSON.stringify(errorData) },
        { status: 500 }
      );
    }

    const tokenData = await tokenResponse.json();

    return NextResponse.json({
      success: true,
      token: tokenData.token,
      roomUrl: roomData?.url || `https://api.daily.co/${roomName}`,
      roomName: roomName,
    });
  } catch (error: any) {
    console.error("Video Token API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
