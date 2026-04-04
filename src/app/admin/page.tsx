"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Plus, Trash2, Play, BarChart3, Type, Smile, Lock, LogOut, GripVertical } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
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

const COLORS = ["#FF6B00", "#1A365D", "#4299E1", "#48BB78"];

// --- Sortable Step Card ---
function SortableStep({
  step,
  isActive,
  onActivate,
  onRemove,
}: {
  step: any;
  isActive: boolean;
  onActivate: (id: any) => void;
  onRemove: (id: any) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step._id });

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
      className={`relative flex items-center justify-between rounded-2xl border p-5 transition-colors ${
        isActive ? "border-primary bg-primary/10" : "border-border bg-card/20"
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="mr-3 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Arrossegar per reordenar"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex flex-1 items-center gap-4">
        <div
          className={`rounded-lg p-2 ${
            step.type === "BIENVENIDA"
              ? "bg-amber-500/20 text-amber-500"
              : step.type === "TEXTO"
              ? "bg-sky-500/20 text-sky-500"
              : "bg-emerald-500/20 text-emerald-500"
          }`}
        >
          {step.type === "BIENVENIDA" && <Smile className="h-5 w-5" />}
          {step.type === "TEXTO" && <Type className="h-5 w-5" />}
          {step.type === "ENCUESTA" && <BarChart3 className="h-5 w-5" />}
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{step.title}</h3>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{step.type === 'BIENVENIDA' ? 'Benvinguda' : step.type === 'TEXTO' ? 'Text' : 'Enquesta'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onActivate(step._id)}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
            isActive ? "bg-primary text-white" : "bg-card border border-border text-foreground hover:bg-secondary"
          }`}
        >
          <Play className="h-4 w-4 fill-current" />
          {isActive ? "ACTIU" : "ACTIVAR"}
        </button>
        <button
          onClick={() => onRemove(step._id)}
          className="rounded-lg bg-card border border-border p-2 text-muted-foreground transition-all hover:bg-destructive/20 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// --- Main Admin Page ---
