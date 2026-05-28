"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { Loader2, Monitor as MonitorIcon, BarChart3, Users } from "lucide-react";
import WebcamOverlay from "../components/WebcamOverlay";

const COLORS = ["#FF6B00", "#4299E1", "#48BB78", "#F6AD55"];

function getYouTubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function BackgroundAudio({ src, volume = 0.15 }: { src: string; volume?: number }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audioRef.current = audio;

    // Start with volume 0 for fade-in
    audio.volume = 0;
    
    // Play audio
    audio.play().catch((err) => {
      console.log("Audio autoplay blocked by browser or failed:", err);
    });

    // Fade in over 3 seconds (3000ms)
    // 50ms intervals -> 60 steps
    let fadeInterval: any;
    const fadeDuration = 3000;
    const intervalStep = 50;
    const steps = fadeDuration / intervalStep; // 60 steps
    const volumeStep = volume / steps;
    let currentStep = 0;

    fadeInterval = setInterval(() => {
      currentStep++;
      if (audio) {
        audio.volume = Math.min(volume, currentStep * volumeStep);
      }
      if (currentStep >= steps) {
        clearInterval(fadeInterval);
      }
    }, intervalStep);

    return () => {
      // Cleanup on unmount (Slide change)
      // Fade out over 3 seconds (3000ms)
      clearInterval(fadeInterval);
      let fadeOutInterval: any;
      const startVolume = audio.volume;
      const fadeDuration = 3000;
      const intervalStep = 50;
      const steps = fadeDuration / intervalStep; // 60 steps
      const volumeStep = startVolume / steps;
      let currentOutStep = steps;
      const targetAudio = audio; // Capture current audio closure
      
      fadeOutInterval = setInterval(() => {
        currentOutStep--;
        if (targetAudio) {
          targetAudio.volume = Math.max(0, currentOutStep * volumeStep);
        }
        if (currentOutStep <= 0) {
          clearInterval(fadeOutInterval);
          if (targetAudio) {
            targetAudio.pause();
          }
        }
      }, intervalStep);
    };
  }, [src, volume]);

  return null; // Invisible element
}

// --- Copy Button for code blocks ---
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="copy-btn absolute top-3 right-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all duration-200"
      style={{
        background: copied ? "rgba(74, 222, 128, 0.15)" : "rgba(255,255,255,0.07)",
        border: copied ? "1px solid rgba(74, 222, 128, 0.3)" : "1px solid rgba(255,255,255,0.1)",
        color: copied ? "#4ade80" : "rgba(255,255,255,0.5)",
      }}
      title="Copiar codi"
    >
      {copied ? (
        <><Check className="h-3 w-3" /> Copiat!</>
      ) : (
        <><Copy className="h-3 w-3" /> Copiar</>
      )}
    </button>
  );
}

// --- Custom pre block wrapper with copy button ---
function PreWithCopy({ children }: { children: React.ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null);
  const [codeText, setCodeText] = useState("");

  useEffect(() => {
    if (preRef.current) {
      setCodeText(preRef.current.textContent || "");
    }
  }, [children]);

  return (
    <div className="relative group/codeblock">
      <pre ref={preRef}>{children}</pre>
      {codeText && <CopyButton text={codeText} />}
    </div>
  );
}

