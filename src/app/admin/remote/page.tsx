"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Monitor, LogOut, ArrowLeft } from "lucide-react";
import Link from "next/link";

const ADMIN_TOKEN_KEY = "adminToken";

export default function RemoteControlPage() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
    setAdminToken(token);
  }, []);

  const slides = useQuery(api.slides.list) || [];
  const presentationState = useQuery(api.presentation.getState);
  const setActiveSlide = useMutation(api.slides.setActive);

  const activeIndex = slides.findIndex((s: any) => s._id === presentationState?.activeSlideId);
  const canGoPrev = activeIndex > 0;
  const canGoNext = slides.length > 0 && activeIndex < slides.length - 1;

  const handleActivate = async (id: any) => {
    try {
      await setActiveSlide({ id, adminToken: adminToken || "" });
      // Feel free to add haptic feedback if the device supports it
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (error) {
      alert("Error al canviar de diapositiva");
    }
  };

  const goPrev = () => {
    if (canGoPrev) handleActivate(slides[activeIndex - 1]._id);
  };

  const goNext = () => {
    if (activeIndex === -1 && slides.length > 0) {
      handleActivate(slides[0]._id); // Start presentation if not started
    } else if (canGoNext) {
      handleActivate(slides[activeIndex + 1]._id);
    }
  };

  if (!isMounted) return null;
  if (!adminToken) return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-4">
        <p>Inicia sessió al panell principal primer.</p>
        <Link href="/admin" className="block text-primary underline">Anar al Login</Link>
      </div>
    </div>
  );

  const activeSlide = activeIndex !== -1 ? slides[activeIndex] : null;

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <Link href="/admin/slides" className="rounded-full bg-secondary p-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold font-display text-lg">Comandament</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${activeSlide ? "animate-pulse bg-green-500" : "bg-muted-foreground"}`} />
          <span className="text-xs font-medium text-muted-foreground">
            {activeIndex !== -1 ? `Slide ${activeIndex + 1} de ${slides.length}` : "En espera"}
          </span>
        </div>
      </header>

      {/* Main Remote Area */}
      <main className="flex-1 flex flex-col p-4 gap-4">
        {/* Current Slide Info / Teleprompter */}
        <div className="flex-1 rounded-3xl border border-border bg-card/30 p-6 flex flex-col justify-center items-center text-center">
          {activeSlide ? (
            <>
              <h2 className="text-2xl font-bold mb-2">
                {activeSlide.internalTitle || "Diapositiva sense títol"}
              </h2>
              {activeSlide.linkedStepId && (
                <div className="mt-4 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-bold animate-pulse">
                  Interacció Activa
                </div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground flex flex-col items-center">
              <Monitor className="h-10 w-10 mb-2 opacity-50" />
              <p>Cap diapositiva activa.</p>
              <p className="text-sm mt-1">Prem endavant per començar.</p>
            </div>
          )}
        </div>

        {/* Big Buttons Configuration */}
        <div className="h-64 sm:h-72 flex gap-4">
          <button
            onClick={goPrev}
            disabled={!canGoPrev}
            className="flex-1 bg-secondary hover:bg-secondary/80 disabled:opacity-30 disabled:hover:bg-secondary active:scale-[0.98] transition-all rounded-3xl flex items-center justify-center"
            aria-label="Diapositiva Anterior"
          >
            <ChevronLeft className="h-20 w-20 text-foreground opacity-50" />
          </button>

          <button
            onClick={goNext}
            disabled={activeIndex !== -1 && !canGoNext}
            className="flex-[2] bg-primary hover:opacity-90 disabled:opacity-50 active:scale-[0.98] transition-all rounded-3xl flex items-center justify-center shadow-lg shadow-primary/20"
            aria-label="Següent Diapositiva"
          >
            <ChevronRight className="h-24 w-24 text-white" />
          </button>
        </div>
      </main>
    </div>
  );
}