export default function AdminPage() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedToken = sessionStorage.getItem("adminToken");
    if (savedToken) setAdminToken(savedToken);
  }, []);

  const stepsFromServer = (useQuery(api.steps.list) as any) || [];
  const presentationState = useQuery(api.presentation.getState) as any;

  // Local optimistic state for ordering
  const [localSteps, setLocalSteps] = useState<any[]>([]);

  // Sync local state when server data changes (but not while dragging)
  const [isDragging, setIsDragging] = useState(false);
  useEffect(() => {
    if (!isDragging) {
      setLocalSteps(stepsFromServer);
    }
  }, [stepsFromServer, isDragging]);

  // Mutations
  const activateMutation = useMutation(api.presentation.activateStep);
  const createStepMutation = useMutation(api.steps.create);
  const removeStepMutation = useMutation(api.steps.remove);
  const reorderMutation = useMutation(api.steps.reorder);

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    if (!over || active.id === over.id) return;
    const oldIndex = localSteps.findIndex((s: any) => s._id === active.id);
    const newIndex = localSteps.findIndex((s: any) => s._id === over.id);
    const newOrder = arrayMove(localSteps, oldIndex, newIndex);
    // Optimistic update — apply immediately before Convex responds
    setLocalSteps(newOrder);
    try {
      await reorderMutation({ 
        orderedIds: newOrder.map((s: any) => s._id),
        adminToken: adminToken || "",
      });
    } catch (err: any) {
      // Rollback on failure
      setLocalSteps(stepsFromServer);
      alert("Error en reordenar: " + (err.data || err.message || "Error desconegut"));
    }
  };

  const handleDragStart = () => setIsDragging(true);

  // State for the form
  const [type, setType] = useState<"BIENVENIDA" | "TEXTO" | "ENCUESTA">("BIENVENIDA");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const activeStep = localSteps.find((s: any) => s._id === presentationState?.currentStepId);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setIsValidating(true);
    setError(null);

    try {
      const res = await fetch("/api/validate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput }),
      });
      const data = await res.json();

      if (data.valid) {
        setAdminToken(tokenInput);
        sessionStorage.setItem("adminToken", tokenInput);
      } else {
        setError(data.error || "Token incorrecte. Torna-ho a intentar.");
      }
    } catch (err) {
      setError("Error de xarxa. Comprova la teva connexió.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminToken");
    setAdminToken(null);
    setTokenInput("");
    setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createStepMutation({
        type,
        title,
        content: type === "TEXTO" ? content : undefined,
        options: type === "ENCUESTA" ? options.filter((o) => o.trim() !== "") : undefined,
        adminToken: adminToken || "",
      });
      setTitle("");
      setContent("");
      setOptions(["", ""]);
    } catch (err: any) {
      alert("Error en crear el pas: " + (err.data || err.message || "Error desconegut"));
    }
  };

  const handleRemove = async (id: any) => {
    try {
      await removeStepMutation({ 
        id,
        adminToken: adminToken || "",
      });
    } catch (err: any) {
      alert("Error en eliminar el pas: " + (err.data || err.message || "Error desconegut"));
    }
  };

  const handleActivate = async (id: any) => {
    try {
      await activateMutation({ 
        id,
        adminToken: adminToken || "",
      });
    } catch (err: any) {
      alert("Error en activar el pas: " + (err.data || err.message || "Error desconegut"));
    }
  };

  const addOption = () => {
    if (options.length < 4) setOptions([...options, ""]);
  };

  if (!isMounted) return null;

  if (!adminToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8 rounded-3xl border border-border bg-card p-10 text-center glass"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Accés Restringit</h1>
            <p className="text-muted-foreground">Introdueix el token d'administrador per gestionar la presentació.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Token d'administració"
              className={`w-full rounded-xl border bg-background p-4 text-foreground outline-none focus:ring-2 focus:ring-primary ${
                error ? "border-destructive" : "border-border"
              }`}
              required
            />
            {error && (
              <p className="rounded-lg bg-destructive/10 p-3 text-left text-sm text-destructive">⚠️ {error}</p>
            )}
            <button
              type="submit"
              disabled={isValidating}
              className="w-full rounded-xl bg-primary py-4 font-bold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isValidating ? "Verificant..." : "Desbloquejar Panell"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 text-foreground lg:p-12">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-secondary-foreground font-display">Tauler de Control</h1>
            <p className="text-muted-foreground">Gestiona els passos de la teva presentació interactiva.</p>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  presentationState?.currentStepId ? "animate-pulse bg-green-500" : "bg-muted-foreground"
                }`}
              />
              <span className="text-sm font-medium">
                {presentationState?.currentStepId ? "Presentació Activa" : "En espera"}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-2 text-sm font-bold text-destructive transition-all hover:bg-destructive/20"
            >
              <LogOut className="h-4 w-4" />
              Sortir
            </button>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Create Step Form */}
          <section className="rounded-2xl border border-border bg-card p-8 glass">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold text-secondary-foreground font-display">
              <Plus className="h-5 w-5 text-primary" />
              Crear nou pas
            </h2>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-3 gap-2">
                {(["BIENVENIDA", "TEXTO", "ENCUESTA"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex flex-col items-center gap-2 rounded-xl p-4 text-xs font-medium transition-all ${
                      type === t ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:bg-border"
                    }`}
                  >
                    {t === "BIENVENIDA" && <Smile className="h-5 w-5" />}
                    {t === "TEXTO" && <Type className="h-5 w-5" />}
                    {t === "ENCUESTA" && <BarChart3 className="h-5 w-5" />}
                    {t === 'BIENVENIDA' ? 'BENVINGUDA' : t === 'TEXTO' ? 'TEXT' : 'ENQUESTA'}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Títol / Pregunta</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Què et sembla aquesta tecnologia?"
                  className="w-full rounded-xl border border-border bg-background p-3 text-foreground outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              {type === "TEXTO" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Contingut</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Escriu el missatge aquí..."
                    className="h-32 w-full rounded-xl border border-border bg-background p-3 text-foreground outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              {type === "ENCUESTA" && (
                <div className="space-y-4">
                  <label className="text-sm font-medium text-muted-foreground">Opcions (Màxim 4)</label>
                  <div className="space-y-2">
                    {options.map((opt, idx) => (
                      <input
                        key={idx}
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...options];
                          newOpts[idx] = e.target.value;
                          setOptions(newOpts);
                        }}
                        placeholder={`Opció ${idx + 1}`}
                        className="w-full rounded-xl border border-border bg-background p-3 text-foreground outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    ))}
                  </div>
                  {options.length < 4 && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="text-sm font-medium text-primary hover:opacity-80"
                    >
                      + Afegir una altra opció
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-primary py-4 font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                disabled={!title}
              >
                Crear pas
              </button>
            </form>
          </section>

          {/* Steps List */}
          <section className="space-y-6">
            <h2 className="flex items-center justify-between text-xl font-semibold font-display text-secondary-foreground">
              <span>Llista de passos</span>
              <span className="text-xs font-normal text-muted-foreground">{localSteps.length} passos · arrossega per reordenar</span>
            </h2>
            <div className="space-y-3">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext items={localSteps.map((s: any) => s._id)} strategy={verticalListSortingStrategy}>
                  <AnimatePresence>
                    {localSteps.map((step: any) => (
                      <motion.div
                        key={step._id}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <SortableStep
                          step={step}
                          isActive={presentationState?.currentStepId === step._id}
                          onActivate={handleActivate}
                          onRemove={handleRemove}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </SortableContext>
              </DndContext>
            </div>

            {/* Live Results Panel */}
            {activeStep?.type === "ENCUESTA" && activeStep.options && activeStep.votes && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-8 glass"
              >
                <h2 className="mb-6 flex items-center justify-between text-xl font-semibold font-display text-secondary-foreground">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Resultats en Viu
                  </span>
                  <span className="animate-pulse text-sm font-medium text-primary">LIVE</span>
                </h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={activeStep.options.map((opt: string, i: number) => ({
                        name: opt,
                        votes: activeStep.votes![i],
                      }))}
                      layout="vertical"
                      margin={{ left: 10, right: 30 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        width={100}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "8px" }}
                        itemStyle={{ color: "var(--color-foreground)" }}
                      />
                      <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={20}>
                        {activeStep.options.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-center gap-6">
                  {activeStep.options.map((opt: string, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-muted-foreground">{activeStep.votes![i]} vots</span>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
