import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!openrouterApiKey) {
    return NextResponse.json(
      { success: false, error: "OPENROUTER_API_KEY no configurada al servidor." },
      { status: 500 }
    );
  }

  try {
    const { prompt, modelA, modelB } = await req.json();

    if (!prompt || !modelA) {
      return NextResponse.json(
        { success: false, error: "Falten paràmetres obligatoris: prompt i modelA." },
        { status: 400 }
      );
    }

    const executePrompt = async (model: string) => {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openrouterApiKey}`,
          "HTTP-Referer": "https://presentacio-xammar.vercel.app",
          "X-Title": "Xammar Digital IA",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Error de l'API (${response.status})`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "No s'ha obtingut cap resposta del model.";
    };

    // Execute concurrently if modelB is configured
    if (modelB) {
      const [resA, resB] = await Promise.all([
        executePrompt(modelA).catch((err) => `Error [${modelA}]: ${err.message}`),
        executePrompt(modelB).catch((err) => `Error [${modelB}]: ${err.message}`),
      ]);

      return NextResponse.json({
        success: true,
        resultA: resA,
        resultB: resB,
      });
    } else {
      const resA = await executePrompt(modelA);
      return NextResponse.json({
        success: true,
        resultA: resA,
      });
    }
  } catch (error: any) {
    console.error("OpenRouter Execution Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error intern en executar el prompt." },
      { status: 500 }
    );
  }
}
