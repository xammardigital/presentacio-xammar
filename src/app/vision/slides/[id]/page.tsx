"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState, useEffect, use, useRef } from "react";
import { 
  ArrowLeft, 
  Save, 
  Image as ImageIcon, 
  Type, 
  Link as LinkIcon, 
  Zap,
  ChevronRight,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Video,
  Play,
  Volume2,
  VolumeX,
  Music
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useDropzone } from "react-dropzone";

// Dynamic import for MDEditor to avoid SSR issues
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

const ADMIN_TOKEN_KEY = "adminToken";
const FONT_SCALES = [0.8, 1.0, 1.2, 1.5, 2.0];

function getYouTubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function BackgroundAudio({ src, volume = 0.15 }: { src: string; volume?: number }) {
  const [muted, setMuted] = useState(true); // Default to muted in the editor, so it doesn't scare the admin
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<any>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;

    if (!muted) {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.log("Audio autoplay failed or blocked:", err);
          setIsPlaying(false);
        });

      // Fade in over 3 seconds (3000ms)
      clearInterval(fadeIntervalRef.current);
      const fadeDuration = 3000;
      const intervalStep = 50;
      const steps = fadeDuration / intervalStep;
      const volumeStep = volume / steps;
      let currentStep = 0;

      fadeIntervalRef.current = setInterval(() => {
        currentStep++;
        if (audioRef.current) {
          audioRef.current.volume = Math.min(volume, currentStep * volumeStep);
        }
        if (currentStep >= steps) {
          clearInterval(fadeIntervalRef.current);
        }
      }, intervalStep);
    } else {
      audio.pause();
      setIsPlaying(false);
    }

    return () => {
      clearInterval(fadeIntervalRef.current);
      const targetAudio = audio;
      const startVolume = targetAudio.volume;
      const fadeDuration = 3000;
      const intervalStep = 50;
      const steps = fadeDuration / intervalStep;
      const volumeStep = startVolume / steps; // Fade out from its current volume!
      let currentOutStep = steps;

      const fadeOutInterval = setInterval(() => {
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
  }, [src, volume, muted]);

  return (
    <div className="absolute bottom-4 left-4 z-50 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 pl-4 pr-5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Animated Soundwave */}
      <div className="flex items-end gap-0.5 h-4 w-4 mr-1">
        <span className={`w-0.75 bg-[#FF6B00] rounded-full transition-all duration-200 ${isPlaying ? 'animate-bounce h-full' : 'h-1'}`} style={{ animationDelay: '0.1s', animationDuration: '0.6s' }} />
        <span className={`w-0.75 bg-[#FF6B00] rounded-full transition-all duration-200 ${isPlaying ? 'animate-bounce h-2/3' : 'h-1.5'}`} style={{ animationDelay: '0.3s', animationDuration: '0.8s' }} />
        <span className={`w-0.75 bg-[#FF6B00] rounded-full transition-all duration-200 ${isPlaying ? 'animate-bounce h-5/6' : 'h-1'}`} style={{ animationDelay: '0.2s', animationDuration: '0.5s' }} />
        <span className={`w-0.75 bg-[#FF6B00] rounded-full transition-all duration-200 ${isPlaying ? 'animate-bounce h-1/2' : 'h-2'}`} style={{ animationDelay: '0.4s', animationDuration: '0.7s' }} />
      </div>

      <div className="flex flex-col text-left">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 font-display">Àudio de fons</span>
        <span className="text-xs font-semibold text-white truncate max-w-[120px]" title={src.split('/').pop()}>
          Ambient Actiu
        </span>
      </div>

      <button
        type="button"
        onClick={() => setMuted(!muted)}
        className={`ml-2 flex h-8 w-8 items-center justify-center rounded-xl transition-all active:scale-90 cursor-pointer ${
          muted 
            ? "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white" 
            : "bg-[#FF6B00] text-white shadow-[0_0_15px_rgba(255,107,0,0.4)]"
        }`}
        title={muted ? "Activar so per provar" : "Silenciar àudio"}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

const customComponents = {
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
          <div className="absolute inset-0 w-full h-full z-30 bg-black rounded-2xl overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`}
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
            className={`overflow-hidden rounded-2xl shadow-xl border border-white/10 ${alignClass} ${heightClass}`}
          >
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`}
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
        style={{ maxWidth: "90%", maxHeight: "40vh" }}
        className="mx-auto rounded-2xl shadow-xl border border-white/5 object-contain my-6 block" 
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
                className="overflow-hidden rounded-2xl shadow-xl border border-white/10 mx-auto aspect-video w-[80%] max-w-full"
              >
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`}
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

export default function SlideEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params) as { id: any };
  const router = useRouter();
  
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [markdown, setMarkdown] = useState<string>("");
  const [internalTitle, setInternalTitle] = useState<string>("Nova Diapositiva");
  const [fontScale, setFontScale] = useState<number>(1.0);
  const [linkedStepId, setLinkedStepId] = useState<string | null>(null);
  const [autoActivate, setAutoActivate] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // YouTube Video Assistant states
  const [ytUrl, setYtUrl] = useState("");
  const [ytWidth, setYtWidth] = useState("100%");
  const [ytHeightMode, setYtHeightMode] = useState<"aspect" | "custom">("aspect");
  const [ytCustomHeight, setYtCustomHeight] = useState("350px");
  const [ytAlign, setYtAlign] = useState("center");
  const [ytFullScreen, setYtFullScreen] = useState(false);

  // Audio Assistant states
  const [bgAudioUrl, setBgAudioUrl] = useState("");
  const [bgAudioVolume, setBgAudioVolume] = useState(15); // default background ambiance volume is 15%
  const [isAudioUploading, setIsAudioUploading] = useState(false);

  const insertAtCursor = (textToInsert: string) => {
    const textarea = document.querySelector('.w-md-editor-text-input') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      
      setMarkdown(before + textToInsert + after);
      
      // Focus back to editor and set cursor position after the inserted text
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + textToInsert.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 50);
    } else {
      // Fallback
      setMarkdown((prev) => prev + textToInsert);
    }
  };

  const handleInsertYouTube = () => {
    if (!ytUrl) {
      alert("Si us plau, introdueix un enllaç de YouTube.");
      return;
    }
    const videoId = getYouTubeId(ytUrl);
    if (!videoId) {
      alert("Enllaç de YouTube no vàlid. Comprova el format.");
      return;
    }
    
    const height = ytHeightMode === "aspect" ? "aspect-video" : ytCustomHeight;
    const fullscreenParam = ytFullScreen ? "fullscreen" : "normal";
    const markdownTag = `\n\n![youtube|${ytWidth}|${height}|${ytAlign}|${fullscreenParam}](${ytUrl})\n`;
    
    insertAtCursor(markdownTag);
    setYtUrl(""); // Reset input URL
    setYtFullScreen(false); // Reset fullscreen option
  };

  const handleInsertAudio = () => {
    if (!bgAudioUrl) {
      alert("Si us plau, introdueix un enllaç d'àudio o puja'n un.");
      return;
    }
    const vol = (bgAudioVolume / 100).toFixed(2);
    const audioTag = `\n\n![bg-audio|${vol}](${bgAudioUrl})\n`;
    insertAtCursor(audioTag);
    setBgAudioUrl("");
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !adminToken) return;

    setIsAudioUploading(true);
    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      const { storageId } = await result.json();
      
      const asset = await saveImage({
        slideId: id,
        storageId,
        altText: `bg-audio|${(bgAudioVolume / 100).toFixed(2)}`,
        adminToken,
      });

      setBgAudioUrl(asset.url);
      alert("Àudio carregat correctament! Ara pots prémer 'Inserir Àudio Ambient' per afegir-lo a la teva diapositiva.");
    } catch (error) {
      console.error(error);
      alert("Error al carregar l'àudio");
    } finally {
      setIsAudioUploading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    const savedToken = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (savedToken) {
      setAdminToken(savedToken);
    } else {
      router.push("/vision");
    }
  }, [router]);

  const slide = useQuery(api.slides.getById, { id });
  const steps = useQuery(api.steps.list, slide?.presentationId ? { presentationId: slide.presentationId } : "skip") || [];
  
  const updateSlide = useMutation(api.slides.update);
  const generateUploadUrl = useMutation(api.slides.generateUploadUrl);
  const saveImage = useMutation(api.slides.saveImage);

  useEffect(() => {
    if (slide) {
      setMarkdown(slide.markdownContent);
      setInternalTitle(slide.internalTitle || "");
      setFontScale(slide.fontScale as number);
      setLinkedStepId(slide.linkedStepId as string | null);
      setAutoActivate(slide.autoActivate);
    }
  }, [slide]);

  const hasChanges = slide ? (
    markdown !== slide.markdownContent ||
    internalTitle !== (slide.internalTitle || "") ||
    fontScale !== slide.fontScale ||
    linkedStepId !== (slide.linkedStepId || null) ||
    autoActivate !== slide.autoActivate
  ) : false;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "Tens canvis sense desar. Segur que vols sortir?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasChanges) {
      if (confirm("Tens canvis sense desar. Segur que vols sortir sense guardar-los?")) {
        router.push(`/vision/slides${slide?.presentationId ? `?presentationId=${slide.presentationId}` : ""}`);
      }
    } else {
      router.push(`/vision/slides${slide?.presentationId ? `?presentationId=${slide.presentationId}` : ""}`);
    }
  };

  const handleSave = async () => {
    if (!adminToken) return;
    setIsSaving(true);
    try {
      await updateSlide({
        id,
        internalTitle,
        markdownContent: markdown,
        fontScale: fontScale as any,
        linkedStepId: linkedStepId as any,
        autoActivate,
        adminToken,
      });
      // Optional: show toast
    } catch (error) {
      alert("Error al desar");
    } finally {
      setIsSaving(false);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !adminToken) return;
    
    setIsUploading(true);
    try {
      const file = acceptedFiles[0];
      const postUrl = await generateUploadUrl();
      
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      const { storageId } = await result.json();
      
      const asset = await saveImage({
        slideId: id,
        storageId,
        altText: file.name,
        adminToken,
      });

      // Insert into markdown at current cursor
      insertAtCursor(`\n\n![${file.name}](${asset.url})\n`);
    } catch (error) {
      alert("Error al pujar la imatge");
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  });

  if (!isMounted) return null;
  if (!slide) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground animate-in">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack} 
            className="rounded-full hover:bg-secondary p-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground w-full max-w-sm">
            <button 
              onClick={handleBack} 
              className="hover:text-foreground cursor-pointer font-medium"
            >
              Slides
            </button>
            <ChevronRight className="h-4 w-4" />
            <input 
              value={internalTitle}
              onChange={(e) => setInternalTitle(e.target.value)}
              className="bg-transparent font-medium text-foreground outline-none border-b border-transparent focus:border-primary/50 px-1 py-0.5 w-full flex-1"
              placeholder="Títol de la diapositiva"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {hasChanges && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 text-xs font-bold font-display animate-pulse select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Sense desar
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 font-display cursor-pointer"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Left: Editor */}
        <div className="flex flex-[3] flex-col border-r border-border overflow-hidden" data-color-mode="dark">
          {/* Quick Actions Toolbar */}
          <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-2.5 text-xs font-semibold select-none">
            <span className="text-muted-foreground mr-1 font-display">Inserir ràpid:</span>
            
            {/* Quick YouTube Video Button */}
            <button 
              type="button"
              onClick={() => {
                const url = prompt("Introdueix l'enllaç de YouTube (ex: https://www.youtube.com/watch?v=...):");
                if (url) {
                  const videoId = getYouTubeId(url);
                  if (videoId) {
                    insertAtCursor(`\n\n![youtube|100%|aspect-video|center](${url})\n`);
                  } else {
                    alert("Enllaç de YouTube no vàlid.");
                  }
                }
              }}
              className="flex items-center gap-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-500 px-3 py-1.5 font-bold transition-all active:scale-95 border border-red-500/10 cursor-pointer font-display"
              title="Insereix un vídeo de YouTube amb aspecte 16:9 centrat"
            >
              <Play className="h-3 w-3 fill-current" />
              Vídeo YouTube
            </button>

            {/* Quick Image Button */}
            <button 
              type="button"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (e: any) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onDrop([file]);
                  }
                };
                input.click();
              }}
              className="flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 font-bold transition-all active:scale-95 border border-primary/10 cursor-pointer font-display"
              title="Tria i puja una imatge de l'ordinador"
            >
              <ImageIcon className="h-3 w-3" />
              Imatge
            </button>
          </div>

          <div className="flex-1 overflow-auto bg-[#0d1117] text-slate-200">
             <MDEditor
              value={markdown}
              onChange={(val) => setMarkdown(val || "")}
              height="100%"
              preview="edit"
              extraCommands={[]}
            />
          </div>
          
          {/* Dropzone Area */}
          <div 
            {...getRootProps()} 
            className={`cursor-pointer border-t border-border p-4 text-center transition-colors ${
              isDragActive ? "bg-primary/10" : "bg-card hover:bg-secondary/50"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Pujant imatge...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4" />
                  <span>Arrossega una imatge aquí o fes clic per pujar-la</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Settings & Preview */}
        <div className="flex flex-[2] flex-col overflow-hidden bg-secondary/20">
          <div className="flex items-center gap-2 border-b border-border px-6 py-3 bg-card font-display font-bold text-sm">
             <Type className="h-4 w-4" />
             Configuració i Preview
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Font Scale Settings */}
            <div className="space-y-4">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Type className="h-4 w-4 text-primary" />
                Escala tipogràfica (Pantalla Gran)
              </label>
              <div className="flex items-center justify-between gap-2 p-1 bg-secondary rounded-xl">
                {FONT_SCALES.map((scale) => (
                  <button
                    key={scale}
                    onClick={() => setFontScale(scale)}
                    className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all ${
                      fontScale === scale 
                        ? "bg-white text-primary shadow-sm dark:bg-slate-800" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {scale}x
                  </button>
                ))}
              </div>
            </div>

            {/* Link to Step Settings */}
            <div className="space-y-4">
              <label className="text-sm font-semibold flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-primary" />
                Vincular amb interactivitat (Mòbils)
              </label>
              <select
                value={linkedStepId || ""}
                onChange={(e) => setLinkedStepId(e.target.value === "" ? null : e.target.value)}
                className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Cap interactivitat activa</option>
                {steps.map((step: any) => (
                  <option key={step._id} value={step._id}>
                    {step.type}: {step.title}
                  </option>
                ))}
              </select>
            </div>

            {/* YouTube Video Assistant */}
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <label className="text-sm font-semibold flex items-center gap-2 text-primary font-display">
                <Video className="h-5 w-5" />
                Assistent de Vídeo YouTube
              </label>
              
              <div className="space-y-3 text-xs">
                {/* Past URL */}
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium">Enllaç de YouTube</span>
                  <input
                    type="text"
                    value={ytUrl}
                    onChange={(e) => setYtUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full rounded-xl border border-border bg-secondary/30 p-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-xs"
                  />
                </div>

                {/* Width selection */}
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium">Amplada</span>
                  <div className="flex gap-1.5 p-0.5 bg-secondary/50 rounded-lg">
                    {["50%", "80%", "100%"].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setYtWidth(w)}
                        className={`flex-1 rounded-md py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
                          ytWidth === w 
                            ? "bg-white text-primary shadow-sm dark:bg-slate-800" 
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Height selection */}
                <div className="space-y-1.5">
                  <span className="text-muted-foreground font-medium">Alçada (Mida)</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setYtHeightMode("aspect")}
                      className={`flex-1 rounded-xl p-2 border text-[10px] font-bold text-center cursor-pointer transition-all ${
                        ytHeightMode === "aspect"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-secondary/30 text-muted-foreground"
                      }`}
                    >
                      Proporció 16:9
                    </button>
                    <button
                      type="button"
                      onClick={() => setYtHeightMode("custom")}
                      className={`flex-1 rounded-xl p-2 border text-[10px] font-bold text-center cursor-pointer transition-all ${
                        ytHeightMode === "custom"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-secondary/30 text-muted-foreground"
                      }`}
                    >
                      Personalitzada
                    </button>
                  </div>
                  {ytHeightMode === "custom" && (
                    <input
                      type="text"
                      value={ytCustomHeight}
                      onChange={(e) => setYtCustomHeight(e.target.value)}
                      placeholder="e.g. 350px, 40vh"
                      className="w-full rounded-xl border border-border bg-secondary/30 p-2 outline-none focus:ring-2 focus:ring-primary/50 text-[11px] mt-1"
                    />
                  )}
                </div>

                {/* Alignment */}
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium">Alineació</span>
                  <div className="flex gap-1 bg-secondary/50 rounded-lg p-0.5 max-w-[150px]">
                    {[
                      { val: "left", icon: AlignLeft },
                      { val: "center", icon: AlignCenter },
                      { val: "right", icon: AlignRight }
                    ].map((align) => {
                      const Icon = align.icon;
                      return (
                        <button
                          key={align.val}
                          type="button"
                          onClick={() => setYtAlign(align.val)}
                          className={`flex-1 rounded-md py-1.5 flex justify-center cursor-pointer transition-all ${
                            ytAlign === align.val 
                              ? "bg-white text-primary shadow-sm dark:bg-slate-800" 
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          title={`Alineació a la ${align.val === "left" ? "esquerra" : align.val === "right" ? "dreta" : "centrat"}`}
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Full Screen option */}
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium">Pantalla completa (cobreix la diapositiva)</span>
                  <div className="flex gap-1.5 p-0.5 bg-secondary/50 rounded-lg max-w-[150px]">
                    {[
                      { label: "Sí", val: true },
                      { label: "No", val: false }
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setYtFullScreen(opt.val)}
                        className={`flex-1 rounded-md py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
                          ytFullScreen === opt.val 
                            ? "bg-white text-primary shadow-sm dark:bg-slate-800" 
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Insert Button */}
                <button
                  type="button"
                  onClick={handleInsertYouTube}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary py-2 px-4 font-bold text-white transition-all hover:opacity-90 active:scale-95 cursor-pointer font-display"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Inserir Vídeo
                </button>
              </div>
            </div>

            {/* Background Audio Assistant */}
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <label className="text-sm font-semibold flex items-center gap-2 text-primary font-display">
                <Music className="h-5 w-5" />
                Assistent d'Àudio de Fons
              </label>

              <div className="space-y-3 text-xs">
                {/* Past URL */}
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium">Enllaç d'Àudio (MP3 / WAV)</span>
                  <input
                    type="text"
                    value={bgAudioUrl}
                    onChange={(e) => setBgAudioUrl(e.target.value)}
                    placeholder="https://exemple.com/musica.mp3"
                    className="w-full rounded-xl border border-border bg-secondary/30 p-2.5 outline-none focus:ring-2 focus:ring-primary/50 text-xs"
                  />
                </div>

                {/* Upload File */}
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium">O penja un arxiu d'àudio local</span>
                  <div className="relative">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      disabled={isAudioUploading}
                      className="hidden"
                      id="audio-upload-input"
                    />
                    <label
                      htmlFor="audio-upload-input"
                      className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-center text-xs font-semibold cursor-pointer hover:bg-secondary/40 transition-colors ${
                        isAudioUploading ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      {isAudioUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span>Pujant àudio a Convex...</span>
                        </>
                      ) : (
                        <>
                          <Music className="h-4 w-4 text-muted-foreground" />
                          <span>Tria o arrossega un arxiu MP3/WAV</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Volume slider */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-muted-foreground font-medium">
                    <span>Volum d'ambient</span>
                    <span className="font-bold text-foreground">{bgAudioVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={bgAudioVolume}
                    onChange={(e) => setBgAudioVolume(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    Per defecte és del 15% per quedar com a música de fons suau.
                  </p>
                </div>

                {/* Insert Button */}
                <button
                  type="button"
                  onClick={handleInsertAudio}
                  disabled={!bgAudioUrl}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary py-2 px-4 font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer font-display"
                >
                  <Music className="h-3.5 w-3.5" />
                  Inserir Àudio Ambient
                </button>
              </div>
            </div>

            {/* Live Preview Overlay */}
            <div className="space-y-4">
               <label className="text-sm font-semibold">Preview real (Estil Presentador)</label>
               <div className="relative aspect-video w-full rounded-2xl bg-[#1A365D] p-8 text-white shadow-2xl overflow-hidden flex flex-col items-center justify-start text-center">
                  <div style={{ fontSize: `${(fontScale || 1.0) * 0.8}rem` }} className="w-full max-w-full prose prose-invert prose-orange presenter-markdown text-left">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={customComponents}>
                      {markdown}
                    </ReactMarkdown>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
