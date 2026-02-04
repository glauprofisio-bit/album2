import React, { useMemo, useState } from 'react';
import { User } from '../types';
import { X, Shuffle, UserCircle } from 'lucide-react';

type AvatarPickerVariant = 'student' | 'professor';

interface AvatarPickerModalProps {
  onSelect: (updates: Partial<User>) => void;
  onClose: () => void;

  // ✅ novo (opcional)
  dicebearStyle?: string; // ex: "bottts"
  variant?: AvatarPickerVariant; // ex: "professor" para estilos diferentes
}

function makeSeeds(n: number) {
  return Array.from({ length: n }, () => Math.random().toString(36).substring(2, 10));
}

const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  onSelect,
  onClose,
  dicebearStyle = 'bottts',
  variant = 'student'
}) => {
  const [seeds, setSeeds] = useState(() => makeSeeds(12));

  const title = useMemo(() => {
    return variant === 'professor' ? 'Avatar do Professor' : 'Avatar do Aluno';
  }, [variant]);

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

        <div className="text-center mb-8">
          <h3 className="text-4xl font-black text-indigo-950 uppercase italic tracking-tighter">
            {title}
          </h3>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-2">
            Escolha seu avatar (seed)
          </p>

          <button
            type="button"
            onClick={() => setSeeds(makeSeeds(12))}
            className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-[1.5rem] border-4 border-indigo-950 bg-yellow-400 text-indigo-950 font-black uppercase italic tracking-tighter shadow-[0_6px_0_0_rgba(30,27,75,1)] active:translate-y-1 active:shadow-none transition-all"
          >
            <Shuffle size={18} strokeWidth={3} /> Trocar opções
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
                  src={`https://api.dicebear.com/9.x/${dicebearStyle}/svg?seed=${seed}`}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                  alt="avatar"
                />
              </button>
            ))}

            <button
              onClick={() => onSelect({ avatarSeed: undefined, avatarUrl: undefined })}
              className="aspect-square bg-slate-50 rounded-[2rem] border-4 border-slate-100 p-2 hover:border-indigo-600 hover:bg-indigo-50 transition-all group overflow-hidden shadow-sm flex items-center justify-center"
              title="Remover avatar"
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
