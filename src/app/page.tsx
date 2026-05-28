"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, BarChart3, Star, Zap, Video, Mic, MicOff, Loader2, X, Smile } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RichText } from "@/components/RichText";

export default function PublicPage() {
  const presentationState = useQuery(api.presentation.getState) as any;
  const currentStep = useQuery(api.steps.get, { id: presentationState?.currentStepId ?? null }) as any;
  const vote = useMutation(api.steps.vote);

  // Q&A Mutations
  const requestToSpeakMutation = useMutation(api.presentation.requestToSpeak);
  const updateQnaStatusMutation = useMutation(api.presentation.updateQnaStatus);
  const qnaQueue = useQuery(
    api.presentation.getQnaQueue,
    presentationState?.activePresentationId ? { presentationId: presentationState.activePresentationId as any } : "skip"
  ) || [];

  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // Audience Q&A Local States
  const [viewerId, setViewerId] = useState("");
  const [viewerName, setViewerName] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [isSubmittingQna, setIsSubmittingQna] = useState(false);
  const [mobileCallObject, setMobileCallObject] = useState<any>(null);
  const [mobileStream, setMobileStream] = useState<MediaStream | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [mobileVideoError, setMobileVideoError] = useState<string | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);

  // Generate unique persistent viewerId
  useEffect(() => {
    let vid = localStorage.getItem("xammar-viewer-id");
    if (!vid) {
      vid = "v-" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("xammar-viewer-id", vid);
    }
    setViewerId(vid);

    const savedName = localStorage.getItem("xammar-viewer-name");
    if (savedName) {
      setViewerName(savedName);
    }
  }, []);

  // Sync mobile local video element with media stream
  useEffect(() => {
    if (mobileStream && mobileVideoRef.current) {
      mobileVideoRef.current.srcObject = mobileStream;
    }
  }, [mobileStream]);

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

  // Find my current active request in the queue
  const myQnaRequest = qnaQueue.find((q: any) => q.viewerId === viewerId && q.status !== "FINISHED");
  const myQnaStatus = myQnaRequest?.status ?? null; // "PENDING" | "SPEAKING" | null

  // Monitor if the presenter granted us speaker access in real time
  useEffect(() => {
    if (myQnaStatus === "SPEAKING" && !isBroadcasting) {
      startMobileBroadcasting();
    } else if (myQnaStatus !== "SPEAKING" && isBroadcasting) {
      stopMobileBroadcasting();
    }
  }, [myQnaStatus, isBroadcasting]);

  // Raise hand (send request to Convex)
  const handleRequestQna = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewerName.trim() || !presentationState?.activePresentationId) return;
    
    setIsSubmittingQna(true);
    localStorage.setItem("xammar-viewer-name", viewerName.trim());
    
    try {
      await requestToSpeakMutation({
        presentationId: presentationState.activePresentationId,
        viewerId,
        viewerName: viewerName.trim(),
      });
      setShowNameModal(false);
    } catch (err: any) {
      alert("Error al pedir turno: " + err.message);
    } finally {
      setIsSubmittingQna(false);
    }
  };

  // Cancel Q&A request or finish speaking voluntarily
  const handleCancelQna = async () => {
    if (myQnaRequest) {
      try {
        await updateQnaStatusMutation({
          requestId: myQnaRequest._id,
          status: "FINISHED",
          adminToken: "bypass", // Allow open participant self-finish
        });
        stopMobileBroadcasting();
      } catch (err) {
        console.error("Error cancelling request:", err);
      }
    }
  };

  // Initialize camera and publish stream to Daily.co
  const startMobileBroadcasting = async () => {
    try {
      setMobileVideoError(null);
      setIsBroadcasting(true);

      // Get camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });

      setMobileStream(stream);

      const roomUrl = "https://xammardigital.daily.co/4XvgrpD8t4sYDCqH4861";

      // Import Daily dynamically
      const DailyIframe = (await import("@daily-co/daily-js")).default;

      const call = DailyIframe.createCallObject({
        subscribeToTracksAutomatically: false, // We only publish, no need to subscribe to others
      });

      setMobileCallObject(call);

      call.on("error", (e: any) => {
        console.error("Daily Mobile Error:", e);
        setMobileVideoError("Error de conexión");
      });

      await call.join({
        url: roomUrl,
      });

      // Enable local devices in Daily room
      await call.setLocalVideo(true);
      await call.setLocalAudio(true);

    } catch (err: any) {
      console.error("Error starting mobile camera:", err);
      setMobileVideoError(err.message || "Permiso de cámara/micrófono denegado.");
      setIsBroadcasting(false);
      if (mobileStream) {
        mobileStream.getTracks().forEach(t => t.stop());
        setMobileStream(null);
      }
    }
  };

  // Stop mobile camera and disconnect
  const stopMobileBroadcasting = () => {
    if (mobileCallObject) {
      try {
        mobileCallObject.leave().then(() => mobileCallObject.destroy());
      } catch (e) {
        console.error(e);
      }
      setMobileCallObject(null);
    }
    if (mobileStream) {
      mobileStream.getTracks().forEach(track => track.stop());
      setMobileStream(null);
    }
    setIsBroadcasting(false);
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (mobileStream) {
        mobileStream.getTracks().forEach(track => track.stop());
      }
      if (mobileCallObject) {
        mobileCallObject.leave().then(() => mobileCallObject.destroy()).catch((e: any) => console.log(e));
      }
    };
  }, [mobileStream, mobileCallObject]);

  if (!presentationState || !currentStep) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-12 text-center text-foreground">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-8"
        >
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-secondary text-primary">
            <Zap className="h-12 w-12" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-bold font-display tracking-tight text-secondary-foreground">Xammar Digital</h2>
            <div className="flex items-center justify-center gap-2 text-muted-foreground bg-secondary/50 px-4 py-2 rounded-full">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <p className="text-sm font-bold tracking-wide uppercase">Connectat. Esperant el següent pas...</p>
            </div>
          </div>
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

      {/* --- MOBILE Q&A FLOATING BOARD --- */}
      <AnimatePresence>
        {presentationState?.qnaEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="w-full max-w-lg mt-8 border border-border/80 bg-card/60 backdrop-blur-md rounded-3xl p-5 text-center shadow-lg relative overflow-hidden"
          >
            {/* 1. Requesting Turn (Not yet raised hand) */}
            {!myQnaStatus && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground uppercase font-bold tracking-wider">
                  <Mic className="w-4 h-4 text-primary animate-pulse" />
                  <span>El presentador ha obert les preguntes</span>
                </div>
                <button
                  onClick={() => setShowNameModal(true)}
                  className="w-full rounded-2xl bg-primary hover:opacity-95 font-bold font-display text-white py-3.5 text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/10 active:scale-95 transition-all"
                >
                  <Video className="w-4.5 h-4.5" />
                  PREGUNTAR EN DIRECTE (VÍDEO)
                </button>
              </div>
            )}

            {/* 2. Hand Raised & Pending (Waiting for admin approval) */}
            {myQnaStatus === "PENDING" && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-xs text-amber-500 uppercase font-bold tracking-wider animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  <span>Cua d'espera activa</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  Has demanat el torn, <strong>{viewerName}</strong>. Espera que el presentador et doni pas en breu...
                </p>
                <button
                  onClick={handleCancelQna}
                  className="w-full rounded-2xl bg-secondary hover:bg-secondary-foreground/10 text-muted-foreground hover:text-foreground font-semibold py-2.5 text-xs transition-colors"
                >
                  Cancel·lar petició
                </button>
              </div>
            )}

            {/* 3. Speaking in live (granted by admin) */}
            {myQnaStatus === "SPEAKING" && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-xs text-emerald-500 uppercase font-bold tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>ESTÀS EMITINT EN DIRECTE</span>
                </div>
                
                <p className="text-xs text-muted-foreground">La teva càmera i micròfon estan actius al projector.</p>

                {/* Local smartphone video preview */}
                <div className="relative aspect-video max-w-[240px] mx-auto bg-black rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-md">
                  <video
                    ref={mobileVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {mobileVideoError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 p-2 text-center text-[10px] text-rose-500 font-semibold">
                      ⚠️ {mobileVideoError}
                    </div>
                  )}
                  {!mobileStream && !mobileVideoError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-xs text-white/30">
                      Iniciant càmera...
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCancelQna}
                  className="w-full rounded-2xl bg-rose-500 hover:bg-rose-600 font-bold font-display text-white py-3.5 text-sm shadow-md shadow-rose-500/10 active:scale-95 transition-all"
                >
                  FINALITZAR PREGUNTA
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- NAME REGISTRATION MODAL POPUP --- */}
      <AnimatePresence>
        {showNameModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm bg-card border border-border/80 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-bold font-display text-secondary-foreground">Demanar torn de paraula</h3>
                <button 
                  onClick={() => setShowNameModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRequestQna} className="space-y-4">
                <div className="space-y-2 text-left">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Com et dius?</label>
                  <input
                    value={viewerName}
                    onChange={(e) => setViewerName(e.target.value)}
                    placeholder="Escriu el teu nom"
                    className="w-full rounded-2xl border border-border bg-background p-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 transition-all font-semibold"
                    required
                    maxLength={30}
                    autoFocus
                  />
                  <p className="text-[10px] text-muted-foreground font-light">Aquest nom apareixerà al projector de la presentació.</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNameModal(false)}
                    className="flex-1 rounded-2xl bg-secondary text-foreground font-semibold py-3 hover:bg-secondary/80 transition-colors text-sm"
                  >
                    Cancel·lar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingQna || !viewerName.trim()}
                    className="flex-1 rounded-2xl bg-primary text-white font-bold font-display py-3 hover:opacity-95 shadow-md shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-1.5"
                  >
                    {isSubmittingQna ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar petició"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
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
