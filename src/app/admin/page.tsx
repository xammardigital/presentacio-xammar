"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect, Suspense } from "react";
import { 
  Plus, 
  Trash2, 
  Play, 
  BarChart3, 
  Type, 
  Smile, 
  Lock, 
  LogOut, 
  GripVertical, 
  Monitor, 
  Smartphone, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Calendar, 
  Edit3, 
  CheckCircle, 
  ArrowLeft, 
  ExternalLink,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
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
const ADMIN_TOKEN_KEY = "adminToken";

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
      className={`relative flex flex-col gap-4 sm:flex-row sm:items-center justify-between rounded-2xl border p-5 transition-all ${
        isActive 
          ? "border-primary bg-primary/10 ring-1 ring-primary/20 shadow-md" 
          : "border-border bg-card/20 hover:bg-card/45 hover:shadow-sm"
      }`}
    >
      <div className="flex flex-1 items-center gap-4 w-full sm:w-auto">
        <button
          {...attributes}
          {...listeners}
          className="mr-2 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing p-1 rounded-md hover:bg-secondary"
          aria-label="Arrossegar per reordenar"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div
          className={`rounded-lg p-2.5 ${
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
          <h3 className="font-semibold text-foreground leading-snug">{step.title}</h3>
          <p className="text-[10px] font-bold tracking-wider text-muted-foreground mt-0.5 uppercase">
            {step.type === 'BIENVENIDA' ? 'Benvinguda' : step.type === 'TEXTO' ? 'Missatge de Text' : 'Enquesta Interactiva'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto mt-2 sm:mt-0 gap-2">
        <button
          onClick={() => onActivate(step._id)}
          className={`flex-1 sm:flex-none flex justify-center items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all font-display ${
            isActive 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "bg-card border border-border text-foreground hover:bg-secondary"
          }`}
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          {isActive ? "ACTIU" : "ACTIVAR"}
        </button>
        <button
          onClick={() => onRemove(step._id)}
          className="rounded-xl bg-card border border-border p-2.5 text-muted-foreground transition-all hover:bg-destructive/15 hover:border-destructive/30 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// --- Admin Dashboard Content ---
function AdminPageContent() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Multiple Presentations Dashboard State
  const [selectedPresentationId, setSelectedPresentationId] = useState<string | null>(null);
  const [newPresentationTitle, setNewPresentationTitle] = useState("");
  const [isCreatingPresentation, setIsCreatingPresentation] = useState(false);
  const [editingPresentationId, setEditingPresentationId] = useState<string | null>(null);
  const [editPresentationTitle, setEditPresentationTitle] = useState("");

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    const storedToken = sessionStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
    if (storedToken) setAdminToken(storedToken);

    // Dynamic selection via URL parameter
    const pId = searchParams.get("presentationId");
    if (pId) {
      setSelectedPresentationId(pId);
    }
  }, [searchParams]);

  // Check if backend has been deployed/updated with new schemas/endpoints
  // Since the user has deployed the backend using 'npx convex deploy', these endpoints are 100% active.
  // The 'in' operator fails on the Convex generated 'anyApi' Proxy at runtime.
  const hasPresentations = true;
  const hasMigration = true;
  const isBackendUpdated = true;

  // Convex Queries
  const presentations = useQuery(api.presentations.list) || [];
  const presentationState = useQuery(api.presentation.getState) as any;
  const stepsFromServer = useQuery(
    api.steps.list, 
    selectedPresentationId ? { presentationId: selectedPresentationId as any } : "skip"
  ) || [];

  const migrationInfo = useQuery(api.migration.checkPending) as any;
  const runMigration = useMutation(api.migration.run) as any;
  const [isMigrating, setIsMigrating] = useState(false);

  const handleRunMigration = async () => {
    if (!confirm("⚠️ Estàs a punt d'executar la migració de dades. Això associarà totes les diapositives i passos existents sense presentació a la presentació 'Agentes y WordPress'. Vols continuar?")) return;
    setIsMigrating(true);
    try {
      const result = await runMigration();
      if (result?.success) {
        alert("🎉 Migració completada amb èxit! S'han migrat " + result.slidesMigrated + " diapositives i " + result.stepsMigrated + " passos a la presentació 'Agentes y WordPress'.");
      }
    } catch (err: any) {
      alert("Error al migrar: " + (err.data || err.message || "Error desconegut"));
    } finally {
      setIsMigrating(false);
    }
  };

  const activePresentation = presentations.find((p) => p._id === selectedPresentationId);

  // Optimistic Dnd sorting local state
  const [localSteps, setLocalSteps] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      setLocalSteps(stepsFromServer);
    }
  }, [stepsFromServer, isDragging]);

  // Mutations
  const createPresentationMutation = useMutation(api.presentations.create);
  const updatePresentationMutation = useMutation(api.presentations.update);
  const removePresentationMutation = useMutation(api.presentations.remove);
  
  const setActivePresentationMutation = useMutation(api.presentation.setActivePresentation);
  const resetPresentationMutation = useMutation(api.presentation.resetPresentation);
  
  const activateStepMutation = useMutation(api.presentation.activateStep);
  const createStepMutation = useMutation(api.steps.create);
  const removeStepMutation = useMutation(api.steps.remove);
  const reorderStepsMutation = useMutation(api.steps.reorder);

  // Form states for creating a new step
  const [type, setType] = useState<"BIENVENIDA" | "TEXTO" | "ENCUESTA">("BIENVENIDA");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const activeStep = localSteps.find((s: any) => s._id === presentationState?.currentStepId);

  // drag-and-drop sensor bindings
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = () => setIsDragging(true);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    if (!over || active.id === over.id) return;

    const oldIndex = localSteps.findIndex((s: any) => s._id === active.id);
    const newIndex = localSteps.findIndex((s: any) => s._id === over.id);
    const newOrder = arrayMove(localSteps, oldIndex, newIndex);

    setLocalSteps(newOrder);

    try {
      await reorderStepsMutation({
        orderedIds: newOrder.map((s: any) => s._id),
        adminToken: adminToken || "",
      });
    } catch (err: any) {
      setLocalSteps(stepsFromServer); // Rollback
      alert("Error al reordenar: " + (err.data || err.message || "Error desconegut"));
    }
  };

  // Auth management
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
        sessionStorage.setItem(ADMIN_TOKEN_KEY, tokenInput);
        localStorage.setItem(ADMIN_TOKEN_KEY, tokenInput);
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
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminToken(null);
    setTokenInput("");
    setError(null);
    setSelectedPresentationId(null);
  };

  // --- Presentation Mutations ---
  const handleCreatePresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresentationTitle.trim() || !adminToken) return;
    setIsCreatingPresentation(true);
    try {
      const newId = await createPresentationMutation({
        title: newPresentationTitle.trim(),
        adminToken,
      });
      setNewPresentationTitle("");
      setSelectedPresentationId(newId);
    } catch (err: any) {
      alert("Error al crear la presentació: " + (err.data || err.message || "Error desconegut"));
    } finally {
      setIsCreatingPresentation(false);
    }
  };

  const handleRenamePresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPresentationId || !editPresentationTitle.trim() || !adminToken) return;
    try {
      await updatePresentationMutation({
        id: editingPresentationId as any,
        title: editPresentationTitle.trim(),
        adminToken,
      });
      setEditingPresentationId(null);
      setEditPresentationTitle("");
    } catch (err: any) {
      alert("Error en desar el canvi de nom: " + (err.data || err.message || "Error desconegut"));
    }
  };

  const handleRemovePresentation = async (id: any, title: string) => {
    if (!adminToken) return;
    const msg = `⚠️ ATENCIÓ CRÍTICA: Estàs a punt d'eliminar la presentació "${title}".\n\nAquesta acció esborrarà de forma permanent TOT el contingut d'aquesta presentació, incloent-hi slides, interaccions de telèfon, imatges i vots associats. No es podrà recuperar.\n\nVols continuar?`;
    if (!confirm(msg)) return;

    try {
      await removePresentationMutation({ id, adminToken });
      if (selectedPresentationId === id) {
        setSelectedPresentationId(null);
      }
    } catch (err: any) {
      alert("Error en eliminar la presentació: " + (err.data || err.message || "Error desconegut"));
    }
  };

  const handleActivatePresentation = async (id: any) => {
    if (!adminToken) return;
    try {
      await setActivePresentationMutation({ id, adminToken });
    } catch (err: any) {
      alert("Error en activar la presentació: " + (err.data || err.message || "Error desconegut"));
    }
  };

  // --- Steps Mutations ---
  const handleCreateStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPresentationId || !adminToken) return;
    try {
      await createStepMutation({
        presentationId: selectedPresentationId as any,
        type,
        title: title.trim(),
        content: type === "TEXTO" ? content.trim() : undefined,
        options: type === "ENCUESTA" ? options.filter((o) => o.trim() !== "") : undefined,
        adminToken,
      });
      setTitle("");
      setContent("");
      setOptions(["", ""]);
    } catch (err: any) {
      alert("Error en crear el pas: " + (err.data || err.message || "Error desconegut"));
    }
  };

  const handleRemoveStep = async (id: any) => {
    if (!adminToken) return;
    try {
      await removeStepMutation({ id, adminToken });
    } catch (err: any) {
      alert("Error en eliminar el pas: " + (err.data || err.message || "Error desconegut"));
    }
  };

  const handleActivateStep = async (id: any) => {
    if (!adminToken) return;
    try {
      await activateStepMutation({ id, adminToken });
    } catch (err: any) {
      alert("Error en activar el pas: " + (err.data || err.message || "Error desconegut"));
    }
  };

  const handleResetPresentation = async () => {
    if (!adminToken) return;
    if (!confirm("⚠️ ATENCIÓ: Estàs a punt de reiniciar aquesta presentació. Això desactivarà la slide i el pas de projecció, i posarà a ZERO tots els vots rebuts. Vols continuar?")) return;

    try {
      const res = await resetPresentationMutation({ adminToken });
      if (res && !res.success) {
        alert("Error al reiniciar: " + res.error);
        return;
      }
    } catch (err: any) {
      alert("Error en reiniciar: " + (err.data || err.message || "Error desconegut"));
    }
  };

  const addOption = () => {
    if (options.length < 4) setOptions([...options, ""]);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("ca-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (!isMounted) return null;

  // Render Server Update Warning Screen if Backend not yet deployed
  if (!isBackendUpdated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl space-y-8 rounded-3xl border border-amber-500/20 bg-card p-8 sm:p-10 text-center glass shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
          
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <AlertTriangle className="h-10 w-10 animate-bounce" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight font-display text-amber-500">
              Desplegament del Backend Requerit
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto font-light leading-relaxed">
              El frontend de producció s'ha actualitzat correctament, però el teu servidor de <strong>Convex</strong> encara està executant una versió antiga.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background/50 p-6 text-left space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Com solucionar-ho:</h3>
            <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-2.5 font-light">
              <li>Obre una terminal a la carpeta arrel del projecte local.</li>
              <li>Executa la següent comanda per pujar el backend i les noves taules a producció:</li>
            </ol>
            
            <div className="relative group rounded-xl bg-secondary/80 border border-border p-4.5 font-mono text-xs text-primary flex items-center justify-between overflow-x-auto">
              <span>npx convex deploy</span>
              <span className="text-[10px] bg-primary/10 px-2 py-1 rounded text-primary font-sans font-bold">
                Executa a la terminal
              </span>
            </div>
            
            <p className="text-[11px] text-muted-foreground/80 font-light leading-relaxed">
              💡 <strong>Consell:</strong> Si tens el projecte connectat a GitHub mitjançant la integració de Convex, el desplegament es farà automàticament. Si no, executa <code className="bg-secondary px-1.5 py-0.5 rounded text-amber-500 font-semibold font-mono">npx convex deploy</code> localment per actualitzar el teu backend de producció.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="rounded-2xl bg-amber-500 hover:bg-amber-600 px-8 py-3.5 font-bold text-white shadow-lg shadow-amber-500/10 transition-all font-display text-sm animate-pulse"
            >
              Comprovar de Nou
            </button>
            <Link
              href="/"
              className="rounded-2xl border border-border bg-card hover:bg-secondary/40 px-8 py-3.5 font-bold text-foreground transition-all font-display text-sm"
            >
              Tornar a l'Inici
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Render Login Panel
  if (!adminToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8 rounded-3xl border border-border bg-card p-10 text-center glass shadow-2xl"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-10 w-10 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">Accés Restringit</h1>
            <p className="text-sm text-muted-foreground">Introdueix el token de seguretat per gestionar el panell interactiu.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Token d'administració"
              className={`w-full rounded-2xl border bg-background/50 p-4 text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all text-center font-mono ${
                error ? "border-destructive focus:ring-destructive/30" : "border-border"
              }`}
              required
            />
            {error && (
              <p className="rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 text-center text-xs font-semibold text-destructive">
                ⚠️ {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isValidating}
              className="w-full rounded-2xl bg-primary py-4 font-bold text-white transition-all hover:opacity-95 shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-50 font-display"
            >
              {isValidating ? "Verificant..." : "Desbloquejar Panell"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // --- RENDER DASHBOARD MODE ---
  if (!selectedPresentationId) {
    const activeGlobalPres = presentations.find(p => p._id === presentationState?.activePresentationId);

    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 text-foreground lg:p-12">
        <div className="mx-auto max-w-6xl space-y-10">
          <header className="flex flex-col gap-6 md:flex-row md:items-center justify-between border-b border-border/60 pb-8">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-secondary-foreground font-display">
                  Gestor de Presentacions
                </h1>
                <ThemeToggle />
              </div>
              <p className="text-muted-foreground mt-1.5 font-light">Crea, edita i selecciona les presentacions interactives de l'esdeveniment.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {activeGlobalPres && (
                <div className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/5 px-4.5 py-2 text-xs font-bold text-green-500 animate-pulse">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  PROJECCIÓ ACTIVA: {activeGlobalPres.title}
                </div>
              )}
              <button 
                onClick={() => window.open("/presenter", "_blank")}
                className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4.5 py-2 text-xs font-bold text-primary hover:bg-primary/15 transition-all font-display"
              >
                <Monitor className="h-4 w-4" />
                Obrir Projector
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-full bg-destructive/10 border border-destructive/20 px-4.5 py-2 text-xs font-bold text-destructive transition-all hover:bg-destructive/15 font-display"
              >
                <LogOut className="h-4 w-4" />
                Tancar sessió
              </button>
            </div>
          </header>

          {migrationInfo?.needsMigration && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 text-sm text-amber-600 dark:text-amber-400">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-base">Actualització de dades requerida</p>
                  <p className="font-light text-xs text-amber-600/80 dark:text-amber-400/80">
                    S'han detectat {migrationInfo.pendingSlides} diapositives i {migrationInfo.pendingSteps} passos antics que no pertanyen a cap presentació.
                    Si no es migren, no apareixeran al projector ni en les edicions del panell principal.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRunMigration}
                disabled={isMigrating}
                className="flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 px-6 py-3 font-bold text-white shadow-lg shadow-amber-500/10 disabled:opacity-50 transition-all font-display text-xs whitespace-nowrap"
              >
                {isMigrating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Executar Migració Ara
              </button>
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-3 items-start">
            {/* Create Presentation Card */}
            <section className="rounded-3xl border border-border bg-card p-6 glass shadow-sm space-y-5 lg:col-span-1">
              <div className="space-y-1">
                <h2 className="flex items-center gap-2 text-lg font-bold text-secondary-foreground font-display">
                  <Plus className="h-5 w-5 text-primary" />
                  Nova Presentació
                </h2>
                <p className="text-xs text-muted-foreground">Defineix una nova presentació des de zero per a l'esdeveniment.</p>
              </div>

              <form onSubmit={handleCreatePresentation} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Títol de la presentació</label>
                  <input
                    value={newPresentationTitle}
                    onChange={(e) => setNewPresentationTitle(e.target.value)}
                    placeholder="Ex: Agentes y WordPress"
                    className="w-full rounded-2xl border border-border bg-background p-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreatingPresentation || !newPresentationTitle.trim()}
                  className="w-full rounded-2xl bg-primary py-3.5 font-bold text-white transition-all hover:opacity-95 shadow-md shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-display flex items-center justify-center gap-2"
                >
                  {isCreatingPresentation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Crear Presentació
                </button>
              </form>
            </section>

            {/* List of Presentations */}
            <section className="lg:col-span-2 space-y-5">
              <h2 className="text-xl font-bold font-display text-secondary-foreground flex items-center justify-between">
                <span>Presentacions existents</span>
                <span className="text-xs font-normal text-muted-foreground bg-secondary/60 px-3 py-1 rounded-full">
                  {presentations.length} total
                </span>
              </h2>

              <div className="space-y-4">
                {presentations.map((p) => {
                  const isCurrentlyActive = presentationState?.activePresentationId === p._id;
                  const isEditing = editingPresentationId === p._id;

                  return (
                    <motion.div
                      key={p._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`relative overflow-hidden rounded-3xl border p-6 transition-all duration-300 ${
                        isCurrentlyActive
                          ? "border-primary bg-primary/[0.03] ring-1 ring-primary/20 shadow-md"
                          : "border-border bg-card/40 hover:bg-card/70 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2 flex-1">
                          {isEditing ? (
                            <form onSubmit={handleRenamePresentation} className="flex items-center gap-2 max-w-md">
                              <input
                                value={editPresentationTitle}
                                onChange={(e) => setEditPresentationTitle(e.target.value)}
                                className="bg-background border border-border rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 flex-1"
                                placeholder="Nou títol"
                                autoFocus
                              />
                              <button
                                type="submit"
                                className="rounded-xl bg-primary text-white font-bold text-xs px-3.5 py-2 hover:opacity-90 transition-all font-display"
                              >
                                Desar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPresentationId(null)}
                                className="rounded-xl bg-secondary text-foreground text-xs px-3.5 py-2 hover:bg-secondary/80 transition-all font-display"
                              >
                                Cancel·lar
                              </button>
                            </form>
                          ) : (
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl font-bold tracking-tight font-display">{p.title}</h3>
                              {isCurrentlyActive && (
                                <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-[9px] font-extrabold text-green-500 border border-green-500/25 animate-pulse uppercase">
                                  Activa
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-light">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 opacity-70" />
                              Creació: {formatDate(p.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="flex flex-wrap items-center gap-2 self-end sm:self-start">
                          <button
                            onClick={() => handleActivatePresentation(p._id)}
                            disabled={isCurrentlyActive}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all font-display ${
                              isCurrentlyActive
                                ? "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 cursor-default"
                                : "bg-primary text-white hover:opacity-95 shadow-md shadow-primary/10"
                            }`}
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            {isCurrentlyActive ? "PROJECCIÓ ACTIVA" : "ACTIVAR PROJECCIÓ"}
                          </button>

                          <button
                            onClick={() => {
                              setSelectedPresentationId(p._id);
                              // Sync parameters to history to remember selection
                              router.push(`/admin?presentationId=${p._id}`);
                            }}
                            className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-xs font-bold text-foreground hover:bg-secondary transition-all font-display"
                          >
                            Editar Pasos
                          </button>

                          <Link
                            href={`/admin/slides?presentationId=${p._id}`}
                            className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-xs font-bold text-foreground hover:bg-secondary transition-all font-display"
                          >
                            Editar Slides
                          </Link>

                          {!isEditing && (
                            <button
                              onClick={() => {
                                setEditingPresentationId(p._id);
                                setEditPresentationTitle(p.title);
                              }}
                              className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground hover:text-foreground transition-all"
                              title="Canviar el nom"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleRemovePresentation(p._id, p.title)}
                            className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground hover:bg-destructive/10 hover:border-destructive/20 hover:text-destructive transition-all"
                            title="Eliminar presentació"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {presentations.length === 0 && (
                  <div className="text-center py-20 rounded-3xl border-2 border-dashed border-border bg-card/10">
                    <p className="text-muted-foreground font-light">No hi ha cap presentació creada encara. Fes-ne servir el formulari de l'esquerra.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER DETAIL MODE ---
  const isSelectedActiveGlobally = presentationState?.activePresentationId === selectedPresentationId;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 text-foreground lg:p-12">
      <div className="mx-auto max-w-6xl space-y-8 sm:space-y-12">
        <header className="flex flex-col gap-6 md:flex-row md:items-center justify-between border-b border-border/60 pb-8">
          <div className="flex items-start sm:items-center gap-4">
            <button
              onClick={() => {
                setSelectedPresentationId(null);
                router.push("/admin"); // Clear the param
              }}
              className="rounded-full bg-secondary hover:bg-secondary/80 p-2.5 text-muted-foreground hover:text-foreground transition-colors mt-1 sm:mt-0"
              title="Tornar al tauler"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center flex-wrap gap-2.5">
                <h1 className="text-3xl font-extrabold tracking-tight text-secondary-foreground font-display leading-none">
                  {activePresentation?.title || "Detalls de la Presentació"}
                </h1>
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold border ${
                  isSelectedActiveGlobally 
                    ? "bg-green-500/10 border-green-500/25 text-green-500 animate-pulse" 
                    : "bg-secondary border-border text-muted-foreground"
                } uppercase`}>
                  {isSelectedActiveGlobally ? "Projectant" : "En espera"}
                </span>
                <ThemeToggle />
              </div>
              <p className="text-sm text-muted-foreground mt-1.5 font-light">Gestió de flux interactiu de preguntes i missatges del públic.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {isSelectedActiveGlobally && (
              <button 
                onClick={handleResetPresentation}
                className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/15 transition-all font-display"
                title="Reiniciar vots a zero i netejar projecció"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reiniciar Presentació
              </button>
            )}
            
            <Link
              href={`/admin/slides?presentationId=${selectedPresentationId}`}
              className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2.5 text-xs font-bold text-primary hover:bg-primary/15 transition-all font-display"
            >
              <Monitor className="h-3.5 w-3.5" />
              Editor Slides
            </Link>

            <Link
              href="/admin/remote"
              className="flex items-center gap-2 rounded-xl border border-secondary bg-secondary/50 px-4 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-secondary font-display"
              title="Comandament mòbil per gestionar diapositives"
            >
              <Smartphone className="h-3.5 w-3.5" />
              Comandament Mòbil
            </Link>
          </div>
        </header>

        {/* Dynamic Detail Alert */}
        {!isSelectedActiveGlobally && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4.5 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Aquesta presentació no està activa en projecció</p>
              <p className="font-light text-xs text-amber-600/80 dark:text-amber-400/80">
                Pots afegir, reordenar i eliminar passos lliurement. Per rebre vots en directe del públic o reflectir els passos a la pantalla, primer has d'activar la presentació des del tauler principal.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Create Step Form */}
          <section className="rounded-3xl border border-border bg-card p-8 glass shadow-sm">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-secondary-foreground font-display">
              <Plus className="h-5 w-5 text-primary" />
              Crear nou pas interactiu
            </h2>
            
            <form onSubmit={handleCreateStep} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(["BIENVENIDA", "TEXTO", "ENCUESTA"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex flex-col items-center gap-2 rounded-2xl p-4 text-xs font-semibold transition-all ${
                      type === t ? "bg-primary text-white shadow-md shadow-primary/10" : "bg-secondary/70 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {t === "BIENVENIDA" && <Smile className="h-5 w-5" />}
                    {t === "TEXTO" && <Type className="h-5 w-5" />}
                    {t === "ENCUESTA" && <BarChart3 className="h-5 w-5" />}
                    {t === 'BIENVENIDA' ? 'Benvinguda' : t === 'TEXTO' ? 'Text Llire' : 'Enquesta'}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Títol o Pregunta</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Quin agent t'agrada més?"
                  className="w-full rounded-2xl border border-border bg-background p-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  required
                />
                <p className="text-[10px] text-muted-foreground font-light">Suporta emojis 🎉 i format bàsic.</p>
              </div>

              {type === "TEXTO" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contingut del missatge</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`Escriu el missatge aquí...\n\nEx: **Benvinguts** a la sessió de Xammar Digital! 🚀`}
                    className="h-36 w-full rounded-2xl border border-border bg-background p-3.5 text-foreground outline-none focus:ring-2 focus:ring-primary/40 transition-all font-mono text-xs leading-relaxed"
                  />
                  <p className="text-[10px] text-muted-foreground font-light">Suporta: <code className="bg-secondary px-1 rounded">**negreta**</code> · <code className="bg-secondary px-1 rounded">[link](url)</code> · salts de línia.</p>
                </div>
              )}

              {type === "ENCUESTA" && (
                <div className="space-y-4">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Opcions de resposta (Màxim 4)</label>
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
                        className="w-full rounded-2xl border border-border bg-background p-3.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        required
                      />
                    ))}
                  </div>
                  {options.length < 4 && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="text-xs font-bold text-primary hover:opacity-85 transition-all"
                    >
                      + Afegir una altra opció
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-2xl bg-primary py-4 font-bold text-white transition-all hover:opacity-95 shadow-lg shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed font-display"
                disabled={!title}
              >
                Crear pas interactiu
              </button>
            </form>
          </section>

          {/* Steps List */}
          <section className="space-y-6">
            <h2 className="flex items-center justify-between text-xl font-bold font-display text-secondary-foreground">
              <span>Llista de passos</span>
              <span className="text-xs font-normal text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                {localSteps.length} passos · arrossega per ordenar
              </span>
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
                          onActivate={handleActivateStep}
                          onRemove={handleRemoveStep}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </SortableContext>
              </DndContext>

              {localSteps.length === 0 && (
                <div className="text-center py-20 rounded-3xl border-2 border-dashed border-border bg-card/10">
                  <p className="text-muted-foreground font-light">No hi ha cap pas interactiu encara. Comença per crear el primer a l'esquerra.</p>
                </div>
              )}
            </div>

            {/* Live Results Panel */}
            {isSelectedActiveGlobally && activeStep?.type === "ENCUESTA" && activeStep.options && activeStep.votes && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-6 sm:p-8 glass shadow-md"
              >
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-bold font-display text-secondary-foreground flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                    Resultats en Directe
                  </h2>
                  <span className="animate-pulse text-xs font-bold text-indigo-500 tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/25">
                    LIVE
                  </span>
                </div>

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
                        tick={{ fill: "currentColor", fontSize: 11, opacity: 0.7 }}
                        width={90}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "12px" }}
                        itemStyle={{ color: "var(--color-foreground)" }}
                      />
                      <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={16}>
                        {activeStep.options.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 justify-center">
                  {activeStep.options.map((opt: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-xl border border-border/40">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs font-semibold text-muted-foreground">{activeStep.votes![i]} vots</span>
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

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground font-light">Carregant el tauler de control...</p>
        </div>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  );
}
