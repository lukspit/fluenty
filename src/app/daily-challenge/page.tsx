"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ChevronLeftIcon, 
  SparklesIcon, 
  FlameIcon,
  CheckIcon,
  MicIcon
} from "@/components/Icons";

export default function DailyChallengeScreen() {
  const router = useRouter();

  // Estados de Controle
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Detalhes do Desafio Diário
  const [completedToday, setCompletedToday] = useState(false);
  const [completedScore, setCompletedScore] = useState<number | null>(null);
  const [completedFeedback, setCompletedFeedback] = useState<string>("");

  const [challenge, setChallenge] = useState<any>(null);

  // Estados de Gravação
  const [isRecording, setIsRecording] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);

  // Refs de áudio
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);

  // Audio Context para visualizer de onda (efeito WOW!)
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [volumeHeights, setVolumeHeights] = useState<number[]>(Array(15).fill(4));

  useEffect(() => {
    fetchChallenge();
  }, []);

  const fetchChallenge = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/daily-challenge", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        throw new Error("Erro ao buscar o desafio diário.");
      }

      const data = await res.json();
      if (data.completed) {
        setCompletedToday(true);
        setCompletedScore(data.score);
        setCompletedFeedback(data.highlights);
      } else {
        setChallenge(data.challenge);
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg("Ocorreu um erro ao carregar o desafio de hoje.");
    } finally {
      setLoading(false);
    }
  };

  // Efeito de visualizador de áudio durante a gravação
  useEffect(() => {
    let animationFrameId: number;
    const dataArray = new Uint8Array(15);

    const updateVolumeVisualizer = () => {
      if (analyserRef.current && isRecordingRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        // Mapear frequências para alturas de visualização (entre 4px e 36px)
        const heights = Array.from(dataArray).map(val => {
          const percentage = val / 255;
          return Math.max(4, Math.round(percentage * 36));
        });
        setVolumeHeights(heights);
        animationFrameId = requestAnimationFrame(updateVolumeVisualizer);
      }
    };

    if (isRecording) {
      updateVolumeVisualizer();
    } else {
      setVolumeHeights(Array(15).fill(4));
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isRecording]);

  const startRecording = async () => {
    setErrorMsg(null);
    audioChunksRef.current = [];
    setAudioBlobUrl(null);
    setEvaluationResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        audioBitsPerSecond: 16000
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setStatusText("Analisando sua fala...");
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const mimeType = audioBlob.type || "audio/webm";
        const format = mimeType.split(";")[0].split("/")[1] || "webm";
        
        // Converter blob para base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          const base64Audio = base64Data.split(",")[1];
          await submitRecording(base64Audio, format);
        };
      };

      // Configurar visualizador de áudio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64; // Tamanho pequeno para o visualizador simplificado
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      mediaRecorder.start();
      setIsRecording(true);
      isRecordingRef.current = true;
      setStatusText("Gravando... Fale agora");

      // Parar automaticamente após 30 segundos
      setTimeout(() => {
        if (isRecordingRef.current) {
          stopRecording();
        }
      }, 30000);

    } catch (err) {
      console.error("Erro ao gravar:", err);
      setErrorMsg("Erro ao acessar o microfone. Verifique as permissões de gravação.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error(e);
      }
    }
    setIsRecording(false);
    isRecordingRef.current = false;
    
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
    }
  };

  const submitRecording = async (audioBase64: string, format: string) => {
    setSaving(true);
    setErrorMsg(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/daily-challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          audioBase64,
          format,
          challengeType: challenge?.type || "pronunciation",
          targetText: challenge?.target_text || ""
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao processar sua gravação.");
      }

      const data = await res.json();
      setEvaluationResult(data);
      setCompletedToday(true);
      setCompletedScore(data.score);
      setCompletedFeedback(data.feedback);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro de conexão ao enviar áudio.");
      setStatusText("");
    } finally {
      setSaving(false);
    }
  };

  const formatTranslations: Record<string, string> = {
    pronunciation: "Pronúncia Exata",
    upgrade: "Upgrade Vocab",
    scenario: "Cenário Rápido"
  };

  if (loading) {
    return (
      <div className="flex-grow w-full max-w-md mx-auto flex flex-col px-4 py-6 md:max-w-2xl lg:py-10 text-foreground bg-background min-h-screen animate-pulse">
        {/* Header Skeleton */}
        <header className="flex items-center justify-between w-full mb-8">
          <div className="w-16 h-4 bg-muted-slate/20 rounded-md" />
          <div className="w-28 h-5 bg-muted-slate/20 rounded-md" />
          <div className="w-10" />
        </header>

        {/* Challenge Panel Skeleton */}
        <div className="w-full bg-card-bg/40 border border-muted-slate/20 rounded-3xl p-6 flex flex-col gap-6 items-center">
          {/* Challenge Type Badge Skeleton */}
          <div className="w-28 h-6 bg-primary/10 border border-primary/20 rounded-full" />

          {/* Title & Instructions Skeletons */}
          <div className="flex flex-col items-center gap-2.5 w-full">
            <div className="w-3/4 h-5 bg-white/20 rounded-md" />
            <div className="w-5/6 h-3 bg-muted-slate/20 rounded-md" />
          </div>

          {/* Target Text Box Skeleton */}
          <div className="w-full h-24 bg-background/40 border border-muted-slate/15 rounded-2xl p-5 flex items-center justify-center" />

          {/* Pedagogy Context Card Skeleton */}
          <div className="w-full h-14 bg-card-bg/25 border border-muted-slate/15 rounded-2xl" />

          {/* Recorder Controls Skeleton */}
          <div className="flex flex-col items-center gap-4 w-full mt-4">
            {/* Audio Wave Sim */}
            <div className="flex items-center justify-center gap-1.5 h-10 w-1/2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-[3px] h-3 bg-muted-slate/20 rounded-full" />
              ))}
            </div>
            {/* Mic Circle */}
            <div className="w-16 h-16 rounded-full bg-primary/15" />
            <div className="w-32 h-2.5 bg-muted-slate/10 rounded-md mt-1" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow w-full max-w-md mx-auto flex flex-col px-4 py-6 md:max-w-2xl lg:py-10 text-foreground bg-background relative overflow-hidden min-h-screen">
      
      {/* Detalhes estéticos em blur */}
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
          Desafio Diário
        </h1>
        <div className="w-10"></div>
      </header>

      {/* Feedbacks de Erro */}
      {errorMsg && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-4 text-xs font-semibold leading-relaxed relative z-10">
          {errorMsg}
        </div>
      )}

      {/* PAINEL CENTRAL (Obsidian / Vidro Fumê) */}
      <div className="w-full bg-card-bg border border-muted-slate/30 rounded-3xl p-6 backdrop-blur-md relative z-10 shadow-2xl flex flex-col gap-6 items-center">
        
        {completedToday ? (
          /* TELA DE CONCLUÍDO (Feedback da Avaliação) */
          <div className="w-full flex flex-col items-center gap-6 text-center animate-scale-up py-4">
            <div className="relative w-24 h-24 flex items-center justify-center">
              {/* Círculo do Score */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-muted-slate/20"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-primary"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={263.8}
                  strokeDashoffset={263.8 - (263.8 * (completedScore || 80)) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-white leading-none">
                  {completedScore}%
                </span>
                <span className="text-[7px] font-black uppercase text-primary tracking-wider mt-0.5">
                  Precisão
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-base font-black uppercase tracking-wider text-white">
                Desafio Diário Concluído!
              </h2>
              <p className="text-xs text-muted-text max-w-xs leading-relaxed">
                {completedFeedback}
              </p>
            </div>

            {evaluationResult?.transcription && (
              <div className="w-full bg-background/50 border border-muted-slate/20 rounded-2xl p-4.5 text-left flex flex-col gap-1.5 mt-2">
                <span className="text-[8px] font-bold text-muted-text uppercase tracking-widest">
                  O que você disse:
                </span>
                <p className="text-[11px] text-white/80 font-medium italic leading-relaxed">
                  "{evaluationResult.transcription}"
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-2xl px-5 py-3 mt-2">
              <FlameIcon className="text-primary animate-pulse" size={18} />
              <span className="text-xs font-bold text-primary tracking-wide">
                Streak Diário Atualizado! 🔥
              </span>
            </div>

            <button
              onClick={() => router.push("/")}
              className="w-full mt-4 py-3.5 bg-primary text-background font-bold uppercase tracking-widest text-[10px] rounded-xl shadow-[0_0_15px_rgba(204,255,0,0.15)] hover:bg-primary-hover transition duration-300"
            >
              Voltar ao Início
            </button>
          </div>
        ) : (
          /* TELA DE EXECUÇÃO DO DESAFIO DIÁRIO */
          <div className="w-full flex flex-col items-center gap-6 text-center animate-fade-in">
            
            {/* Badge de Formato de Desafio */}
            <span className="px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest">
              {formatTranslations[challenge?.type] || "Desafio Diário"}
            </span>

            {/* Título & Instruções */}
            <div className="flex flex-col gap-2">
              <h2 className="text-base font-black text-white tracking-tight">
                {challenge?.title}
              </h2>
              <p className="text-xs text-muted-text max-w-xs leading-relaxed font-medium">
                {challenge?.instruction}
              </p>
            </div>

            {/* Caixa de Texto Alvo */}
            <div className="w-full bg-background/50 border border-muted-slate/20 rounded-2xl p-5 my-2 flex items-center justify-center relative overflow-hidden group hover:border-primary/20 transition duration-300">
              <span className="text-sm font-black tracking-wide text-white leading-normal max-w-xs select-all">
                {challenge?.target_text}
              </span>
            </div>

            {/* Dica Pedagógica do Tutor */}
            {challenge?.context && (
              <div className="flex items-start gap-2 text-left bg-card-bg/30 border border-muted-slate/20 rounded-2xl p-4 text-[10px] leading-relaxed text-muted-text font-medium">
                <SparklesIcon size={14} className="text-primary shrink-0 mt-0.5" />
                <p>{challenge.context}</p>
              </div>
            )}

            {/* Gravador com Visualizador de Ondas */}
            <div className="flex flex-col items-center gap-4 w-full mt-4">
              
              {/* Visualizador de Onda de Áudio Premium (WOW!) */}
              <div className="flex items-center justify-center gap-1.5 h-10 w-full">
                {volumeHeights.map((h, i) => (
                  <div
                    key={i}
                    className={`w-[3px] rounded-full transition-all duration-150 ${
                      isRecording ? "bg-primary" : "bg-muted-slate/30"
                    }`}
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>

              {/* Botão de Controle Gravador */}
              <div className="relative">
                {isRecording && (
                  <div className="absolute inset-0 rounded-full border border-primary animate-ping opacity-60 pointer-events-none" />
                )}
                
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={saving}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.3)] ${
                    isRecording 
                      ? "bg-red-500 text-white scale-95" 
                      : "bg-primary hover:bg-primary-hover text-background shadow-[0_0_15px_rgba(204,255,0,0.15)] hover:scale-105"
                  } disabled:opacity-40`}
                >
                  {saving ? (
                    <div className="w-5 h-5 rounded-full border-2 border-background border-t-transparent animate-spin" />
                  ) : isRecording ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                    </svg>
                  ) : (
                    <MicIcon size={22} />
                  )}
                </button>
              </div>

              <span className="text-[9px] font-bold text-muted-text uppercase tracking-widest min-h-[14px]">
                {statusText || (isRecording ? "GRAVANDO (MÁX. 30S)" : "Aperte o microfone para falar")}
              </span>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
