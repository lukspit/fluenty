"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Heatmap } from "@/components/Heatmap";
import { 
  FlameIcon, 
  SparklesIcon, 
  ChevronRightIcon, 
  ZapIcon, 
  SoundwaveIcon,
  CheckIcon,
  XIcon,
  TrendingUpIcon,
  UserIcon,
  BookOpenIcon
} from "@/components/Icons";

const tutorAvatars: Record<string, string> = {
  casual: "/assets/tutor_alex_v3.png",
  interview: "/assets/tutor_sarah_v3.png",
  coffee: "/assets/tutor_sophia_v3.png",
  meeting: "/assets/tutor_marcus_v3.png"
};

const tutorNames: Record<string, string> = {
  casual: "Alex",
  interview: "Sarah",
  coffee: "Sophia",
  meeting: "Marcus"
};

const cleanTitle = (title: string) => {
  if (!title) return "";
  return title.replace(/^fase\s*\d+\s*[:\-–—]\s*/i, "").trim();
};

interface Scenario {
  id: string;
  title: string;
  desc: string;
  difficulty: "Fácil" | "Médio" | "Avançado";
  timeMinutes: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [streak, setStreak] = useState(12);
  const [selectedScenario, setSelectedScenario] = useState("casual");
  const [activeTab, setActiveTab] = useState<"practice" | "dictionary" | "progress">("practice");
  const [userName, setUserName] = useState<string>("");
  const [authChecking, setAuthChecking] = useState(true);
  const [englishLevel, setEnglishLevel] = useState<string>("Intermediate");
  const [learningObjective, setLearningObjective] = useState<string>("Daily Conversation");
  const [dailyChallengeCompleted, setDailyChallengeCompleted] = useState(false);
  const [dailyChallengeScore, setDailyChallengeScore] = useState<number | null>(null);
  
  // Estados para dados históricos do Supabase
  const [historyData, setHistoryData] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Estados para a jornada personalizada de fases
  const [phases, setPhases] = useState<any[]>([]);
  const [loadingPhases, setLoadingPhases] = useState(true);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [showCasualSelector, setShowCasualSelector] = useState(false);
  const [selectedTrackName, setSelectedTrackName] = useState<string | null>(null);

  const handleTrackChange = (trackName: string) => {
    setSelectedTrackName(trackName);
    
    // Filtrar as fases da trilha selecionada
    const trackPhases = phases.filter(p => (p.track_name || "Trilha de Aprendizado") === trackName);
    // Selecionar a primeira fase desbloqueada (unlocked), ou a primeira se todas estiverem completas
    const phaseToSelect = trackPhases.find(p => p.status === "unlocked") || trackPhases[0];
    if (phaseToSelect) {
      setSelectedPhaseId(phaseToSelect.id);
      setSelectedScenario(phaseToSelect.scenario_key || "casual");
    }
  };

  // Mapeamento de nomes de cenários
  const scenarioNames: Record<string, string> = {
    casual: "Casual Chat",
    interview: "Job Interview",
    coffee: "Coffee Shop",
    meeting: "Daily Scrum"
  };

  const scenarios: Scenario[] = [
    {
      id: "casual",
      title: "Casual Chat",
      desc: "Conversa livre com um amigo virtual em inglês. Fale sobre seu dia, planos ou hobbies.",
      difficulty: "Fácil",
      timeMinutes: 10,
    },
    {
      id: "interview",
      title: "Job Interview",
      desc: "Prepare-se para processos seletivos. Simule uma entrevista técnica desafiadora.",
      difficulty: "Avançado",
      timeMinutes: 15,
    },
    {
      id: "coffee",
      title: "Coffee Shop",
      desc: "Pratique conversação prática de viagem pedindo café e lanche em Nova York.",
      difficulty: "Fácil",
      timeMinutes: 5,
    },
    {
      id: "meeting",
      title: "Daily Scrum",
      desc: "Simule a daily meeting da sua squad. Compartilhe o progresso e alinhe as tarefas.",
      difficulty: "Médio",
      timeMinutes: 8,
    },
  ];

