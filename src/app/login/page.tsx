"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { SparklesIcon } from "@/components/Icons";

export default function LoginScreen() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [priceIdToRedirect, setPriceIdToRedirect] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") {
      setIsSignUp(true);
    }
    const priceId = params.get("priceId");
    if (priceId) {
      setPriceIdToRedirect(priceId);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password || (isSignUp && !name)) {
      setErrorMsg("Preencha todos os campos obrigatórios.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // Fluxo de Cadastro
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name
            }
          }
        });

        if (error) throw error;
        
        // Faz login automático após o cadastro
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (loginError) throw loginError;
        
      } else {
        // Fluxo de Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
      }

      // Redirecionamento para o checkout, se necessário
      if (priceIdToRedirect) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const res = await fetch("/api/checkout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ priceId: priceIdToRedirect })
          });
          const data = await res.json();
          if (data.url) {
            window.location.href = data.url;
            return;
          }
        }
      }

      // Redireciona para a dashboard se não houver checkout pendente
      router.push("/");
    } catch (err: any) {
      console.error("Erro na autenticação:", err);
      setErrorMsg(err.message || "Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto flex flex-col justify-center px-6 py-12 bg-background text-foreground min-h-screen relative overflow-hidden">
      {/* Círculos de fundo desfocados */}
      <div className="absolute w-48 h-48 bg-primary/5 rounded-full blur-3xl -top-10 -left-10 pointer-events-none" />
      <div className="absolute w-64 h-64 bg-primary/2 rounded-full blur-3xl -bottom-20 -right-20 pointer-events-none" />

      <div className="w-full bg-card-bg border border-muted-slate/30 rounded-3xl p-6 backdrop-blur-md relative z-10 shadow-2xl flex flex-col gap-6">
        
        {/* Logo e cabeçalho */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-14 h-14">
            <Image 
              src="/logo-v3.png" 
              alt="Fluenty Logo" 
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-black tracking-tight text-white">
              {isSignUp ? "Crie sua conta" : "Entre no Fluenty"}
            </h1>
            <p className="text-[11px] text-muted-text uppercase tracking-widest mt-1 font-bold">
              {isSignUp ? "Sua jornada de fluência começa aqui" : "Pratique inglês hands-free com IA"}
            </p>
          </div>
        </div>

        {/* Mensagens de feedback */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-4 text-xs font-semibold leading-relaxed">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-primary/10 border border-primary/20 text-primary rounded-2xl p-4 text-xs font-bold leading-relaxed">
            {successMsg}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-muted-text font-bold uppercase tracking-wider">
                Nome completo
              </label>
              <input
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background/80 border border-muted-slate/30 rounded-xl px-4 py-3 text-xs font-medium text-foreground placeholder:text-muted-text/50 focus:outline-none focus:border-primary transition"
                disabled={loading}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-muted-text font-bold uppercase tracking-wider">
              E-mail
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background/80 border border-muted-slate/30 rounded-xl px-4 py-3 text-xs font-medium text-foreground placeholder:text-muted-text/50 focus:outline-none focus:border-primary transition"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-muted-text font-bold uppercase tracking-wider">
              Senha
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background/80 border border-muted-slate/30 rounded-xl px-4 py-3 text-xs font-medium text-foreground placeholder:text-muted-text/50 focus:outline-none focus:border-primary transition"
              disabled={loading}
            />
          </div>

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-background font-bold uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(204,255,0,0.25)] hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.99] transition duration-300 flex items-center justify-center gap-2 mt-2 disabled:opacity-55 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 rounded-full border-2 border-background/20 border-t-background animate-spin" />
            ) : (
              <>
                <SparklesIcon size={14} />
                {isSignUp ? "Criar Conta" : "Entrar no App"}
              </>
            )}
          </button>
        </form>

        {/* Toggle */}
        <div className="text-center text-xs font-medium text-muted-text mt-2 border-t border-muted-slate/20 pt-4">
          {isSignUp ? "Já possui uma conta?" : "Novo no Fluenty?"}{" "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="text-primary font-bold hover:underline bg-transparent border-none p-0 cursor-pointer ml-1"
            disabled={loading}
          >
            {isSignUp ? "Faça login" : "Crie uma conta gratuita"}
          </button>
        </div>

      </div>
    </div>
  );
}
