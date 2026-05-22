"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState, useEffect, use } from "react";
import { 
  ArrowLeft, 
  Save, 
  Image as ImageIcon, 
  Type, 
  Link as LinkIcon, 
  Zap,
  ChevronRight,
  Loader2
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

export default function SlideEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params) as { id: any };
  const router = useRouter();
  
  // Passcode security bypassed as requested by the user to allow anyone to enter
  const [adminToken, setAdminToken] = useState<string | null>("bypass");
  const [isMounted, setIsMounted] = useState(false);
  const [markdown, setMarkdown] = useState<string>("");
  const [internalTitle, setInternalTitle] = useState<string>("Nova Diapositiva");
  const [fontScale, setFontScale] = useState<number>(1.0);
  const [linkedStepId, setLinkedStepId] = useState<string | null>(null);
  const [autoActivate, setAutoActivate] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
        router.push(`/admin/slides${slide?.presentationId ? `?presentationId=${slide.presentationId}` : ""}`);
      }
    } else {
      router.push(`/admin/slides${slide?.presentationId ? `?presentationId=${slide.presentationId}` : ""}`);
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

      // Insert into markdown at current cursor or end
      setMarkdown(prev => prev + `\n\n![${file.name}](${asset.url})\n`);
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

            {/* Live Preview Overlay */}
            <div className="space-y-4">
               <label className="text-sm font-semibold">Preview real (Estil Presentador)</label>
               <div className="aspect-video w-full rounded-2xl bg-[#1A365D] p-8 text-white shadow-2xl overflow-hidden flex flex-col items-center justify-center text-center">
                  <div style={{ fontSize: `${(fontScale || 1.0) * 0.8}rem` }} className="w-full max-w-full overflow-hidden prose prose-invert prose-orange">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
