import React from "react";

interface HeatmapProps {
  sessions?: any[];
}

export const Heatmap: React.FC<HeatmapProps> = ({ sessions = [] }) => {
  const today = new Date();
  
  // 1. Calcular a semana corrente (Segunda a Domingo)
  const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Segunda, etc.
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  // Função para verificar se houve prática em um determinado dia
  const hasSessionOnDay = (date: Date) => {
    return sessions.some(s => {
      const sDate = new Date(s.created_at);
      return sDate.getDate() === date.getDate() &&
             sDate.getMonth() === date.getMonth() &&
             sDate.getFullYear() === date.getFullYear();
    });
  };

  // Nomes curtos dos dias da semana em PT-BR
  const weekDayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  // Total de dias praticados na semana atual
  const practicedThisWeek = weekDays.filter(day => hasSessionOnDay(day)).length;
  
  // Meta sugerida de prática (ex: 5 dias por semana)
  const weeklyGoal = 5;
  const goalProgressPercentage = Math.min(100, Math.round((practicedThisWeek / weeklyGoal) * 100));

  // 2. Calcular o histórico linear dos últimos 30 dias (para ver o progresso no tempo)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (29 - i)); // Ordenado do mais antigo para hoje (último)
    return d;
  });

  const practicedLast30DaysCount = last30Days.filter(day => hasSessionOnDay(day)).length;

  return (
    <div className="w-full bg-card-bg border border-muted-slate/30 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-6">
      
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-xs font-bold text-muted-text uppercase tracking-widest">
            Frequência de Prática
          </h3>
          <span className="text-[10px] text-muted-text/80 font-medium">
            Acompanhe o seu ritmo de conversação em inglês
          </span>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[8px] font-bold text-primary uppercase tracking-widest">
          Semana Atual
        </div>
      </div>

      {/* Grid de Dias da Semana Atual */}
      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {weekDays.map((day, idx) => {
          const isPracticed = hasSessionOnDay(day);
          const isToday = 
            day.getDate() === today.getDate() &&
            day.getMonth() === today.getMonth() &&
            day.getFullYear() === today.getFullYear();
            
          return (
            <div 
              key={idx} 
              className="flex flex-col items-center gap-1.5"
            >
              {/* Card do Dia */}
              <div 
                className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-300 relative border ${
                  isPracticed 
                    ? "bg-primary border-primary text-background shadow-[0_0_12px_rgba(204,255,0,0.25)]" 
                    : isToday 
                    ? "bg-card-bg/40 border-primary/60 text-white animate-pulse" 
                    : "bg-muted-slate/15 border-muted-slate/10 text-muted-text"
                }`}
                title={isPracticed ? "Dia Praticado!" : isToday ? "Hoje (Pratique agora!)" : "Sem registro"}
              >
                <span className="text-[9px] font-black uppercase tracking-wider">
                  {weekDayLabels[idx]}
                </span>
                <span className="text-[12px] font-black tracking-tight mt-0.5">
                  {day.getDate()}
                </span>
                
                {/* Indicador sutil de dia atual para dias inativos */}
                {isToday && !isPracticed && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Meta e Resumos de Progresso */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2 border-t border-muted-slate/20">
        
        {/* Progresso da Meta Semanal */}
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold text-muted-text">
            <span>META SEMANAL</span>
            <span className="text-white">{practicedThisWeek} de {weeklyGoal} dias</span>
          </div>
          {/* Barra de Progresso */}
          <div className="w-full h-2 rounded-full bg-muted-slate/30 overflow-hidden border border-muted-slate/10">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(204,255,0,0.5)]"
              style={{ width: `${goalProgressPercentage}%` }}
            />
          </div>
        </div>

        {/* Resumo Mensal Linear (Bolinhas dos últimos 30 dias) */}
        <div className="flex flex-col gap-1.5 sm:w-48">
          <div className="flex justify-between items-center text-[10px] font-bold text-muted-text">
            <span>ÚLTIMOS 30 DIAS</span>
            <span className="text-white">{practicedLast30DaysCount} ativações</span>
          </div>
          {/* Bolinhas Lineares dos últimos 30 dias */}
          <div className="flex items-center gap-1 flex-wrap">
            {last30Days.map((day, idx) => {
              const isPracticed = hasSessionOnDay(day);
              const isToday = 
                day.getDate() === today.getDate() &&
                day.getMonth() === today.getMonth() &&
                day.getFullYear() === today.getFullYear();
                
              return (
                <div 
                  key={idx}
                  className={`w-2.5 h-2.5 rounded-sm transition-all duration-300 ${
                    isPracticed 
                      ? "bg-primary shadow-[0_0_4px_rgba(204,255,0,0.3)]" 
                      : isToday
                      ? "bg-transparent border border-primary/70"
                      : "bg-muted-slate/20 border border-muted-slate/10"
                  }`}
                  title={`${day.getDate()}/${day.getMonth() + 1} - ${isPracticed ? "Praticado" : "Sem registro"}`}
                />
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
