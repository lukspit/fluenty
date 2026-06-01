"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  CheckIcon, 
  XIcon, 
  ShareIcon, 
  ChevronLeftIcon, 
  SparklesIcon, 
  ZapIcon 
} from "@/components/Icons";

interface Correction {
  original: string;
  corrected: string;
  explanation: string;
}

interface VocabImprovement {
  word_used: string;
  suggestions: string[];
  context: string;
}

interface AnalysisResult {
  score_overall: number;
  score_grammar: number;
  score_vocabulary: number;
  score_fluency: number;
  corrections: Correction[];
  vocabulary_improvements: VocabImprovement[];
  highlights: string;
  instagram_card_phrase: string;
}

export default function ResultScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<"feedback" | "vocabulary">("feedback");
  const [showShareModal, setShowShareModal] = useState(false);
  const [cardTheme, setCardTheme] = useState<"obsidian" | "neon" | "minimal">("obsidian");

  const [streak, setStreak] = useState(12);
  const [phaseUnlocked, setPhaseUnlocked] = useState(false);
  const [trackCompleted, setTrackCompleted] = useState(false);
  const [newTrackName, setNewTrackName] = useState("");
  const [oldTrackName, setOldTrackName] = useState("");

  const [isShortSession, setIsShortSession] = useState(false);
  const [shortSessionMessage, setShortSessionMessage] = useState("");

  const handleRestartCall = () => {
    const pathId = localStorage.getItem("fluenty_latest_path_id");
    const scenario = localStorage.getItem("fluenty_latest_scenario") || "casual";
    if (pathId) {
      router.push(`/call?pathId=${pathId}`);
    } else {
      router.push(`/call?scenario=${scenario}`);
    }
  };

  const handleGoToNextPhase = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      
      const { data: nextPhase } = await supabase
        .from("fluenty_learning_paths")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("status", "unlocked")
        .order("phase_number", { ascending: true })
        .limit(1)
        .single();
        
      if (nextPhase) {
        router.push(`/call?pathId=${nextPhase.id}`);
      } else {
        router.push("/");
      }
    } catch (e) {
      router.push("/");
    }
  };

  const formatBoldText = (text: string) => {
    if (!text) return "";
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-primary font-black">{part}</strong> : part);
  };

  const renderHighlights = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("*")) {
        const content = trimmed.substring(1).trim();
        return (
          <li key={i} className="text-xs leading-relaxed text-foreground/90 font-medium ml-4 list-disc mb-1.5">
            {formatBoldText(content)}
          </li>
        );
      }
      if (trimmed.startsWith("-")) {
        const content = trimmed.substring(1).trim();
        return (
          <li key={i} className="text-xs leading-relaxed text-foreground/90 font-medium ml-4 list-disc mb-1.5">
            {formatBoldText(content)}
          </li>
        );
      }
      if (!trimmed) {
        return <div key={i} className="h-2" />;
      }
      return (
        <p key={i} className="text-xs leading-relaxed text-foreground/90 font-medium mb-2.5">
          {formatBoldText(line)}
        </p>
      );
    });
  };

  // Carregar dados e analisar conversa
  useEffect(() => {
    const analyzeSession = async () => {
      try {
        if (typeof window === "undefined") return;

        const chatDataStr = localStorage.getItem("fluenty_latest_chat");
        const scenario = localStorage.getItem("fluenty_latest_scenario") || "casual";
        const durationStr = localStorage.getItem("fluenty_latest_duration") || "0";
        const duration = parseInt(durationStr, 10);
        const pathId = localStorage.getItem("fluenty_latest_path_id") || null;

        if (!chatDataStr) {
          setError("Nenhum dado de conversação recente encontrado.");
          setLoading(false);
          return;
        }

        const history = JSON.parse(chatDataStr);

        if (history.length === 0) {
          setError("A chamada foi encerrada sem interação falada.");
          setLoading(false);
          return;
        }

        // Buscar sessão ativa e obter token JWT
        const { data: { session } } = await supabase.auth.getSession();
        
        // Puxa informações do profile do usuário logado se disponível
        if (session?.user?.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("streak")
            .eq("id", session.user.id)
            .single();
          if (profile?.streak) {
            setStreak(profile.streak);
          }
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json"
        };

        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        // Requisição para a API de análise
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers,
          body: JSON.stringify({ history, scenario, duration, pathId })
        });

        if (!response.ok) {
          throw new Error("Falha ao analisar a conversa.");
        }

        const data: any = await response.json();
        
        if (data.isShortSession) {
          setIsShortSession(true);
          setShortSessionMessage(data.message);
          setLoading(false);
          return;
        }

        setResult(data);
        if (data.phase_unlocked) {
          setPhaseUnlocked(true);
        }
        if (data.track_completed) {
          setTrackCompleted(true);
          setNewTrackName(data.new_track_name || "");
          setOldTrackName(data.old_track_name || "");
        }
        setLoading(false);

      } catch (err: any) {
        console.error("Erro na análise:", err);
        setError(err.message || "Ocorreu um erro ao gerar a sua nota.");
        setLoading(false);
      }
    };

    analyzeSession();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 w-full max-w-md mx-auto flex flex-col items-center justify-center px-4 py-12">
        {/* Spinner animado em CSS puro */}
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-muted-slate/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
        </div>
        <p className="text-sm font-bold uppercase tracking-widest text-primary animate-pulse">
          Analisando sua fluência...
        </p>
        <p className="text-[11px] text-muted-text mt-2 text-center font-medium">
          Nossa IA está revisando sua pronúncia, gramática e vocabulário.
        </p>
      </div>
    );
  }

  if (isShortSession) {
    return (
      <div className="flex-grow w-full max-w-md mx-auto flex flex-col items-center justify-center px-4 py-12 text-center bg-background min-h-screen">
        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-6">
          <SparklesIcon size={24} className="animate-pulse" />
        </div>
        <h2 className="text-base font-black uppercase tracking-wider text-white mb-3">Sessão muito curta</h2>
        <p className="text-xs text-muted-text leading-relaxed max-w-xs mb-8">
          {shortSessionMessage}
        </p>
        
        <div className="w-full flex flex-col gap-3 max-w-[280px]">
          <button
            onClick={handleRestartCall}
            className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-background font-bold uppercase tracking-widest text-[10px] transition duration-300 shadow-[0_0_15px_rgba(204,255,0,0.2)] cursor-pointer"
          >
            Tentar Novamente
          </button>
          <Link
            href="/"
            className="w-full py-3.5 rounded-xl border border-muted-slate/30 hover:bg-muted-slate/15 text-white font-bold uppercase tracking-widest text-[10px] transition duration-300 flex items-center justify-center cursor-pointer"
          >
            Voltar ao Menu
          </Link>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="flex-grow w-full max-w-md mx-auto flex flex-col items-center justify-center px-4 py-12 text-center bg-background min-h-screen">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-4">
          <XIcon size={24} />
        </div>
        <h2 className="text-md font-bold uppercase tracking-wider mb-2">Ops, algo deu errado!</h2>
        <p className="text-xs text-muted-text mb-6">{error || "Não foi possível carregar a nota."}</p>
        <Link 
          href="/" 
          className="text-xs font-bold bg-primary hover:bg-primary-hover text-background px-6 py-3 rounded-xl uppercase tracking-widest transition"
        >
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  // Cores do anel circular de progresso (calcula o stroke-dashoffset baseado na nota)
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (result.score_overall / 100) * circumference;

  return (
    <div className="flex-1 w-full max-w-md mx-auto flex flex-col justify-between px-4 py-6 md:max-w-2xl lg:max-w-4xl relative">
      
      {/* Top Header */}
      <header className="flex items-center justify-between w-full mb-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-bold text-muted-text hover:text-foreground uppercase tracking-widest transition"
        >
          <ChevronLeftIcon size={14} /> Fechar
        </Link>
        <span className="text-[10px] text-muted-text font-bold tracking-widest uppercase">
          Resultado da Sessão
        </span>
        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-card-bg border border-muted-slate/30 text-primary">
          <SparklesIcon size={18} />
        </div>
      </header>

      {/* Banner de Celebração de Fase Desbloqueada */}
      {phaseUnlocked && (
        <section className="w-full bg-primary/10 border border-primary/30 rounded-xl p-4.5 mb-6 text-center shadow-[0_0_20px_rgba(204,255,0,0.15)] animate-pulse">
          <div className="flex items-center justify-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
            <SparklesIcon size={14} />
            <span>Fase Concluída! Próxima etapa liberada!</span>
          </div>
        </section>
      )}

      {/* Main Analysis Container */}
      <main className="flex-1 flex flex-col gap-6 w-full">
        
        {/* Score Ring Section */}
        <section className="flex flex-col items-center justify-center bg-card-bg border border-muted-slate/30 rounded-xl p-6 backdrop-blur-md">
          <div className="relative w-36 h-36 flex items-center justify-center mb-4">
            {/* SVG Ring Progress */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-muted-slate/20"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-primary drop-shadow-[0_0_8px_rgba(204,255,0,0.5)]"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-black tracking-tight">{result.score_overall}%</span>
              <span className="text-[9px] text-primary uppercase font-bold tracking-widest mt-0.5">Fluência</span>
            </div>
          </div>

          <div className="w-full grid grid-cols-3 gap-2 border-t border-muted-slate/30 pt-4 mt-2 text-center">
            <div>
              <span className="text-xs font-bold block">{result.score_grammar}%</span>
              <span className="text-[9px] text-muted-text font-bold uppercase tracking-wider">Gramática</span>
            </div>
            <div className="border-x border-muted-slate/30">
              <span className="text-xs font-bold block">{result.score_vocabulary}%</span>
              <span className="text-[9px] text-muted-text font-bold uppercase tracking-wider">Vocabulário</span>
            </div>
            <div>
              <span className="text-xs font-bold block">{result.score_fluency}%</span>
              <span className="text-[9px] text-muted-text font-bold uppercase tracking-wider">Fluidez</span>
            </div>
          </div>
        </section>

        {/* Highlights Banner */}
        <section className="bg-primary/5 border border-primary/10 rounded-xl p-4.5">
          <div className="flex items-center gap-2 mb-2">
            <ZapIcon size={14} className="text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
              Destaques e Insights
            </span>
          </div>
          <div className="w-full flex flex-col">
            {renderHighlights(result.highlights)}
          </div>
        </section>

        {/* Tabs and Review Lists */}
        <section className="w-full flex-1 flex flex-col">
          {/* Tab Selector */}
          <div className="flex border-b border-muted-slate/30 mb-4">
            <button
              onClick={() => setActiveTab("feedback")}
              className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === "feedback"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-text hover:text-foreground"
              }`}
            >
              Gramática ({result.corrections.length})
            </button>
            <button
              onClick={() => setActiveTab("vocabulary")}
              className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === "vocabulary"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-text hover:text-foreground"
              }`}
            >
              Vocabulário ({result.vocabulary_improvements.length})
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 flex flex-col gap-3.5 max-h-96 overflow-y-auto pr-1">
            {activeTab === "feedback" ? (
              result.corrections.length > 0 ? (
                result.corrections.map((corr, idx) => (
                  <div key={idx} className="bg-card-bg border border-muted-slate/20 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <XIcon size={9} />
                      </div>
                      <p className="text-xs line-through text-muted-text font-medium">
                        "{corr.original}"
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckIcon size={9} />
                      </div>
                      <p className="text-xs text-primary font-bold">
                        "{corr.corrected}"
                      </p>
                    </div>

                    <p className="text-[11px] leading-relaxed text-muted-text border-t border-muted-slate/10 pt-2 mt-1 font-medium">
                      {corr.explanation}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-xs text-muted-text font-medium">
                  Excelente! Nenhum erro gramatical identificado na sessão.
                </div>
              )
            ) : (
              result.vocabulary_improvements.length > 0 ? (
                result.vocabulary_improvements.map((vocab, idx) => (
                  <div key={idx} className="bg-card-bg border border-muted-slate/20 rounded-xl p-4 flex flex-col gap-2.5">
                    <div className="text-xs">
                      <span className="text-muted-text font-medium">Você usou: </span>
                      <span className="font-bold text-red-400 line-through">"{vocab.word_used}"</span>
                    </div>

                    <div className="text-xs flex flex-wrap items-center gap-1.5">
                      <span className="text-muted-text font-medium">Tente usar: </span>
                      {vocab.suggestions.map((sug, sIdx) => (
                        <span key={sIdx} className="bg-primary/10 border border-primary/20 text-primary font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                          {sug}
                        </span>
                      ))}
                    </div>

                    <p className="text-[10px] leading-relaxed text-muted-text italic bg-muted-slate/10 rounded-lg p-2 mt-1">
                      Contexto: ...{vocab.context}...
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-xs text-muted-text font-medium">
                  Seu vocabulário foi variado e rico na conversa!
                </div>
              )
            )}
          </div>
        </section>

        {/* Action Buttons: Next Phase / Share / Dashboard */}
        <section className="w-full mt-4 flex flex-col gap-3">
          <button
            onClick={() => setShowShareModal(true)}
            className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-background font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(204,255,0,0.15)] transition duration-300 active:scale-95 cursor-pointer"
          >
            <ShareIcon size={14} /> Compartilhar Conquista
          </button>

          <div className="flex gap-3 w-full">
            <Link
              href="/"
              className="flex-1 py-3.5 rounded-xl border border-muted-slate/30 hover:bg-muted-slate/15 text-white font-bold uppercase tracking-widest text-[10px] flex items-center justify-center transition duration-300 cursor-pointer"
            >
              Voltar ao Menu
            </Link>
            
            <button
              onClick={handleGoToNextPhase}
              className="flex-1 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-background font-bold uppercase tracking-widest text-[10px] flex items-center justify-center transition duration-300 shadow-[0_0_15px_rgba(204,255,0,0.1)] cursor-pointer"
            >
              Próxima Fase
            </button>
          </div>
        </section>

      </main>

      {/* Share Modal (Stories 9:16) */}
      {showShareModal && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-card-bg border border-muted-slate/50 rounded-xl p-6 w-full max-w-sm flex flex-col gap-6 relative shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                Visualização do Story (9:16)
              </span>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-[9px] font-bold text-muted-text hover:text-foreground uppercase tracking-widest"
              >
                Fechar
              </button>
            </div>

            {/* Simulated Instagram Card Container (9:16 aspect ratio) */}
            <div 
              id="instagram-card"
              className={`w-full aspect-[9/16] rounded-xl p-6 flex flex-col justify-between border relative overflow-hidden transition-all duration-300 ${
                cardTheme === "obsidian"
                  ? "bg-background border-muted-slate/50 text-foreground"
                  : cardTheme === "neon"
                  ? "bg-gradient-to-br from-primary/10 via-background to-primary/5 border-primary/20 text-foreground"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              {/* Card Watermark */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className="relative w-7 h-7">
                    <Image src="/logo-v3.png" alt="Fluenty Logo" fill className="object-contain" />
                  </div>
                  <span className={`text-xs font-black tracking-tight ${cardTheme === "minimal" ? "text-slate-900" : "text-white"}`}>
                    Fluenty
                  </span>
                </div>
                <span className={`text-[8px] font-bold tracking-widest uppercase ${cardTheme === "minimal" ? "text-slate-400" : "text-muted-text"}`}>
                  Speak Up!
                </span>
              </div>

              {/* Card Center: Score and Stats */}
              <div className="flex flex-col items-center text-center my-auto gap-4">
                {/* Score Number Badge */}
                <div className={`w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 ${
                  cardTheme === "minimal" ? "border-slate-200" : "border-primary"
                } ${cardTheme === "neon" ? "shadow-[0_0_15px_rgba(204,255,0,0.3)]" : ""}`}>
                  <span className="text-3xl font-black">{result.score_overall}%</span>
                  <span className={`text-[8px] font-bold uppercase tracking-widest ${cardTheme === "minimal" ? "text-slate-400" : "text-primary"}`}>
                    Fluência
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <p className={`text-sm font-bold leading-relaxed px-4 ${cardTheme === "minimal" ? "text-slate-800" : "text-white/90"}`}>
                    {result.instagram_card_phrase}
                  </p>
                  <span className={`text-[8px] font-bold uppercase tracking-wider ${cardTheme === "minimal" ? "text-slate-400" : "text-muted-text"}`}>
                    Avaliação em tempo real por IA
                  </span>
                </div>
              </div>

              {/* Card Footer: Streak and Performance */}
              <div className={`w-full border-t pt-4 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider ${
                cardTheme === "minimal" ? "border-slate-200 text-slate-500" : "border-muted-slate/20 text-muted-text"
              }`}>
                <span>STREAK: {streak} DIAS</span>
                <span className={cardTheme === "minimal" ? "text-slate-800" : "text-primary"}>
                  SPEAK UP!
                </span>
              </div>
            </div>

            {/* Theme Selector (Minimalist Controls) */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-bold text-muted-text uppercase tracking-widest text-center">
                Escolha o Tema do Card
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCardTheme("obsidian")}
                  className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-wider rounded-xl border transition ${
                    cardTheme === "obsidian"
                      ? "bg-primary border-primary text-background"
                      : "bg-muted-slate/20 border-muted-slate/30 text-muted-text"
                  }`}
                >
                  Obsidian
                </button>
                <button
                  onClick={() => setCardTheme("neon")}
                  className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-wider rounded-xl border transition ${
                    cardTheme === "neon"
                      ? "bg-primary border-primary text-background"
                      : "bg-muted-slate/20 border-muted-slate/30 text-muted-text"
                  }`}
                >
                  Neon
                </button>
                <button
                  onClick={() => setCardTheme("minimal")}
                  className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-wider rounded-xl border transition ${
                    cardTheme === "minimal"
                      ? "bg-primary border-primary text-background"
                      : "bg-muted-slate/20 border-muted-slate/30 text-muted-text"
                  }`}
                >
                  Minimal
                </button>
              </div>
            </div>

            {/* Final Action: Save */}
            <button
              onClick={() => {
                alert("Simulação: Imagem exportada e salva no seu rolo de câmera! Pronta para postar nos Stories.");
                setShowShareModal(false);
              }}
              className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-background font-bold uppercase tracking-widest text-xs transition duration-300"
            >
              Exportar Imagem
            </button>

          </div>
        </div>
      )}

      {/* Modal de Celebração de Fim de Trilha (Fase 10 - Premium Obsidian/Acid Lime) */}
      {trackCompleted && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-lg z-50 flex items-center justify-center p-4">
          <div className="bg-card-bg border border-primary/30 rounded-xl p-6.5 w-full max-w-sm flex flex-col gap-6 text-center shadow-[0_0_35px_rgba(204,255,0,0.15)] animate-scale-up relative overflow-hidden">
            {/* Elemento de background brilhante */}
            <div className="absolute -top-16 -left-16 w-32 h-32 rounded-full bg-primary/10 blur-xl" />
            <div className="absolute -bottom-16 -right-16 w-32 h-32 rounded-full bg-primary/5 blur-xl" />

            <div className="flex flex-col items-center gap-3 relative z-10">
              <div className="w-16 h-16 rounded-full bg-primary/15 border-2 border-primary flex items-center justify-center text-primary mb-2 shadow-[0_0_15px_rgba(204,255,0,0.25)] animate-bounce">
                <ZapIcon size={24} />
              </div>
              
              <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                Trilha Concluída
              </span>
              
              <h2 className="text-lg font-black tracking-tight text-white mt-1.5 leading-snug">
                Parabéns! Você dominou a trilha "{oldTrackName}"
              </h2>
              
              <p className="text-xs text-muted-text leading-relaxed px-2 font-medium">
                Nossa inteligência avaliou seu histórico de conversação, seus erros gramaticais mais frequentes e suas evoluções de vocabulário para moldar seu próximo passo.
              </p>
            </div>

            <div className="bg-muted-slate/10 border border-muted-slate/30 rounded-xl p-4.5 text-left flex flex-col gap-2 relative z-10">
              <span className="text-[8px] font-bold text-muted-text uppercase tracking-widest block">
                Próximo Objetivo Gerado por IA
              </span>
              <span className="text-xs font-black text-primary uppercase tracking-wide">
                {newTrackName || "Próxima Trilha de Aprendizado"}
              </span>
              <p className="text-[10px] text-muted-text mt-0.5 leading-normal font-medium">
                Esta nova trilha contém 5 lições focadas em reforçar seus pontos fracos e avançar a complexidade do diálogo nos seus interesses.
              </p>
            </div>

            <button
              onClick={() => {
                setTrackCompleted(false);
                router.push("/");
              }}
              className="w-full py-4 rounded-xl bg-primary hover:bg-primary-hover text-background font-bold uppercase tracking-widest text-xs transition duration-300 shadow-[0_0_20px_rgba(204,255,0,0.25)] relative z-10"
            >
              Iniciar Nova Trilha
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
