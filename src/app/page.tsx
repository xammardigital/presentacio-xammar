"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, BarChart3, Star, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RichText } from "@/components/RichText";

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
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <h2 className="text-2xl font-bold text-foreground uppercase tracking-widest">Esperant al presentador...</h2>
          <p className="text-muted-foreground">La presentació començarà en breu.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start sm:justify-center bg-background p-6 py-8 text-foreground overflow-y-auto scroll-smooth">
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep._id}
          initial={{ opacity: 0, x: 20, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -20, scale: 0.98 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className={`w-full max-w-lg ${currentStep.type === 'ENCUESTA' ? 'space-y-4' : 'space-y-8'}`}
        >
          {/* Header Icon */}
          <div className="flex justify-center">
            <div className={`rounded-full p-4 ${
              currentStep.type === 'BIENVENIDA' ? 'bg-amber-500/10 text-amber-500' :
              currentStep.type === 'TEXTO' ? 'bg-primary/10 text-primary' :
              'bg-emerald-500/10 text-emerald-500'
            }`}>
              {currentStep.type === 'BIENVENIDA' && <SmileIcon className="h-8 w-8" />}
              {currentStep.type === 'TEXTO' && <Zap className="h-8 w-8" />}
              {currentStep.type === 'ENCUESTA' && <BarChart3 className="h-8 w-8" />}
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className={`${currentStep.type === 'ENCUESTA' ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'} font-bold text-secondary-foreground tracking-tight leading-tight`}>
              <RichText text={currentStep.title} />
            </h1>
            {currentStep.content && (
              <p className="text-base text-muted-foreground sm:text-xl font-medium leading-relaxed">
                <RichText text={currentStep.content} />
              </p>
            )}
          </div>

          {currentStep.type === "ENCUESTA" && currentStep.options && (
            <div className="grid gap-3 w-full">
              {currentStep.options.map((opt: string, i: number) => (
                <button
                  key={i}
                  disabled={hasVoted}
                  onClick={() => handleVote(i)}
                  className={`relative flex w-full items-center justify-between overflow-hidden rounded-2xl border-2 p-4 text-left transition-all sm:p-5 ${
                    selectedOption === i
                      ? "border-primary bg-primary/20 text-foreground"
                      : hasVoted
                      ? "border-border bg-card/40 text-muted-foreground opacity-60"
                      : "border-border bg-card/60 text-foreground hover:border-accent hover:bg-card active:scale-95"
                  }`}
                >
                  <span className="text-lg font-bold sm:text-xl"><RichText text={opt} /></span>
                  {selectedOption === i ? (
                    <CheckCircle2 className="h-5 w-5 text-indigo-400 shrink-0" />
                  ) : (
                    <ChevronRight className={`h-5 w-5 shrink-0 ${hasVoted ? 'hidden' : 'text-slate-600'}`} />
                  )}
                </button>
              ))}
              
              {hasVoted && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-center text-primary font-bold tracking-wide uppercase text-sm"
                >
                  ¡Vot registrat! Espera al següent pas.
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
              <div className="flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-bold text-muted-foreground">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                Interactua en temps real
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
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
