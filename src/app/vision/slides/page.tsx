"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Play, 
  GripVertical, 
  Edit3, 
  ArrowLeft,
  Monitor,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Smartphone,
  AlertTriangle,
  Download,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";

const ADMIN_TOKEN_KEY = "adminToken";

function SortableSlideItem({ slide, isActive, onActivate, onRemove, presentationId }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex flex-col gap-4 sm:flex-row sm:items-center justify-between rounded-2xl border p-4 transition-all ${
        isActive 
          ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
          : "border-border bg-card/50 hover:bg-card"
      }`}
    >
      <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
        <div {...attributes} {...listeners} className="cursor-grab hover:text-foreground text-muted-foreground touch-none">
          <GripVertical className="h-5 w-5" />
        </div>
        <Link
          href={`/vision/slides/${slide._id}?presentationId=${presentationId || ""}`}
          className="flex flex-1 items-center gap-4 hover:opacity-80 transition-all w-full sm:w-auto cursor-pointer"
        >
          <div className="flex h-12 w-20 items-center justify-center rounded-lg bg-secondary/50 border border-border overflow-hidden text-[6px] p-2 leading-tight text-muted-foreground select-none">
              {slide.markdownContent.substring(0, 80)}...
          </div>
          <div className="flex-1">
            <h3 className="font-medium line-clamp-1 text-foreground">
              {slide.internalTitle || slide.markdownContent.split('\n')[0].replace('#', '').trim() || "Diapositiva sin título"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Escala: {slide.fontScale}x • {slide.linkedStepId ? "Vinculada" : "Sin interactividad"}
            </p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-auto">
        <button
          onClick={() => onActivate(slide._id)}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all font-display ${
            isActive
              ? "bg-primary text-white"
              : "bg-secondary text-foreground hover:bg-secondary/80"
          }`}
        >
          <Play className="h-4 w-4 fill-current" />
          {isActive ? "ACTIVA" : "ACTIVAR"}
        </button>
        <Link
          href={`/vision/slides/${slide._id}?presentationId=${presentationId || ""}`}
          className="rounded-lg bg-secondary p-2 text-muted-foreground hover:text-foreground transition-all"
        >
          <Edit3 className="h-5 w-5" />
        </Link>
        <button
          onClick={() => onRemove(slide._id)}
          className="rounded-lg bg-secondary p-2 text-muted-foreground hover:text-destructive transition-all"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function SlidesAdminPageContent() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    const savedToken = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (savedToken) {
      setAdminToken(savedToken);
    } else {
      router.push("/vision");
    }
  }, [router]);

  const searchParams = useSearchParams();
  const presentationState = useQuery(api.presentation.getState);
  const presentationId = searchParams?.get("presentationId") || presentationState?.activePresentationId;

  const presentations = useQuery(api.presentations.list) || [];
  const currentPresentation = presentations.find((p) => p._id === presentationId);
  const isActiveGlobally = presentationState?.activePresentationId === presentationId;

  const slides = useQuery(api.slides.list, presentationId ? { presentationId: presentationId as any } : "skip") || [];
  
  const createSlide = useMutation(api.slides.create);
  const reorderSlides = useMutation(api.slides.reorder);
  const removeSlide = useMutation(api.slides.remove);
  const setActiveSlide = useMutation(api.slides.setActive);
  const resetPresentation = useMutation(api.presentation.resetPresentation);
  const setActivePresentation = useMutation(api.presentation.setActivePresentation);

  const handleActivatePresentation = async () => {
    if (!presentationId || !adminToken) return;
    try {
      await setActivePresentation({ id: presentationId as any, adminToken });
    } catch (error) {
      alert("Error al projectar la presentació");
    }
  };

  const [localSlides, setLocalSlides] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      setLocalSlides(slides);
    }
  }, [slides, isDragging]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = () => setIsDragging(true);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = localSlides.findIndex((s: any) => s._id === active.id);
    const newIndex = localSlides.findIndex((s: any) => s._id === over.id);
    const newOrder = arrayMove(localSlides, oldIndex, newIndex);
    
    setLocalSlides(newOrder);

    try {
      await reorderSlides({
        orderedIds: newOrder.map((s: any) => s._id),
        adminToken: adminToken || "",
      });
    } catch (error) {
      console.error("Failed to reorder:", error);
      setLocalSlides(slides);
    }
  };

  const handleCreate = async () => {
    if (!presentationId) {
      alert("No hi ha cap presentació activa o seleccionada.");
      return;
    }
    try {
      await createSlide({
        presentationId: presentationId as any,
        internalTitle: "Nova Diapositiva",
        markdownContent: "# Nova Diapositiva\nEscribe aquí tu contenido...",
        fontScale: 1.0,
        linkedStepId: null,
        autoActivate: false,
        adminToken: adminToken || "",
      });
    } catch (error) {
      alert("Error al crear diapositiva");
    }
  };

  const handleRemove = async (id: any) => {
    if (!confirm("¿Seguro que quieres eliminar esta diapositiva?")) return;
    try {
      await removeSlide({ id, adminToken: adminToken || "" });
    } catch (error) {
      alert("Error al eliminar");
    }
  };

  const handleActivate = async (id: any) => {
    try {
      await setActiveSlide({ id, adminToken: adminToken || "" });
    } catch (error) {
      alert("Error al activar");
    }
  };

  const handleReset = async () => {
    if (!adminToken) {
      alert("No tens sessió activa. Refresca la pàgina i torna a entrar.");
      return;
    }
    if (!confirm("⚠️ ATENCIÓ: Estàs a punt de reiniciar tota la presentació. Això posarà tots els vots de les enquestes a zero i desactivarà la slide activa. Estàs segur?")) return;
    
    try {
      const result = await resetPresentation({ adminToken }) as any;
      if (result && !result.success) {
        alert("Error al reiniciar la presentació: " + result.error);
        return;
      }
      alert("Presentació reiniciada correctament.");
    } catch (error: any) {
      console.error("Reset error full object:", error);
      const msg = error?.data ?? error?.message ?? JSON.stringify(error) ?? "Error desconegut";
      alert("Error crític al reiniciar: " + msg);
    }
  };

  const [isImporting, setIsImporting] = useState(false);

  const handleImportMarkdown = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !presentationId) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          alert("El fitxer està buit.");
          setIsImporting(false);
          return;
        }

        // Split slides using the standard MD three dashes separator (---) in a single line
        const rawSlides = text.split(/\r?\n---\r?\n/g);
        const parsedSlides = rawSlides
          .map(s => s.trim())
          .filter(s => s.length > 0);

        if (parsedSlides.length === 0) {
          alert("No s'ha trobat cap diapositiva vàlida. Assegura't de separar-les amb '---' en una línia sola.");
          setIsImporting(false);
          return;
        }

        // Ask the user if they want to append or replace
        const replaceMode = confirm(
          `S'han detectat ${parsedSlides.length} diapositives.\n\n` +
          `• Clic a ACEPTAR per REEMPLAÇAR totes les diapositives actuals.\n` +
          `• Clic a CANCELAR per AFEGIR-LES al final de les actuals.`
        );

        if (replaceMode) {
          // Replace mode: delete all existing slides first
          for (const slide of slides) {
            await removeSlide({ id: slide._id, adminToken: adminToken || "" });
          }
        }

        // Create new slides sequentially to preserve correct ordering
        for (let i = 0; i < parsedSlides.length; i++) {
          const content = parsedSlides[i];
          
          // Try to extract the first header (# Title) as the internal title
          const titleMatch = content.match(/^#+\s+(.+)$/m);
          const internalTitle = titleMatch ? titleMatch[1].trim() : `Diapositiva ${i + 1}`;

          await createSlide({
            presentationId: presentationId as any,
            internalTitle,
            markdownContent: content,
            fontScale: 1.0,
            linkedStepId: null,
            autoActivate: false,
            adminToken: adminToken || "",
          });
        }

        alert(`🎉 ¡Importació completada amb èxit! S'han importat ${parsedSlides.length} diapositives.`);
      } catch (err: any) {
        console.error("Error importing markdown:", err);
        alert("Error al importar: " + (err.message || "Error desconegut"));
      } finally {
        setIsImporting(false);
        // Clear input value so same file can be selected again
        event.target.value = "";
      }
    };

    reader.onerror = () => {
      alert("Error al llegir el fitxer.");
      setIsImporting(false);
    };

    reader.readAsText(file);
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-12 text-foreground">
      <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
        <header className="flex flex-col gap-6 md:flex-row md:items-center justify-between">
          <div className="flex items-start sm:items-center gap-4">
            <Link href={`/vision${presentationId ? `?presentationId=${presentationId}` : ""}`} className="rounded-full bg-secondary p-2 text-muted-foreground hover:text-foreground mt-1 sm:mt-0">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-secondary-foreground leading-tight">
                {currentPresentation ? `Diapositives de "${currentPresentation.title}"` : "Editor de Diapositives"}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 font-light">
                Gestiona el contingut de la pantalla gran per a aquesta presentació.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
                <button 
                    onClick={() => {
                        const idx = localSlides.findIndex(s => s._id === presentationState?.activeSlideId);
                        if (idx > 0) handleActivate(localSlides[idx - 1]._id);
                    }}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                    disabled={!presentationState?.activeSlideId || localSlides.findIndex(s => s._id === presentationState?.activeSlideId) <= 0}
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="h-4 w-px bg-border mx-1" />
                <button 
                    onClick={() => {
                        const idx = localSlides.findIndex(s => s._id === presentationState?.activeSlideId);
                        if (idx !== -1 && idx < localSlides.length - 1) handleActivate(localSlides[idx + 1]._id);
                        else if (idx === -1 && localSlides.length > 0) handleActivate(localSlides[0]._id);
                    }}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                    disabled={localSlides.length === 0 || localSlides.findIndex(s => s._id === presentationState?.activeSlideId) === localSlides.length - 1}
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>
            <button 
                onClick={handleReset}
                className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2 text-sm font-bold text-destructive hover:bg-destructive/20 transition-all font-display"
                title="Reiniciar vots i estat"
            >
                <RotateCcw className="h-4 w-4" />
                Reiniciar
            </button>
            <Link 
                href="/vision/remote"
                className="flex items-center gap-2 rounded-xl border border-secondary bg-secondary/50 px-4 py-2 text-sm font-bold text-foreground hover:bg-secondary transition-all font-display"
                title="Mode comandament mòbil"
            >
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline">Comandament</span>
            </Link>
            <button 
                onClick={() => {
                  if (localSlides.length === 0) {
                    alert("No hi ha diapositives per exportar.");
                    return;
                  }
                  const title = currentPresentation?.title || "presentacio";
                  const fullMarkdownContent = localSlides
                    .map((slide) => slide.markdownContent)
                    .join("\n\n---\n\n");
                  
                  const blob = new Blob([fullMarkdownContent], { type: "text/markdown;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  const fileName = `${title.toLowerCase().replace(/\s+/g, "-")}.md`;
                  link.setAttribute("download", fileName);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="flex items-center gap-2 rounded-xl border border-secondary bg-secondary/50 px-4 py-2 text-sm font-bold text-foreground hover:bg-secondary transition-all font-display cursor-pointer"
                title="Exportar totes les diapositives a un sol fitxer Markdown"
            >
                <Download className="h-4 w-4" />
                <span>Exportar MD</span>
            </button>

            <label 
                className={`flex items-center gap-2 rounded-xl border border-secondary bg-secondary/50 px-4 py-2 text-sm font-bold text-foreground hover:bg-secondary transition-all font-display cursor-pointer ${isImporting ? "opacity-50 cursor-not-allowed" : ""}`}
                title="Importar fitxer Markdown per generar diapositives automàticament"
            >
                <Upload className="h-4 w-4" />
                <span>{isImporting ? "Important..." : "Importar MD"}</span>
                <input 
                  type="file" 
                  accept=".md" 
                  onChange={handleImportMarkdown} 
                  className="hidden" 
                  disabled={isImporting} 
                />
            </label>

            <button 
                onClick={() => window.open("/presenter", "_blank")}
                className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/20 transition-all font-display"
            >
                <Monitor className="h-4 w-4" />
                Presentar
            </button>
            <button
                onClick={handleCreate}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 sm:px-6 py-2 font-bold text-white hover:opacity-90 transition-all font-display"
            >
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline">Nova Slide</span>
                <span className="sm:hidden">Nova</span>
            </button>
          </div>
        </header>

        {!isActiveGlobally && currentPresentation && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-md"
          >
            <div className="flex gap-3 items-start">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-600 dark:text-amber-500 font-display text-sm sm:text-base">Aquesta presentació no està activa</h4>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Estàs editant les diapositives de <strong className="text-foreground">"{currentPresentation.title}"</strong>, però actualment no és la presentació que s'està projectant.
                </p>
              </div>
            </div>
            <button
              onClick={handleActivatePresentation}
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all text-white font-bold text-sm px-4 py-2 font-display cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" />
              Projectar Ara
            </button>
          </motion.div>
        )}

        <section className="space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={localSlides.map((s: any) => s._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                <AnimatePresence>
                  {localSlides.map((slide: any) => (
                    <motion.div
                      key={slide._id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <SortableSlideItem
                        slide={slide}
                        isActive={presentationState?.activeSlideId === slide._id}
                        onActivate={handleActivate}
                        onRemove={handleRemove}
                        presentationId={presentationId}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
          
          {localSlides.length === 0 && (
            <div className="text-center py-20 rounded-3xl border-2 border-dashed border-border bg-card/20">
              <p className="text-muted-foreground">No hay diapositivas todavía. ¡Crea la primera!</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function SlidesAdminPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregant l'editor de diapositives...</p>
        </div>
      </div>
    }>
      <SlidesAdminPageContent />
    </Suspense>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

