"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SparklesIcon, CheckIcon, ChevronRightIcon } from "@/components/Icons";

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Respostas do Quiz
  const [englishLevel, setEnglishLevel] = useState<string>("Intermediate");
  const [objective, setObjective] = useState<string>("Business");
  const [interests, setInterests] = useState<string[]>([]);
  const [tutorTone, setTutorTone] = useState<string>("friendly");

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

  const handleInterestToggle = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter((i) => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
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

      // 1. Atualizar perfil com as respostas do onboarding
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          english_level: englishLevel,
          learning_objective: objective,
          interests: interests,
          tutor_tone: tutorTone,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", session.user.id);

      if (profileError) throw profileError;

      // 2. Chamar API para gerar o caminho personalizado de 5 fases
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
      <div className="flex-1 w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-screen px-4">
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
      <div className="flex-1 w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-screen px-6 text-center">
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
          Nossa inteligência artificial está desenhando 5 lições progressivas sob medida baseadas no seu nível e objetivos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-md mx-auto flex flex-col justify-center px-6 py-12 bg-background text-foreground min-h-screen relative overflow-hidden">
      {/* Círculos de fundo desfocados */}
      <div className="absolute w-48 h-48 bg-primary/5 rounded-full blur-3xl -top-10 -left-10 pointer-events-none" />
      <div className="absolute w-64 h-64 bg-primary/2 rounded-full blur-3xl -bottom-20 -right-20 pointer-events-none" />

      <div className="w-full bg-card-bg border border-muted-slate/30 rounded-3xl p-6 backdrop-blur-md relative z-10 shadow-2xl flex flex-col gap-6">
        
        {/* Progresso do Quiz */}
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-1.5 w-full max-w-[140px]">
            {[1, 2, 3, 4].map((stepNum) => (
              <div 
                key={stepNum} 
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  step >= stepNum ? "bg-primary" : "bg-muted-slate/20"
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-text font-bold uppercase tracking-widest">
            Passo {step} de 4
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
                O tutor adaptará a fala e as correções
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {[
                { id: "Beginner", label: "Iniciante", desc: "Consigo entender frases básicas e formular respostas muito simples" },
                { id: "Intermediate", label: "Intermediário", desc: "Me comunico razoavelmente bem, mas preciso pensar para estruturar ideias complexas" },
                { id: "Advanced", label: "Avançado", desc: "Falo com fluidez e naturalidade, buscando polir preposições e vocabulário nativo" }
              ].map((item) => {
                const isSelected = englishLevel === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setEnglishLevel(item.id)}
                    className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all duration-300 ${
                      isSelected
                        ? "bg-primary/5 border-primary shadow-[0_0_12px_rgba(204,255,0,0.05)]"
                        : "bg-background/40 border-muted-slate/20 hover:border-muted-slate/50"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? "border-primary bg-primary text-background" : "border-muted-slate/50"
                    }`}>
                      {isSelected && <CheckIcon size={10} />}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-xs font-bold ${isSelected ? "text-primary" : "text-white"}`}>
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

        {/* Passo 2: Objetivo */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-lg font-black tracking-tight text-white">
                Qual o seu objetivo principal?
              </h1>
              <p className="text-[10px] text-muted-text uppercase tracking-widest mt-1 font-bold">
                Direciona os desafios pedagógicos da trilha
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {[
                { id: "Business", label: "Trabalho e Negócios", desc: "Simulações de entrevistas, daily standups e apresentações profissionais" },
                { id: "Travel", label: "Viagens e Turismo", desc: "Diálogos práticos em aeroportos, hotéis, restaurantes e alfândegas" },
                { id: "Daily Conversation", label: "Conversação do Dia a Dia", desc: "Diálogos informais sobre hobbies, rotina, planos e socialização" },
                { id: "Academic", label: "Acadêmico e Exames", desc: "Debates formais de ideias e preparação para provas de proficiência" }
              ].map((item) => {
                const isSelected = objective === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setObjective(item.id)}
                    className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all duration-300 ${
                      isSelected
                        ? "bg-primary/5 border-primary shadow-[0_0_12px_rgba(204,255,0,0.05)]"
                        : "bg-background/40 border-muted-slate/20 hover:border-muted-slate/50"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? "border-primary bg-primary text-background" : "border-muted-slate/50"
                    }`}>
                      {isSelected && <CheckIcon size={10} />}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-xs font-bold ${isSelected ? "text-primary" : "text-white"}`}>
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

        {/* Passo 3: Interesses */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-lg font-black tracking-tight text-white">
                Quais temas você gosta?
              </h1>
              <p className="text-[10px] text-muted-text uppercase tracking-widest mt-1 font-bold">
                O tutor trará esses temas para os diálogos livres
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                "Technology",
                "Movies & Series",
                "Sports",
                "Gaming",
                "Cooking",
                "Economy & Business",
                "Travel & Culture",
                "Health & Fitness"
              ].map((topic) => {
                // Traduções apenas estéticas para exibição
                const translations: Record<string, string> = {
                  "Technology": "Tecnologia",
                  "Movies & Series": "Filmes e Séries",
                  "Sports": "Esportes",
                  "Gaming": "Jogos/Games",
                  "Cooking": "Culinária",
                  "Economy & Business": "Negócios/Mercado",
                  "Travel & Culture": "Viagem e Cultura",
                  "Health & Fitness": "Saúde e Bem-estar"
                };

                const isSelected = interests.includes(topic);
                return (
                  <button
                    key={topic}
                    onClick={() => handleInterestToggle(topic)}
                    className={`p-3.5 rounded-xl border text-center font-bold text-xs transition duration-300 ${
                      isSelected
                        ? "bg-primary border-primary text-background shadow-[0_0_12px_rgba(204,255,0,0.15)]"
                        : "bg-background/40 border-muted-slate/20 text-muted-text hover:border-muted-slate/50"
                    }`}
                  >
                    {translations[topic]}
                  </button>
                );
              })}
            </div>
            
            {interests.length === 0 && (
              <span className="text-[10px] text-muted-text italic text-center leading-relaxed block mt-1">
                Selecione pelo menos um tema de interesse.
              </span>
            )}
          </div>
        )}

        {/* Passo 4: Tom do Tutor */}
        {step === 4 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-lg font-black tracking-tight text-white">
                Qual o tom do tutor ideal?
              </h1>
              <p className="text-[10px] text-muted-text uppercase tracking-widest mt-1 font-bold">
                Escolha a personalidade do parceiro de conversação
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {[
                { id: "friendly", label: "Amigável e Paciente", desc: "Foca em encorajar, elogia avanços e responde com calma" },
                { id: "casual", label: "Descontraído e Informal", desc: "Utiliza gírias comuns, conversação dinâmica como um amigo próximo" },
                { id: "technical", label: "Técnico e Direto", desc: "Foco profissional, corrige erros de pronúncia e gramática de imediato" }
              ].map((item) => {
                const isSelected = tutorTone === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTutorTone(item.id)}
                    className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all duration-300 ${
                      isSelected
                        ? "bg-primary/5 border-primary shadow-[0_0_12px_rgba(204,255,0,0.05)]"
                        : "bg-background/40 border-muted-slate/20 hover:border-muted-slate/50"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? "border-primary bg-primary text-background" : "border-muted-slate/50"
                    }`}>
                      {isSelected && <CheckIcon size={10} />}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-xs font-bold ${isSelected ? "text-primary" : "text-white"}`}>
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
            disabled={step === 3 && interests.length === 0}
            className="flex-grow py-3.5 bg-primary text-background font-bold uppercase tracking-widest text-[10px] rounded-xl shadow-[0_0_20px_rgba(204,255,0,0.25)] hover:bg-primary-hover transition duration-300 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === 4 ? "Concluir" : "Avançar"} <ChevronRightIcon size={10} />
          </button>
        </div>

      </div>
    </div>
  );
}
