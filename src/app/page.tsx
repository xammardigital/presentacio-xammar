"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, BarChart3, Star, Zap } from "lucide-react";

export default function PublicPage() {
  const presentationState = useQuery(api.presentation.getState) as any;
  const currentStep = useQuery(api.steps.get, { id: presentationState?.currentStepId ?? null }) as any;
  const vote = useMutation(api.steps.vote);

  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // Reset vote state when step changes
  useEffect(() => {
    setHasVoted(false);
    setSelectedOption(null);
  }, [presentationState?.currentStepId]);

  const handleVote = async (index: number) => {
    if (hasVoted || !presentationState?.currentStepId) return;
    
    setHasVoted(true);
    setSelectedOption(index);
    await vote({ stepId: presentationState.currentStepId, optionIndex: index });
  };

  if (!presentationState || !currentStep) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Esperando al presentador...</h2>
          <p className="text-slate-500">La presentación comenzará en breve.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-slate-100 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep._id}
          initial={{ opacity: 0, x: 20, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -20, scale: 0.98 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="w-full max-w-lg space-y-12"
        >
          {/* Header Icon */}
          <div className="flex justify-center">
            <div className={`rounded-full p-6 ${
              currentStep.type === 'BIENVENIDA' ? 'bg-amber-500/10 text-amber-500' :
              currentStep.type === 'TEXTO' ? 'bg-indigo-500/10 text-indigo-500' :
              'bg-emerald-500/10 text-emerald-500'
            }`}>
              {currentStep.type === 'BIENVENIDA' && <SmileIcon className="h-12 w-12" />}
              {currentStep.type === 'TEXTO' && <Zap className="h-12 w-12" />}
              {currentStep.type === 'ENCUESTA' && <BarChart3 className="h-12 w-12" />}
            </div>
          </div>

          <div className="text-center space-y-4">
            <h1 className="text-4xl font-black text-white sm:text-6xl tracking-tight leading-tight">
              {currentStep.title}
            </h1>
            {currentStep.content && (
              <p className="text-lg text-slate-400 sm:text-2xl font-medium leading-relaxed">
                {currentStep.content}
              </p>
            )}
          </div>

          {currentStep.type === "ENCUESTA" && currentStep.options && (
            <div className="grid gap-4 w-full">
              {currentStep.options.map((opt, i) => (
                <button
                  key={i}
                  disabled={hasVoted}
                  onClick={() => handleVote(i)}
                  className={`relative flex w-full items-center justify-between overflow-hidden rounded-2xl border-2 p-6 text-left transition-all sm:p-8 ${
                    selectedOption === i
                      ? "border-indigo-500 bg-indigo-500/20 text-white"
                      : hasVoted
                      ? "border-slate-800 bg-slate-900/40 text-slate-500 opacity-60"
                      : "border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-600 hover:bg-slate-900 active:scale-95"
                  }`}
                >
                  <span className="text-xl font-bold sm:text-2xl">{opt}</span>
                  {selectedOption === i ? (
                    <CheckCircle2 className="h-6 w-6 text-indigo-400 shrink-0" />
                  ) : (
                    <ChevronRight className={`h-6 w-6 shrink-0 ${hasVoted ? 'hidden' : 'text-slate-600'}`} />
                  )}
                </button>
              ))}
              
              {hasVoted && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-center text-indigo-400 font-bold tracking-wide uppercase text-sm"
                >
                  ¡Voto registrado! Espera al siguiente paso.
                </motion.p>
              )}
            </div>
          )}

          {currentStep.type === "BIENVENIDA" && (
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="flex justify-center"
            >
              <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-6 py-3 text-sm font-bold text-slate-400">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                Interactúa en tiempo real
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <footer className="fixed bottom-8 text-xs font-mono uppercase tracking-[0.2em] text-slate-700">
        Interactive Platform — Realtime
      </footer>
    </main>
  );
}

function SmileIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  );
}
