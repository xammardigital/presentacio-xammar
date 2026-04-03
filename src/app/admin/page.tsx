"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Plus, Trash2, Play, BarChart3, Type, Smile, Lock, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";

const COLORS = ["#6366f1", "#a855f7", "#ec4899", "#f97316"];

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

  const steps = (useQuery(api.steps.list) as any) || [];
  const presentationState = useQuery(api.presentation.getState) as any;
  const currentStep = useQuery(api.steps.get, { id: presentationState?.currentStepId ?? null }) as any;
  
  // Mutations
  const activateMutation = useMutation(api.presentation.activateStep);
  const createStepMutation = useMutation(api.steps.create);
  const removeStepMutation = useMutation(api.steps.remove);
  
  // State for the form
  const [type, setType] = useState<"BIENVENIDA" | "TEXTO" | "ENCUESTA">("BIENVENIDA");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const activeStep = steps.find((s: any) => s._id === presentationState?.currentStepId);

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
        setError(data.error || "Token incorrecto. Inténtalo de nuevo.");
      }
    } catch (err) {
      setError("Error de red. Comprueba tu conexión.");
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
    if (!adminToken) return;
    try {
      await createStepMutation({
        type,
        title,
        content: type === "TEXTO" ? content : undefined,
        options: type === "ENCUESTA" ? options.filter(o => o.trim() !== "") : undefined,
        adminToken,
      });
      setTitle("");
      setContent("");
      setOptions(["", ""]);
    } catch (err) {
      alert("Error: Token inválido o sesión expirada.");
      handleLogout();
    }
  };

  const handleRemove = async (id: any) => {
    if (!adminToken) return;
    try {
      await removeStepMutation({ id, adminToken });
    } catch (err) {
      alert("Error: No se pudo eliminar el paso.");
    }
  };

  const handleActivate = async (id: any) => {
    if (!adminToken) return;
    try {
      await activateMutation({ id, adminToken });
    } catch (err) {
      alert("Error: No se pudo activar el paso.");
    }
  };

  const addOption = () => {
    if (options.length < 4) setOptions([...options, ""]);
  };

  if (!isMounted) return null;

  if (!adminToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8 rounded-3xl border border-slate-800 bg-slate-900/50 p-10 text-center glass"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
            <Lock className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Acceso Restringido</h1>
            <p className="text-slate-400">Introduce el token de administrador para gestionar la presentación.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Token de administración"
              className={`w-full rounded-xl border bg-slate-950 p-4 text-white outline-none focus:ring-2 focus:ring-indigo-500 ${error ? "border-red-500" : "border-slate-700"}`}
              required
            />
            {error && (
              <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 text-left">
                ⚠️ {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isValidating}
              className="w-full rounded-xl bg-indigo-600 py-4 font-bold text-white transition-all hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? "Verificando..." : "Desbloquear Panel"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100 lg:p-12">
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Panel de Control</h1>
            <p className="text-slate-400">Gestiona los pasos de tu presentación interactiva.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-slate-900/50 px-4 py-2 border border-slate-800">
              <div className={`h-2 w-2 rounded-full ${presentationState?.currentStepId ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-sm font-medium">{presentationState?.currentStepId ? 'Presentación Activa' : 'En espera'}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-sm font-bold text-red-500 transition-all hover:bg-red-500/20"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Create Step Form */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/30 p-8 glass">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
              <Plus className="h-5 w-5 text-indigo-400" />
              Crear Nuevo Paso
            </h2>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-3 gap-2">
                {(["BIENVENIDA", "TEXTO", "ENCUESTA"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex flex-col items-center gap-2 rounded-xl p-4 text-xs font-medium transition-all ${
                      type === t ? "bg-indigo-600 text-white" : "bg-slate-800/50 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {t === "BIENVENIDA" && <Smile className="h-5 w-5" />}
                    {t === "TEXTO" && <Type className="h-5 w-5" />}
                    {t === "ENCUESTA" && <BarChart3 className="h-5 w-5" />}
                    {t}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Título / Pregunta</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: ¿Qué te parece esta tecnología?"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {type === "TEXTO" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Contenido</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Escribe el mensaje aquí..."
                    className="h-32 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {type === "ENCUESTA" && (
                <div className="space-y-4">
                  <label className="text-sm font-medium text-slate-400">Opciones (Máximo 4)</label>
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
                        placeholder={`Opción ${idx + 1}`}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    ))}
                  </div>
                  {options.length < 4 && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      + Añadir otra opción
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 py-4 font-bold text-white transition-all hover:bg-indigo-500 disabled:opacity-50"
                disabled={!title}
              >
                Crear Paso
              </button>
            </form>
          </section>

          {/* Steps List */}
          <section className="space-y-6">
            <h2 className="flex items-center justify-between text-xl font-semibold">
              <span>Lista de Pasos</span>
              <span className="text-xs font-normal text-slate-500">{steps.length} pasos totales</span>
            </h2>
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {steps.map((step: any) => (
                  <motion.div
                    key={step._id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`group relative flex items-center justify-between rounded-2xl border p-5 transition-all ${
                      presentationState?.currentStepId === step._id
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-slate-800 bg-slate-900/20"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`rounded-lg p-2 ${
                        step.type === 'BIENVENIDA' ? 'bg-amber-500/20 text-amber-500' :
                        step.type === 'TEXTO' ? 'bg-sky-500/20 text-sky-500' :
                        'bg-emerald-500/20 text-emerald-500'
                      }`}>
                        {step.type === 'BIENVENIDA' && <Smile className="h-5 w-5" />}
                        {step.type === 'TEXTO' && <Type className="h-5 w-5" />}
                        {step.type === 'ENCUESTA' && <BarChart3 className="h-5 w-5" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{step.title}</h3>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">{step.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleActivate(step._id)}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                          presentationState?.currentStepId === step._id
                            ? "bg-indigo-500 text-white"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        <Play className="h-4 w-4 fill-current" />
                        {presentationState?.currentStepId === step._id ? "ACTIVO" : "ACTIVAR"}
                      </button>
                      <button
                        onClick={() => handleRemove(step._id)}
                        className="rounded-lg bg-slate-800 p-2 text-slate-500 transition-all hover:bg-red-500/20 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Live Results Panel */}
            {activeStep?.type === "ENCUESTA" && activeStep.options && activeStep.votes && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-8 feedback-card glass"
              >
                <h2 className="mb-6 flex items-center justify-between text-xl font-semibold">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-indigo-400" />
                    Resultados en Vivo
                  </span>
                  <span className="text-sm font-medium text-indigo-400 animate-pulse">LIVE</span>
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
                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: '8px' }}
                        itemStyle={{ color: "#fff" }}
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
                      <span className="text-xs text-slate-400">{activeStep.votes![i]} votos</span>
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
