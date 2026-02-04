import React, { useMemo, useState } from 'react';
import { User } from '../types';
import { X, RefreshCw, UserCircle } from 'lucide-react';

interface AvatarPickerModalProps {
  onSelect: (updates: Partial<User>) => void;
  onClose: () => void;

  // opcional: se quiser no futuro variar por tela
  title?: string;
}

const AVATAR_STYLE = 'robottts'; // ✅ trocado de fun-emoji para robottts

function makeSeeds(n: number) {
  return Array.from({ length: n }, () => Math.random().toString(36).substring(2, 10));
}

const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({ onSelect, onClose, title }) => {
  const [batch, setBatch] = useState(0);

  const seeds = useMemo(() => {
    // muda quando você clica “Mais opções”
    return makeSeeds(12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch]);

  return (
    <div
      className="fixed inset-0 bg-indigo-950/98 backdrop-blur-3xl z-[5000] flex items-center justify-center p-6 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[4rem] w-full max-w-lg p-10 md:p-14 border-[12px] border-indigo-950 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-6 -right-6 p-4 bg-red-500 rounded-2xl text-white border-4 border-indigo-950 shadow-xl hover:scale-110 transition-all"
        >
          <X size={24} strokeWidth={4} />
        </button>

        <div className="text-center mb-6">
          <h3 className="text-4xl font-black text-indigo-950 uppercase italic tracking-tighter">
            {title || 'Pack de Avatares'}
          </h3>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-2">
            Clique em “Mais opções” para trocar o pack
          </p>
        </div>

        <div className="flex items-center justify-between mb-6 gap-3">
          <button
            onClick={() => setBatch(b => b + 1)}
            className="flex-1 py-4 bg-yellow-400 hover:bg-yellow-500 text-indigo-950 rounded-[2rem] font-black uppercase tracking-widest text-[10px] border-4 border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} /> Mais opções
          </button>

          <button
            onClick={() => onSelect({ avatarSeed: undefined, avatarUrl: undefined })}
            className="py-4 px-5 bg-white text-indigo-950 rounded-[2rem] font-black uppercase tracking-widest text-[10px] border-4 border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,0.12)] active:translate-y-1 active:shadow-none transition-all"
          >
            Remover
          </button>
        </div>

        <div className="max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-4 pb-4">
            {seeds.map(seed => (
              <button
                key={seed}
                onClick={() => onSelect({ avatarSeed: seed, avatarUrl: undefined })}
                className="aspect-square bg-slate-50 rounded-[2rem] border-4 border-slate-100 p-2 hover:border-indigo-600 hover:bg-indigo-50 transition-all group overflow-hidden shadow-sm"
              >
                <img
                  src={`https://api.dicebear.com/9.x/${AVATAR_STYLE}/svg?seed=${seed}`}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                  alt="avatar"
                />
              </button>
            ))}

            <button
              onClick={() => onSelect({ avatarSeed: undefined, avatarUrl: undefined })}
              className="aspect-square bg-slate-50 rounded-[2rem] border-4 border-slate-100 p-2 hover:border-indigo-600 hover:bg-indigo-50 transition-all group overflow-hidden shadow-sm flex items-center justify-center"
            >
              <UserCircle size={48} className="text-slate-200 group-hover:text-indigo-200" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarPickerModal;
