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
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

const ADMIN_TOKEN_KEY = "adminToken";

export default function SlidesAdminPage() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    setAdminToken(token);
  }, []);

  const slides = useQuery(api.slides.list) || [];
  const presentationState = useQuery(api.presentation.getState);
  
  const createSlide = useMutation(api.slides.create);
  const reorderSlides = useMutation(api.slides.reorder);
  const removeSlide = useMutation(api.slides.remove);
  const setActiveSlide = useMutation(api.slides.setActive);

  const [localSlides, setLocalSlides] = useState<any[]>([]);

  useEffect(() => {
    setLocalSlides(slides);
  }, [slides]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(localSlides);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLocalSlides(items);

    try {
      await reorderSlides({
        orderedIds: items.map((s) => s._id),
        adminToken: adminToken || "",
      });
    } catch (error) {
      console.error("Failed to reorder:", error);
      setLocalSlides(slides);
    }
  };

  const handleCreate = async () => {
    try {
      await createSlide({
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

  if (!isMounted) return null;
  if (!adminToken) return (
    <div className="flex h-screen items-center justify-center">
      <p>Inicia sesión en el panel principal primero.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="rounded-full bg-secondary p-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold font-display">Editor de Diapositivas</h1>
              <p className="text-muted-foreground">Gestiona el contenido de la pantalla grande.</p>
            </div>
          </div>
          <div className="flex gap-3">
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
                onClick={() => window.open("/presenter", "_blank")}
                className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/20 transition-all font-display"
            >
                <Monitor className="h-4 w-4" />
                Presentar
            </button>
            <button
                onClick={handleCreate}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2 font-bold text-white hover:opacity-90 transition-all font-display"
            >
                <Plus className="h-5 w-5" />
                Nova Slide
            </button>
          </div>
        </header>

        <section className="space-y-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="slides">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {localSlides.map((slide, index) => (
                    <Draggable key={slide._id} draggableId={slide._id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`group flex items-center justify-between rounded-2xl border p-4 transition-all ${
                            presentationState?.activeSlideId === slide._id 
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                              : "border-border bg-card/50 hover:bg-card"
                          }`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div {...provided.dragHandleProps} className="text-muted-foreground hover:text-foreground">
                              <GripVertical className="h-5 w-5" />
                            </div>
                            <div className="flex h-12 w-20 items-center justify-center rounded-lg bg-secondary/50 border border-border overflow-hidden text-[6px] p-2 leading-tight text-muted-foreground select-none">
                               {slide.markdownContent.substring(0, 80)}...
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium line-clamp-1">
                                {slide.markdownContent.split('\n')[0].replace('#', '').trim() || "Diapositiva sin título"}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                Escala: {slide.fontScale}x • {slide.linkedStepId ? "Vinculada" : "Sin interactividad"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleActivate(slide._id)}
                              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all font-display ${
                                presentationState?.activeSlideId === slide._id
                                  ? "bg-primary text-white"
                                  : "bg-secondary text-foreground hover:bg-secondary/80"
                              }`}
                            >
                              <Play className="h-4 w-4 fill-current" />
                              {presentationState?.activeSlideId === slide._id ? "ACTIVA" : "ACTIVAR"}
                            </button>
                            <Link
                              href={`/admin/slides/${slide._id}`}
                              className="rounded-lg bg-secondary p-2 text-muted-foreground hover:text-foreground transition-all"
                            >
                              <Edit3 className="h-5 w-5" />
                            </Link>
                            <button
                              onClick={() => handleRemove(slide._id)}
                              className="rounded-lg bg-secondary p-2 text-muted-foreground hover:text-destructive transition-all"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          
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
