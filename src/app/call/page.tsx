"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

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
import { 
  MicIcon, 
  MicOffIcon, 
  PhoneOffIcon, 
  HelpCircleIcon, 
  ClosedCaptionsIcon, 
  ChevronLeftIcon,
  SoundwaveIcon
} from "@/components/Icons";

interface Message {
  sender: "user" | "ai";
  text: string;
}

function CallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenario = searchParams.get("scenario") || "casual";
  const pathId = searchParams.get("pathId") || null;

  // Estados do app
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [showSos, setShowSos] = useState(false);
  const [statusText, setStatusText] = useState("Conectando ao tutor de voz...");
  const [duration, setDuration] = useState(0);
  const [activeScenario, setActiveScenario] = useState<string>(scenario);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const [isAiTalking, setIsAiTalking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isMicrophoneAllowed, setIsMicrophoneAllowed] = useState<boolean | null>(null);
  const [showMicInstructionModal, setShowMicInstructionModal] = useState(false);
  const [isSecureContext, setIsSecureContext] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [phaseTitle, setPhaseTitle] = useState<string | null>(null);

  // Referências para gravação e áudio
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isRecordingRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isCallActiveRef = useRef(true);


  // Mapeamento de títulos de cenário
  const scenarioTitles: Record<string, string> = {
    casual: "Casual Chat",
    interview: "Job Interview",
    coffee: "Coffee Shop",
    meeting: "Daily Scrum"
  };

  // Frases de SOS sugeridas baseado no cenário
  const sosPhrases: Record<string, string[]> = {
    casual: [
      "Can you repeat that, please?",
      "I'm doing well, thank you! What about you?",
      "That sounds interesting, tell me more."
    ],
    interview: [
      "Could you clarify the question, please?",
      "I have three years of experience working as a dev.",
      "My main stack is React, Node.js and TypeScript."
    ],
    coffee: [
      "I would like a cappuccino and a chocolate cookie.",
      "Is oat milk available?",
      "How much is it?"
    ],
    meeting: [
      "Yesterday I worked on the login screen redesign.",
      "Today I will implement the voice recording integration.",
      "I have no blockers today."
    ]
  };

  // Solicita permissão explícita do microfone e carrega vozes do sistema
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Verifica se o contexto é seguro
      const secure = window.isSecureContext || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      setIsSecureContext(secure);

      if (!secure) {
        console.warn("Contexto inseguro detectado. O microfone pode não funcionar.");
        setIsMicrophoneAllowed(false);
        setStatusText("Erro: Requer HTTPS ou localhost.");
      } else {
        // Força a exibição do pop-up de microfone do navegador
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((stream) => {
            console.log("Microfone autorizado com sucesso.");
            setIsMicrophoneAllowed(true);
            setStatusText("Conectando ao tutor de voz...");
            // Para as faixas para fechar a gravação de fundo (libera o microfone)
            stream.getTracks().forEach((track) => track.stop());
          })
          .catch(err => {
            console.error("Microfone negado:", err);
            setIsMicrophoneAllowed(false);
            setStatusText("Erro: Sem acesso ao microfone.");
          });
      }

      // Carrega as vozes assincronamente (Chrome e Safari exigem onvoiceschanged)
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log("Vozes nativas carregadas:", voices.length);
        setAvailableVoices(voices);
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Verifica a permissão do microfone novamente de forma manual
  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microfone autorizado com sucesso após verificação manual.");
      setIsMicrophoneAllowed(true);
      setStatusText("Tutor pronto. Fale agora!");
      stream.getTracks().forEach((track) => track.stop());
      setShowMicInstructionModal(false);
      return true;
    } catch (err) {
      console.error("Microfone negado na verificação manual:", err);
      setIsMicrophoneAllowed(false);
      return false;
    }
  };


  // 1. Inicializar timer e fala inicial da IA
  useEffect(() => {
    isCallActiveRef.current = true;
    
    // Inicia cronômetro
    durationTimerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    // Primeira mensagem da IA ao conectar (via API Real)
    const startIntro = async () => {
      setStatusText("Tutor conectando...");
      setIsThinking(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {
          "Content-Type": "application/json"
        };
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        let currentScenario = scenario;
        if (pathId) {
          const { data: phaseData } = await supabase
            .from("fluenty_learning_paths")
            .select("title, scenario_key")
            .eq("id", pathId)
            .single();
          if (phaseData) {
            const cleanedTitle = phaseData.title.replace(/^fase\s*\d+\s*[:\-–—]\s*/i, "").trim();
            setPhaseTitle(cleanedTitle);
            currentScenario = phaseData.scenario_key || scenario;
          }
        }
        setActiveScenario(currentScenario);

        const response = await fetch("/api/chat", {
          method: "POST",
          headers,
          body: JSON.stringify({
            init: true,
            scenario: currentScenario,
            history: [],
            pathId
          })
        });

        if (!response.ok) throw new Error("Erro na inicialização");

        const data = await response.json();
        
        if (!isCallActiveRef.current) return;
        
        // Salva no chat
        const newMsg: Message = { sender: "ai", text: data.aiText };
        setMessages([newMsg]);
        
        setIsThinking(false);
        // Fala (se tiver áudio real, senão nativo)
        speakText(data.aiText, data.audioBase64);
      } catch (err) {
        console.error("Erro na introdução por IA:", err);
        if (!isCallActiveRef.current) return;
        
        setIsThinking(false);
        // Fallback local caso a API falhe totalmente
        const welcomeMessages: Record<string, string> = {
          casual: "Hey there! Nice to talk to you. How are you doing today?",
          interview: "Welcome. Let's start the interview. Can you briefly introduce yourself?",
          coffee: "Hello! Welcome to Fluenty Cafe. What can I get for you today?",
          meeting: "Good morning team. Let's start our daily standup. What did you work on yesterday?"
        };
        const introText = welcomeMessages[scenario] || welcomeMessages.casual;
        setMessages([{ sender: "ai", text: introText }]);
        speakText(introText);
      }
    };

    // Garante que as vozes nativas do navegador estejam carregadas
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }

    // Pequeno delay para simular conexão
    const connectionTimeout = setTimeout(() => {
      startIntro();
    }, 1500);

    return () => {
      isCallActiveRef.current = false;
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      clearTimeout(connectionTimeout);
      
      // Limpa reprodução de áudio
      if (audioPlayerRef.current) {
        audioPlayerRef.current.onended = null;
        audioPlayerRef.current.pause();
      }
      
      // Limpa SpeechSynthesis
      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
      
      // Para gravação se estiver ativa
      if (isRecordingRef.current) {
        isRecordingRef.current = false;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          try {
            mediaRecorderRef.current.stop();
          } catch {}
        }
      }
      
      // Fecha o AudioContext do analisador de silêncio
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {}
        audioContextRef.current = null;
      }
    };
  }, [scenario]);

  // Função para a IA falar (com fallback de SpeechSynthesis nativo)
  const speakText = (text: string, audioBase64?: string | null) => {
    if (!isCallActiveRef.current) return;
    setIsAiTalking(true);
    setStatusText("Tutor falando...");

    // Se temos o áudio realista em base64 vindo da API
    if (audioBase64) {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      
      const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      
      audio.onended = () => {
        if (!isCallActiveRef.current) return;
        setIsAiTalking(false);
        setStatusText("Sua vez. Fale agora!");
        // Modo hands-free: inicia gravação automática após o tutor terminar
        startRecording();
      };
      
      audio.play().catch(err => {
        console.error("Erro ao tocar áudio da API:", err);
        fallbackSpeech(text);
      });
    } else {
      // Fallback nativo se a chave não estiver configurada ou falhar
      fallbackSpeech(text);
    }
  };

  // Fallback nativo usando API de fala do navegador (Selecionando voz premium do macOS)
  const fallbackSpeech = (text: string) => {
    if (!isCallActiveRef.current) return;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utteranceRef.current = utterance;
      
      // Busca vozes de alta qualidade nativas do sistema (como Samantha, Siri ou vozes Premium/Enhanced)
      const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
      const premiumVoice = voices.find(v => 
        v.lang.startsWith("en") && 
        (v.name.includes("Samantha") || v.name.includes("Siri") || v.name.includes("Enhanced") || v.name.includes("Premium") || v.name.includes("Daniel"))
      ) || voices.find(v => v.lang.startsWith("en") && v.name.includes("Google")) || voices.find(v => v.lang.startsWith("en"));
      
      if (premiumVoice) {
        utterance.voice = premiumVoice;
      }

      utterance.onend = () => {
        if (!isCallActiveRef.current) return;
        setIsAiTalking(false);
        setStatusText("Sua vez. Fale agora!");
        // Modo hands-free: inicia gravação automática após o tutor terminar
        startRecording();
      };
      utterance.onerror = (e) => {
        console.error("Erro no SpeechSynthesis nativo:", e);
        if (!isCallActiveRef.current) return;
        setIsAiTalking(false);
        setStatusText("Sua vez. Fale agora!");
        // Modo hands-free fallback: tenta gravar também
        startRecording();
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setIsAiTalking(false);
      setStatusText("Sua vez. Fale agora!");
      // Modo hands-free fallback: tenta gravar também
      startRecording();
    }
  };

  // 2. Controlar microfone e gravação (MediaRecorder com transcrição remota)
  async function startRecording() {
    if (isMuted || isAiTalking) return;
    
    if (isMicrophoneAllowed === false) {
      setShowMicInstructionModal(true);
      return;
    }
    
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Instancia o MediaRecorder com taxa de bits baixa (16 kbps) para compressão e upload super veloz
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
        setStatusText("Processando áudio...");
        
        // Define o tipo real gerado pelo navegador
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const mimeType = audioBlob.type || "audio/webm";
        const format = mimeType.split(";")[0].split("/")[1] || "webm";
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          const base64Audio = base64Data.split(",")[1];
          await sendAudioToIA(base64Audio, format);
        };
      };

      // Configuração da Web Audio API para detecção automática de silêncio (Hands-free)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let silenceStart = Date.now();
      let hasStartedSpeaking = false; // Rastreia se o usuário já começou a falar nesta gravação
      const silenceThreshold = 8; // Sensibilidade de som/silêncio (limiar baixo = mais sensível ao som)
      const silenceDuration = 3000; // 3.0 segundos de silêncio contínuo para parar a gravação
      
      const checkVolume = () => {
        if (!analyserRef.current || !isRecordingRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calcula a amplitude média
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const averageVolume = sum / bufferLength;
        
        if (averageVolume > silenceThreshold) {
          // Usuário está falando, marca que a fala começou e reseta o marcador de silêncio
          hasStartedSpeaking = true;
          silenceStart = Date.now();
        } else {
          // Em silêncio
          if (hasStartedSpeaking) {
            // Só checa se o tempo de silêncio excedeu o limite se o usuário já tiver começado a falar
            if (Date.now() - silenceStart > silenceDuration) {
              console.log("Silêncio detectado por 3s após o início da fala, encerrando gravação automática.");
              stopRecording();
              return;
            }
          } else {
            // Se ainda não começou a falar, mantém silenceStart atualizado para evitar disparos falsos
            silenceStart = Date.now();
          }
        }
        
        requestAnimationFrame(checkVolume);
      };

      mediaRecorder.start();
      setIsRecording(true);
      isRecordingRef.current = true;
      setStatusText("Escutando você...");

      // Espera 500ms antes de iniciar o analisador de volume para ignorar barulhos mecânicos iniciais
      setTimeout(() => {
        if (isRecordingRef.current) {
          checkVolume();
        }
      }, 500);

    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      setStatusText("Erro: Microfone bloqueado.");
      setIsMicrophoneAllowed(false);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("Erro ao parar MediaRecorder:", e);
      }
    }
    
    // Fecha o analisador de áudio
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(err => console.error("Erro ao fechar AudioContext:", err));
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsRecording(false);
    isRecordingRef.current = false;
  }

  // Função de clique no microfone (Toggle manual + Interromper fala da IA)
  const handleMicClick = () => {
    if (isMicrophoneAllowed === false) {
      setShowMicInstructionModal(true);
      return;
    }
    
    if (isAiTalking) {
      // Interrompe o tutor para falar imediatamente
      if (audioPlayerRef.current) {
        try {
          audioPlayerRef.current.onended = null;
          audioPlayerRef.current.pause();
        } catch {}
      }
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
      }
      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
      setIsAiTalking(false);
      startRecording();
      return;
    }
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Envia texto transcrito diretamente para o LLM (usado por exemplo no SOS)
  const sendTextToIA = async (text: string) => {
    try {
      setStatusText("Tutor pensando...");
      setIsThinking(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: text,
          history: messagesRef.current,
          scenario: activeScenario,
          pathId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Erro da API (Status ${response.status})`);
      }

      const data = await response.json();
      if (!isCallActiveRef.current) return;
      setIsThinking(false);
      
      if (data.aiText) {
        const userMsg: Message = { sender: "user", text: text };
        const aiMsg: Message = { sender: "ai", text: data.aiText };
        setMessages((prev) => [...prev, userMsg, aiMsg]);
        speakText(data.aiText, data.audioBase64);
      } else {
        setStatusText("Erro de processamento.");
      }
    } catch (err: any) {
      console.error("Erro no envio de texto:", err);
      if (!isCallActiveRef.current) return;
      setIsThinking(false);
      setStatusText(`Erro: ${err.message || "Erro de conexão. Tente novamente."}`);
    }
  };

  // Envia áudio gravado e recebe resposta + áudio sintetizado
  const sendAudioToIA = async (base64Audio: string, format: string = "webm") => {
    try {
      setStatusText("Tutor pensando...");
      setIsThinking(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          audio: base64Audio,
          format: format,
          history: messagesRef.current,
          scenario: activeScenario,
          pathId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Erro da API (Status ${response.status})`);
      }

      const data = await response.json();
      if (!isCallActiveRef.current) return;
      setIsThinking(false);
      
      if (data.userText) {
        const userMsg: Message = { sender: "user", text: data.userText };
        const aiMsg: Message = { sender: "ai", text: data.aiText };
        setMessages((prev) => [...prev, userMsg, aiMsg]);
        speakText(data.aiText, data.audioBase64);
      } else {
        setStatusText("Não entendi. Tente novamente.");
      }
    } catch (err: any) {
      console.error("Erro no envio:", err);
      if (!isCallActiveRef.current) return;
      setIsThinking(false);
      setStatusText(`Erro: ${err.message || "Erro de conexão. Tente novamente."}`);
    }
  };

  // Formatar tempo cronômetro (ex: 02:45)
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  // Encerrar chamada e ir para relatório
  const handleHangUp = () => {
    isCallActiveRef.current = false;
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    
    // Limpa referências de áudio para evitar que chamem startRecording ao terminar
    if (audioPlayerRef.current) {
      audioPlayerRef.current.onended = null;
      try {
        audioPlayerRef.current.pause();
      } catch {}
      audioPlayerRef.current = null;
    }
    
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
    }
    
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    
    // Para gravação
    isRecordingRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    
    // Fecha o AudioContext do analisador de silêncio
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    
    if (typeof window !== "undefined") {
      // Salva o histórico no localStorage para a tela de resultados ler
      localStorage.setItem("fluenty_latest_chat", JSON.stringify(messagesRef.current));
      localStorage.setItem("fluenty_latest_scenario", scenario);
      localStorage.setItem("fluenty_latest_duration", duration.toString());
      if (pathId) {
        localStorage.setItem("fluenty_latest_path_id", pathId);
      } else {
        localStorage.removeItem("fluenty_latest_path_id");
      }
    }
    router.push("/result");
  };

  const activeSosPhrases = sosPhrases[scenario] || sosPhrases.casual;
  const lastUserMessage = [...messages].reverse().find(m => m.sender === "user")?.text || "";
  const lastAiMessage = [...messages].reverse().find(m => m.sender === "ai")?.text || "";

  return (
    <div className="flex-1 w-full max-w-md mx-auto flex flex-col justify-between px-4 py-6 md:max-w-2xl lg:max-w-4xl relative overflow-hidden bg-background text-foreground">
      
      {/* Banner de Microfone Bloqueado */}
      {isMicrophoneAllowed === false && (
        <div className="w-full mb-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between z-10 animate-fade-in shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 shrink-0">
              <MicOffIcon size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                Microfone Bloqueado
              </span>
              <span className="text-[11px] text-muted-text mt-0.5 leading-tight">
                {isSecureContext 
                  ? "O navegador bloqueou o acesso ao microfone. Permita o uso para falar."
                  : "Erro de Segurança: O microfone requer HTTPS ou localhost."
                }
              </span>
            </div>
          </div>
          {isSecureContext && (
            <button
              onClick={() => setShowMicInstructionModal(true)}
              className="text-xs font-bold text-primary hover:underline shrink-0 ml-2 uppercase tracking-wider"
            >
              Ativar
            </button>
          )}
        </div>
      )}

      {/* Top Header */}
      <header className="flex items-center justify-between w-full z-10">
        <button
          onClick={() => {
            if (confirm("Tem certeza que deseja cancelar e voltar ao dashboard?")) {
              router.push("/");
            }
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-text hover:text-foreground uppercase tracking-widest transition"
        >
          <ChevronLeftIcon size={14} /> Sair
        </button>

        <div className="flex flex-col items-center">
          <span className="text-sm font-bold uppercase tracking-wider text-primary">
            {phaseTitle || scenarioTitles[scenario] || "Casual Chat"}
          </span>
          <span className="text-[10px] text-muted-text font-bold tracking-widest mt-0.5">
            {formatTime(duration)}
          </span>
        </div>

        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-card-bg border border-muted-slate/30 text-primary">
          <SoundwaveIcon size={18} className={isRecording || isAiTalking ? "animate-pulse" : ""} />
        </div>
      </header>

      {/* Middle: Soundwave Animation Area */}
      <main className="flex-1 flex flex-col items-center justify-center my-8 relative z-10">
        
        {/* Avatar Central do Tutor & Ripple de Onda Sonora Concêntrica (Fase 11 Redesign) */}
        <div className="relative w-56 h-56 flex items-center justify-center mb-6">
          
          {/* Anéis de Ripple de Fundo (Se a voz estiver ativa) */}
          {(isRecording || isAiTalking || isThinking) && (
            <>
              <div className="ripple-ring ripple-1" />
              <div className="ripple-ring ripple-2" />
              <div className="ripple-ring ripple-3" />
            </>
          )}

          {/* Imagem de Perfil do Tutor com Borda Iluminada */}
          <div className={`relative w-36 h-36 rounded-full overflow-hidden border-2 bg-card-bg/85 backdrop-blur-md z-10 transition-all duration-500 ${
            isAiTalking 
              ? "border-primary shadow-[0_0_20px_rgba(204,255,0,0.3)] scale-105" 
              : isRecording 
              ? "border-primary/80 shadow-[0_0_15px_rgba(204,255,0,0.15)] scale-102"
              : isThinking 
              ? "border-primary/40 scale-100 opacity-80" 
              : "border-muted-slate/40 scale-100"
          }`}>
            <Image 
              src={tutorAvatars[activeScenario] || "/assets/tutor_alex.png"} 
              alt={tutorNames[activeScenario] || "Tutor"} 
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Status & Progress Indicator */}
        <div className="flex flex-col items-center gap-2 mt-8 min-h-[40px] justify-center">
          {isThinking ? (
            <div className="flex items-center gap-2.5 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 animate-fade-in shadow-[0_0_15px_rgba(204,255,0,0.1)]">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                {statusText}
              </span>
            </div>
          ) : (
            <p className={`text-xs font-bold uppercase tracking-widest transition-colors ${
              isRecording ? "text-primary animate-pulse" : "text-muted-text"
            }`}>
              {statusText}
            </p>
          )}
        </div>

        {/* Captions Display (Zero Emojis) */}
        {showCaptions && messages.length > 0 && (
          <div className="w-full max-w-sm bg-card-bg/60 border border-muted-slate/30 rounded-2xl p-5 mt-10 backdrop-blur-md transition-all duration-300">
            <span className="text-[9px] font-bold text-primary uppercase tracking-widest block mb-2">
              Legendas Ativas
            </span>
            <div className="flex flex-col gap-3 max-h-36 overflow-y-auto pr-1">
              {messages.slice(-2).map((msg, idx) => (
                <p 
                  key={idx} 
                  className={`text-xs leading-relaxed ${
                    msg.sender === "user" 
                      ? "text-muted-text border-l-2 border-muted-slate/50 pl-2.5" 
                      : "text-foreground font-medium border-l-2 border-primary pl-2.5"
                  }`}
                >
                  {msg.text}
                </p>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* SOS Modal / Suggestions Card */}
      {showSos && (
        <div className="absolute inset-x-4 bottom-32 bg-card-bg border border-muted-slate/50 rounded-2xl p-5 backdrop-blur-lg z-20 shadow-2xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
              SOS - Sugestões de Frases
            </span>
            <button 
              onClick={() => setShowSos(false)}
              className="text-[9px] font-bold text-muted-text hover:text-foreground uppercase tracking-widest"
            >
              Fechar
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            {activeSosPhrases.map((phrase, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (typeof window !== "undefined" && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                  }
                  // Fala a frase usando fallback nativo
                  speakText(phrase);
                  // Adiciona no chat como usuário
                  setMessages((prev) => [...prev, { sender: "user", text: phrase }]);
                  setShowSos(false);
                }}
                className="text-left text-xs bg-muted-slate/20 hover:bg-muted-slate/40 border border-muted-slate/20 rounded-xl p-3 text-foreground font-medium transition"
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Base Controls (Sleek Geometric Panel - Phase 11) */}
      <footer className="w-full bg-card-bg/60 border border-muted-slate/30 rounded-xl p-3 flex items-center justify-between gap-4 z-10 backdrop-blur-md">
        
        {/* Lado Esquerdo: SOS e Legenda */}
        <div className="flex items-center gap-2">
          {/* Toggle Captions Button */}
          <button
            onClick={() => setShowCaptions(!showCaptions)}
            className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${
              showCaptions 
                ? "bg-primary/10 border-primary/30 text-primary" 
                : "bg-background/40 border-muted-slate/20 text-muted-text hover:text-foreground hover:bg-muted-slate/10"
            }`}
            title="Alternar Legendas"
          >
            <ClosedCaptionsIcon size={16} />
          </button>

          {/* SOS Button */}
          <button
            onClick={() => setShowSos(!showSos)}
            className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${
              showSos
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-background/40 border-muted-slate/20 text-muted-text hover:text-foreground hover:bg-muted-slate/10"
            }`}
            title="SOS Ajuda"
          >
            <HelpCircleIcon size={16} />
          </button>
        </div>

        {/* Centro: Microphone Action Button */}
        <button
          onClick={handleMicClick}
          disabled={isMuted || isThinking}
          className={`px-6 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-widest flex items-center gap-2.5 transition-all duration-300 border ${
            isThinking
              ? "bg-muted-slate/10 border-muted-slate/15 text-muted-text cursor-not-allowed"
              : isMicrophoneAllowed === false
              ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.1)]"
              : isRecording
              ? "bg-red-500 border-red-600 text-white shadow-[0_0_16px_rgba(239,68,68,0.3)] animate-pulse"
              : isAiTalking
              ? "bg-primary/10 border-primary/40 text-primary hover:bg-primary/20 shadow-[0_0_12px_rgba(204,255,0,0.1)]"
              : "bg-primary border-primary text-background hover:bg-primary-hover shadow-[0_0_12px_rgba(204,255,0,0.15)]"
          }`}
          title={
            isMicrophoneAllowed === false 
              ? "Microfone bloqueado. Clique para ver instruções." 
              : isAiTalking 
              ? "Interromper tutor" 
              : isRecording 
              ? "Parar gravação" 
              : "Falar"
          }
        >
          {isMicrophoneAllowed === false ? (
            <MicOffIcon size={14} className="text-red-400" />
          ) : (
            <MicIcon size={14} className={isRecording || isAiTalking ? "animate-pulse" : ""} />
          )}
          <span>
            {isMicrophoneAllowed === false 
              ? "Bloqueado" 
              : isThinking 
              ? "Pensando" 
              : isRecording 
              ? "Parar" 
              : isAiTalking 
              ? "Interromper" 
              : "Falar"}
          </span>
        </button>

        {/* Lado Direito: Hang Up */}
        <button
          onClick={handleHangUp}
          className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
          title="Desligar e Ver Relatório"
        >
          <PhoneOffIcon size={16} />
        </button>
      </footer>

      {/* Modal de Instruções de Microfone Premium (Sem emojis) */}
      {showMicInstructionModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-card-bg border border-muted-slate/50 max-w-md w-full rounded-3xl p-6 shadow-2xl relative flex flex-col gap-4 animate-scale-up">
            
            {/* Header do Modal */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">
                Acesso ao Microfone
              </span>
              <button 
                onClick={() => setShowMicInstructionModal(false)}
                className="text-muted-text hover:text-foreground text-xs font-bold uppercase tracking-wider transition"
              >
                Fechar
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-bold tracking-tight text-foreground leading-snug">
                Como ativar seu microfone no navegador
              </h3>
              <p className="text-xs text-muted-text leading-relaxed">
                Para que o tutor de voz consiga te escutar e te dar feedback em tempo real, precisamos de acesso ao seu microfone. Siga os passos rápidos abaixo:
              </p>
            </div>

            {/* Simulação Visual do Navegador (Estética Premium em CSS/SVG) */}
            <div className="bg-background/50 border border-muted-slate/30 rounded-2xl p-4 my-2 flex flex-col gap-3 relative overflow-hidden">
              
              {/* Barra de Endereço Simulada */}
              <div className="flex items-center gap-2 bg-card-bg border border-muted-slate/30 rounded-xl px-3 py-2">
                {/* Cadeado de Segurança */}
                <div className="w-5 h-5 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary animate-pulse shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                {/* Texto da URL */}
                <span className="text-[10px] text-muted-text font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                  localhost:3080/call
                </span>
                
                {/* Setinha apontando */}
                <div className="absolute right-8 top-12 flex flex-col items-center animate-bounce">
                  <span className="text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Clique aqui
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary rotate-90 mt-1">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              </div>

              {/* Dropdown de Permissões Simulado */}
              <div className="bg-card-bg/90 border border-muted-slate/30 rounded-xl p-3 flex flex-col gap-2 mt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-foreground font-medium">Conexão segura</span>
                  <span className="text-primary font-bold text-[9px] uppercase tracking-wider">Ativa</span>
                </div>
                <div className="h-px bg-muted-slate/20 my-1" />
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <MicIcon size={12} className="text-primary" />
                    <span className="text-foreground">Microfone</span>
                  </div>
                  <div className="bg-primary/20 border border-primary/40 text-primary font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span>Permitir</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Guias Rápidos por Plataforma */}
            <div className="flex flex-col gap-2.5 text-left text-xs bg-muted-slate/10 border border-muted-slate/10 rounded-2xl p-4">
              <div className="flex flex-col">
                <span className="font-bold text-foreground">No Desktop (Chrome / Safari):</span>
                <span className="text-muted-text text-[11px] mt-0.5">
                  Clique no ícone de **cadeado** à esquerda da URL, mude o **Microfone** para **Permitir** e recarregue a página.
                </span>
              </div>
              <div className="h-px bg-muted-slate/20" />
              <div className="flex flex-col">
                <span className="font-bold text-foreground">No iOS (Safari Móvel):</span>
                <span className="text-muted-text text-[11px] mt-0.5">
                  Toque em **aA** na barra de navegação superior, selecione **Configurações do Site** e marque o **Microfone** como **Permitir**.
                </span>
              </div>
              <div className="h-px bg-muted-slate/20" />
              <div className="flex flex-col">
                <span className="font-bold text-foreground">No Android (Chrome Móvel):</span>
                <span className="text-muted-text text-[11px] mt-0.5">
                  Toque nos três pontinhos superiores &gt; **Configurações** &gt; **Configurações do Site** &gt; **Microfone** e autorize o site.
                </span>
              </div>
            </div>

            {/* Ações do Modal */}
            <div className="flex gap-3 mt-2">
              <button
                onClick={checkMicrophonePermission}
                className="flex-1 py-3.5 bg-primary text-background text-xs font-bold rounded-2xl uppercase tracking-widest hover:bg-primary/90 transition shadow-[0_4px_16px_rgba(204,255,0,0.2)] hover:scale-[1.02] active:scale-[0.98]"
              >
                Tentar Novamente
              </button>
              <button
                onClick={() => setShowMicInstructionModal(false)}
                className="py-3.5 px-6 bg-muted-slate/20 border border-muted-slate/30 text-foreground text-xs font-bold rounded-2xl uppercase tracking-widest hover:bg-muted-slate/30 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CallScreen() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex flex-col items-center justify-center bg-background text-foreground">
          <div className="relative w-12 h-12 mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-muted-slate/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary animate-pulse">
            Carregando chamada...
          </p>
        </div>
      }
    >
      <CallContent />
    </Suspense>
  );
}