const customComponents = {
  pre: ({ children }: any) => <PreWithCopy>{children}</PreWithCopy>,
  img: ({ node, src, alt, ...props }: any) => {
    if (!src) return null;
    
    const isBgAudio = alt && alt.startsWith("bg-audio");
    if (isBgAudio) {
      const parts = alt.split("|");
      const volume = parseFloat(parts[1]?.trim() || "0.15");
      return <BackgroundAudio src={src} volume={volume} />;
    }
    
    const isYouTube = (alt && alt.startsWith("youtube")) || src.includes("youtube.com") || src.includes("youtu.be");
    
    if (isYouTube) {
      const videoId = getYouTubeId(src);
      if (!videoId) return <p className="text-destructive text-sm font-semibold">Enllaç de YouTube no vàlid: {src}</p>;
      
      const parts = alt ? alt.split("|") : [];
      const width = parts[1]?.trim() || "100%";
      const height = parts[2]?.trim() || "aspect-video";
      const position = parts[3]?.trim() || "center";
      const isFullScreen = parts[4]?.trim() === "fullscreen";
      
      if (isFullScreen) {
        return (
          <div className="absolute inset-0 w-full h-full z-40 bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0`}
              title={alt || "YouTube video"}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        );
      }
      
      // Setup position styles
      let alignClass = "mx-auto";
      if (position === "left") alignClass = "mr-auto ml-0";
      if (position === "right") alignClass = "ml-auto mr-0";
      
      // Setup height style
      const heightStyle = height.endsWith("px") || height.endsWith("vh") || height.endsWith("%") || height.endsWith("rem")
        ? { height }
        : height === "aspect-video" ? {} : { height: `${height}px` };
        
      const heightClass = height === "aspect-video" ? "aspect-video w-full" : "w-full";
      
      return (
        <div className="my-6 flex w-full">
          <div 
            style={{ 
              width: width.endsWith("%") || width.endsWith("px") || width.endsWith("vw") || width.endsWith("rem") ? width : `${width}px`, 
              ...heightStyle 
            }}
            className={`overflow-hidden rounded-2xl shadow-2xl border border-white/10 ${alignClass} ${heightClass}`}
          >
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0`}
              title={alt || "YouTube video"}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      );
    }
    
    // Fallback to standard image
    return (
      <img 
        src={src} 
        alt={alt || ""} 
        {...props} 
        style={{ maxWidth: "90%", maxHeight: "50vh" }}
        className="mx-auto rounded-2xl shadow-2xl border border-white/5 object-contain my-6 block" 
      />
    );
  },
  a: ({ node, href, children, ...props }: any) => {
    if (href) {
      const isYouTube = href.includes("youtube.com") || href.includes("youtu.be");
      if (isYouTube) {
        const videoId = getYouTubeId(href);
        if (videoId) {
          return (
            <div className="my-6 flex w-full">
              <div 
                className="overflow-hidden rounded-2xl shadow-2xl border border-white/10 mx-auto aspect-video w-[80%] max-w-full"
              >
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0`}
                  title={typeof children === "string" ? children : "YouTube video"}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          );
        }
      }
    }
    
    return (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer" 
        {...props} 
        className="text-[#FF6B00] underline font-medium hover:text-[#FF8C33] transition-colors"
      >
        {children}
      </a>
    );
  }
};

const pulseVariants = {
  animate: {
    scale: [1, 1.08, 1],
    rotate: [0, -4, 4, -4, 4, 0],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      repeatType: "loop" as const,
      ease: "easeInOut" as const
    }
  }
};

const rippleVariants = {
  animate: {
    scale: [1, 1.5],
    opacity: [0.6, 0],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      ease: "easeOut" as const
    }
  }
};

