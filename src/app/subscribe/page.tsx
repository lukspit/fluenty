"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SparklesIcon, CheckIcon, ChevronLeftIcon } from "@/components/Icons";

export default function SubscribeScreen() {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("annual");
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userSession, setUserSession] = useState<any>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserSession(session);
    };
    getSession();
  }, []);

  const handleSubscribe = async (priceId: string) => {
    if (!userSession) {
      router.push("/login");
      return;
    }

    setLoadingPriceId(priceId);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userSession.access_token}`
        },
        body: JSON.stringify({ priceId })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao iniciar o checkout com o Stripe.");
      }

      const data = await res.json();
      if (data.url) {
        // Redireciona para o Stripe Checkout seguro
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout inválida retornada.");
      }
    } catch (err: any) {
      console.error("Erro na assinatura:", err);
      setErrorMsg(err.message || "Erro ao conectar com o Stripe.");
      setLoadingPriceId(null);
    }
  };

  // IDs dos preços de produção configurados no .env.local
  const plusMonthlyId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_MONTHLY || "price_1TdLU2Jm8EKlUsxio6XIM3aU";
  const proMonthlyId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || "price_1TdLU3Jm8EKlUsxicdHCxiMn";
  const proAnnualId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL || "price_1TdLU3Jm8EKlUsxiVdM1tgJm";

  return (
    <div className="flex-1 w-full max-w-md mx-auto flex flex-col justify-center px-4 py-8 bg-background text-foreground min-h-screen relative overflow-hidden md:max-w-2xl lg:max-w-4xl">
      {/* Elementos decorativos com blur */}
      <div className="absolute w-72 h-72 bg-primary/5 rounded-full blur-3xl -top-10 -left-10 pointer-events-none animate-pulse" />
      <div className="absolute w-96 h-96 bg-primary/2 rounded-full blur-3xl -bottom-20 -right-20 pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between w-full mb-8 relative z-10">
        <button
          onClick={() => router.push("/profile")}
          className="flex items-center gap-1.5 text-xs text-muted-text font-bold uppercase tracking-widest hover:text-white transition"
        >
          <ChevronLeftIcon size={12} />
          Voltar
        </button>
        <div className="relative w-8 h-8 flex-shrink-0">
          <Image
            src="/logo-v3.png"
            alt="Fluenty Logo"
            fill
            className="object-contain animate-pulse"
          />
        </div>
        <div className="w-10"></div>
      </header>

      {/* Título Principal */}
      <div className="text-center flex flex-col items-center gap-2 mb-8 relative z-10">
        <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full animate-bounce">
          Acesso Premium
        </span>
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-white max-w-md leading-tight">
          Destrave sua conversação em inglês de forma ilimitada
        </h1>
        <p className="text-xs text-muted-text max-w-xs leading-normal">
          Pratique a qualquer hora do dia com tutores inteligentes e roleplays do seu cotidiano profissional.
        </p>

        {/* Alternador Mensal / Anual para o plano Pro */}
        <div className="flex items-center gap-1 bg-card-bg border border-muted-slate/30 rounded-xl p-1 mt-6">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition duration-300 ${
              billingPeriod === "monthly"
                ? "bg-primary text-background font-black shadow-[0_2px_8px_rgba(204,255,0,0.15)]"
                : "text-muted-text hover:text-foreground"
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setBillingPeriod("annual")}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition duration-300 flex items-center gap-1.5 ${
              billingPeriod === "annual"
                ? "bg-primary text-background font-black shadow-[0_2px_8px_rgba(204,255,0,0.15)]"
                : "text-muted-text hover:text-foreground"
            }`}
          >
            <span>Anual</span>
            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
              billingPeriod === "annual" ? "bg-background/20 text-background" : "bg-primary/20 text-primary"
            }`}>
              50% OFF
            </span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-4 text-xs font-semibold leading-relaxed text-center relative z-10">
          {errorMsg}
        </div>
      )}

      {/* Grade com os dois Planos */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 relative z-10 w-full max-w-3xl mx-auto">
        
        {/* Plano 1: Fluenty Plus */}
        <div className="bg-card-bg/60 border border-muted-slate/20 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between hover:border-muted-slate/40 transition duration-300 relative">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-text block mb-1">
              Para Começar
            </span>
            <h2 className="text-base font-black text-white">Fluenty Plus</h2>
            <p className="text-[10px] text-muted-text mt-1.5 leading-normal">
              Ideal para quem quer praticar conversação casual em ritmo leve sem perder o hábito.
            </p>

            <div className="my-6">
              <span className="text-2xl font-black text-white">R$ 29,90</span>
              <span className="text-[10px] text-muted-text font-bold uppercase tracking-wider"> / mês</span>
            </div>

            <div className="border-t border-muted-slate/15 pt-5 flex flex-col gap-3">
              {[
                "15 sessões de áudio completas por mês",
                "Acesso a 2 tutores (Alex e Sophia)",
                "Trilha básica de aprendizado",
                "Geração de 1 nova trilha de IA por mês",
                "Histórico completo de pontuações"
              ].map((benefit, i) => (
                <div key={i} className="flex items-start gap-2.5 text-[11px] font-medium leading-normal text-foreground/90">
                  <div className="w-4 h-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <CheckIcon size={9} />
                  </div>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleSubscribe(plusMonthlyId)}
            disabled={loadingPriceId !== null}
            className="w-full mt-8 py-3.5 border border-muted-slate/30 text-white hover:border-white/50 font-bold uppercase tracking-widest text-[10px] rounded-xl transition duration-300 disabled:opacity-40"
          >
            {loadingPriceId === plusMonthlyId ? "Redirecionando..." : "Começar Agora"}
          </button>
        </div>

        {/* Plano 2: Fluenty Pro */}
        <div className="bg-card-bg/85 border border-primary/35 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between hover:border-primary/50 transition duration-300 relative shadow-[0_0_30px_rgba(204,255,0,0.04)]">
          {/* Badge de Recomendado */}
          <div className="absolute -top-3 right-6 bg-primary text-background text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_12px_rgba(204,255,0,0.25)]">
            Recomendado
          </div>

          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-primary block mb-1">
              Conversação Infinita
            </span>
            <h2 className="text-base font-black text-white flex items-center gap-1.5">
              Fluenty Pro <SparklesIcon size={12} className="text-primary animate-pulse" />
            </h2>
            <p className="text-[10px] text-muted-text mt-1.5 leading-normal">
              Acesso total ilimitado para quem precisa destravar a fala profissional para o mercado e reuniões.
            </p>

            <div className="my-6">
              {billingPeriod === "monthly" ? (
                <>
                  <span className="text-2xl font-black text-white">R$ 49,90</span>
                  <span className="text-[10px] text-muted-text font-bold uppercase tracking-wider"> / mês</span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-black text-white">R$ 24,90</span>
                  <span className="text-[10px] text-muted-text font-bold uppercase tracking-wider"> / mês equival.</span>
                  <span className="text-[10px] text-primary block font-bold mt-1 uppercase tracking-wider">
                    Cobrado anualmente (R$ 299,00/ano)
                  </span>
                </>
              )}
            </div>

            <div className="border-t border-muted-slate/15 pt-5 flex flex-col gap-3">
              {[
                "Chamadas de voz 100% ILIMITADAS",
                "Acesso a todos os 4 tutores virtuais",
                "Cenários de roleplay customizados para seu cargo",
                "Dicionário inteligente de erros com análise de IA",
                "Geração ilimitada de novas fases no roadmap",
                "Suporte prioritário dedicado"
              ].map((benefit, i) => (
                <div key={i} className="flex items-start gap-2.5 text-[11px] font-medium leading-normal text-foreground/90">
                  <div className="w-4 h-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <CheckIcon size={9} />
                  </div>
                  <span className="font-bold">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleSubscribe(billingPeriod === "monthly" ? proMonthlyId : proAnnualId)}
            disabled={loadingPriceId !== null}
            className="w-full mt-8 py-3.5 bg-primary text-background font-black uppercase tracking-widest text-[10px] rounded-xl shadow-[0_0_15px_rgba(204,255,0,0.15)] hover:bg-primary-hover transition duration-300 disabled:opacity-40"
          >
            {loadingPriceId === (billingPeriod === "monthly" ? proMonthlyId : proAnnualId)
              ? "Redirecionando..."
              : `Assinar Pro ${billingPeriod === "annual" ? "Anual" : "Mensal"}`}
          </button>
        </div>

      </div>

      <footer className="w-full text-center text-[10px] text-muted-text uppercase tracking-widest mt-12 font-bold relative z-10">
        Fluenty © 2026 • Ambiente de Pagamento Seguro
      </footer>
    </div>
  );
}
