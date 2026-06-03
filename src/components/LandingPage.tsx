"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { SparklesIcon, CheckIcon, ChevronRightIcon, ZapIcon } from "@/components/Icons";

declare global {
  interface Window {
    onYouTubeIframeAPIReady: (() => void) | undefined;
    YT: any;
  }
}

const PRODUCT_PRICE = "27,00";
const CHECKOUT_URL = "https://pay.kiwify.com.br/lvlsx68";
const YOUTUBE_VIDEO_ID = "FqkMu2dD5kE";

export default function LandingPage() {
  const [showOffer, setShowOffer] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  // Inicia a verificação de tempo do vídeo
  const startTracking = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        const currentTime = playerRef.current.getCurrentTime();
        // Revela a oferta quando o vídeo passa de 4m30s (270 segundos)
        if (currentTime >= 270) {
          triggerReveal();
          stopTracking();
        }
      }
    }, 1000);
  };

  const stopTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const triggerReveal = () => {
    setShowOffer(true);
    localStorage.setItem("vsl_revealed", "true");
  };

  const resetReveal = () => {
    localStorage.removeItem("vsl_revealed");
    setShowOffer(false);
    if (playerRef.current && typeof playerRef.current.seekTo === "function") {
      playerRef.current.seekTo(0);
      playerRef.current.playVideo();
    }
  };

  // Carrega e inicializa a API do YouTube
  useEffect(() => {
    const initPlayer = () => {
      if (playerRef.current) return;
      
      playerRef.current = new window.YT.Player("vsl-youtube-player", {
        height: "100%",
        width: "100%",
        videoId: YOUTUBE_VIDEO_ID,
        playerVars: {
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          controls: 1,
          origin: typeof window !== "undefined" ? window.location.origin : ""
        },
        events: {
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              startTracking();
            } else {
              stopTracking();
            }
            if (event.data === window.YT.PlayerState.ENDED) {
              triggerReveal();
            }
          }
        }
      });
    };

    // Insere o script da Iframe API se já não estiver no DOM
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    // Vincula a callback global que o YouTube executa ao carregar
    window.onYouTubeIframeAPIReady = () => {
      initPlayer();
    };

    // Caso a API já tenha carregado anteriormente
    if (window.YT && window.YT.Player) {
      initPlayer();
    }

    return () => {
      stopTracking();
    };
  }, []);

  // Verifica se o usuário já liberou a oferta anteriormente
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reveal") === "true" || localStorage.getItem("vsl_revealed") === "true") {
      setShowOffer(true);
    }
  }, []);

  const faqs = [
    {
      q: "Para quem é este treinamento?",
      a: "Para qualquer profissional (especialmente da área de tecnologia e corporativo) que já consegue entender inglês, ler documentação e escrever e-mails, mas sente a garganta fechar, gagueja e trava na hora de falar em reuniões, dailies ou entrevistas internacionais."
    },
    {
      q: "Como funciona o acesso?",
      a: "Assim que sua compra de R$ 27,00 for confirmada pela Kiwify, você receberá instantaneamente um e-mail com seus dados de login para a nossa área de membros exclusiva. Lá você terá acesso imediato às 4 aulas práticas do método."
    },
    {
      q: "O que é a plataforma Fluenty que é citada nas aulas?",
      a: "O Fluenty é a nossa plataforma proprietária de simulação conversacional por voz com inteligência artificial. Na Aula 4 do treinamento, nós vamos te dar o mapa prático e o link exclusivo para você criar sua conta e começar a praticar conversação ativa diariamente."
    },
    {
      q: "Quanto tempo dura o treinamento?",
      a: "O treinamento é direto ao ponto, sem enrolação. São 4 aulas cirúrgicas que você consegue assistir inteiras em menos de 20 minutos, saindo de lá com um plano de treino prático montado para começar a aplicar no mesmo dia."
    },
    {
      q: "E se eu não gostar?",
      a: "Você tem uma garantia incondicional de 7 dias. Assista às aulas, baixe os bônus e, se achar que o método não faz sentido para você, basta nos enviar um e-mail e nós devolvemos 100% do seu dinheiro. Sem burocracia."
    }
  ];

  return (
    <div className="bg-brand-dark text-slate-100 min-h-screen relative overflow-x-hidden font-sans selection:bg-brand-neon selection:text-brand-dark">
      
      {/* Background Glows */}
      <div className="absolute w-[600px] h-[600px] bg-brand-neon/5 rounded-full blur-[150px] -top-96 left-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] bg-brand-neon/2 rounded-full blur-[120px] bottom-10 -right-96 pointer-events-none" />

      {/* Header (Premium, Floating & Glassmorphic) */}
      <header className="sticky top-0 w-full bg-brand-dark/60 backdrop-blur-md border-b border-white/[0.04] z-50 transition-all duration-300">
        <div className="max-w-4xl mx-auto px-6 py-4.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image 
              src="/logo-v3.png" 
              alt="Fluenty Logo" 
              width={28} 
              height={28} 
              className="object-contain"
            />
            <span className="font-title font-black text-base text-white tracking-tight">Fluenty</span>
          </div>
          <a 
            href="/login" 
            className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition duration-200"
          >
            Área de Membros
          </a>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-6 pt-6 md:pt-10 pb-24 relative z-10 flex flex-col items-center">
        
        {/* Headline Section */}
        <div className="text-center space-y-5 max-w-3xl mb-6">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-brand-neon bg-brand-neon/10 border border-brand-neon/15 px-4 py-1.5 rounded-full">
            <SparklesIcon size={10} className="animate-pulse text-brand-neon" /> PARA QUEM JÁ ENTENDE INGLÊS, MAS TRAVA NA HORA DE FALAR
          </span>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight max-w-2xl mx-auto">
            Fale inglês com a mesma <span className="text-brand-neon">confiança e autoridade</span> que você tem em português
          </h1>
          
          <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-slate-200 leading-snug max-w-2xl mx-auto">
            — em menos de 30 dias, praticando sozinho, sem decorar gramática ou gastar com intercâmbio caro.
          </h2>
          
          {/* Indicador de Seta apontando para a VSL */}
          <div className="flex flex-col items-center gap-1 text-brand-neon/70 animate-bounce pt-2 pointer-events-none">
            <svg className="w-5 h-5 text-brand-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-6l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* VSL Player (9:16 Vertical Container with Premium Holographic Glow) */}
        <div className="w-full max-w-sm aspect-[9/16] bg-brand-card/90 rounded-[2rem] border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_40px_rgba(204,255,0,0.06)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_50px_rgba(204,255,0,0.12)] hover:border-brand-neon/30 transition-all duration-500 relative overflow-hidden flex items-center justify-center group mb-8">
          <div id="vsl-youtube-player" className="w-full h-full rounded-2xl" />
        </div>

        <p className="text-[10px] text-brand-textMuted uppercase tracking-widest font-bold mb-12 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span> Assista ao vídeo de 5 minutos acima para liberar seu acesso
        </p>

        {/* Developer Bypass (Só para testes locais) */}
        <div className="text-center mb-10">
          <button 
            onClick={showOffer ? resetReveal : triggerReveal}
            className="text-[9px] uppercase tracking-widest font-bold text-slate-600 hover:text-slate-400 transition"
          >
            [ {showOffer ? "Ocultar Oferta (Testar VSL)" : "Ignorar Vídeo (Testar Revelação)"} ]
          </button>
        </div>

        {/* DELAYED REVEAL SECTION */}
        {showOffer && (
          <div className="w-full animate-fade-in space-y-16 mt-8">
            
            {/* CTA Box (Premium Glassmorphic Banner) */}
            <div className="bg-brand-card/80 border border-white/[0.06] rounded-[2rem] p-8 md:p-10 text-center space-y-8 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_50px_rgba(204,255,0,0.04)] relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-brand-neon/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-2 relative z-10">
                <span className="text-[10px] font-black uppercase text-brand-neon tracking-widest block bg-brand-neon/10 border border-brand-neon/15 px-3 py-1 rounded-full w-max mx-auto">
                  Oferta Exclusiva de Lançamento
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-white">Adquira o Treinamento do Método</h2>
              </div>

              <div className="py-5 border-y border-white/[0.04] max-w-sm mx-auto relative z-10">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-slate-400 text-xs line-through">R$ 97,00</span>
                  <span className="bg-brand-neon/10 text-brand-neon text-[9px] font-black uppercase px-2 py-0.5 rounded">Salvar R$ 70,00</span>
                </div>
                <div className="mt-2 flex items-baseline justify-center">
                  <span className="text-brand-textMuted text-xs font-bold uppercase tracking-wider">Apenas</span>
                  <span className="text-4xl font-black text-white ml-2">R$ {PRODUCT_PRICE}</span>
                  <span className="text-slate-400 text-xs font-medium ml-1.5">à vista</span>
                </div>
              </div>

              <div className="space-y-4 max-w-md mx-auto relative z-10">
                <a
                  href={CHECKOUT_URL}
                  className="w-full py-4.5 bg-brand-neon text-brand-dark hover:bg-brand-neonHover hover:shadow-[0_0_30px_rgba(204,255,0,0.3)] hover:scale-[1.01] active:scale-[0.99] font-title font-black uppercase tracking-widest text-[11px] rounded-2xl transition duration-300 flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_4px_25px_rgba(204,255,0,0.15)]"
                >
                  <ZapIcon size={14} className="fill-brand-dark" />
                  Quero Destravar Minha Fala
                </a>
                <p className="text-[10px] text-brand-textMuted uppercase font-bold tracking-widest">
                  🔒 Ambiente de Pagamento Seguro da Kiwify
                </p>
              </div>
            </div>

            {/* O que você vai levar */}
            <div className="space-y-8">
              <h3 className="text-xl font-black text-white text-center tracking-tight">
                O que você recebe ao garantir o acesso hoje:
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-brand-card/30 border border-white/[0.04] p-6 rounded-2xl flex gap-4 hover:border-brand-neon/20 hover:bg-brand-card/50 transition-all duration-300 hover:shadow-[0_0_25px_rgba(204,255,0,0.02)]">
                  <div className="w-8 h-8 rounded-xl bg-brand-neon/10 border border-brand-neon/20 flex items-center justify-center text-brand-neon shrink-0">
                    <span className="font-black text-xs">01</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold uppercase text-white tracking-wider">Aula 1: O Paradoxo</h4>
                    <p className="text-xs text-brand-textMuted mt-1.5 leading-relaxed">Como mapear sua trava e entender por que a teoria te deixou no intermediário.</p>
                  </div>
                </div>

                <div className="bg-brand-card/30 border border-white/[0.04] p-6 rounded-2xl flex gap-4 hover:border-brand-neon/20 hover:bg-brand-card/50 transition-all duration-300 hover:shadow-[0_0_25px_rgba(204,255,0,0.02)]">
                  <div className="w-8 h-8 rounded-xl bg-brand-neon/10 border border-brand-neon/20 flex items-center justify-center text-brand-neon shrink-0">
                    <span className="font-black text-xs">02</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold uppercase text-white tracking-wider">Aula 2: A Ilusão das Escolas</h4>
                    <p className="text-xs text-brand-textMuted mt-1.5 leading-relaxed">O motivo real pelo qual Duolingo e decoreba de gramática travam sua fala ativa.</p>
                  </div>
                </div>

                <div className="bg-brand-card/30 border border-white/[0.04] p-6 rounded-2xl flex gap-4 hover:border-brand-neon/20 hover:bg-brand-card/50 transition-all duration-300 hover:shadow-[0_0_25px_rgba(204,255,0,0.02)]">
                  <div className="w-8 h-8 rounded-xl bg-brand-neon/10 border border-brand-neon/20 flex items-center justify-center text-brand-neon shrink-0">
                    <span className="font-black text-xs">03</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold uppercase text-white tracking-wider">Aula 3: O Método do Roleplay</h4>
                    <p className="text-xs text-brand-textMuted mt-1.5 leading-relaxed">A mecânica científica para simular conversações sob pressão sem vergonha ou medo.</p>
                  </div>
                </div>

                <div className="bg-brand-card/30 border border-white/[0.04] p-6 rounded-2xl flex gap-4 hover:border-brand-neon/20 hover:bg-brand-card/50 transition-all duration-300 hover:shadow-[0_0_25px_rgba(204,255,0,0.02)]">
                  <div className="w-8 h-8 rounded-xl bg-brand-neon/10 border border-brand-neon/20 flex items-center justify-center text-brand-neon shrink-0">
                    <span className="font-black text-xs">04</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold uppercase text-white tracking-wider">Aula 4: Plano Prático</h4>
                    <p className="text-xs text-brand-textMuted mt-1.5 leading-relaxed">As ferramentas necessárias e o acesso direto à plataforma Fluenty de simulação.</p>
                  </div>
                </div>
              </div>

              {/* Bônus (Com gradiente e destaque premium) */}
              <div className="bg-brand-neon/[0.02] border border-brand-neon/15 rounded-2xl p-6 space-y-4 shadow-[0_0_30px_rgba(204,255,0,0.02)]">
                <span className="text-[9px] font-black uppercase text-brand-neon tracking-widest bg-brand-neon/10 border border-brand-neon/15 px-3 py-1 rounded-full">
                  Bônus inclusos na compra
                </span>
                
                <div className="space-y-3">
                  <div className="flex gap-2.5">
                    <CheckIcon size={12} className="text-brand-neon shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-extrabold text-white uppercase tracking-wider">PDF: Dicionário de Sobrevivência Corporativo</h5>
                      <p className="text-[11px] text-brand-textMuted mt-0.5">As 50 frases e termos mais usados em reuniões globais e Dailies para você soar profissional.</p>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <CheckIcon size={12} className="text-brand-neon shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-extrabold text-white uppercase tracking-wider">Checklist: Entrevista Internacional Descomplicada</h5>
                      <p className="text-[11px] text-brand-textMuted mt-0.5">O passo a passo exato para responder às perguntas clássicas de recrutadores estrangeiros.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Garantia */}
            <div className="bg-brand-card/40 border border-white/[0.04] rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 backdrop-blur-sm">
              <div className="w-20 h-20 relative shrink-0 bg-brand-neon/15 border border-brand-neon/20 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(204,255,0,0.1)]">
                <span className="text-brand-neon font-black text-[10px] text-center leading-tight">7 DIAS<br/>GARANTIA</span>
              </div>
              <div className="space-y-2 text-center md:text-left">
                <h4 className="text-xs font-black uppercase text-white tracking-wider">Compromisso de Risco Zero</h4>
                <p className="text-xs text-brand-textMuted leading-relaxed">
                  Assista a todas as 4 aulas práticas. Se no período de 7 dias você sentir que o método não serve para destravar a sua conversação, basta mandar um único e-mail para nós. Devolvemos 100% do seu dinheiro investido. Sem enrolação.
                </p>
              </div>
            </div>

            {/* Provas Sociais */}
            <div className="space-y-6">
              <h3 className="text-lg font-black text-white text-center tracking-tight">
                Depoimentos de quem usou o método para destravar:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-brand-card/30 border border-white/[0.04] p-6 rounded-2xl space-y-3 hover:border-brand-neon/20 transition-all duration-300">
                  <p className="text-xs text-brand-textMuted italic leading-relaxed">
                    "Eu travava completamente quando meu PM americano pedia um update na daily. Eu sabia o que fazer, mas as palavras sumiam. O método da simulação com IA mudou totalmente meus reflexos de fala. Hoje faço dailies sorrindo."
                  </p>
                  <div>
                    <h5 className="text-xs font-extrabold text-white">Gustavo Santos</h5>
                    <span className="text-[10px] text-brand-textMuted font-medium block">Desenvolvedor Frontend Sênior</span>
                  </div>
                </div>

                <div className="bg-brand-card/30 border border-white/[0.04] p-6 rounded-2xl space-y-3 hover:border-brand-neon/20 transition-all duration-300">
                  <p className="text-xs text-brand-textMuted italic leading-relaxed">
                    "Fiquei estagnada por 3 anos na mesma vaga porque tinha medo de assumir reuniões com clientes internacionais. O treinamento abriu meus olhos sobre o porquê eu travava. Recomendo de olhos fechados."
                  </p>
                  <div>
                    <h5 className="text-xs font-extrabold text-white">Mariana Ramos</h5>
                    <span className="text-[10px] text-brand-textMuted font-medium block">Product Manager</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Accordion */}
            <div className="space-y-6">
              <h3 className="text-lg font-black text-white text-center tracking-tight">
                Perguntas Frequentes (FAQ)
              </h3>
              
              <div className="bg-brand-card/30 border border-white/[0.04] rounded-2xl overflow-hidden divide-y divide-white/[0.04] backdrop-blur-sm">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="transition">
                    <button
                      onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                      className="w-full px-6 py-4.5 flex items-center justify-between text-left hover:bg-brand-card/40 transition duration-200"
                    >
                      <span className="text-xs font-extrabold text-white tracking-wide">{faq.q}</span>
                      <ChevronRightIcon 
                        size={14} 
                        className={`text-brand-textMuted transition-transform duration-300 ${activeFaq === idx ? "rotate-95 text-brand-neon" : ""}`}
                      />
                    </button>
                    {activeFaq === idx && (
                      <div className="px-6 pb-5 pt-1 text-xs text-brand-textMuted leading-relaxed animate-slide-down">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Pricing Call */}
            <div className="text-center space-y-5 pt-8">
              <a
                href={CHECKOUT_URL}
                className="inline-flex py-4 px-8 bg-brand-neon text-brand-dark hover:bg-brand-neonHover hover:shadow-[0_0_30px_rgba(204,255,0,0.35)] hover:scale-[1.01] active:scale-[0.99] font-title font-extrabold uppercase tracking-widest text-xs rounded-2xl transition duration-300 shadow-[0_4px_25px_rgba(204,255,0,0.15)] items-center gap-2 cursor-pointer"
              >
                Garantir Minha Vaga por R$ {PRODUCT_PRICE}
              </a>
              <p className="text-[9px] text-brand-textMuted uppercase tracking-widest font-bold">
                Fluenty © 2026 • Todos os direitos reservados.
              </p>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
