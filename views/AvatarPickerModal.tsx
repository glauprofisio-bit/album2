
import React, { useState, useMemo } from 'react';
import { User } from '../types';
import { X, Sparkles, Wand2, Loader2, ShieldAlert } from 'lucide-react';

interface AvatarPickerModalProps {
  onSelect: (updates: Partial<User>) => void;
  onClose: () => void;
}

const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({ onSelect, onClose }) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'magic'>('gallery');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const randomSeeds = useMemo(() => Array.from({ length: 12 }, () => Math.random().toString(36).substring(7)), []);

  const BLOCKED_TERMS = ['penis', 'pênis', 'vagina', 'sexo', 'sexual', 'nude', 'pelado', 'pinto', 'rola', 'buceta', 'caralho', 'porno', 'gore', 'violencia', 'arma', 'sangue'];

  const validatePrompt = (text: string) => {
    const lowerText = text.toLowerCase();
    return !BLOCKED_TERMS.some(term => lowerText.includes(term));
  };

  const generateMagicSticker = async () => {
    if (!prompt.trim()) return;
    
    if (!validatePrompt(prompt)) {
      setError('Epa! Esse termo não é permitido na escola. Use sua criatividade para algo legal! 🎨');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      // MUDANÇA AQUI: Agora chamamos a nossa própria API interna, não o Google diretamente.
      // Isso resolve o erro de segurança e protege sua chave.
      const response = await fetch('/api/generate-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao gerar imagem');
      }

      if (data.avatarUrl) {
        onSelect({ avatarUrl: data.avatarUrl, avatarSeed: undefined });
      } else {
        // Fallback caso a API ainda esteja em configuração
        throw new Error('A IA ainda está sendo configurada no servidor.');
      }
    } catch (err: any) {
      setError('Ops! A IA teve um probleminha. Tente novamente em instantes ou use a galeria!');
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
             <button onClick={() => setActiveTab('magic')} className={`flex-1 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'magic' ? 'bg-yellow-400 text-indigo-950 shadow-lg border-2 border-indigo-950/10' : 'text-indigo-400 hover:bg-white/50'}`}><Wand2 size={16}/> Mágica</button>
          </div>

          <div className="max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
            {activeTab === 'gallery' ? (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4 pb-4">
                {randomSeeds.map(seed => (
                  <button 
                    key={seed}
                    onClick={() => onSelect({ avatarSeed: seed, avatarUrl: undefined })}
                    className="aspect-square bg-slate-50 rounded-[2rem] border-4 border-slate-100 p-2 hover:border-indigo-600 hover:bg-indigo-50 transition-all group overflow-hidden shadow-sm"
                  >
                    <img src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${seed}`} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative">
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ex: Um astronauta de massinha, robô dourado, gatinho pirata..."
                    className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 font-black text-indigo-950 text-sm outline-none placeholder:text-indigo-950/20 resize-none h-32 focus:bg-white transition-colors"
                  />
                  <div className="absolute -bottom-4 right-6 bg-indigo-950 text-white text-[8px] font-black px-4 py-2 rounded-full uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={10} className="text-yellow-400" /> IA Protegida
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 p-4 rounded-2xl border-2 border-red-100 flex items-center gap-3 animate-pulse">
                     <ShieldAlert className="text-red-500 shrink-0" size={20} />
                     <p className="text-red-600 text-[10px] font-black uppercase leading-tight">{error}</p>
                  </div>
                )}

                <button 
                  onClick={generateMagicSticker}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full py-7 bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-950 font-black rounded-[2.5rem] shadow-[0_8px_0_0_rgba(30,27,75,1)] border-[6px] border-indigo-950 text-xl uppercase italic tracking-tighter flex items-center justify-center gap-4 transition-all hover:translate-y-1 active:translate-y-2 active:shadow-none"
                >
                  {isGenerating ? <><Loader2 className="animate-spin" size={24} strokeWidth={4} /> Criando Figurinha...</> : <><Sparkles size={24} fill="currentColor"/> Criar Avatar Mágico</>}
                </button>
                
                <p className="text-[8px] text-center text-indigo-300 font-black uppercase tracking-widest px-8">A IA não aceita termos inapropriados para ambiente escolar.</p>
              </div>
            )}
          </div>
       </div>
    </div>
  );
};

export default AvatarPickerModal;
