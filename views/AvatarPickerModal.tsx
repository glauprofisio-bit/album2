
import React, { useState, useMemo, useEffect } from 'react';
import { User } from '../types';
import { X, Sparkles, Wand2, Loader2, ShieldAlert, Heart, Briefcase, Star } from 'lucide-react';

interface AvatarPickerModalProps {
  onSelect: (updates: Partial<User>) => void;
  onClose: () => void;
}

const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({ onSelect, onClose }) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'magic'>('gallery');
  const [animal, setAnimal] = useState('');
  const [projetoVida, setProjetoVida] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [error, setError] = useState('');

  const randomSeeds = useMemo(() => Array.from({ length: 12 }, () => Math.random().toString(36).substring(7)), []);

  const BLOCKED_TERMS = ['penis', 'pênis', 'vagina', 'sexo', 'sexual', 'nude', 'pelado', 'pinto', 'rola', 'buceta', 'caralho', 'porno', 'gore', 'violencia', 'arma', 'sangue'];

  const validateText = (text: string) => {
    const lowerText = text.toLowerCase();
    return !BLOCKED_TERMS.some(term => lowerText.includes(term));
  };

  // Lógica da contagem regressiva mágica
  useEffect(() => {
    let timer: any;
    if (isGenerating && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (!isGenerating) {
      setCountdown(10);
    }
    return () => clearInterval(timer);
  }, [isGenerating, countdown]);

  const getMagicMessage = (count: number) => {
    if (count > 8) return "Preparando o caldeirão...";
    if (count > 6) return "Misturando as cores...";
    if (count > 4) return "Dando vida ao seu animal...";
    if (count > 2) return "Vestindo o uniforme...";
    return "Quase pronto! ✨";
  };

  const generateMagicSticker = async () => {
    if (!animal.trim() || !projetoVida.trim()) {
      setError('Por favor, preencha os dois campos para a mágica acontecer! ✨');
      return;
    }
    
    if (!validateText(animal) || !validateText(projetoVida)) {
      setError('Epa! Algum termo usado não é permitido na escola. Use sua criatividade para algo legal! 🎨');
      return;
    }

    setIsGenerating(true);
    setError('');
    setCountdown(10);

    try {
      const response = await fetch('/api/generate-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animal, projetoVida })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao gerar imagem');
      }

      if (data.avatarUrl) {
        onSelect({ avatarUrl: data.avatarUrl, avatarSeed: '' });
      } else {
        throw new Error('A IA ainda está sendo configurada no servidor.');
      }
    } catch (err: any) {
      setError(`Erro: ${err.message || 'A IA demorou muito. Tente novamente!'}`);
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-indigo-950/98 backdrop-blur-3xl z-[5000] flex items-center justify-center p-6 animate-in fade-in duration-300">
       <div className="bg-white rounded-[4rem] w-full max-w-lg p-10 md:p-14 border-[12px] border-indigo-950 shadow-2xl relative" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="absolute -top-6 -right-6 p-4 bg-red-500 rounded-2xl text-white border-4 border-indigo-950 shadow-xl hover:scale-110 transition-all">
            <X size={24} strokeWidth={4} />
          </button>

          <div className="text-center mb-10">
             <h3 className="text-4xl font-black text-indigo-950 uppercase italic tracking-tighter">Pack de Avatares</h3>
             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-2">Escolha sua figurinha de perfil</p>
          </div>

          <div className="flex bg-slate-100 p-2 rounded-[2rem] border-4 border-indigo-950 mb-8">
             <button onClick={() => setActiveTab('gallery')} className={`flex-1 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'gallery' ? 'bg-indigo-600 text-white shadow-lg border-2 border-white/10' : 'text-indigo-400 hover:bg-white/50'}`}>Galeria</button>
             <button onClick={() => setActiveTab('magic')} className={`flex-1 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'magic' ? 'bg-orange-500 text-white shadow-lg border-2 border-indigo-950/10' : 'text-indigo-400 hover:bg-white/50'}`}><Wand2 size={16}/> Mágica</button>
          </div>

          <div className="max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
            {activeTab === 'gallery' ? (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4 pb-4">
                {randomSeeds.map(seed => (
                  <button 
                    key={seed}
                    onClick={() => onSelect({ avatarSeed: seed, avatarUrl: '' })}
                    className="aspect-square bg-slate-50 rounded-[2rem] border-4 border-slate-100 p-2 hover:border-indigo-600 hover:bg-indigo-50 transition-all group overflow-hidden shadow-sm"
                  >
                    <img src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${seed}`} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {isGenerating ? (
                  <div className="py-10 flex flex-col items-center justify-center space-y-8 animate-in zoom-in duration-500">
                    <div className="relative">
                      <div className="absolute -top-4 -left-4 animate-bounce">
                        <Star className="text-yellow-400 fill-yellow-400" size={24} />
                      </div>
                      <div className="absolute -bottom-4 -right-4 animate-bounce delay-150">
                        <Star className="text-cyan-400 fill-cyan-400" size={20} />
                      </div>
                      <div className="w-32 h-32 bg-indigo-50 rounded-full border-8 border-indigo-950 flex items-center justify-center relative overflow-hidden">
                        <Wand2 size={64} className="text-indigo-600 animate-magic-wand" />
                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 to-transparent animate-pulse" />
                      </div>
                    </div>
                    
                    <div className="text-center space-y-2">
                      <div className="text-6xl font-black text-indigo-950 tabular-nums">{countdown}</div>
                      <p className="text-sm font-black text-indigo-600 uppercase italic tracking-tighter animate-pulse">
                        {getMagicMessage(countdown)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <label className="text-[10px] font-black uppercase text-indigo-300 ml-4 tracking-widest mb-2 block">Escolha um animal</label>
                      <div className="relative">
                        <input 
                          type="text"
                          value={animal}
                          onChange={(e) => setAnimal(e.target.value)}
                          placeholder="Ex: Panda, Leão, Gato..."
                          className="w-full p-5 pl-12 bg-slate-50 rounded-[1.5rem] border-4 border-indigo-950 font-black text-indigo-950 text-sm outline-none focus:bg-white transition-colors"
                        />
                        <Heart className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-950/30" size={20} />
                      </div>
                    </div>

                    <div className="relative">
                      <label className="text-[10px] font-black uppercase text-indigo-300 ml-4 tracking-widest mb-2 block">Qual é o seu projeto de vida?</label>
                      <div className="relative">
                        <input 
                          type="text"
                          value={projetoVida}
                          onChange={(e) => setProjetoVida(e.target.value)}
                          placeholder="Ex: Médico, Astronauta, Jogador..."
                          className="w-full p-5 pl-12 bg-slate-50 rounded-[1.5rem] border-4 border-indigo-950 font-black text-indigo-950 text-sm outline-none focus:bg-white transition-colors"
                        />
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-950/30" size={20} />
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 p-4 rounded-2xl border-2 border-red-100 flex items-center gap-3 animate-pulse">
                     <ShieldAlert className="text-red-500 shrink-0" size={20} />
                     <p className="text-red-600 text-[10px] font-black uppercase leading-tight">{error}</p>
                  </div>
                )}

                {!isGenerating && (
                  <button 
                    onClick={generateMagicSticker}
                    disabled={isGenerating || !animal.trim() || !projetoVida.trim()}
                    className="w-full py-6 bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-[2rem] shadow-[0_8px_0_0_rgba(30,27,75,1)] border-[6px] border-indigo-950 text-lg uppercase italic tracking-tighter flex items-center justify-center gap-4 transition-all hover:translate-y-1 active:translate-y-2 active:shadow-none"
                  >
                    <Sparkles size={24} fill="currentColor"/> Criar Avatar Mágico
                  </button>
                )}
                
                <p className="text-[8px] text-center text-indigo-300 font-black uppercase tracking-widest px-8">A IA combinará seu animal com sua profissão dos sonhos!</p>
              </div>
            )}
          </div>
       </div>
       <style>{`
         @keyframes magic-wand {
           0% { transform: rotate(0deg) translateX(0px); }
           25% { transform: rotate(20deg) translateX(10px); }
           50% { transform: rotate(-20deg) translateX(-10px); }
           75% { transform: rotate(10deg) translateX(5px); }
           100% { transform: rotate(0deg) translateX(0px); }
         }
         .animate-magic-wand {
           animation: magic-wand 1.5s infinite ease-in-out;
         }
       `}</style>
    </div>
  );
};

export default AvatarPickerModal;
