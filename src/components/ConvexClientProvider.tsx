"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0c] text-white p-6 text-center">
        <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-[#121215]/80 p-8 shadow-2xl backdrop-blur-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500 mb-6">
            <svg
              className="h-8 w-8"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold font-display tracking-tight text-white mb-2">
            Falta la variable d'entorn
          </h1>
          <p className="text-sm text-zinc-400 mb-6 font-light leading-relaxed">
            La variable d'entorn <code className="bg-zinc-800 text-zinc-200 px-1.5 py-0.5 rounded font-mono text-xs">NEXT_PUBLIC_CONVEX_URL</code> no està configurada a Vercel. 
            Això és necessari per connectar l'aplicació amb la base de dades de Convex.
          </p>
          <div className="rounded-2xl bg-zinc-800/40 p-4 border border-zinc-700/35 text-left text-xs font-mono text-zinc-300 space-y-2">
            <p className="font-semibold text-zinc-400">Com solucionar-ho:</p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] font-sans font-light text-zinc-400 leading-normal">
              <li>Vés al teu dashboard de <b>Vercel</b>.</li>
              <li>Entra a la configuració del teu projecte &gt; <b>Environment Variables</b>.</li>
              <li>Afegeix la variable amb el nom <code className="bg-zinc-800 text-zinc-300 font-mono text-[10px] px-1 rounded">NEXT_PUBLIC_CONVEX_URL</code>.</li>
              <li>Pega el valor corresponent (ex: <code className="bg-zinc-800 text-zinc-300 font-mono text-[10px] px-1 rounded">https://...convex.cloud</code>).</li>
              <li>Fes un nou desplegament (Redeploy).</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

