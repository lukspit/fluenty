"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SparklesIcon, CheckIcon, ChevronRightIcon } from "@/components/Icons";

const suggestionRoles = [
  "Software Developer",
  "Product Designer",
  "Project Manager",
  "Marketing Analyst",
  "Financial Analyst",
  "English Student"
];

const objectiveOptions = [
  { id: "Job Interviews", label: "Passar em Entrevistas de Emprego", desc: "Preparação para perguntas técnicas e apresentações pessoais" },
  { id: "Daily Meetings", label: "Participar de Reuniões de Trabalho", desc: "Simulações de standups, alinhamento de tarefas e feedbacks" },
  { id: "Travel & Tourism", label: "Viajar para o Exterior e Socializar", desc: "Prática em aeroportos, hotéis, restaurantes e pedidos práticos" },
  { id: "Casual Conversation", label: "Conversar sobre Hobbies e Dia a Dia", desc: "Diálogos livres, gírias e estruturação fluida de ideias" }
];

const difficultyOptions = [
  { id: "Tradução Mental", label: "Traduzir mentalmente / Dar 'branco'", desc: "Tento traduzir na cabeça do português para o inglês antes de falar, travando a conversa." },
  { id: "Medo de Julgamento", label: "Medo de julgamento ou vergonha", desc: "Insegurança em errar pronúncia ou regras gramaticais diante de outras pessoas." },
  { id: "Falta de Vocabulário", label: "Falta de vocabulário específico", desc: "Sinto falta de jargões técnicos e termos profissionais para me expressar na minha área." },
  { id: "Ritmo e Pronúncia", label: "Ritmo de fala e pronúncia", desc: "Dificuldade em pronunciar as palavras corretamente ou de manter um diálogo contínuo." }
];

