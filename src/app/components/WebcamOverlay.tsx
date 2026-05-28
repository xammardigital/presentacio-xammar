"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useDragControls } from "framer-motion";
import { Camera, CameraOff, GripHorizontal, Maximize2, Minimize2, Video, VolumeX, X } from "lucide-react";

interface WebcamOverlayProps {
  presentationId: string;
  webcamActive: boolean;
  activeSpeakerId?: string | null;
  qnaQueue?: any[];
}

export default function WebcamOverlay({
  presentationId,
  webcamActive,
  activeSpeakerId,
}: WebcamOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [callObject, setCallObject] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingApiKey, setMissingApiKey] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const videoElementRef = useRef<HTMLVideoElement>(null);
  const speakerVideoElementRef = useRef<HTMLVideoElement>(null);
  const dragControls = useDragControls();

  // Posición inicial por defecto (arriba a la izquierda con margen)
  const [position, setPosition] = useState({ x: 20, y: 20 });

  useEffect(() => {
    setMounted(true);
    // Recuperar última posición arrastrada del almacenamiento local si existe
    const savedPos = localStorage.getItem(`webcam-pos-${presentationId}`);
    if (savedPos) {
      try {
        setPosition(JSON.parse(savedPos));
      } catch (e) {
        console.error("Error al cargar posición de la webcam:", e);
      }
    }
  }, [presentationId]);

  // Cargar dinámicamente Daily.co y unirse a la sala si la webcam está activa
  useEffect(() => {
    if (!mounted || !webcamActive) {
      // Si el admin apaga la cámara, nos desconectamos
      if (callObject) {
        callObject.leave().then(() => {
          callObject.destroy();
        });
        setCallObject(null);
        setJoined(false);
      }
      return;
    }

    let isSubscribed = true;
    let localCallObject: any = null;

    async function initVideo() {
      try {
        setError(null);
        setMissingApiKey(false);

        // 1. Solicitar Token a nuestro backend
        const res = await fetch("/api/video/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            presentationId,
            role: "viewer", // Rol espectador pasivo
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          if (data.missingApiKey) {
            setMissingApiKey(true);
            return;
          }
          throw new Error(data.error || "Error al obtener credenciales de vídeo");
        }

        if (!isSubscribed) return;

        setToken(data.token);
        setRoomUrl(data.roomUrl);

        // 2. Importar dinámicamente @daily-co/daily-js para evitar problemas de SSR en Next.js
        const DailyIframe = (await import("@daily-co/daily-js")).default;

        // 3. Crear el objeto llamada (sin UI de Daily, lo dibujamos nosotros)
        localCallObject = DailyIframe.createCallObject({
          subscribeToTracksAutomatically: true,
          dailyConfig: {
            useDevicePreferenceCookies: false,
          },
        });

        setCallObject(localCallObject);

        // Registrar eventos del flujo de vídeo
        localCallObject.on("joined-meeting", () => {
          if (isSubscribed) setJoined(true);
        });

        localCallObject.on("track-started", (evt: any) => {
          if (!isSubscribed) return;
          handleTrackEvent(evt, localCallObject);
        });

        localCallObject.on("track-stopped", (evt: any) => {
          if (!isSubscribed) return;
          handleTrackStopped(evt);
        });

        localCallObject.on("participant-updated", () => {
          if (!isSubscribed || !localCallObject) return;
          updateVideoElements(localCallObject);
        });

        localCallObject.on("error", (evt: any) => {
          console.error("Daily.co error:", evt);
          if (isSubscribed) setError("Error en la transmisión de vídeo");
        });

        // 4. Unirse a la reunión
        await localCallObject.join({
          url: data.roomUrl,
          token: data.token,
        });

      } catch (err: any) {
        console.error("Error al inicializar videollamada:", err);
        if (isSubscribed) {
          setError(err.message || "No se ha podido conectar al servidor de vídeo");
        }
      }
    }

    initVideo();

    return () => {
      isSubscribed = false;
      if (localCallObject) {
        localCallObject.leave().then(() => {
          localCallObject.destroy();
        });
      }
    };
  }, [mounted, webcamActive, presentationId]);

  // Manejar el inicio de un track de vídeo
  const handleTrackEvent = (evt: any, currentCall: any) => {
    if (evt.track.kind !== "video") return;
    updateVideoElements(currentCall);
  };

  // Manejar parada de track
  const handleTrackStopped = (evt: any) => {
    if (evt.track.kind !== "video") return;
    // Si se detiene, limpiamos el srcObject del video correspondiente
    const isPresenter = evt.participant?.owner === true;
    if (isPresenter && videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    } else if (speakerVideoElementRef.current) {
      speakerVideoElementRef.current.srcObject = null;
    }
  };

  // Actualizar los elementos <video> de HTML con los flujos de WebRTC
  const updateVideoElements = (currentCall: any) => {
    if (!currentCall) return;

    const participants = currentCall.participants();
    
    // Buscar al presentador (dueño de la sala)
    const presenter = Object.values(participants).find(
      (p: any) => p.owner === true
    ) as any;

    if (presenter && presenter.videoTrack && videoElementRef.current) {
      const stream = new MediaStream([presenter.videoTrack]);
      if (videoElementRef.current.srcObject !== stream) {
        videoElementRef.current.srcObject = stream;
        videoElementRef.current.play().catch(e => console.log("Video auto-play blocked:", e));
      }
    }

    // Buscar al espectador activo haciendo preguntas (si lo hay)
    if (activeSpeakerId) {
      const speaker = Object.values(participants).find(
        (p: any) => p.user_id === activeSpeakerId || p.id === activeSpeakerId
      ) as any;

      if (speaker && speaker.videoTrack && speakerVideoElementRef.current) {
        const stream = new MediaStream([speaker.videoTrack]);
        if (speakerVideoElementRef.current.srcObject !== stream) {
          speakerVideoElementRef.current.srcObject = stream;
          speakerVideoElementRef.current.play().catch(e => console.log("Speaker video auto-play blocked:", e));
        }
      }
    }
  };

  // Forzar actualización cuando cambie el activeSpeakerId
  useEffect(() => {
    if (callObject && joined) {
      updateVideoElements(callObject);
    }
  }, [activeSpeakerId, joined, callObject]);

  const handleDragEnd = (event: any, info: any) => {
    const newPos = {
      x: position.x + info.offset.x,
      y: position.y + info.offset.y,
    };
    setPosition(newPos);
    localStorage.setItem(`webcam-pos-${presentationId}`, JSON.stringify(newPos));
  };

  if (!mounted || (!webcamActive && !activeSpeakerId)) return null;

  return (
    <motion.div
      drag
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0.05}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        x: position.x,
        y: position.y,
        zIndex: 9999,
      }}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="select-none pointer-events-auto"
    >
      {/* Contenedor de la ventanita premium */}
      <div className="bg-[#18181b]/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden w-[280px] sm:w-[320px] transition-all duration-300">
        
        {/* Barra superior de control y arrastre */}
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border-b border-white/5 cursor-grab active:cursor-grabbing text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          <div className="flex items-center gap-1.5 font-medium">
            <Video className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>Ponente en directo</span>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Indicador de Silencio de Audio */}
            <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded text-[10px] text-white/60">
              <VolumeX className="w-3 h-3 text-amber-500" />
              <span>Sin audio</span>
            </div>
            
            {/* Arrancador visual */}
            <GripHorizontal className="w-4 h-4 text-white/30 hover:text-white/60 mx-1" />
            
            {/* Minimizar */}
            <button 
              onClick={() => setIsMinimized(!isMinimized)} 
              className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/40 hover:text-white"
            >
              {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Cuerpo de Video */}
        {!isMinimized && (
          <div className="relative aspect-video bg-black/80 flex flex-col items-center justify-center">
            
            {/* 1. Muestra error de API Key si no está configurada */}
            {missingApiKey && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[#18181b] z-20">
                <CameraOff className="w-8 h-8 text-amber-500 mb-2" />
                <p className="text-[11px] text-white/90 font-medium">Falta configurar la Clave de Vídeo</p>
                <p className="text-[9px] text-white/40 mt-1 leading-relaxed">
                  El administrador debe añadir <code>DAILY_API_KEY</code> en su entorno para activar esta función.
                </p>
              </div>
            )}

            {/* 2. Muestra error general */}
            {error && !missingApiKey && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[#18181b] z-20">
                <CameraOff className="w-8 h-8 text-rose-500 mb-2" />
                <p className="text-[11px] text-white/90 font-medium">{error}</p>
              </div>
            )}

            {/* 3. Cargando conexión */}
            {webcamActive && !joined && !error && !missingApiKey && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#18181b] z-10">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] text-white/40">Conectando vídeo...</span>
              </div>
            )}

            {/* Grid de Vídeo: Si hay un espectador hablando, pantalla dividida (Split Screen) */}
            <div className={`w-full h-full grid ${activeSpeakerId ? "grid-cols-2" : "grid-cols-1"} gap-0.5`}>
              
              {/* Webcam del Administrador */}
              <div className="relative w-full h-full bg-zinc-950">
                <video
                  ref={videoElementRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]" // Espejo para vista natural
                />
                {!videoElementRef.current?.srcObject && joined && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-[10px] text-white/30">
                    Cámara apagada
                  </div>
                )}
                {activeSpeakerId && (
                  <span className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[8px] text-white/80 backdrop-blur-sm">
                    Ponente
                  </span>
                )}
              </div>

              {/* Webcam del Participante con Pregunta (Q&A) */}
              {activeSpeakerId && (
                <div className="relative w-full h-full bg-zinc-950 border-l border-white/5">
                  <video
                    ref={speakerVideoElementRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!speakerVideoElementRef.current?.srcObject && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-[10px] text-white/30">
                      Cargando cámara...
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 bg-emerald-500/80 px-1.5 py-0.5 rounded text-[8px] text-white font-medium backdrop-blur-sm">
                    Pregunta
                  </span>
                </div>
              )}
            </div>

            {/* Marca de agua premium discreta */}
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded-md backdrop-blur-md text-[9px] text-white/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>VIVO</span>
            </div>

          </div>
        )}
      </div>
    </motion.div>
  );
}
