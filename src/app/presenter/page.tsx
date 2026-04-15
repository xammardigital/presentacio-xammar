"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { Loader2, Monitor as MonitorIcon, BarChart3, Users } from "lucide-react";

const COLORS = ["#FF6B00", "#4299E1", "#48BB78", "#F6AD55"];

export default function PresenterPage() {
  const state = useQuery(api.presentation.getState);
  
  // Current slide being projected
  const slides = useQuery(api.slides.list) || [];
  const slide = useQuery(api.slides.getById, { 
    id: state?.activeSlideId ?? null 
  });
  
  // Smooth out loading flickers: keep previous slide visible while fetching new one
  const [displaySlide, setDisplaySlide] = useState<any>(null);
  useEffect(() => {
    if (slide !== undefined) {
      setDisplaySlide(slide);
    }
  }, [slide]);
  
  // Current interactive step active for the audience
  const activeStep = useQuery(api.steps.get, { 
    id: state?.currentStepId ?? null 
  });
  
  const setActiveSlide = useMutation(api.slides.setActive);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken");
    setAdminToken(token);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!adminToken || slides.length === 0 || !state?.activeSlideId) return;
      const currentIndex = slides.findIndex((s) => s._id === state.activeSlideId);
      if (currentIndex === -1) return;

      if (e.key === "ArrowRight" && currentIndex < slides.length - 1) {
        setActiveSlide({ id: slides[currentIndex + 1]._id, adminToken });
      } else if (e.key === "ArrowLeft" && currentIndex > 0) {
        setActiveSlide({ id: slides[currentIndex - 1]._id, adminToken });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [adminToken, slides, state?.activeSlideId, setActiveSlide]);

  if (state === undefined || slides === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1A365D]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!state?.activeSlideId || !displaySlide) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#1A365D] p-12 text-center text-white">
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="space-y-8"
        >
            <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-white/10 text-[#FF6B00]">
                <MonitorIcon size={64} />
            </div>
            <div className="space-y-2">
                <h1 className="text-5xl font-bold font-display tracking-tight">Xammar Digital</h1>
                <p className="text-2xl text-white/50 font-light">Esperant que comenci la presentació...</p>
            </div>
        </motion.div>
      </div>
    );
  }

  const totalVotes = activeStep?.votes?.reduce((a, b) => a + b, 0) || 0;
  const showPollOverlay = activeStep?.type === "ENCUESTA" && totalVotes > 0;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#1A365D] text-white relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={displaySlide._id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-full w-full flex-col items-center justify-center p-24 text-center"
        >
          <div 
            style={{ fontSize: `${displaySlide.fontScale * 1.5}rem` }}
            className="w-[calc(100vw-100px)] max-h-[80vh] overflow-y-auto presenter-markdown"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {displaySlide.markdownContent}
            </ReactMarkdown>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Poll Overlay Window */}
      <AnimatePresence>
        {showPollOverlay && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="absolute bottom-24 right-10 z-50 w-96 overflow-hidden rounded-3xl border border-white/10 bg-[#1A365D]/80 p-6 shadow-2xl backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#FF6B00]/20 p-2 text-[#FF6B00]">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Resultats Live</h3>
                    <p className="line-clamp-1 text-xs font-medium text-white/80">{activeStep?.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
                <Users className="h-3 w-3" />
                {totalVotes}
              </div>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeStep?.options?.map((opt, i) => ({
                    name: opt,
                    votes: activeStep?.votes?.[i] ?? 0,
                  }))}
                  layout="vertical"
                  margin={{ left: 0, right: 30, top: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                    width={80}
                  />
                  <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={14}>
                    {activeStep?.options?.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 flex justify-between gap-2 border-t border-white/5 pt-4">
                {activeStep?.options?.map((opt, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                        <div className="h-1.5 w-6 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-[10px] font-bold text-white/40">
                             {totalVotes > 0 ? Math.round(((activeStep?.votes?.[i] ?? 0) / totalVotes) * 100) : 0}%
                        </span>
                    </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brand Watermark */}
      <div className="absolute top-10 right-10 opacity-30">
          <h2 className="text-xl font-bold font-display text-white">Xammar Digital</h2>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-2 bg-white/5 w-full">
         <motion.div 
            className="h-full bg-[#FF6B00] shadow-[0_0_20px_rgba(255,107,0,0.5)]"
            initial={false}
            animate={{ 
                width: `${((slides.findIndex(s => s._id === displaySlide._id) + 1) / (slides.length || 1)) * 100}%` 
            }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
         />
      </div>

      {/* Admin Control Badge */}
      {adminToken && (
        <div className="absolute bottom-6 right-6 text-xs text-white/30 font-display flex items-center justify-center gap-2 group">
            <span className="hidden opacity-0 group-hover:block transition-all">Control actiu: Usa les fletxes (← / →) per navegar</span>
            <div className="h-2 w-2 rounded-full bg-emerald-500/50" />
        </div>
      )}

      <style jsx global>{`
        .presenter-markdown {
          line-height: 1.4;
        }
        .presenter-markdown h1 {
          font-family: var(--font-funnel-display);
          color: #FF6B00;
          font-weight: 800;
          font-size: 2em;
          margin-bottom: 0.4em;
          line-height: 1.1;
        }
        .presenter-markdown h2 {
          font-family: var(--font-funnel-display);
          color: #FF6B00;
          font-weight: 700;
          font-size: 1.9em;
          margin-bottom: 0.4em;
          line-height: 1.15;
        }
        .presenter-markdown h3 {
          font-family: var(--font-funnel-display);
          color: #FF6B00;
          font-weight: 600;
          font-size: 1.8em;
          margin-bottom: 0.3em;
          line-height: 1.2;
        }
        .presenter-markdown h4 {
          font-family: var(--font-funnel-display);
          color: #FF6B00;
          font-weight: 600;
          font-size: 1.6em;
          margin-bottom: 0.3em;
        }
        .presenter-markdown h5 {
          font-family: var(--font-funnel-display);
          color: #FF6B00;
          font-weight: 600;
          font-size: 1.6em;
          margin-bottom: 0.3em;
        }
        .presenter-markdown h6 {
          font-family: var(--font-funnel-display);
          color: #FF6B00;
          font-weight: 600;
          font-size: 1.5em;
          margin-bottom: 0.3em;
        }
        .presenter-markdown p {
          margin-bottom: 0.8em;
          color: rgba(255, 255, 255, 0.9);
        }
        .presenter-markdown strong {
          color: #FF6B00;
          font-weight: 700;
        }
        .presenter-markdown ul {
          display: block;
          width: fit-content;
          margin: 0.8em auto;
          text-align: left;
          list-style-type: disc;
          padding-left: 1.5em;
        }
        .presenter-markdown ol {
          display: block;
          width: fit-content;
          margin: 0.8em auto;
          text-align: left;
          list-style-type: decimal;
          padding-left: 1.5em;
        }
        .presenter-markdown li {
          margin-bottom: 0.4em;
          padding-left: 0.25em;
        }
        .presenter-markdown li::marker {
          color: #FF6B00;
          font-weight: bold;
        }
        .presenter-markdown img {
          max-width: 90%;
          max-height: 50vh;
          margin: 1.5em auto;
          display: block;
          border-radius: 1rem;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
          object-fit: contain;
        }
        .presenter-markdown::-webkit-scrollbar {
          width: 6px;
        }
        .presenter-markdown::-webkit-scrollbar-track {
          background: transparent;
        }
        .presenter-markdown::-webkit-scrollbar-thumb {
          background: rgba(255, 107, 0, 0.3);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}