const interestOptions = [
  { id: "Technology & AI", label: "Tecnologia & IA" },
  { id: "Startups & Business", label: "Startups & Negócios" },
  { id: "Software & Coding", label: "Programação & Código" },
  { id: "Design & UX/UI", label: "Design & UX/UI" },
  { id: "Leadership & Careers", label: "Carreira & Liderança" },
  { id: "Economy & Finance", label: "Economia & Finanças" },
  { id: "Science & Space", label: "Ciência & Espaço" },
  { id: "Sports & Fitness", label: "Esportes & Saúde" },
  { id: "Movies & Pop Culture", label: "Filmes & Séries" },
  { id: "Travel & Culture", label: "Viagens & Cultura" },
  { id: "Cryptocurrencies", label: "Criptomoedas" },
  { id: "Books & Growth", label: "Livros & Desenvolvimento" }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Respostas do Quiz
  const [englishLevel, setEnglishLevel] = useState<string>("Intermediate");
  const [difficulty, setDifficulty] = useState<string>("Tradução Mental");
  const [occupation, setOccupation] = useState<string>("");
  const [objectives, setObjectives] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        // Verifica se já concluiu o onboarding no perfil
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", session.user.id)
          .single();

        if (profile?.onboarding_completed) {
          router.push("/");
        } else {
          setAuthChecking(false);
        }
      }
    };
    checkSession();
  }, [router]);

  const handleObjectiveToggle = (id: string) => {
    if (objectives.includes(id)) {
      setObjectives(objectives.filter((o) => o !== id));
    } else {
      setObjectives([...objectives, id]);
    }
  };

  const handleInterestToggle = (id: string) => {
    if (interests.includes(id)) {
      setInterests(interests.filter((i) => i !== id));
    } else {
      setInterests([...interests, id]);
    }
  };

  const handleNext = () => {
    if (step === 3 && !occupation.trim()) {
      setErrorMsg("Por favor, descreva um pouco da sua rotina de trabalho ou estudos.");
      return;
    }
    if (step === 4 && objectives.length === 0) {
      setErrorMsg("Por favor, selecione pelo menos um objetivo principal.");
      return;
    }
    if (step === 5 && interests.length === 0) {
      setErrorMsg("Por favor, selecione pelo menos um tema de interesse.");
      return;
    }
    
    setErrorMsg(null);
    if (step < 5) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // 1. Mapear tom de tutor padrão
      const hasTechnicalObj = objectives.includes("Job Interviews") || objectives.includes("Daily Meetings");
      const toneValue = hasTechnicalObj ? "technical" : "friendly";

      // 2. Serializar o campo learning_objective no formato "Objetivos (Dificuldade: X): Rotina"
      const objectiveValue = `${objectives.join(", ")} (Dificuldade: ${difficulty}): ${occupation.trim()}`;

      // 3. Atualizar perfil com as respostas do onboarding
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          english_level: englishLevel,
          learning_objective: objectiveValue,
          interests: interests,
          tutor_tone: toneValue,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", session.user.id);

      if (profileError) throw profileError;

      // 4. Chamar API para gerar o caminho personalizado de 5 fases
      const res = await fetch("/api/generate-path", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        throw new Error("Falha ao gerar sua jornada personalizada de fases.");
      }

      // Redireciona para o dashboard
      router.push("/");
    } catch (err: any) {
      console.error("Erro no onboarding:", err);
      setErrorMsg(err.message || "Erro de conexão ao salvar seu perfil.");
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <div className="flex-1 w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-screen px-4 bg-background text-foreground">
        <div className="relative w-12 h-12 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-muted-slate/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-primary animate-pulse">
          Carregando questionário...
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-screen px-6 text-center bg-background text-foreground">
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-primary/10"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
          <div className="absolute inset-2 bg-background rounded-full flex items-center justify-center text-primary">
            <SparklesIcon size={24} className="animate-pulse" />
          </div>
        </div>
        <h2 className="text-lg font-black tracking-tight text-white mb-2">
          Construindo sua jornada
        </h2>
        <p className="text-xs text-muted-text max-w-xs leading-relaxed">
          Nossa inteligência artificial está desenhando 5 lições progressivas sob medida baseadas na sua rotina de trabalho e nos seus objetivos de conversação.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-md mx-auto flex flex-col justify-center px-4 py-8 bg-background text-foreground min-h-screen relative overflow-hidden md:max-w-lg">
      {/* Círculos de fundo desfocados */}
      <div className="absolute w-48 h-48 bg-primary/5 rounded-full blur-3xl -top-10 -left-10 pointer-events-none" />
      <div className="absolute w-64 h-64 bg-primary/2 rounded-full blur-3xl -bottom-20 -right-20 pointer-events-none" />

      <div className="w-full bg-card-bg border border-muted-slate/30 rounded-3xl p-6 backdrop-blur-md relative z-10 shadow-2xl flex flex-col gap-6">
        
        {/* Progresso do Quiz */}
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-1 w-full max-w-[150px]">
            {[1, 2, 3, 4, 5].map((stepNum) => (
              <div 
                key={stepNum} 
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  step >= stepNum ? "bg-primary" : "bg-muted-slate/20"
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-text font-bold uppercase tracking-widest pl-2">
            Passo {step} de 5
          </span>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-4 text-xs font-semibold leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* Passo 1: Nível de Inglês */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-lg font-black tracking-tight text-white">
                Qual é o seu nível atual?
              </h1>
              <p className="text-[10px] text-muted-text uppercase tracking-widest mt-1 font-bold">
                O tutor adaptará a fala e o vocabulário para você
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {[
                { id: "Beginner", label: "Iniciante", emoji: "🇬🇧", desc: "Consigo entender frases básicas e formular respostas curtas ou com ajuda." },
                { id: "Intermediate", label: "Intermediário", emoji: "💬", desc: "Me comunico bem na maioria das situações, mas sinto travar para ideias complexas." },
                { id: "Advanced", label: "Avançado", emoji: "⚡", desc: "Falo com boa fluidez e naturalidade, buscando polir preposições, sotaque e expressões nativas." }
              ].map((item) => {
                const isSelected = englishLevel === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setEnglishLevel(item.id)}
                    className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all duration-300 ${
                      isSelected
                        ? "bg-primary/5 border-primary shadow-[0_0_12px_rgba(204,255,0,0.05)]"
                        : "bg-background/40 border-muted-slate/20 hover:border-muted-slate/50"
                    }`}
                  >
                    <div className="text-2xl mt-0.5 shrink-0 select-none">
                      {item.emoji}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-xs font-black ${isSelected ? "text-primary" : "text-white"}`}>
                        {item.label}
                      </span>
                      <span className="text-[10px] text-muted-text mt-1 leading-relaxed">
                        {item.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Passo 2: Dificuldade na Fala */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-lg font-black tracking-tight text-white">
                Qual sua maior barreira ao falar?
              </h1>
              <p className="text-[10px] text-muted-text uppercase tracking-widest mt-1 font-bold">
                Isso ajuda a calibrar a tolerância de erros do seu tutor
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {difficultyOptions.map((item) => {
                const isSelected = difficulty === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setDifficulty(item.id)}
                    className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all duration-300 ${
                      isSelected
                        ? "bg-primary/5 border-primary shadow-[0_0_12px_rgba(204,255,0,0.05)]"
                        : "bg-background/40 border-muted-slate/20 hover:border-muted-slate/50"
                    }`}
                  >
                    <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isSelected ? "border-primary bg-primary text-background" : "border-muted-slate/40 bg-background/20"
                    }`}>
                      {isSelected && <CheckIcon size={10} />}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-xs font-black ${isSelected ? "text-primary" : "text-white"}`}>
                        {item.label}
                      </span>
                      <span className="text-[10px] text-muted-text mt-1 leading-relaxed">
                        {item.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Passo 3: Rotina de Trabalho (Textarea Aberto) */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-lg font-black tracking-tight text-white">
                O que você faz no trabalho?
              </h1>
              <p className="text-[10px] text-muted-text uppercase tracking-widest mt-1 font-bold">
                Descreva sua rotina para criarmos simulações sob medida
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <textarea
                value={occupation}
                onChange={(e) => {
                  setOccupation(e.target.value);
                  setErrorMsg(null);
                }}
                rows={4}
                className="w-full bg-background/50 border border-muted-slate/30 focus:border-primary rounded-xl px-4 py-3 text-xs font-semibold text-white focus:outline-none transition-all placeholder-muted-text resize-none leading-relaxed"
                placeholder="Ex: Sou programador frontend, participo de reuniões diárias com devs gringos e apresento componentes de UI..."
                autoFocus
              />

              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-text">
                  Ou selecione uma sugestão para editar:
                </span>
                <div className="flex flex-wrap gap-2">
                  {suggestionRoles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setOccupation(`Atuo como ${role} no cotidiano, participando de alinhamentos e respondendo demandas da área.`);
                        setErrorMsg(null);
                      }}
                      className="px-3 py-1.5 rounded-lg border text-[10px] font-bold transition duration-300 bg-background/30 border-muted-slate/20 text-muted-text hover:border-muted-slate/40 hover:text-white"
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Passo 4: Objetivos / Dores */}
        {step === 4 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-lg font-black tracking-tight text-white">
                O que você mais precisa praticar?
              </h1>
              <p className="text-[10px] text-muted-text uppercase tracking-widest mt-1 font-bold">
                Selecione as situações reais que deseja dominar
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {objectiveOptions.map((item) => {
                const isSelected = objectives.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleObjectiveToggle(item.id)}
                    className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all duration-300 ${
                      isSelected
                        ? "bg-primary/5 border-primary shadow-[0_0_12px_rgba(204,255,0,0.05)]"
                        : "bg-background/40 border-muted-slate/20 hover:border-muted-slate/50"
                    }`}
                  >
                    <div className={`w-4.5 h-4.5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isSelected ? "border-primary bg-primary text-background" : "border-muted-slate/40 bg-background/20"
                    }`}>
                      {isSelected && <CheckIcon size={11} />}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-xs font-black ${isSelected ? "text-primary" : "text-white"}`}>
                        {item.label}
                      </span>
                      <span className="text-[10px] text-muted-text mt-1 leading-relaxed">
                        {item.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Passo 5: Interesses (Expandido - 12 Opções) */}
        {step === 5 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-lg font-black tracking-tight text-white">
                Quais temas te interessam?
              </h1>
              <p className="text-[10px] text-muted-text uppercase tracking-widest mt-1 font-bold">
                O tutor utilizará esses temas nas conversas e exemplos
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pr-1">
              {interestOptions.map((topic) => {
                const isSelected = interests.includes(topic.id);
                return (
                  <button
                    key={topic.id}
                    onClick={() => handleInterestToggle(topic.id)}
                    className={`p-3 rounded-xl border text-center font-black text-[9px] transition-all duration-300 uppercase tracking-wider ${
                      isSelected
                        ? "bg-primary border-primary text-background shadow-[0_0_12px_rgba(204,255,0,0.15)]"
                        : "bg-background/40 border-muted-slate/20 text-muted-text hover:border-muted-slate/50 hover:text-white"
                    }`}
                  >
                    {topic.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Controles de Navegação */}
        <div className="flex gap-3 mt-4 border-t border-muted-slate/20 pt-4">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex-1 py-3.5 border border-muted-slate/30 text-muted-text font-bold uppercase tracking-widest text-[10px] rounded-xl hover:border-muted-slate/60 hover:text-white transition duration-300"
            >
              Voltar
            </button>
          )}

          <button
            onClick={handleNext}
            className="flex-grow py-3.5 bg-primary text-background font-bold uppercase tracking-widest text-[10px] rounded-xl shadow-[0_0_20px_rgba(204,255,0,0.25)] hover:bg-primary-hover transition duration-300 flex items-center justify-center gap-1.5"
          >
            {step === 5 ? "Concluir" : "Avançar"} <ChevronRightIcon size={10} />
          </button>
        </div>

      </div>
    </div>
  );
}
