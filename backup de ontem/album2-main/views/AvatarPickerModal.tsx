import React, { useState, useMemo } from 'react';
import { User } from '../types';
import { X, UserCircle } from 'lucide-react';

interface AvatarPickerModalProps {
  onSelect: (updates: Partial<User>) => void;
  onClose: () => void;
}

const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({ onSelect, onClose }) => {
  const randomSeeds = useMemo(() => Array.from({ length: 12 }, () => Math.random().toString(36).substring(7)), []);

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

          <div className="max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
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
