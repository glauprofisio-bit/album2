
import React, { useMemo } from 'react';
import { AppData, StickerRarity, UserRole, User } from '../types';
import { Trophy, Star, Crown, Medal, ChevronLeft, Sparkles, Gem, UserCircle, ShieldAlert, Users, Flame, Zap } from 'lucide-react';

interface HallOfFameProps {
  data: AppData;
  onClose: () => void;
}

const HallOfFame: React.FC<HallOfFameProps> = ({ data, onClose }) => {
  const ranking = useMemo(() => {
    return data.students
      .map(student => {
        const stickers = data.studentStickers.filter(s => s.alunoId === student.id);
        const revealedStickers = stickers.filter(s => s.revelada);
        
        // Cálculo das Figurinhas Épicas
        const epicStickersCount = revealedStickers.filter(s => {
          const stickerInfo = data.stickers.find(si => si.week === s.week);
          return stickerInfo?.rarity === StickerRarity.DIAMOND || stickerInfo?.rarity === StickerRarity.OBSIDIAN;
        }).length;

        // NOVO: Cálculo da Sequência Ininterrupta (Streak)
        let maxStreak = 0;
        let currentStreak = 0;
        for (let w = 1; w <= data.currentWeek; w++) {
          const s = stickers.find(st => st.week === w);
          if (s && s.liberada && !s.isFalta) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
          } else {
            currentStreak = 0;
          }
        }
        
        return {
          ...student,
          total: revealedStickers.length,
          reconquistadas: stickers.filter(s => s.reconquistada).length,
          epics: epicStickersCount,
          maxStreak: maxStreak
        };
      })
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if (b.reconquistadas !== a.reconquistadas) return b.reconquistadas - a.reconquistadas;
        return a.name.localeCompare(b.name);
      });
  }, [data]);

  const topThree = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  const clubRares = useMemo(() => {
    return ranking.filter(s => s.epics > 0);
  }, [ranking]);

  // NOVO: Filtro para o Clube dos Imparáveis (Sequência >= 2 semanas)
  const unstoppables = useMemo(() => {
    return ranking.filter(s => s.maxStreak >= 2).sort((a, b) => b.maxStreak - a.maxStreak);
  }, [ranking]);

  const getAvatarUrl = (user: User) => {
    if (user.avatarUrl) return user.avatarUrl;
    if (user.avatarSeed) return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${user.avatarSeed}`;
    return null;
  };

  return (
    <div className="space-y-16 pb-24 animate-in fade-in slide-in-from-bottom-10 duration-700">
      {/* Botão Voltar */}
      <div className="max-w-4xl mx-auto px-4">
        <button onClick={onClose} className="flex items-center gap-2 text-white/40 hover:text-white font-black uppercase text-[10px] tracking-[0.2em] transition-all active:scale-95">
            <ChevronLeft size={16} /> Voltar ao Meu Álbum
        </button>
      </div>

      {/* Título Principal */}
      <div className="text-center space-y-6 px-4">
        <div className="inline-block bg-yellow-400 p-10 rounded-[3.5rem] border-[10px] border-indigo-950 shadow-[0_15px_0_0_rgba(30,27,75,1)] -rotate-3 mb-6 animate-float">
           <Trophy size={80} className="text-indigo-950" />
        </div>
        <h2 className="text-7xl md:text-9xl font-black italic uppercase tracking-tighter text-white drop-shadow-[0_10px_0_rgba(30,27,75,1)] leading-none">
          Pódio Épico
        </h2>
        <p className="text-yellow-400 font-black uppercase tracking-[0.6em] text-[10px] md:text-xs animate-pulse">O Olimpo dos Maiores Colecionadores</p>
      </div>

      {/* Seção 1: Pódio dos Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-6 items-end max-w-6xl mx-auto pt-24 px-4 relative">
        {/* Segundo Lugar (Prata) */}
        {topThree[1] && (
          <div className="order-2 md:order-1 flex flex-col items-center">
             <div className="relative mb-8 group">
                <div className="w-32 h-32 bg-white rounded-[2.5rem] border-[8px] border-slate-300 flex items-center justify-center shadow-2xl overflow-hidden ring-[8px] ring-slate-300/20 transition-transform group-hover:scale-110">
                   {getAvatarUrl(topThree[1]) ? (
                     <img src={getAvatarUrl(topThree[1])!} className="w-full h-full object-cover" />
                   ) : (
                     <UserCircle size={64} className="text-slate-200" />
                   )}
                </div>
                <div className="absolute -top-6 -right-6 bg-slate-300 text-indigo-950 w-14 h-14 rounded-full flex items-center justify-center font-black border-[6px] border-indigo-950 shadow-xl text-xl">2º</div>
             </div>
             <div className="bg-white p-8 rounded-[3rem] border-[10px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)] w-full text-center">
                <p className="font-black text-2xl text-indigo-950 uppercase italic tracking-tighter truncate leading-none">{topThree[1].name}</p>
                <div className="mt-4 space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">MESTRE DE PRATA</span>
                    <span className="text-3xl font-black text-indigo-950 leading-none block">{topThree[1].total} FIGURINHAS</span>
                </div>
             </div>
          </div>
        )}

        {/* Primeiro Lugar (Ouro) */}
        {topThree[0] && (
          <div className="order-1 md:order-2 flex flex-col items-center scale-110 md:scale-125 relative z-20">
             <div className="absolute -top-24 text-yellow-300 animate-bounce">
                <Crown size={100} strokeWidth={3} fill="currentColor" className="drop-shadow-[0_0_30px_rgba(253,224,71,0.8)]" />
             </div>
             <div className="relative mb-10 group">
                <div className="w-40 h-40 bg-white rounded-[3.5rem] border-[12px] border-yellow-400 flex items-center justify-center shadow-2xl overflow-hidden ring-[15px] ring-yellow-400/30 transition-transform group-hover:scale-110">
                   {getAvatarUrl(topThree[0]) ? (
                     <img src={getAvatarUrl(topThree[0])!} className="w-full h-full object-cover" />
                   ) : (
                     <Trophy size={80} className="text-yellow-500" />
                   )}
                </div>
                <div className="absolute -top-8 -right-8 bg-yellow-400 text-indigo-950 w-20 h-20 rounded-full flex items-center justify-center font-black text-3xl border-[10px] border-indigo-950 shadow-2xl animate-pulse">1º</div>
             </div>
             <div className="bg-white p-12 rounded-[4rem] border-[12px] border-indigo-950 shadow-[0_15px_0_0_rgba(30,27,75,1)] w-full text-center">
                <p className="font-black text-4xl text-indigo-950 uppercase italic tracking-tighter leading-none">{topThree[0].name}</p>
                <div className="mt-5 space-y-1">
                    <span className="text-[12px] font-black text-yellow-600 uppercase tracking-[0.2em] block">LENDA SUPREMA</span>
                    <span className="text-5xl font-black text-indigo-950 leading-none block">{topThree[0].total} FIGURINHAS</span>
                </div>
             </div>
          </div>
        )}

        {/* Terceiro Lugar (Bronze) */}
        {topThree[2] && (
          <div className="order-3 flex flex-col items-center">
             <div className="relative mb-8 group">
                <div className="w-32 h-32 bg-white rounded-[2.5rem] border-[8px] border-orange-500 flex items-center justify-center shadow-2xl overflow-hidden ring-[8px] ring-orange-500/20 transition-transform group-hover:scale-110">
                   {getAvatarUrl(topThree[2]) ? (
                     <img src={getAvatarUrl(topThree[2])!} className="w-full h-full object-cover" />
                   ) : (
                     <UserCircle size={64} className="text-orange-200" />
                   )}
                </div>
                <div className="absolute -top-6 -right-6 bg-orange-500 text-white w-14 h-14 rounded-full flex items-center justify-center font-black border-[6px] border-indigo-950 shadow-xl text-xl">3º</div>
             </div>
             <div className="bg-white p-8 rounded-[3rem] border-[10px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)] w-full text-center">
                <p className="font-black text-2xl text-indigo-950 uppercase italic tracking-tighter truncate leading-none">{topThree[2].name}</p>
                <div className="mt-4 space-y-1">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block">GUERREIRO DE BRONZE</span>
                    <span className="text-3xl font-black text-indigo-950 leading-none block">{topThree[2].total} FIGURINHAS</span>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Seção 2: Clube dos Raros (Misterioso) */}
      <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="bg-indigo-950/80 rounded-[4.5rem] border-[10px] border-indigo-950 p-12 relative overflow-hidden group club-card-shimmer">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10 opacity-30" />
              <div className="relative z-10 flex flex-col items-center gap-8">
                  <div className="flex items-center gap-6 bg-black/50 px-10 py-4 rounded-full border-2 border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.3)]">
                      <Gem className="text-cyan-400 animate-pulse" size={36} />
                      <h3 className="text-3xl md:text-4xl font-black italic uppercase text-white tracking-tighter">Clube dos Raros</h3>
                      <Sparkles className="text-purple-400" size={36} />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <p className="text-cyan-400 text-xs font-black uppercase tracking-[0.4em]">A Elite dos Caçadores de Raridade</p>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] italic">Acesso exclusivo para quem possui Diamante ou Obsidiana</p>
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-6 mt-6">
                      {clubRares.length === 0 ? (
                        <div className="py-10 text-center text-white/10 font-black uppercase tracking-widest italic">Nenhum membro iniciado ainda...</div>
                      ) : (
                        clubRares.map(student => (
                          <div key={student.id} className="bg-white/5 backdrop-blur-2xl border-2 border-white/10 rounded-3xl px-8 py-6 flex items-center gap-5 hover:border-cyan-400/50 hover:bg-white/10 transition-all cursor-help relative group/item">
                              <div className="w-14 h-14 rounded-2xl bg-cyan-400/20 flex items-center justify-center border-2 border-cyan-400/40 overflow-hidden">
                                 {getAvatarUrl(student) ? (
                                   <img src={getAvatarUrl(student)!} className="w-full h-full object-cover grayscale group-hover/item:grayscale-0 transition-all" />
                                 ) : (
                                   <Sparkles size={24} className="text-cyan-300" />
                                 )}
                              </div>
                              <div className="text-left">
                                  <p className="font-black text-white text-lg uppercase italic tracking-tight leading-none mb-1">{student.name}</p>
                                  <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest leading-none">Membro Certificado</p>
                              </div>
                              <div className="absolute -top-3 -right-3 bg-cyan-400 p-1.5 rounded-lg border-2 border-indigo-950 shadow-lg">
                                 <ShieldAlert size={12} className="text-indigo-950" />
                              </div>
                          </div>
                        ))
                      )}
                  </div>

                  <div className="bg-red-500/10 border-2 border-red-500/20 px-8 py-4 rounded-[2rem] flex items-center gap-3 mt-4">
                      <ShieldAlert className="text-red-400" size={20} />
                      <p className="text-red-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-tight text-center italic">
                        AVISO: AS IMAGENS DAS RARIDADES SÃO RESTRITAS AOS MEMBROS.<br/>O MISTÉRIO FAZ PARTE DO CLUBE!
                      </p>
                  </div>
              </div>
          </div>
      </div>

      {/* NOVA SEÇÃO: OS IMPARÁVEIS (Elite da Constância) */}
      <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="bg-orange-950/90 rounded-[4.5rem] border-[10px] border-orange-500/30 p-12 relative overflow-hidden group shadow-[0_0_60px_rgba(249,115,22,0.1)]">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
              <div className="relative z-10 flex flex-col items-center gap-8">
                  <div className="flex items-center gap-6 bg-orange-600 px-10 py-4 rounded-full border-4 border-indigo-950 shadow-2xl animate-float">
                      <Flame className="text-yellow-300 animate-pulse" size={36} fill="currentColor" />
                      <h3 className="text-3xl md:text-4xl font-black italic uppercase text-white tracking-tighter">Os Imparáveis</h3>
                      <Zap className="text-white" size={32} fill="currentColor" />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <p className="text-orange-400 text-xs font-black uppercase tracking-[0.4em]">Elite da Constância Inabalável</p>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] italic">Guerreiros com maior sequência de semanas sem faltas</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-4">
                      {unstoppables.length === 0 ? (
                        <div className="col-span-full py-10 text-center text-white/10 font-black uppercase tracking-widest italic">Aguardando os primeiros veteranos...</div>
                      ) : (
                        unstoppables.slice(0, 6).map(student => (
                          <div key={student.id} className="bg-white/5 border-2 border-orange-500/20 rounded-[2.5rem] p-6 flex items-center justify-between group/unstoppable hover:bg-orange-600/10 transition-all">
                              <div className="flex items-center gap-4">
                                {/* Avatar com ícone de fogo acoplado */}
                                <div className="relative">
                                  <div className="w-14 h-14 rounded-2xl border-4 border-indigo-950 overflow-hidden bg-white shadow-lg flex-shrink-0">
                                     {getAvatarUrl(student) ? (
                                       <img src={getAvatarUrl(student)!} className="w-full h-full object-cover" />
                                     ) : (
                                       <UserCircle className="text-slate-200" size={32} />
                                     )}
                                  </div>
                                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-orange-600 rounded-lg border-2 border-indigo-950 flex items-center justify-center shadow-md animate-pulse">
                                     <Flame size={14} className="text-white" fill="currentColor" />
                                  </div>
                                </div>
                                <div className="text-left">
                                    <p className="font-black text-white text-md uppercase italic tracking-tighter leading-none mb-1 truncate max-w-[120px]">{student.name}</p>
                                    <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest">INVENCÍVEL</p>
                                </div>
                              </div>
                              <div className="text-right">
                                  <span className="text-3xl font-black text-orange-500 italic leading-none">{student.maxStreak}</span>
                                  <p className="text-[7px] font-black text-white/30 uppercase tracking-tighter">SEMANAS</p>
                              </div>
                          </div>
                        ))
                      )}
                  </div>
              </div>
          </div>
      </div>

      {/* Seção 3: Ranking Geral Completo */}
      <div className="max-w-4xl mx-auto space-y-6 px-4">
        <div className="flex flex-col items-center gap-4 mb-12">
            <h3 className="font-black uppercase text-white/20 text-[10px] md:text-xs tracking-[0.8em] italic">Ranking Geral dos Colecionadores</h3>
            <div className="h-1 w-24 bg-white/10 rounded-full" />
        </div>
        
        {ranking.length === 0 && <p className="text-center text-white/20 font-black uppercase tracking-widest py-20">Nenhuma lenda detectada ainda...</p>}
        
        {rest.map((student, idx) => (
          <div key={student.id} className="bg-white rounded-[2.5rem] p-6 border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)] flex items-center justify-between hover:translate-x-3 transition-transform duration-300 group">
             <div className="flex items-center gap-8">
                <span className="text-3xl font-black text-indigo-100 italic w-12 text-center group-hover:text-indigo-200 transition-colors">#{idx + 4}</span>
                <div className="w-16 h-16 rounded-2xl border-[6px] border-indigo-950 overflow-hidden bg-slate-50 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                   {getAvatarUrl(student) ? (
                     <img src={getAvatarUrl(student)!} className="w-full h-full object-cover" />
                   ) : (
                     <UserCircle className="text-slate-200" size={40} />
                   )}
                </div>
                <div className="space-y-1">
                    <p className="font-black text-indigo-950 uppercase italic text-2xl tracking-tighter leading-none">{student.name}</p>
                    <div className="flex items-center gap-2">
                       <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border-2 ${student.epics > 0 ? 'bg-cyan-50 border-cyan-200 text-cyan-600' : 'bg-indigo-50 border-indigo-100 text-indigo-400'}`}>
                          {student.epics > 0 ? 'MEMBRO DO CLUBE' : 'COLECIONADOR'}
                       </span>
                       {student.maxStreak >= 3 && (
                         <span className="bg-orange-50 border-2 border-orange-100 text-orange-600 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                            <Flame size={10} fill="currentColor" /> {student.maxStreak} SEMANAS
                         </span>
                       )}
                    </div>
                </div>
             </div>
             
             <div className="flex items-center gap-8">
                <div className="text-right">
                   <p className="text-3xl font-black text-indigo-950 uppercase leading-none italic">{student.total}</p>
                   <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mt-1">Total</p>
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-4 border-indigo-950 transition-all ${student.total >= 10 ? 'bg-indigo-600 text-white shadow-lg rotate-3 group-hover:rotate-0' : 'bg-slate-50 text-slate-100'}`}>
                   <Medal size={28} />
                </div>
             </div>
          </div>
        ))}
      </div>
      
      {/* Rodapé do Ranking */}
      <div className="text-center pt-10 pb-20 opacity-30">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] italic">Atualizado em Tempo Real • PEI Dr. Disnei</p>
      </div>
    </div>
  );
};

export default HallOfFame;