export default function PresenterPage() {
  const state = useQuery(api.presentation.getState);
  
  // Current slide being projected
  const slides = useQuery(api.slides.list, state?.activePresentationId ? { presentationId: state.activePresentationId } : "skip") || [];
  
  // Find the active slide instantly from the already synced local array
  const slide = slides.find((s) => s._id === state?.activeSlideId);
  
  // Smooth out loading flickers: keep previous slide visible while fetching new one
  const [displaySlide, setDisplaySlide] = useState<any>(null);

  useEffect(() => {
    if (slide) {
      setDisplaySlide(slide);
    }
  }, [slide]);
  
  // Current interactive step active for the audience
  const activeStep = useQuery(api.steps.get, { 
    id: state?.currentStepId ?? null 
  });

  // Fetch step linked to the currently displayed slide
  const slideStep = useQuery(api.steps.get, { 
    id: displaySlide?.linkedStepId ?? null 
  });
  
  const setActiveSlide = useMutation(api.slides.setActive);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  // Dynamic scaling calculations to fit screen at 16:9 (1600x900)
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const baseWidth = 1600;
      const baseHeight = 900;
      const scaleX = window.innerWidth / baseWidth;
      const scaleY = window.innerHeight / baseHeight;
      // We want to fit the entire slide canvas inside the viewport boundaries
      setScale(Math.min(scaleX, scaleY));
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleToken = () => {
      const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken");
      setAdminToken(token);
    };
    handleToken();
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
      <div className="flex h-screen items-center justify-center bg-[#07090E]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  if (!state?.activeSlideId || !displaySlide) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#07090E] p-12 text-center text-white font-sans">
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           className="space-y-8"
        >
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-3xl bg-white/5 border border-white/10 text-[#FF6B00]">
                <MonitorIcon size={48} />
            </div>
            <div className="space-y-2">
                <h1 className="text-4xl font-bold font-display tracking-tight text-white">Xammar Digital</h1>
                <p className="text-xl text-white/40 font-light">Esperant que comenci la presentació...</p>
            </div>
        </motion.div>
      </div>
    );
  }

  const totalVotes = activeStep?.votes?.reduce((a, b) => a + b, 0) || 0;
  const showPollOverlay = activeStep?.type === "ENCUESTA" && totalVotes > 0;
  
  // Calculate index of option with the highest votes to highlight the winner
  const maxVotesIndex = activeStep?.votes ? activeStep.votes.indexOf(Math.max(...activeStep.votes)) : -1;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#07090E] text-white relative flex items-center justify-center select-none font-sans">
      
      {/* Aspect-ratio constrained Slide Canvas */}
      <AnimatePresence mode="wait">
        <motion.div
          key={displaySlide._id}
          initial={{ opacity: 0, scale: scale * 0.98 }}
          animate={{ opacity: 1, scale: scale }}
          exit={{ opacity: 0, scale: scale * 0.98 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: "1600px",
            height: "900px",
            transformOrigin: "center center",
          }}
          className="flex flex-col items-center justify-center p-16 text-center shrink-0 relative"
        >
          <div 
            style={{ fontSize: `${displaySlide.fontScale * 1.3}rem` }}
            className="w-[1400px] max-h-[750px] overflow-y-auto presenter-markdown select-text scrollbar-thin"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={customComponents}>
              {displaySlide.markdownContent}
            </ReactMarkdown>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Poll Overlay Window (Rendered cleanly as HUD relative to the main window) */}
      <AnimatePresence>
        {showPollOverlay && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            className="absolute bottom-16 right-10 z-50 w-96 overflow-hidden rounded-3xl border border-white/10 bg-[#0B0F19]/90 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/5 border border-white/10 p-2 text-[#FF6B00]">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-white/40">Resultats Live</h3>
                    <p className="line-clamp-1 text-xs font-semibold text-white/80">{activeStep?.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-bold text-white/80">
                <Users className="h-3 w-3" />
                {totalVotes}
              </div>
            </div>

            <div className="h-44 w-full">
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
                  <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={12}>
                    {activeStep?.options?.map((_, index) => {
                      const isWinner = index === maxVotesIndex && (activeStep?.votes?.[index] ?? 0) > 0;
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={isWinner ? "#FF6B00" : "rgba(255, 255, 255, 0.15)"} 
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 flex justify-between gap-2 border-t border-white/5 pt-4">
                {activeStep?.options?.map((opt, i) => {
                    const isWinner = i === maxVotesIndex && (activeStep?.votes?.[i] ?? 0) > 0;
                    return (
                      <div key={i} className="flex flex-col items-center gap-1">
                          <div 
                            className="h-1 w-6 rounded-full transition-colors" 
                            style={{ backgroundColor: isWinner ? "#FF6B00" : "rgba(255, 255, 255, 0.15)" }} 
                          />
                          <span className={`text-[10px] font-bold ${isWinner ? "text-[#FF6B00]" : "text-white/40"}`}>
                               {totalVotes > 0 ? Math.round(((activeStep?.votes?.[i] ?? 0) / totalVotes) * 100) : 0}%
                          </span>
                      </div>
                    );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Poll Indicator in Bottom Left */}
      <AnimatePresence>
        {slideStep?.type === "ENCUESTA" && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-12 left-10 z-40 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0B0F19]/90 px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
          >
            {/* Pulsing ring indicator */}
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-[#FF6B00]">
              <motion.div
                variants={pulseVariants}
                animate="animate"
                className="z-10"
              >
                <BarChart3 className="h-5 w-5" />
              </motion.div>
              {/* Outer Ripple ring */}
              <motion.div
                variants={rippleVariants}
                animate="animate"
                className="absolute inset-0 rounded-xl bg-[#FF6B00]/20"
              />
            </div>
            
            <div className="text-left font-display">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B00] animate-pulse">Enquesta en marxa</span>
              <p className="max-w-[200px] truncate text-xs font-semibold text-white/80 leading-tight">
                {slideStep?.title || "S'esperen respostes"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brand Watermark (Sleek minimalist monochrome top right) */}
      <div className="absolute top-10 right-10 opacity-20">
          <h2 className="text-lg font-bold font-display text-white tracking-widest uppercase">Xammar Digital</h2>
      </div>

      {/* Progress Bar (Extremely thin and elegant at the very bottom) */}
      <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full">
         <motion.div 
            className="h-full bg-[#FF6B00] shadow-[0_0_12px_rgba(255,107,0,0.4)]"
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
            <span className="hidden opacity-0 group-hover:block transition-all text-[10px] uppercase tracking-wider">Control actiu: Fletxes (← / →) per navegar</span>
            <div className="h-1.5 w-1.5 rounded-full bg-[#FF6B00]/60 animate-pulse" />
        </div>
      )}

      {/* Webcam overlay */}
      {state && state.activePresentationId && (
        <WebcamOverlay
          presentationId={state.activePresentationId}
          webcamActive={state.webcamActive ?? false}
          activeSpeakerId={state.activeSpeakerId ?? null}
        />
      )}

      {/* Minimalist Premium Slide Styles (Forcing brand typography and strict white & black palette with selective orange accents) */}
      <style jsx global>{`
        .presenter-markdown {
          line-height: 1.5;
          max-width: 100%;
          overflow-x: hidden;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .presenter-markdown h1 {
          font-family: var(--font-funnel-display);
          color: #FFFFFF;
          font-weight: 800;
          font-size: 2.2em;
          margin-bottom: 0.6em;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }
        .presenter-markdown h2 {
          font-family: var(--font-funnel-display);
          color: #FFFFFF;
          font-weight: 700;
          font-size: 2em;
          margin-bottom: 0.5em;
          line-height: 1.15;
          letter-spacing: -0.01em;
        }
        .presenter-markdown h3 {
          font-family: var(--font-funnel-display);
          color: #FFFFFF;
          font-weight: 600;
          font-size: 1.8em;
          margin-bottom: 0.4em;
          line-height: 1.2;
        }
        .presenter-markdown h4, 
        .presenter-markdown h5, 
        .presenter-markdown h6 {
          font-family: var(--font-funnel-display);
          color: rgba(255, 255, 255, 0.9);
          font-weight: 600;
          font-size: 1.5em;
          margin-bottom: 0.4em;
        }
        .presenter-markdown p {
          margin-bottom: 1em;
          color: rgba(255, 255, 255, 0.85);
          font-family: var(--font-funnel-sans);
          line-height: 1.6;
        }
        .presenter-markdown strong {
          color: #FF6B00; /* Orange restricted key accent */
          font-weight: 700;
        }
        .presenter-markdown code {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.85em;
          color: #FF6B00; /* Muted orange on inline code elements */
          font-family: var(--font-mono);
          white-space: pre-wrap;
          word-break: break-word;
          overflow-wrap: break-word;
          max-width: 100%;
        }
        .presenter-markdown pre {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 1.25rem;
          padding-top: 2.5rem; /* extra top space for the copy button */
          border-radius: 0.75rem;
          margin: 1.5rem 0;
          text-align: left;
          max-width: 100%;
          width: 100%;
          box-sizing: border-box;
          white-space: pre-wrap;
          word-break: break-word;
          overflow-wrap: break-word;
          overflow-x: hidden;
          position: relative;
        }
        .copy-btn {
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .copy-btn:hover {
          opacity: 1;
        }
        .presenter-markdown pre code {
          background: transparent;
          border: none;
          padding: 0;
          color: rgba(255, 255, 255, 0.9);
          white-space: pre-wrap;
          word-break: break-word;
          overflow-wrap: break-word;
          display: block;
        }
        .presenter-markdown ul {
          display: block;
          width: fit-content;
          margin: 1.2em auto;
          text-align: left;
          list-style-type: disc;
          padding-left: 2em;
        }
        .presenter-markdown ol {
          display: block;
          width: fit-content;
          margin: 1.2em auto;
          text-align: left;
          list-style-type: decimal;
          padding-left: 2em;
        }
        .presenter-markdown li {
          margin-bottom: 0.6em;
          padding-left: 0.5em;
          color: rgba(255, 255, 255, 0.85);
          font-family: var(--font-funnel-sans);
        }
        .presenter-markdown li::marker {
          color: #FF6B00; /* Restricted orange brand marker */
          font-weight: bold;
        }
        .presenter-markdown img {
          max-width: 85%;
          max-height: 480px;
          margin: 2em auto;
          display: block;
          border-radius: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 30px 60px rgba(0,0,0,0.5);
          object-fit: contain;
          background: rgba(255, 255, 255, 0.02);
        }
        .presenter-markdown table {
          width: 90%;
          margin: 2em auto;
          border-collapse: separate;
          border-spacing: 0;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 1.25rem;
          overflow: hidden;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(8px);
        }
        .presenter-markdown th {
          background: rgba(255, 255, 255, 0.06);
          color: #FF6B00;
          font-family: var(--font-funnel-display);
          font-weight: 700;
          font-size: 1.1em;
          padding: 1.25rem 1.5rem;
          text-align: center;
          border-bottom: 2px solid rgba(255, 107, 0, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .presenter-markdown td {
          padding: 1.25rem 1.5rem;
          color: rgba(255, 255, 255, 0.85);
          font-family: var(--font-funnel-sans);
          line-height: 1.5;
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .presenter-markdown tr:last-child td {
          border-bottom: none;
        }
        .presenter-markdown tr:nth-child(even) {
          background: rgba(255, 255, 255, 0.015);
        }
        .presenter-markdown tr:hover td {
          background: rgba(255, 107, 0, 0.03);
          color: #fff;
          transition: all 0.2s ease;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 5px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 107, 0, 0.3);
        }
      `}</style>
    </div>
  );
}
