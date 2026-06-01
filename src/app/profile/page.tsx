"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  FlameIcon, 
  SparklesIcon, 
  ChevronLeftIcon, 
  CheckIcon, 
  UserIcon, 
  LogOutIcon 
} from "@/components/Icons";

export default function ProfileScreen() {
  const router = useRouter();
  
  // Estados de controle
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showRegenModal, setShowRegenModal] = useState(false);

  // Dados do Usuário
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [streak, setStreak] = useState<number>(0);

  // Preferências Pedagógicas (Onboarding)
  const [englishLevel, setEnglishLevel] = useState<string>("Intermediate");
  const [objective, setObjective] = useState<string>("Business");
  const [interests, setInterests] = useState<string[]>([]);
  const [tutorTone, setTutorTone] = useState<string>("friendly");

  // Cópias de backup para detectar se houve alteração na trilha
  const [origLevel, setOrigLevel] = useState<string>("");
  const [origObjective, setOrigObjective] = useState<string>("");
  const [origInterests, setOrigInterests] = useState<string[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }

        setUserId(session.user.id);
        setUserEmail(session.user.email || "");

        // Buscar dados do perfil
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("name, streak, english_level, learning_objective, interests, tutor_tone")
          .eq("id", session.user.id)
          .single();

        if (error) throw error;

        if (profile) {
          setUserName(profile.name || "");
          setStreak(profile.streak || 0);
          
          const levelVal = profile.english_level || "Intermediate";
          const objVal = profile.learning_objective || "Business";
          const interestsVal = profile.interests || [];
          const toneVal = profile.tutor_tone || "friendly";

          setEnglishLevel(levelVal);
          setObjective(objVal);
          setInterests(interestsVal);
          setTutorTone(toneVal);

          // Backup
          setOrigLevel(levelVal);
          setOrigObjective(objVal);
          setOrigInterests(interestsVal);
        }
      } catch (err: any) {
        console.error("Erro ao carregar dados do perfil:", err);
        setErrorMsg("Não foi possível carregar as informações do seu perfil.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleInterestToggle = (topic: string) => {
    if (interests.includes(topic)) {
      setInterests(interests.filter((i) => i !== topic));
    } else {
      setInterests([...interests, topic]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!userName.trim()) {
        throw new Error("O nome de usuário não pode ficar em branco.");
      }
      if (interests.length === 0) {
        throw new Error("Por favor, selecione pelo menos um tema de interesse.");
      }

      // Atualizar no banco
      const { error } = await supabase
        .from("profiles")
        .update({
          name: userName,
          english_level: englishLevel,
          learning_objective: objective,
          interests: interests,
          tutor_tone: tutorTone,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);

      if (error) throw error;

      // Detectar se houve mudanças fundamentais na trilha de aprendizado
      const hasLevelChanged = englishLevel !== origLevel;
      const hasObjectiveChanged = objective !== origObjective;
      const hasInterestsChanged = 
        interests.length !== origInterests.length || 
        !interests.every((val) => origInterests.includes(val));

      if (hasLevelChanged || hasObjectiveChanged || hasInterestsChanged) {
        // Solicitar se deseja regerar a trilha de fases
        setShowRegenModal(true);
      } else {
        setSuccessMsg("Perfil atualizado com sucesso!");
        // Limpar mensagens de sucesso após 3 segundos
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      console.error("Erro ao salvar perfil:", err);
      setErrorMsg(err.message || "Ocorreu um erro ao salvar as alterações.");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenTrack = async (confirmRegen: boolean) => {
    setShowRegenModal(false);
    
    if (!confirmRegen) {
      setSuccessMsg("Perfil atualizado com sucesso! (Trilha de fases mantida)");
      setTimeout(() => setSuccessMsg(null), 3000);
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Chamar API para regerar a trilha de 5 fases baseada nas novas escolhas
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

      // Atualiza backups
      setOrigLevel(englishLevel);
      setOrigObjective(objective);
      setOrigInterests(interests);

      setSuccessMsg("Sua nova jornada personalizada foi gerada com sucesso! Redirecionando...");
      
      // Redirecionar para dashboard principal após 1.5s
      setTimeout(() => {
        router.push("/");
      }, 1500);

    } catch (err: any) {
      console.error("Erro ao regerar trilha:", err);
      setErrorMsg(err.message || "Sua configuração foi salva, mas falhou ao gerar a nova trilha.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (confirm("Deseja realmente sair da sua conta?")) {
      await supabase.auth.signOut();
      router.push("/login");
    }
  };

  // Temas disponíveis
  const availableTopics = [
    "Technology",
    "Movies & Series",
    "Sports",
    "Gaming",
    "Cooking",
    "Economy & Business",
    "Travel & Culture",
    "Health & Fitness"
  ];

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

  if (loading) {
    return (
      <div className="flex-grow w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-screen px-4 text-foreground bg-background">
        <div className="relative w-12 h-12 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-muted-slate/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-primary animate-pulse">
          Carregando perfil...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-grow w-full max-w-md mx-auto flex flex-col px-4 py-6 md:max-w-2xl lg:py-10 text-foreground bg-background relative overflow-hidden min-h-screen">
      
      {/* Círculos decorativos em blur */}
      <div className="absolute w-48 h-48 bg-primary/5 rounded-full blur-3xl -top-10 -left-10 pointer-events-none" />
      <div className="absolute w-64 h-64 bg-primary/2 rounded-full blur-3xl -bottom-20 -right-20 pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between w-full mb-8 relative z-10">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-xs text-muted-text font-bold uppercase tracking-widest hover:text-white transition"
        >
          <ChevronLeftIcon size={12} />
          Voltar
        </button>
        <h1 className="text-sm font-black tracking-widest uppercase text-white">
          Configurações
        </h1>
        <div className="w-10"></div> {/* Espaçador para centralizar o título */}
      </header>

      {/* Feedbacks de Operações */}
      {errorMsg && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-4 text-xs font-semibold leading-relaxed relative z-10">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mb-6 bg-primary/10 border border-primary/20 text-primary rounded-2xl p-4 text-xs font-semibold leading-relaxed relative z-10">
          {successMsg}
        </div>
      )}

      {/* Painel Principal de Perfil (Obsidian / Vidro Fumê) */}
      <div className="w-full bg-card-bg border border-muted-slate/30 rounded-3xl p-6 backdrop-blur-md relative z-10 shadow-2xl flex flex-col gap-8 mb-6">
        
        {/* Sessão 1: Informações de Conta */}
        <section className="flex flex-col gap-5 border-b border-muted-slate/20 pb-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-primary">
            Informações Pessoais
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-muted-slate/15 flex items-center justify-center text-muted-text border border-muted-slate/30 shrink-0">
              <UserIcon size={24} />
            </div>
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-text">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="bg-background/50 border border-muted-slate/20 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-primary transition"
                  placeholder="Seu nome"
                />
              </div>
              
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-text">
                  E-mail
                </span>
                <span className="text-xs font-medium text-white/50 px-1">
                  {userEmail}
                </span>
              </div>
            </div>
          </div>

          {/* Badges de Conta */}
          <div className="grid grid-cols-2 gap-3 mt-2">
            {/* Streak */}
            <div className="flex items-center gap-3 bg-background/30 border border-muted-slate/20 rounded-2xl p-3.5">
              <FlameIcon className="text-primary animate-pulse" size={20} />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-text">
                  Consistência
                </span>
                <span className="text-xs font-black text-white">
                  {streak} {streak === 1 ? "Dia" : "Dias"} Seguidos
                </span>
              </div>
            </div>

            {/* Plano Assinatura */}
            <div className="flex items-center gap-3 bg-background/30 border border-muted-slate/20 rounded-2xl p-3.5">
              <SparklesIcon className="text-primary" size={20} />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-text">
                  Assinatura
                </span>
                <span className="text-xs font-black text-white flex items-center gap-1">
                  Fluenty Pro
                  <span className="text-[8px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full uppercase leading-none font-bold scale-90 origin-left">
                    Ativo
                  </span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Sessão 2: Preferências Pedagógicas */}
        <section className="flex flex-col gap-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-primary">
            Preferências de Aprendizado
          </h2>

          {/* Nível de Inglês */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-text">
              Nível Atual
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "Beginner", label: "Iniciante" },
                { id: "Intermediate", label: "Intermediário" },
                { id: "Advanced", label: "Avançado" }
              ].map((lvl) => {
                const isSelected = englishLevel === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => setEnglishLevel(lvl.id)}
                    className={`py-2 px-1 rounded-xl border font-bold text-[10px] text-center transition ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background/40 border-muted-slate/20 text-muted-text hover:border-muted-slate/40"
                    }`}
                  >
                    {lvl.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Objetivo principal */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-text">
              Objetivo Principal
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "Business", label: "Trabalho" },
                { id: "Travel", label: "Viagens" },
                { id: "Daily Conversation", label: "Dia a Dia" },
                { id: "Academic", label: "Acadêmico" }
              ].map((obj) => {
                const isSelected = objective === obj.id;
                return (
                  <button
                    key={obj.id}
                    onClick={() => setObjective(obj.id)}
                    className={`py-2.5 px-2 rounded-xl border font-bold text-[10px] text-center transition ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background/40 border-muted-slate/20 text-muted-text hover:border-muted-slate/40"
                    }`}
                  >
                    {obj.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interesses */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-text">
              Temas de Interesse
            </span>
            <div className="grid grid-cols-2 gap-2">
              {availableTopics.map((topic) => {
                const isSelected = interests.includes(topic);
                return (
                  <button
                    key={topic}
                    onClick={() => handleInterestToggle(topic)}
                    className={`py-2 px-2.5 rounded-xl border font-bold text-[10px] transition text-center ${
                      isSelected
                        ? "bg-primary border-primary text-background shadow-[0_0_8px_rgba(204,255,0,0.1)]"
                        : "bg-background/40 border-muted-slate/20 text-muted-text hover:border-muted-slate/40"
                    }`}
                  >
                    {translations[topic]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tom do Tutor */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-text">
              Personalidade do Tutor
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "friendly", label: "Amigável" },
                { id: "casual", label: "Descontraído" },
                { id: "technical", label: "Técnico" }
              ].map((tone) => {
                const isSelected = tutorTone === tone.id;
                return (
                  <button
                    key={tone.id}
                    onClick={() => setTutorTone(tone.id)}
                    className={`py-2 px-1 rounded-xl border font-bold text-[10px] text-center transition ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background/40 border-muted-slate/20 text-muted-text hover:border-muted-slate/40"
                    }`}
                  >
                    {tone.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Botão de Salvar */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 bg-primary text-background font-bold uppercase tracking-widest text-[10px] rounded-xl shadow-[0_0_20px_rgba(204,255,0,0.15)] hover:bg-primary-hover transition duration-300 flex items-center justify-center gap-1.5 disabled:opacity-40"
        >
          {saving ? "Salvando..." : "Salvar Configurações"}
        </button>

      </div>

      {/* Botão Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 bg-card-bg/20 border border-muted-slate/20 hover:border-red-500/30 hover:text-red-500 text-muted-text font-bold uppercase tracking-widest text-[9px] rounded-xl flex items-center justify-center gap-2 transition duration-300 relative z-10"
      >
        <LogOutIcon size={12} />
        Sair da Conta
      </button>

      {/* MODAL DE CONFIRMAÇÃO DE REGERAÇÃO DE TRILHA */}
      {showRegenModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-card-bg border border-muted-slate/30 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 text-center">
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 text-primary rounded-2xl flex items-center justify-center mx-auto">
              <SparklesIcon size={22} className="animate-pulse" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Regerar sua Trilha?
              </h3>
              <p className="text-xs text-muted-text leading-relaxed">
                Você alterou dados de aprendizado (Nível, Objetivos ou Interesses). Gostaria de regerar suas 5 fases do roadmap personalizando de acordo com as novas preferências?
              </p>
              <p className="text-[10px] text-yellow-500/80 font-bold bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-2.5 mt-1 leading-normal">
                Aviso: Isso irá regerar a sua jornada pedagógica, apagando o progresso atual.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleRegenTrack(false)}
                className="flex-1 py-3 border border-muted-slate/30 text-muted-text font-bold uppercase tracking-widest text-[10px] rounded-xl hover:border-muted-slate/60 hover:text-white transition"
              >
                Manter Trilha
              </button>
              <button
                onClick={() => handleRegenTrack(true)}
                className="flex-1 py-3 bg-primary text-background font-bold uppercase tracking-widest text-[10px] rounded-xl shadow-[0_0_15px_rgba(204,255,0,0.2)] hover:bg-primary-hover transition"
              >
                Sim, Regerar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