  // Carrega histórico, estatísticas e valida auth
  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push("/login");
          return;
        }

        // Puxa informações do profile do usuário logado
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("name, streak, onboarding_completed, english_level, learning_objective")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          if (profile.onboarding_completed === false) {
            router.push("/onboarding");
            return;
          }
          setUserName(profile.name || "");
          setStreak(profile.streak || 1);
          setEnglishLevel(profile.english_level || "Intermediate");
          setLearningObjective(profile.learning_objective || "Daily Conversation");
        }

        // Busca o histórico do backend enviando o token JWT
        const res = await fetch("/api/history", {
          headers: {
            "Authorization": `Bearer ${session.access_token}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          setHistoryData(data);
          if (data.stats && data.stats.streak) {
            setStreak(data.stats.streak);
          }
        }

        // Busca as fases da jornada personalizada do usuário no Supabase
        const { data: learningPaths, error: pathErr } = await supabase
          .from("fluenty_learning_paths")
          .select("*")
          .order("phase_number", { ascending: true });

        if (!pathErr && learningPaths && learningPaths.length > 0) {
          setPhases(learningPaths);
          
          // Identificar a trilha ativa (a que possui uma fase 'unlocked' ou a última trilha)
          const activePhase = learningPaths.find(p => p.status === "unlocked") || learningPaths[learningPaths.length - 1];
          const activeTrack = activePhase?.track_name || learningPaths[0].track_name || "Trilha de Aprendizado";
          setSelectedTrackName(activeTrack);

          // Filtrar as fases dessa trilha
          const trackPhases = learningPaths.filter(p => (p.track_name || "Trilha de Aprendizado") === activeTrack);
          // Seleciona a fase destravada na trilha ativa, ou a primeira fase da trilha se todas estiverem travadas/completas
          const phaseToSelect = trackPhases.find(p => p.status === "unlocked") || trackPhases[0];
          if (phaseToSelect) {
            setSelectedPhaseId(phaseToSelect.id);
            setSelectedScenario(phaseToSelect.scenario_key || "casual");
          }
        }
      } catch (err) {
        console.error("Erro ao buscar dados da dashboard:", err);
      } finally {
        setLoadingHistory(false);
        setLoadingPhases(false);
        setAuthChecking(false);
      }
    };

    checkAuthAndFetch();
  }, [activeTab, router]);

  // Monitorar se o desafio diário de hoje já foi feito
  useEffect(() => {
    if (historyData?.history) {
      const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const todayDailySession = historyData.history.find((s: any) => 
        s.scenario === "daily_challenge" && 
        s.created_at.startsWith(todayStr)
      );
      if (todayDailySession) {
        setDailyChallengeCompleted(true);
        setDailyChallengeScore(todayDailySession.score_overall);
      } else {
        setDailyChallengeCompleted(false);
        setDailyChallengeScore(null);
      }
    }
  }, [historyData]);

  // Lógica de cálculo dos pontos do gráfico SVG
  const renderEvolutionGraph = () => {
    const evolutionData = historyData?.evolution || [];
    if (evolutionData.length === 0) {
      return (
        <div className="flex items-center justify-center h-28 border border-dashed border-muted-slate/30 rounded-2xl text-[10px] uppercase text-muted-text font-bold tracking-wider">
          Pratique a primeira sessão para ver sua evolução
        </div>
      );
    }

    const width = 400;
    const height = 130;
    const paddingX = 35;
    const paddingY = 20;

    let pointsStr = "";
    let areaPointsStr = "";
    
    // Filtro mínimo de nota para exibição no gráfico
    const minScore = 50;
    const maxScore = 100;

    const stepX = evolutionData.length > 1 ? (width - paddingX * 2) / (evolutionData.length - 1) : 0;

    const svgPoints = evolutionData.map((d: any, idx: number) => {
      const x = evolutionData.length > 1 ? paddingX + idx * stepX : width / 2;
      
      // Normaliza y entre paddingY e height - paddingY
      const scoreNormalized = (d.score - minScore) / (maxScore - minScore);
      const y = height - paddingY - scoreNormalized * (height - paddingY * 2);
      
      return { x, y, date: d.date, score: d.score };
    });

    if (svgPoints.length > 0) {
      if (svgPoints.length === 1) {
        const p = svgPoints[0];
        pointsStr = `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y}`;
        areaPointsStr = `M ${p.x - 20} ${height - paddingY} L ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y} L ${p.x + 20} ${height - paddingY} Z`;
      } else {
        svgPoints.forEach((p: any, idx: number) => {
          if (idx === 0) {
            pointsStr = `M ${p.x} ${p.y}`;
            areaPointsStr = `M ${p.x} ${height - paddingY} L ${p.x} ${p.y}`;
          } else {
            pointsStr += ` L ${p.x} ${p.y}`;
            areaPointsStr += ` L ${p.x} ${p.y}`;
          }
          if (idx === svgPoints.length - 1) {
            areaPointsStr += ` L ${p.x} ${height - paddingY} Z`;
          }
        });
      }
    }

    return (
      <div className="w-full relative bg-card-bg/60 border border-muted-slate/30 rounded-2xl p-4 backdrop-blur-md">
        <span className="text-[9px] font-bold text-primary uppercase tracking-widest block mb-2">
          Evolução de Fluência
        </span>
        <div className="w-full overflow-x-auto">
          <svg className="w-full h-auto min-w-[340px]" viewBox={`0 0 ${width} ${height}`}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Linhas de Grade de Fundo */}
            <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="var(--color-muted-slate)" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.3" />
            <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="var(--color-muted-slate)" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.3" />
            <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="var(--color-muted-slate)" strokeWidth="0.5" opacity="0.3" />

            {/* Área preenchida com gradiente */}
            {areaPointsStr && <path d={areaPointsStr} fill="url(#chartGrad)" />}

            {/* Linha principal do gráfico */}
            {pointsStr && (
              <path
                d={pointsStr}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_6px_rgba(204,255,0,0.4)]"
              />
            )}

            {/* Bolinhas e Labels */}
            {svgPoints.map((p: any, idx: number) => (
              <g key={idx}>
                {/* Eixo X labels */}
                <text
                  x={p.x}
                  y={height - 5}
                  textAnchor="middle"
                  fill="var(--color-muted-text)"
                  fontSize="8"
                  fontWeight="bold"
                  letterSpacing="0.05em"
                >
                  {p.date}
                </text>
                
                {/* Nota label no topo */}
                <text
                  x={p.x}
                  y={p.y - 8}
                  textAnchor="middle"
                  fill="white"
                  fontSize="8"
                  fontWeight="black"
                >
                  {p.score}%
                </text>

                {/* Bolinha externa brilhante */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="var(--primary)"
                  className="animate-pulse"
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="2"
                  fill="var(--background)"
                />
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  const formatSessionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `${day}/${month}`;
  };

  if (authChecking) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-6">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-20 h-20 animate-pulse">
            <Image 
              src="/logo-v3.png" 
              alt="Fluenty Logo" 
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-sm font-black tracking-widest uppercase text-white">
              Fluenty
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70 animate-pulse">
              Preparando sua experiência...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-md mx-auto flex flex-col justify-between px-4 py-6 md:max-w-2xl lg:max-w-4xl lg:py-10 text-foreground bg-background">
      
      {/* Header */}
      <header className="flex items-center justify-between w-full mb-6">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <Image 
              src="/logo-v3.png" 
              alt="Fluenty Logo" 
              fill
              className="object-contain animate-pulse"
              priority
            />
          </div>
          <div className="flex flex-col justify-center gap-0.5">
            <span className="text-base font-bold tracking-tight text-white leading-tight">
              Fluenty
            </span>
            {userName && (
              <span className="text-xs text-muted-text font-medium leading-tight">
                Olá, {userName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Streak Indicator (Zero Emojis - FlameIcon SVG) */}
          <div className="flex items-center gap-2 bg-card-bg border border-muted-slate/30 px-3.5 py-1.5 rounded-full backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
            <FlameIcon className="text-primary animate-pulse" size={18} />
            <span className="text-sm font-bold tracking-wide text-foreground">
              {streak} DIAS
            </span>
          </div>

          {/* Botão de Perfil */}
          <button
            onClick={() => router.push("/profile")}
            className="w-9 h-9 rounded-xl border border-muted-slate/30 hover:border-primary/50 hover:text-primary transition flex items-center justify-center text-muted-text bg-card-bg/50"
            title="Meu Perfil"
          >
            <UserIcon size={16} />
          </button>
        </div>
      </header>

      {/* Tabs Selector (Sleek Geometric Design - Phase 11) */}
      <div className="flex w-full bg-card-bg border border-muted-slate/30 rounded-xl p-1 mb-6 backdrop-blur-md gap-0.5">
        <button
          onClick={() => setActiveTab("practice")}
          className={`flex-1 py-2.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
            activeTab === "practice"
              ? "bg-primary text-background font-black shadow-[0_0_12px_rgba(204,255,0,0.15)]"
              : "text-muted-text hover:text-foreground hover:bg-muted-slate/10"
          }`}
        >
          <SoundwaveIcon size={11} className={activeTab === "practice" ? "text-background" : "text-muted-text"} />
          <span>Praticar</span>
        </button>
        <button
          onClick={() => setActiveTab("dictionary")}
          className={`flex-1 py-2.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
            activeTab === "dictionary"
              ? "bg-primary text-background font-black shadow-[0_0_12px_rgba(204,255,0,0.15)]"
              : "text-muted-text hover:text-foreground hover:bg-muted-slate/10"
          }`}
        >
          <BookOpenIcon size={11} className={activeTab === "dictionary" ? "text-background" : "text-muted-text"} />
          <span>Meu Dicionário</span>
        </button>
        <button
          onClick={() => setActiveTab("progress")}
          className={`flex-1 py-2.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
            activeTab === "progress"
              ? "bg-primary text-background font-black shadow-[0_0_12px_rgba(204,255,0,0.15)]"
              : "text-muted-text hover:text-foreground hover:bg-muted-slate/10"
          }`}
        >
          <TrendingUpIcon size={11} className={activeTab === "progress" ? "text-background" : "text-muted-text"} />
          <span>Progresso</span>
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-6 w-full">
        
        {activeTab === "practice" && (
          <>
            {/* Widget de Desafio Diário (Phase 13 Option B) */}
            <section className="w-full mt-2 relative">
              <button
                onClick={() => router.push("/daily-challenge")}
                className="w-full bg-card-bg/60 border border-muted-slate/30 hover:border-primary/45 rounded-xl p-4 flex items-center justify-between backdrop-blur-lg relative overflow-hidden transition-all duration-300 text-left group"
              >
                {/* Elemento de iluminação Acid Lime do widget */}
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                
                <div className="flex items-center gap-3.5 pl-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                    <SparklesIcon size={16} className="animate-pulse" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-black text-primary uppercase tracking-widest">
                      Micro-Treino Diário
                    </span>
                    <h3 className="text-xs font-black tracking-tight text-white">
                      Desafio Diário de Hoje
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {dailyChallengeCompleted ? (
                    <span className="text-[9px] font-black uppercase bg-primary/20 text-primary border border-primary/30 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                      <CheckIcon size={10} />
                      Concluído ({dailyChallengeScore}%)
                    </span>
                  ) : (
                    <span className="text-[9px] font-black uppercase bg-primary text-background px-2.5 py-1.5 rounded-lg shadow-[0_0_8px_rgba(204,255,0,0.15)] group-hover:bg-primary-hover transition duration-300">
                      Começar
                    </span>
                  )}
                </div>
              </button>
            </section>

            {/* Widget Horizontal de Estação de Conversação de Áudio (Fase 11 Redesign) */}
            <section className="w-full my-4 relative">
              <div className="w-full bg-card-bg/60 border border-muted-slate/30 rounded-xl p-4 flex items-center justify-between backdrop-blur-lg relative overflow-hidden group hover:border-primary/45 transition-all duration-300">
                {/* Elemento decorativo de fundo brilhante */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/2 rounded-full blur-xl group-hover:bg-primary/5 transition-all duration-300" />
                
                <div className="flex items-center gap-4 relative z-10">
                  {/* Avatar do Tutor */}
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-muted-slate/40 flex-shrink-0 bg-background/50">
                    <Image 
                      src={tutorAvatars[selectedScenario] || "/assets/tutor_alex.png"} 
                      alt={tutorNames[selectedScenario] || "Tutor"} 
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  {/* Informações da Lição Ativa */}
                  <div className="flex flex-col gap-1.5 max-w-[170px] sm:max-w-xs md:max-w-md">
                    <span className="text-[8px] font-black text-primary uppercase tracking-widest">
                      Tutor Ativo: {tutorNames[selectedScenario] || "Alex"}
                    </span>
                    <h3 className="text-xs font-black tracking-tight text-white line-clamp-1">
                      {selectedPhaseId 
                        ? cleanTitle(phases.find(p => p.id === selectedPhaseId)?.title || "")
                        : scenarioNames[selectedScenario] || selectedScenario}
                    </h3>
                    
                    {/* Visualização de onda de som estática sutil */}
                    <div className="flex items-center gap-0.5 h-3 mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      {Array.from({ length: 18 }).map((_, i) => {
                        const h = [6, 10, 4, 8, 12, 6, 10, 4, 8, 12, 6, 10, 4, 8, 12, 6, 10, 4][i];
                        return (
                          <div 
                            key={i} 
                            className="w-[1.5px] bg-primary rounded-full transition-all duration-300"
                            style={{ height: `${h}px` }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Botão Conectar / Começar / Refazer */}
                <div className="flex items-center gap-2 relative z-10 shrink-0">
                  {selectedPhaseId && phases.find(p => p.id === selectedPhaseId)?.status === "completed" ? (
                    <>
                      {/* Botão Ver Resultados */}
                      <button
                        onClick={() => {
                          const matchingSession = historyData?.history?.find((s: any) => s.path_id === selectedPhaseId);
                          if (matchingSession) {
                            setExpandedSessionId(matchingSession.id);
                          }
                          setActiveTab("progress");
                          setTimeout(() => {
                            document.getElementById("history-section")?.scrollIntoView({ behavior: "smooth" });
                          }, 100);
                        }}
                        className="px-4 py-3 rounded-lg border border-muted-slate hover:bg-muted-slate/20 text-white text-[10px] font-black uppercase tracking-widest transition duration-300 cursor-pointer"
                      >
                        Resultados
                      </button>
                      
                      {/* Botão Refazer */}
                      <Link
                        href={`/call?pathId=${selectedPhaseId}`}
                        className="px-4 py-3 rounded-lg bg-primary hover:bg-primary-hover text-background text-[10px] font-black uppercase tracking-widest shadow-[0_0_12px_rgba(204,255,0,0.15)] hover:shadow-[0_0_18px_rgba(204,255,0,0.25)] transition duration-300 hover:scale-102 flex items-center justify-center border border-primary/25"
                      >
                        Refazer
                      </Link>
                    </>
                  ) : (
                    <Link
                      href={selectedPhaseId ? `/call?pathId=${selectedPhaseId}` : `/call?scenario=${selectedScenario}`}
                      className="px-5 py-3.5 rounded-lg bg-primary hover:bg-primary-hover text-background text-[10px] font-black uppercase tracking-widest shadow-[0_0_12px_rgba(204,255,0,0.15)] hover:shadow-[0_0_18px_rgba(204,255,0,0.25)] transition duration-300 hover:scale-102 flex items-center justify-center border border-primary/25"
                    >
                      Conectar
                    </Link>
                  )}
                </div>
              </div>
            </section>

            {/* Fases / Cenários Section */}
            <section className="w-full">
              <div className="flex items-center justify-between mb-4.5">
                <div className="flex items-center gap-2">
                  <SparklesIcon size={16} className="text-primary" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-text">
                    {showCasualSelector ? "Selecione um Cenário Livre" : "Sua Trilha de Aprendizado"}
                  </h2>
                </div>
                
                <button
                  onClick={() => setShowCasualSelector(!showCasualSelector)}
                  className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider bg-transparent border-none p-0 cursor-pointer transition"
                >
                  {showCasualSelector ? "Ver Minha Trilha" : "Treino Casual"}
                </button>
              </div>

              {loadingPhases ? (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-card-bg/50 border border-muted-slate/20 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : showCasualSelector ? (
                /* Seletor de Cenários Livres antigo */
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {scenarios.map((sc) => {
                    const isSelected = selectedScenario === sc.id && !selectedPhaseId;
                    return (
                      <button
                        key={sc.id}
                        onClick={() => {
                          setSelectedScenario(sc.id);
                          setSelectedPhaseId(null);
                        }}
                        className={`flex flex-col justify-between text-left p-4.5 rounded-2xl border transition-all duration-300 backdrop-blur-md ${
                          isSelected
                            ? "bg-card-bg border-primary shadow-[0_0_15px_rgba(204,255,0,0.1)]"
                            : "bg-card-bg/50 border-muted-slate/20 hover:border-muted-slate/50"
                        }`}
                      >
                        <div className="w-full">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm tracking-tight text-white">
                              {sc.title}
                            </span>
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              sc.difficulty === "Fácil" 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                : sc.difficulty === "Médio"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}>
                              {sc.difficulty}
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-muted-text font-medium mb-3">
                            {sc.desc}
                          </p>
                        </div>
                        
                        <div className="w-full flex items-center justify-between text-[10px] font-bold tracking-wider text-muted-text mt-1">
                          <span>⏱️ {sc.timeMinutes} MIN LIMIT</span>
                          <span className={`flex items-center gap-1 transition-all ${isSelected ? "text-primary translate-x-1" : "text-muted-text"}`}>
                            SELECIONAR <ChevronRightIcon size={12} />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Timeline Roadmap de Fases */
                <div className="flex flex-col gap-4">
                  {/* Seletor de Trilhas Nomeadas */}
                  {Array.from(new Set(phases.map(p => p.track_name || "Trilha de Aprendizado"))).length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-2 p-1 bg-card-bg/40 border border-muted-slate/25 rounded-2xl">
                      {Array.from(new Set(phases.map(p => p.track_name || "Trilha de Aprendizado"))).map((trackName) => {
                        const isCurrentSelected = selectedTrackName === trackName;
                        const trackPhases = phases.filter(p => (p.track_name || "Trilha de Aprendizado") === trackName);
                        const isTrackCompleted = trackPhases.every(p => p.status === "completed");
                        
                        return (
                          <button
                            key={trackName}
                            onClick={() => handleTrackChange(trackName)}
                            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition duration-300 ${
                              isCurrentSelected
                                ? "bg-primary text-background shadow-[0_2px_8px_rgba(204,255,0,0.15)]"
                                : "text-muted-text hover:text-foreground bg-transparent"
                            }`}
                          >
                            {trackName} {isTrackCompleted && "✓"}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="relative border-l border-dashed border-muted-slate/35 pl-6 ml-3.5 flex flex-col gap-5.5 my-3">
                    {phases
                      .filter((p) => (p.track_name || "Trilha de Aprendizado") === selectedTrackName)
                      .map((phase) => {
                        const isSelected = selectedPhaseId === phase.id;
                        const isLocked = phase.status === "locked";
                        const isCompleted = phase.status === "completed";
                        
                        let cardClass = "premium-card border-muted-slate/20 opacity-40 cursor-not-allowed";
                        let indicatorBg = "bg-background border-muted-slate/35 text-muted-text/30";
                        let pulseElement = null;

                        if (isCompleted) {
                          cardClass = "premium-card border-muted-slate/30 opacity-70 hover:opacity-90 cursor-pointer";
                          indicatorBg = "bg-primary border-primary text-background";
                        } else if (!isLocked) {
                          cardClass = isSelected
                            ? "premium-card-active"
                            : "premium-card border-muted-slate/35 hover:border-muted-slate/50";
                          indicatorBg = "bg-background border-primary text-primary";
                          pulseElement = <span className="absolute inset-0 rounded-full border border-primary/40 animate-ping" />;
                        }

                        const phaseTutorAvatar = tutorAvatars[phase.scenario_key] || "/assets/tutor_alex.png";

                        return (
                          <div key={phase.id} className="relative w-full">
                            {/* Indicador de Timeline */}
                            <div className={`absolute -left-[32.5px] top-4.5 w-4 h-4 rounded-full border flex items-center justify-center text-[8px] z-10 transition-all ${indicatorBg}`}>
                              {isCompleted ? (
                                <CheckIcon size={8} />
                              ) : !isLocked ? (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-muted-slate/30" />
                              )}
                              {pulseElement}
                            </div>

                            {/* Card do Roadmap */}
                            <button
                              disabled={isLocked}
                              onClick={() => {
                                setSelectedPhaseId(phase.id);
                                setSelectedScenario(phase.scenario_key || "casual");
                              }}
                              className={`w-full flex items-center gap-4 text-left p-4 rounded-xl border transition-all duration-300 backdrop-blur-md relative ${cardClass}`}
                            >
                              {/* Avatar do Tutor integrado no Card se estiver desbloqueado */}
                              {!isLocked && (
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-muted-slate/30 flex-shrink-0 bg-background/40">
                                  <Image 
                                    src={phaseTutorAvatar} 
                                    alt="Tutor avatar" 
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              )}

                              {/* Conteúdo do Card */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-[8px] font-black uppercase tracking-widest ${isSelected && !isCompleted ? "text-primary" : "text-muted-text"}`}>
                                    Fase {phase.phase_number}
                                  </span>
                                  {isCompleted && (
                                    <span className="text-[7px] font-bold uppercase tracking-wider text-primary">
                                      Completa
                                    </span>
                                  )}
                                </div>

                                <h3 className="font-bold text-xs sm:text-sm tracking-tight text-white mb-1 truncate">
                                  {cleanTitle(phase.title)}
                                </h3>
                                <p className="text-[10px] leading-relaxed text-muted-text font-medium line-clamp-2">
                                  {phase.description}
                                </p>
                              </div>

                              {/* Ícone de Cadeado se estiver bloqueado */}
                              {isLocked && (
                                <div className="w-8 h-8 rounded-lg bg-card-bg/25 border border-muted-slate/15 flex items-center justify-center text-muted-text/30 shrink-0 ml-auto">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                  </svg>
                                </div>
                              )}
                            </button>
                          </div>
                        );
                      })}

                    {/* Esqueleto da continuação da trilha (Infinite Mode) */}
                    <div className="relative w-full opacity-60">
                      {/* Indicador de Timeline */}
                      <div className="absolute -left-[32.5px] top-4.5 w-4 h-4 rounded-full border border-dashed border-muted-slate/35 bg-background flex items-center justify-center text-[9px] text-muted-text/50 font-black z-10">
                        ?
                      </div>

                      {/* Card do Roadmap */}
                      <div className="w-full flex items-center gap-4 p-4 rounded-xl border border-dashed border-muted-slate/25 bg-card-bg/20 select-none">
                        {/* Avatar do Tutor mockado de interrogação */}
                        <div className="relative w-12 h-12 rounded-lg border border-dashed border-muted-slate/25 bg-background/25 flex items-center justify-center text-muted-text/40 shrink-0 font-bold">
                          ?
                        </div>

                        {/* Conteúdo do Card */}
                        <div className="flex-1 min-w-0">
                          <span className="text-[8px] font-black uppercase tracking-widest text-primary/70 block mb-1">
                            Evolução Infinita
                          </span>
                          <h3 className="font-bold text-xs tracking-tight text-white/95 mb-0.5">
                            Gerando novas lições...
                          </h3>
                          <p className="text-[9.5px] leading-relaxed text-muted-text font-medium">
                            Assim que você concluir a Fase 5, nossa Inteligência Artificial analisará seu histórico para gerar automaticamente mais 5 fases sob medida.
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === "dictionary" && (
          <div className="flex flex-col gap-6 w-full animate-fade-in">
            {/* Seção 1: Erros Frequentes */}
            <section className="w-full bg-card-bg/60 border border-muted-slate/30 rounded-2xl p-4.5 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-3.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-400">
                  <path d="M12 9v4"/>
                  <path d="M12 17h.01"/>
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                </svg>
                <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">
                  Meus Erros Recorrentes
                </span>
              </div>

              {!loadingHistory && historyData?.common_errors && historyData.common_errors.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {historyData.common_errors.map((err: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1 text-[11px] leading-relaxed border-l-2 border-red-500/30 pl-3">
                      <div className="flex items-center gap-1.5 text-muted-text font-medium line-through decoration-red-500/40">
                        <span>"{err.original}"</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-primary font-bold">
                        <CheckIcon size={10} className="text-primary" />
                        <span>"{err.corrected}"</span>
                        {err.count > 1 && (
                          <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                            {err.count}x
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-text italic py-1 font-medium">
                  Nenhum erro recorrente catalogado ainda. Continue praticando!
                </p>
              )}
            </section>

            {/* Seção 2: Melhorias de Vocabulário */}
            <section className="w-full bg-card-bg/60 border border-muted-slate/30 rounded-2xl p-4.5 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-3.5">
                <SparklesIcon size={14} className="text-primary" />
                <span className="text-[9px] font-bold text-primary uppercase tracking-widest">
                  Sugestões de Vocabulário Rico
                </span>
              </div>

              {!loadingHistory && historyData?.history && 
                historyData.history.flatMap((s: any) => s.vocabulary_improvements || []).length > 0 ? (
                <div className="flex flex-col gap-3.5">
                  {(() => {
                    const allVocab = historyData.history.flatMap((s: any) => s.vocabulary_improvements || []);
                    const grouped: Record<string, { word_used: string; suggestions: string[]; context: string }> = {};
                    allVocab.forEach((v: any) => {
                      const key = v.word_used.toLowerCase().trim();
                      if (!grouped[key]) {
                        grouped[key] = {
                          word_used: v.word_used,
                          suggestions: v.suggestions || [],
                          context: v.context || ""
                        };
                      }
                    });
                    
                    return Object.values(grouped).map((item: any, idx: number) => (
                      <div key={idx} className="bg-background/40 border border-muted-slate/20 rounded-xl p-3 flex flex-col gap-2">
                        <div className="flex items-center flex-wrap gap-2 text-[10px] font-bold">
                          <span className="text-white bg-card-bg px-2 py-0.5 rounded border border-muted-slate/30">
                            {item.word_used}
                          </span>
                          <span className="text-muted-text">→</span>
                          {item.suggestions.map((sug: string, sIdx: number) => (
                            <span key={sIdx} className="text-background bg-primary px-2 py-0.5 rounded shadow-[0_0_8px_rgba(204,255,0,0.1)]">
                              {sug}
                            </span>
                          ))}
                        </div>
                        {item.context && (
                          <p className="text-[10px] text-muted-text italic leading-relaxed border-t border-muted-slate/10 pt-1.5">
                            "{item.context}"
                          </p>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <p className="text-[10px] text-muted-text italic py-1 font-medium">
                  Seu tutor sugerirá palavras melhores durante suas conversas.
                </p>
              )}
            </section>

            {/* Seção 3: Expressões Recomendadas para o seu Nível */}
            <section className="w-full bg-card-bg/60 border border-muted-slate/30 rounded-2xl p-4.5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <BookOpenIcon size={14} className="text-white" />
                  <span className="text-[9px] font-bold text-white uppercase tracking-widest">
                    Expressões Recomendadas ({englishLevel === "Beginner" ? "Iniciante" : englishLevel === "Advanced" ? "Avançado" : "Intermediário"})
                  </span>
                </div>
                <span className="text-[8px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold uppercase">
                  {learningObjective === "Business" ? "Trabalho" : learningObjective === "Travel" ? "Viagens" : learningObjective === "Academic" ? "Acadêmico" : "Dia a Dia"}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {(() => {
                  const level = englishLevel.toLowerCase();
                  const obj = learningObjective.toLowerCase();
                  let recommendations = [];

                  if (level === "beginner") {
                    if (obj.includes("business") || obj.includes("trabalho")) {
                      recommendations = [
                        { expr: "Could you please clarify...?", desc: "Pedir explicações educadamente em reuniões.", ex: "Could you please clarify the deadline?" },
                        { expr: "I would like to...", desc: "Mais polido e formal do que falar 'I want' ao expressar desejos.", ex: "I would like to share my thoughts." },
                        { expr: "Best regards", desc: "Forma profissional e comum de fechar um e-mail comercial.", ex: "Best regards, Lucas Claudio" }
                      ];
                    } else if (obj.includes("travel") || obj.includes("viagem")) {
                      recommendations = [
                        { expr: "Where is the nearest...?", desc: "Pedir direções de locais próximos.", ex: "Where is the nearest subway station?" },
                        { expr: "I'll have the...", desc: "Forma ideal de pedir comida ou bebida num restaurante.", ex: "I'll have the cheeseburger, please." },
                        { expr: "How much is this?", desc: "Frase ideal para perguntar o preço de produtos.", ex: "Excuse me, how much is this jacket?" }
                      ];
                    } else {
                      recommendations = [
                        { expr: "How's it going?", desc: "Saudação informal equivalente a 'Como vão as coisas?'.", ex: "Hey friend, how's it going?" },
                        { expr: "Let me check...", desc: "Ganhe tempo de forma natural enquanto pensa na resposta.", ex: "Let me check my calendar for tomorrow." },
                        { expr: "Have a good one!", desc: "Se despedir de alguém desejando um bom dia de forma casual.", ex: "Thanks for the coffee. Have a good one!" }
                      ];
                    }
                  } else if (level === "advanced") {
                    if (obj.includes("business") || obj.includes("trabalho")) {
                      recommendations = [
                        { expr: "To touch base", desc: "Entrar em contato brevemente para se atualizar.", ex: "Let's touch base next Monday to discuss details." },
                        { expr: "To keep in the loop", desc: "Manter alguém informado sobre o andamento de algo.", ex: "Please, keep me in the loop regarding the client." },
                        { expr: "To think outside the box", desc: "Pensar de forma inovadora e fora dos padrões normais.", ex: "We need to think outside the box to solve this." }
                      ];
                    } else {
                      recommendations = [
                        { expr: "To hit the sack", desc: "Expressão informal que significa ir dormir.", ex: "I'm exhausted, I think it's time to hit the sack." },
                        { expr: "By all means", desc: "Uma forma forte e educada de dar permissão ('com certeza').", ex: "Can I use your phone? By all means!" },
                        { expr: "To bite the bullet", desc: "Encarar uma situation difícil ou inevitável com coragem.", ex: "I have to bite the bullet and talk to my boss today." }
                      ];
                    }
                  } else { // Intermediate
                    if (obj.includes("business") || obj.includes("trabalho")) {
                      recommendations = [
                        { expr: "To follow up", desc: "Dar andamento ou acompanhar uma pendência.", ex: "I will follow up with the team today." },
                        { expr: "To get down to business", desc: "Ir direto ao assunto principal ou começar a focar.", ex: "Let's get down to business, we don't have much time." },
                        { expr: "On the same page", desc: "Estar em total sintonia e acordo com as outras pessoas.", ex: "We need a meeting to ensure everyone is on the same page." }
                      ];
                    } else if (obj.includes("travel") || obj.includes("viagem")) {
                      recommendations = [
                        { expr: "To check in / check out", desc: "Registro de entrada ou saída em hotéis/aeroportos.", ex: "We need to check out of the hotel by noon." },
                        { expr: "Do you take credit cards?", desc: "Forma ideal de perguntar se aceitam cartão.", ex: "Do you take credit cards?" },
                        { expr: "I have a reservation under...", desc: "Confirmar sua reserva de forma elegante.", ex: "I have a reservation under Lucas Claudio." }
                      ];
                    } else {
                      recommendations = [
                        { expr: "To hang out", desc: "Passar o tempo de forma relaxada com amigos.", ex: "We should hang out sometime this weekend." },
                        { expr: "To make a long story short", desc: "Resumir uma história longa ('resumindo').", ex: "To make a long story short, we got lost but found the way." },
                        { expr: "Never mind", desc: "Expressão usada para dizer 'deixa pra lá' ou 'esquece'.", ex: "Where is the key? Oh, I found it, never mind." }
                      ];
                    }
                  }

                  return recommendations.map((item, idx) => (
                    <div key={idx} className="bg-background/40 border border-muted-slate/20 rounded-xl p-3 flex flex-col gap-1 text-[10px]">
                      <span className="font-bold text-primary">{item.expr}</span>
                      <p className="text-muted-text font-medium text-[9.5px] leading-normal">{item.desc}</p>
                      <span className="text-white/60 italic mt-0.5">Ex: "{item.ex}"</span>
                    </div>
                  ));
                })()}
              </div>
            </section>
          </div>
        )}

        {activeTab === "progress" && (
          /* ABA DE PROGRESSO & HISTÓRICO (Conexão Supabase / Fallback Mockado) */
          <div className="flex flex-col gap-6 w-full animate-fade-in">
            
            {/* Heatmap Section */}
            <section className="w-full">
              <Heatmap sessions={historyData?.history || []} />
              <p className="text-[11px] text-muted-text mt-2.5 text-center font-medium">
                Você está mantendo sua consistência! Continue praticando diariamente.
              </p>
            </section>

            {/* Metrics Cards Grid */}
            <section className="grid grid-cols-3 gap-3">
              <div className="bg-card-bg/60 border border-muted-slate/30 rounded-2xl p-3 text-center backdrop-blur-md">
                <span className="text-[18px] font-black text-white block">
                  {loadingHistory ? "..." : historyData?.stats?.total_sessions || 0}
                </span>
                <span className="text-[8px] font-bold text-muted-text uppercase tracking-widest">
                  Sessões
                </span>
              </div>
              <div className="bg-card-bg/60 border border-muted-slate/30 rounded-2xl p-3 text-center backdrop-blur-md">
                <span className="text-[18px] font-black text-white block">
                  {loadingHistory ? "..." : historyData?.stats?.total_duration_minutes || 0}m
                </span>
                <span className="text-[8px] font-bold text-muted-text uppercase tracking-widest">
                  Tempo total
                </span>
              </div>
              <div className="bg-card-bg/60 border border-muted-slate/30 rounded-2xl p-3 text-center backdrop-blur-md">
                <span className="text-[18px] font-black text-primary block">
                  {loadingHistory ? "..." : `${historyData?.stats?.average_score || 0}%`}
                </span>
                <span className="text-[8px] font-bold text-primary/80 uppercase tracking-widest">
                  Média Geral
                </span>
              </div>
            </section>

            {/* Evolution Graph Section */}
            <section className="w-full">
              {loadingHistory ? (
                <div className="flex items-center justify-center h-28 border border-muted-slate/30 rounded-2xl text-[10px] uppercase text-muted-text font-bold tracking-wider animate-pulse">
                  Carregando evolução...
                </div>
              ) : (
                renderEvolutionGraph()
              )}
            </section>

            {/* Histórico Cronológico das Conversas */}
            <section id="history-section" className="w-full">
              <div className="flex items-center gap-2 mb-3">
                <SoundwaveIcon size={14} className="text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-text">
                  Histórico de Conversas
                </h3>
              </div>

              {loadingHistory ? (
                <div className="flex flex-col gap-2.5">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-card-bg/50 border border-muted-slate/20 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : historyData?.history && historyData.history.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {historyData.history.map((session: any) => {
                    const isExpanded = expandedSessionId === session.id;
                    return (
                      <div 
                        key={session.id}
                        className={`bg-card-bg border transition-all duration-300 rounded-2xl overflow-hidden ${
                          isExpanded ? "border-primary/50 shadow-[0_0_15px_rgba(204,255,0,0.05)]" : "border-muted-slate/20"
                        }`}
                      >
                        {/* Accordion Header */}
                        <button
                          onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                          className="w-full flex items-center justify-between p-4 text-left transition hover:bg-muted-slate/10"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white tracking-tight">
                               {session.path_id && phases.find(p => p.id === session.path_id)
                                 ? cleanTitle(phases.find(p => p.id === session.path_id).title)
                                 : scenarioNames[session.scenario] || session.scenario}
                            </span>
                            <span className="text-[9px] text-muted-text mt-0.5 font-bold tracking-widest uppercase">
                              {formatDate(session.created_at)} • {formatSessionTime(session.duration_seconds)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-xs font-black text-primary block">
                                {session.score_overall}%
                              </span>
                              <span className="text-[7px] text-muted-text font-bold uppercase tracking-wider block">
                                Fluência
                              </span>
                            </div>
                            <ChevronRightIcon 
                              size={14} 
                              className={`text-muted-text transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`} 
                            />
                          </div>
                        </button>

                        {/* Accordion Expanded Content */}
                        {isExpanded && (
                          <div className="border-t border-muted-slate/30 p-4 bg-muted-slate/10 flex flex-col gap-4 animate-scale-up">
                            {/* Destaque / Highlights */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[8px] font-bold text-primary uppercase tracking-widest">
                                Destaque da Sessão
                              </span>
                              <p className="text-[11px] leading-relaxed text-foreground/90 font-medium">
                                {session.highlights}
                              </p>
                            </div>

                            {/* Sub scores */}
                            <div className="grid grid-cols-3 gap-2 py-2 border-y border-muted-slate/20 text-center text-[10px]">
                              <div>
                                <span className="font-bold text-white block">{session.score_grammar}%</span>
                                <span className="text-[7px] text-muted-text font-bold uppercase tracking-widest">Gramática</span>
                              </div>
                              <div className="border-x border-muted-slate/20">
                                <span className="font-bold text-white block">{session.score_vocabulary}%</span>
                                <span className="text-[7px] text-muted-text font-bold uppercase tracking-widest">Vocabulário</span>
                              </div>
                              <div>
                                <span className="font-bold text-white block">{session.score_fluency}%</span>
                                <span className="text-[7px] text-muted-text font-bold uppercase tracking-widest">Fluidez</span>
                              </div>
                            </div>

                            {/* Correções na Sessão */}
                            {session.corrections && session.corrections.length > 0 ? (
                              <div className="flex flex-col gap-2.5">
                                <span className="text-[8px] font-bold text-muted-text uppercase tracking-widest">
                                  Correções
                                </span>
                                <div className="flex flex-col gap-2.5">
                                  {session.corrections.map((corr: any, cIdx: number) => (
                                    <div key={cIdx} className="bg-card-bg border border-muted-slate/20 rounded-xl p-3 flex flex-col gap-1.5 text-[10px]">
                                      <div className="flex items-start gap-2 text-muted-text font-medium line-through">
                                        <XIcon size={10} className="text-red-500 shrink-0 mt-0.5" />
                                        <span>"{corr.original}"</span>
                                      </div>
                                      <div className="flex items-start gap-2 text-primary font-bold">
                                        <CheckIcon size={10} className="text-primary shrink-0 mt-0.5" />
                                        <span>"{corr.corrected}"</span>
                                      </div>
                                      <p className="text-[9px] text-muted-text border-t border-muted-slate/10 pt-1.5 mt-1 font-medium">
                                        {corr.explanation}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-[9px] text-muted-text italic text-center font-medium py-1">
                                Nenhum erro gramatical identificado na conversa.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-muted-text font-medium border border-dashed border-muted-slate/30 rounded-2xl bg-card-bg/20">
                  Nenhuma chamada gravada ainda.
                </div>
              )}
            </section>
          </div>
        )}

      </main>

      {/* Footer Info */}
      <footer className="w-full text-center text-[10px] text-muted-text uppercase tracking-widest mt-8 font-bold">
        Fluenty © 2026 • Powered by AI
      </footer>
    </div>
  );
}
