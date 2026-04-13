"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function PresenterPage() {
  const state = useQuery(api.presentation.getState);
  const slides = useQuery(api.slides.list) || [];
  const slide = useQuery(api.slides.getById, { 
    id: state?.activeSlideId ?? null 
  });
  
  const setActiveSlide = useMutation(api.slides.setActive);
  
  const [adminToken, setAdminToken] = useState<string | null>(null);

  useEffect(() => {
    // Check both session and local storage just in case
    const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken");
    setAdminToken(token);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!adminToken || slides.length === 0 || !state?.activeSlideId) return;

      const currentIndex = slides.findIndex((s) => s._id === state.activeSlideId);
      if (currentIndex === -1) return;

      if (e.key === "ArrowRight" && currentIndex < slides.length - 1) {
        setActiveSlide({ 
            id: slides[currentIndex + 1]._id, 
            adminToken 
        });
      } else if (e.key === "ArrowLeft" && currentIndex > 0) {
        setActiveSlide({ 
            id: slides[currentIndex - 1]._id, 
            adminToken 
        });
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

  if (!state?.activeSlideId || !slide) {
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

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#1A365D] text-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide._id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-full w-full flex-col items-center justify-center p-24 text-center"
        >
          <div 
            style={{ fontSize: `${slide.fontScale}clamp(1.2rem, 1.6vw, 2rem)` }} 
            className="w-[calc(100vw-100px)] max-h-[80vh] overflow-y-auto presenter-markdown"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {slide.markdownContent}
            </ReactMarkdown>
          </div>
        </motion.div>
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
                width: `${((slides.findIndex(s => s._id === slide._id) + 1) / slides.length) * 100}%` 
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
          font-size: 2.5em;
          margin-bottom: 0.4em;
          line-height: 1.1;
        }
        .presenter-markdown h2 {
          font-family: var(--font-funnel-display);
          color: #FF6B00;
          font-weight: 700;
          font-size: 1.8em;
          margin-bottom: 0.4em;
          line-height: 1.15;
        }
        .presenter-markdown h3 {
          font-family: var(--font-funnel-display);
          color: #FF6B00;
          font-weight: 600;
          font-size: 1.3em;
          margin-bottom: 0.3em;
          line-height: 1.2;
        }
        .presenter-markdown h4 {
          font-family: var(--font-funnel-display);
          color: #FF6B00;
          font-weight: 600;
          font-size: 1.1em;
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

function MonitorIcon({ size = 24 }: { size?: number }) {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        >
            <rect width="20" height="14" x="2" y="3" rx="2" />
            <line x1="8" x2="16" y1="21" y2="21" />
            <line x1="12" x2="12" y1="17" y2="21" />
        </svg>
    )
}
