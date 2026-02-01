import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { AppData, User, AlunoSticker, Sticker as StickerType, StickerRarity } from '../types';
import { Lock, X, Star, Trophy, Sparkles, UserCircle, Puzzle } from 'lucide-react';
import confetti from 'canvas-confetti';
import AvatarPickerModal from './AvatarPickerModal';

interface StudentDashboardProps {
  user: User;
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  onUpdateProfile?: (updates: Partial<User>) => void;
}

type StickerCard = { week: number; data?: StickerType; studentData?: AlunoSticker };

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, data, updateData, onUpdateProfile }) => {
  const [selectedSticker, setSelectedSticker] = useState<StickerCard | null>(null);
  const [scratchingSticker, setScratchingSticker] = useState<{ week: number; data?: StickerType } | null>(null);
  const [celebratingSticker, setCelebratingSticker] = useState<{ week: number; data: StickerType } | null>(null);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

  const myStickers = useMemo(
    () => data.studentStickers.filter(s => s.alunoId === user.id),
    [data.studentStickers, user.id]
  );

  const stats = useMemo(() => {
    const totalReveladas = myStickers.filter(s => s.revelada).length;
    return {
      revealed: totalReveladas,
      reconquistada: myStickers.filter(s => s.reconquistada).length,
      percent: (totalReveladas / 45) * 100
    };
  }, [myStickers]);

  const allComboRevealed = useMemo(
    () => [42, 43, 44, 45].every(w => myStickers.find(s => s.week === w)?.revelada),
    [myStickers]
  );

  const avatarDisplayUrl = useMemo(() => {
    if (user.avatarUrl) return user.avatarUrl;
    if (user.avatarSeed) return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${user.avatarSeed}`;
    return null;
  }, [user.avatarUrl, user.avatarSeed]);

  const getRarityStyle = (r: StickerRarity = StickerRarity.NORMAL) => {
    switch (r) {
      case StickerRarity.RUBY:
        return { frame: 'border-[#ff3e3e]', badge: 'bg-red-600', glow: 'shadow-[0_0_80px_rgba(239,68,68,0.4)]', name: 'Rubi' };
      case StickerRarity.EMERALD:
        return { frame: 'border-[#10b981]', badge: 'bg-emerald-600', glow: 'shadow-[0_0_80px_rgba(16,185,129,0.4)]', name: 'Esmeralda' };
      case StickerRarity.OBSIDIAN:
        return { frame: 'border-[#1e293b]', badge: 'bg-slate-900', glow: 'shadow-[0_0_80px_rgba(30,41,59,0.6)]', name: 'Obsidiana' };
      case StickerRarity.GOLD:
        return { frame: 'border-[#fbbf24]', badge: 'bg-amber-500', glow: 'shadow-[0_0_80px_rgba(251,191,36,0.4)]', name: 'Ouro' };
      case StickerRarity.DIAMOND:
        return { frame: 'border-[#22d3ee]', badge: 'bg-cyan-500', glow: 'shadow-[0_0_100px_rgba(34,211,238,0.5)]', name: 'Diamante' };
      default:
        return { frame: 'border-indigo-600', badge: 'bg-indigo-600', glow: 'shadow-[0_0_50px_rgba(79,70,229,0.1)]', name: 'Comum' };
    }
  };

  const playWinSound = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();

      o.type = 'triangle';
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);

      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);

      o.connect(g);
      g.connect(ctx.destination);

      o.start();
      o.stop(ctx.currentTime + 0.3);

      setTimeout(() => {
        try { ctx.close(); } catch {}
      }, 500);
    } catch {}
  };

  const fireEpicConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 40, spread: 360, ticks: 100, zIndex: 10000 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 60 * (timeLeft / duration);

      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 220);
  };

  const setRevealedAndPersist = useCallback((week: number) => {
    const existing = data.studentStickers.find(s => s.alunoId === user.id && s.week === week);

    const next = existing
      ? data.studentStickers.map(s =>
          s.alunoId === user.id && s.week === week
            ? { ...s, liberada: true, revelada: true, isFalta: false }
            : s
        )
      : [
          ...data.studentStickers,
          { alunoId: user.id, week, liberada: true, revelada: true, reconquistada: false, isFalta: false }
        ];

    updateData({ studentStickers: next });
  }, [data.studentStickers, updateData, user.id]);

  const persistMyAvatar = (updates: Partial<User>) => {
    const updatedStudents = data.students.map(s => (s.id === user.id ? { ...s, ...updates } : s));
    updateData({ students: updatedStudents });
    onUpdateProfile?.(updates);
  };

  // ---------- Scratch modal (raspadinha real MESMO) ----------
  const ScratchModal: React.FC<{
    week: number;
    sticker?: StickerType;
    onClose: () => void;
    onDone: () => void;
  }> = ({ week, sticker, onClose, onDone }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const wrapRef = useRef<HTMLDivElement | null>(null);

    const isDownRef = useRef(false);
    const doneRef = useRef(false);
    const lastCheckRef = useRef(0);
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);

    const [crumbs, setCrumbs] = useState<Array<{ id: string; x: number; y: number; s: number; r: number; dx: number; dy: number }>>([]);

    const spawnCrumbs = (x: number, y: number) => {
      const makeId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
      const batch = Array.from({ length: 5 }, () => ({
        id: makeId(),
        x: x + (Math.random() * 18 - 9),
        y: y + (Math.random() * 18 - 9),
        s: 3 + Math.random() * 6,
        r: Math.random() * 360,
        dx: (Math.random() * 18 - 9),
        dy: (Math.random() * 20 - 10),
      }));
      setCrumbs(prev => [...prev, ...batch].slice(-180));
      setTimeout(() => {
        setCrumbs(prev => prev.filter(c => !batch.find(b => b.id === c.id)));
      }, 900);
    };

    const drawTexture = useCallback(() => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;

      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Base: “prata” com leve gradiente (opaco, cobre 100%)
      const g = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      g.addColorStop(0, '#A8AFB8');
      g.addColorStop(0.45, '#8F97A2');
      g.addColorStop(1, '#B9C0C9');
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Ruído repetido (mais “raspadinha”)
      const noise = document.createElement('canvas');
      noise.width = 160;
      noise.height = 200;
      const nctx = noise.getContext('2d');
      if (nctx) {
        const img = nctx.createImageData(noise.width, noise.height);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = 140 + Math.floor(Math.random() * 80); // 140-220
          img.data[i] = v;
          img.data[i + 1] = v;
          img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
        nctx.putImageData(img, 0, 0);

        ctx.save();
        ctx.globalAlpha = 0.18;
        const pat = ctx.createPattern(noise, 'repeat');
        if (pat) {
          ctx.fillStyle = pat;
          ctx.fillRect(0, 0, rect.width, rect.height);
        }
        ctx.restore();
      }

      // Micro “riscos” diagonais (bem sutil)
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 70; i++) {
        const x = Math.random() * rect.width;
        const y = Math.random() * rect.height;
        const len = 18 + Math.random() * 55;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, y + len * (0.25 + Math.random() * 0.25));
        ctx.stroke();
      }
      ctx.restore();

      // Texto grande e proporcional ao tamanho do card
      const base = Math.min(rect.width, rect.height);
      const fontSize = Math.max(26, Math.round(base / 7.5));
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 ${fontSize}px Fredoka, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.translate(rect.width / 2, rect.height / 2);
      ctx.rotate(-0.1);
      ctx.fillText('RASPE AQUI', 0, 0);
      ctx.restore();
    }, []);

    useEffect(() => {
      drawTexture();
      const onResize = () => drawTexture();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, [drawTexture]);

    const eraseLine = (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // migalhinhas
      spawnCrumbs(x, y);

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 46;

      const last = lastPosRef.current;
      ctx.beginPath();
      if (last) {
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      // reforço no ponto atual (limpa 100% do “carimbo” do dedo)
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      lastPosRef.current = { x, y };
    };

    const scratchedEnough = () => {
      const canvas = canvasRef.current;
      if (!canvas) return false;

      // Amostra pequena pra performance
      const w = 140;
      const h = 180;
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const octx = off.getContext('2d');
      if (!octx) return false;

      octx.drawImage(canvas, 0, 0, w, h);
      const img = octx.getImageData(0, 0, w, h).data;

      let cleared = 0;
      const total = w * h;
      for (let i = 3; i < img.length; i += 4) {
        if (img[i] < 30) cleared++;
      }
      const percent = cleared / total;

      // “~90%” raspado
      return percent >= 0.90;
    };

    const handleDown = (e: React.PointerEvent) => {
      if (doneRef.current) return;
      isDownRef.current = true;
      lastPosRef.current = null;
      (e.target as any).setPointerCapture?.(e.pointerId);
      eraseLine(e.clientX, e.clientY);
    };

    const handleMove = (e: React.PointerEvent) => {
      if (!isDownRef.current || doneRef.current) return;
      eraseLine(e.clientX, e.clientY);

      const now = Date.now();
      if (now - lastCheckRef.current > 200) {
        lastCheckRef.current = now;
        if (scratchedEnough()) {
          doneRef.current = true;
          onDone();
        }
      }
    };

    const handleUp = () => {
      isDownRef.current = false;
      lastPosRef.current = null;
    };

    return (
      <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
        <style>{`
          @keyframes crumbFly {
            0% { transform: translate(0,0) rotate(var(--r)) scale(1); opacity: 0.85; }
            100% { transform: translate(var(--dx), var(--dy)) rotate(calc(var(--r) + 80deg)) scale(0.6); opacity: 0; }
          }
        `}</style>

        <div className="bg-white rounded-[4rem] w-full max-w-md border-[12px] border-indigo-950 shadow-2xl overflow-hidden relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-3 bg-red-500 rounded-2xl text-white border-4 border-indigo-950 shadow-xl z-10">
            <X size={22} strokeWidth={4} />
          </button>

          <div className="p-7 text-center">
            <div className="bg-yellow-400 w-20 h-20 rounded-full border-8 border-indigo-950 flex items-center justify-center mx-auto -rotate-12 shadow-xl mb-4">
              <Sparkles size={34} className="text-indigo-950" />
            </div>
            <h3 className="text-3xl font-black text-indigo-950 uppercase italic tracking-tighter">Raspe a figurinha!</h3>
            <p className="text-indigo-400 font-black uppercase tracking-widest text-[10px] mt-2">Semana {week}</p>
          </div>

          <div className="px-7 pb-8">
            <div
              ref={wrapRef}
              className="relative w-full aspect-[3/4] rounded-[2.5rem] overflow-hidden border-[10px] border-indigo-950 bg-white"
            >
              {/* abaixo: figurinha (aparece quando raspar) */}
              <div className="absolute inset-0">
                <div className={`w-full h-full flex flex-col border-4 ${getRarityStyle(sticker?.rarity).frame} rounded-[2rem] overflow-hidden`}>
                  <div className="flex-1 bg-slate-50 flex items-center justify-center">
                    {sticker?.imageUrl ? (
                      <img src={sticker.imageUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-sm uppercase">Sem imagem</div>
                    )}
                  </div>
                  <div className="p-4 bg-white text-center border-t-4 border-slate-50">
                    <p className="text-lg font-black text-indigo-950 uppercase italic tracking-tighter">{sticker?.name || `Semana ${week}`}</p>
                    <span className={`inline-block mt-2 px-5 py-2 rounded-full text-white font-black text-[9px] uppercase tracking-widest ${getRarityStyle(sticker?.rarity).badge}`}>
                      {getRarityStyle(sticker?.rarity).name}
                    </span>
                  </div>
                </div>
              </div>

              {/* camada raspável */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ touchAction: 'none' }}
                onPointerDown={handleDown}
                onPointerMove={handleMove}
                onPointerUp={handleUp}
                onPointerCancel={handleUp}
                onPointerLeave={handleUp}
              />

              {/* migalhinhas (visual) */}
              <div className="absolute inset-0 pointer-events-none">
                {crumbs.map(c => (
                  <span
                    key={c.id}
                    className="absolute rounded-sm"
                    style={{
                      left: c.x,
                      top: c.y,
                      width: c.s,
                      height: c.s * 0.7,
                      background: 'rgba(255,255,255,0.65)',
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.05)',
                      transform: `rotate(${c.r}deg)`,
                      ['--r' as any]: `${c.r}deg`,
                      ['--dx' as any]: `${c.dx}px`,
                      ['--dy' as any]: `${c.dy}px`,
                      animation: 'crumbFly 900ms ease-out forwards'
                    }}
                  />
                ))}
              </div>
            </div>

            <p className="text-center mt-4 text-[10px] font-black uppercase tracking-widest text-indigo-300">
              Raspe com o dedo ou o mouse até liberar
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderSticker = (w: number, puzzleClasses?: string) => {
    const stickerData = data.stickers.find(s => s.week === w);
    const studentSticker = myStickers.find(s => s.week === w);

    const isLiberada = studentSticker?.liberada && !studentSticker?.isFalta;
    const isRevelada = studentSticker?.revelada;
    const isLost = (w < data.currentWeek && !isLiberada) || studentSticker?.isFalta;

    const style = getRarityStyle(stickerData?.rarity);
    const isCombo = w >= 42 && w <= 45;
    const isAllComboDone = isCombo && allComboRevealed;

    return (
      <div
        key={w}
        onClick={() => {
          if (isLiberada && !isRevelada) setScratchingSticker({ week: w, data: stickerData });
          else setSelectedSticker({ week: w, data: stickerData, studentData: studentSticker });
        }}
        className={`aspect-[3/4] overflow-hidden cursor-pointer transition-all duration-300 active:scale-95 relative border-4 shadow-xl ${
          puzzleClasses || 'rounded-[2rem]'
        } ${isLost ? 'bg-slate-300 border-slate-400' : 'bg-indigo-900/40 border-indigo-950/20'} ${
          isRevelada && !isAllComboDone ? 'bg-white border-indigo-950 p-1' : ''
        } ${isAllComboDone ? 'border-none p-0' : ''}`}
      >
        {isRevelada ? (
          <div className={`w-full h-full overflow-hidden flex flex-col relative ${
            isAllComboDone ? 'rounded-none' : (puzzleClasses || 'rounded-[1.5rem]') + ' bg-white border-2 ' + style.frame
          }`}>
            <div className="flex-1 bg-slate-50 flex items-center justify-center p-0 h-full">
              <img src={stickerData?.imageUrl} className="w-full h-full object-cover" />
            </div>
            {!isCombo && (
              <div className="p-1 text-center bg-white border-t border-slate-100">
                <p className="text-[8px] font-black text-indigo-950 truncate uppercase tracking-tighter leading-none">
                  {stickerData?.name || `S${w}`}
                </p>
              </div>
            )}
            {isCombo && !isAllComboDone && (
              <div className="absolute bottom-2 right-2 text-white drop-shadow-lg opacity-40">
                <Puzzle size={14} fill="currentColor" />
              </div>
            )}
          </div>
        ) : isLiberada ? (
          <div className={`w-full h-full ${isCombo ? 'bg-indigo-500' : 'bg-slate-400'} flex flex-col items-center justify-center p-2 relative overflow-hidden shadow-inner ${puzzleClasses || 'rounded-[1.5rem]'}`}>
            <div className="absolute inset-0 opacity-40 bg-slate-500/20"></div>
            <div className="relative z-10 flex flex-col items-center gap-1">
              <div className="bg-yellow-400 p-1.5 rounded-lg border-2 border-indigo-950 shadow-md rotate-3">
                <Sparkles size={16} className="text-indigo-950" />
              </div>
              <h4 className="text-[12px] font-black text-white uppercase italic leading-none tracking-tighter -rotate-6 text-center drop-shadow-md">RASPE!</h4>
            </div>
          </div>
        ) : isLost ? (
          <div className={`w-full h-full flex flex-col items-center justify-center p-2 relative overflow-hidden grayscale bg-slate-200 ${puzzleClasses || 'rounded-[1.5rem]'}`}>
            <Lock size={24} className="text-slate-400 mb-1" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-16 bg-orange-500 rotate-[-25deg] flex items-center justify-center shadow-2xl z-20 border-y-[6px] border-indigo-950">
              <p className="text-slate-100 font-black text-[16px] uppercase tracking-tighter italic text-center leading-none px-4">Não foi dessa vez!</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 opacity-40">
            <Lock size={20} className="text-indigo-950/60" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="bg-white rounded-[3rem] p-8 md:p-10 border-[8px] border-indigo-950 shadow-[0_12px_0_0_rgba(30,27,75,1)] flex flex-col md:flex-row items-center gap-8 md:gap-12">
        <div onClick={() => setIsAvatarPickerOpen(true)} className="relative group cursor-pointer">
          <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-100 rounded-full border-[6px] border-indigo-950 shadow-xl overflow-hidden relative transition-transform group-hover:scale-105 active:scale-95">
            {avatarDisplayUrl ? (
              <img src={avatarDisplayUrl} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-indigo-200">
                <UserCircle size={64} />
              </div>
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-yellow-400 p-3 rounded-2xl border-4 border-indigo-950 shadow-lg -rotate-12 group-hover:rotate-0 transition-all">
            <Star size={20} className="text-indigo-950" fill="currentColor" />
          </div>
        </div>

        <div className="flex-1 space-y-6 text-center md:text-left w-full">
          <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none text-indigo-950">{user.name}</h2>
          <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4">
            <div className="flex items-center gap-3 bg-yellow-400 px-5 py-3 rounded-[1.5rem] text-[10px] md:text-[12px] font-black uppercase tracking-widest text-indigo-950 border-4 border-indigo-950 shadow-[0_4px_0_0_rgba(30,27,75,1)]">
              <Trophy size={18} /> {stats.revealed}/45 FIGURINHAS
            </div>
            <div className="flex items-center gap-3 bg-cyan-400 px-5 py-3 rounded-[1.5rem] text-[10px] md:text-[12px] font-black uppercase tracking-widest text-indigo-950 border-4 border-indigo-950 shadow-[0_4px_0_0_rgba(30,27,75,1)]">
              <Star size={18} /> {stats.reconquistada} RECONQUISTAS
            </div>
          </div>

          <div className="w-full bg-slate-100 h-6 rounded-full border-4 border-indigo-950 p-1 overflow-hidden">
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full transition-all duration-1000 shadow-inner" style={{ width: `${stats.percent}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {Array.from({ length: 41 }, (_, i) => i + 1).map(w => renderSticker(w))}

        <div className="col-span-2 row-span-2 relative group mt-8">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-indigo-950 text-yellow-400 px-6 py-2 rounded-full border-4 border-white font-black text-[10px] uppercase tracking-widest z-20 shadow-2xl whitespace-nowrap">
            ELO SUPREMO: LEGADO DOS GUARDIÕES
          </div>

          <div className={`grid grid-cols-2 bg-indigo-950 p-0 rounded-[3rem] border-[10px] border-yellow-400 shadow-[0_0_60px_rgba(250,204,21,0.3)] overflow-hidden transition-all duration-500 ${allComboRevealed ? 'gap-0 p-0' : ''}`}>
            {renderSticker(42, allComboRevealed ? 'rounded-none' : 'rounded-none border-b-2 border-r-2 border-indigo-950/20')}
            {renderSticker(43, allComboRevealed ? 'rounded-none' : 'rounded-none border-b-2 border-l-0 border-indigo-950/20')}
            {renderSticker(44, allComboRevealed ? 'rounded-none' : 'rounded-none border-t-0 border-r-2 border-indigo-950/20')}
            {renderSticker(45, allComboRevealed ? 'rounded-none' : 'rounded-none border-t-0 border-l-0 border-indigo-950/20')}
          </div>

          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white px-4 py-1 rounded-full border-2 border-indigo-950 font-black text-[8px] uppercase text-indigo-950 shadow-md whitespace-nowrap">
            PRESENÇA NAS REUNIÕES (4 PARTES)
          </div>
        </div>
      </div>

      {/* modal raspadinha real */}
      {scratchingSticker && (
        <ScratchModal
          week={scratchingSticker.week}
          sticker={scratchingSticker.data}
          onClose={() => setScratchingSticker(null)}
          onDone={() => {
            setScratchingSticker(null);
            if (scratchingSticker.data) {
              playWinSound();
              setCelebratingSticker({ week: scratchingSticker.week, data: scratchingSticker.data });
              fireEpicConfetti();
            }
          }}
        />
      )}

      {/* celebração e “colar no álbum” */}
      {celebratingSticker && (
        <div className="fixed inset-0 bg-indigo-950/98 backdrop-blur-3xl z-[5000] flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
          <div className="relative mb-12 flex flex-col items-center">
            <div className={`relative z-10 w-full max-w-[320px] aspect-[3/4] bg-white rounded-[3rem] p-6 border-[12px] border-indigo-950 animate-reveal-pop ${getRarityStyle(celebratingSticker.data.rarity).glow}`}>
              <div className={`w-full h-full flex flex-col border-4 rounded-[2rem] overflow-hidden ${getRarityStyle(celebratingSticker.data.rarity).frame}`}>
                <div className="flex-1 bg-slate-50 flex items-center justify-center p-0">
                  <img src={celebratingSticker.data.imageUrl} className="w-full h-full object-cover" />
                </div>
                <div className="p-4 bg-white text-center border-t-4 border-slate-50">
                  <p className="text-xl font-black text-indigo-950 uppercase italic tracking-tighter mb-2">{celebratingSticker.data.name}</p>
                  <span className={`px-6 py-2 rounded-full text-white font-black text-[10px] uppercase tracking-widest ${getRarityStyle(celebratingSticker.data.rarity).badge}`}>
                    {celebratingSticker.week >= 42 ? 'PEÇA DO ELO SUPREMO' : getRarityStyle(celebratingSticker.data.rarity).name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setRevealedAndPersist(celebratingSticker.week);
              setCelebratingSticker(null);
            }}
            className="px-12 py-6 bg-yellow-400 text-indigo-950 font-black rounded-[2.5rem] shadow-2xl border-[6px] border-indigo-950 text-2xl uppercase italic tracking-tighter active:scale-95 transition-all"
          >
            Colar no Álbum
          </button>
        </div>
      )}

      {/* avatar picker (salvando de verdade) */}
      {isAvatarPickerOpen && (
        <AvatarPickerModal
          onClose={() => setIsAvatarPickerOpen(false)}
          onSelect={(updates) => {
            persistMyAvatar(updates);
            setIsAvatarPickerOpen(false);
          }}
        />
      )}

      {/* modal detalhe */}
      {selectedSticker && !celebratingSticker && (
        <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-xl z-[2000] flex items-center justify-center p-6" onClick={() => setSelectedSticker(null)}>
          <div className="bg-white rounded-[4rem] w-full max-w-sm p-10 shadow-2xl relative border-[8px] border-indigo-950 animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedSticker(null)} className="absolute -top-6 -right-6 p-4 bg-red-500 rounded-2xl text-white border-4 border-indigo-950 shadow-xl">
              <X size={24} strokeWidth={4} />
            </button>

            {selectedSticker.studentData?.revelada ? (
              <div className="text-center space-y-4">
                <div className={`mx-auto w-full aspect-[3/4] rounded-[2rem] overflow-hidden border-8 ${getRarityStyle(selectedSticker.data?.rarity).frame} bg-white p-0`}>
                  <img src={selectedSticker.data?.imageUrl} className="w-full h-full object-cover" />
                </div>
                <h3 className="text-3xl font-black text-indigo-950 uppercase italic tracking-tighter leading-none">{selectedSticker.data?.name}</h3>
              </div>
            ) : (
              <div className="p-4 text-center">
                <h3 className="text-3xl font-black text-red-500 uppercase italic tracking-tighter mb-6">BLOQUEADA!</h3>
                <p className="text-[13px] font-black text-indigo-950 uppercase leading-relaxed mb-8 px-2">
                  {selectedSticker.week >= 42
                    ? "Esta é uma peça do ELO SUPREMO. Você só ganha se sua família for na reunião de pais!"
                    : "Você perdeu a figurinha. Tire uma nota 10 em qualquer matéria ou conquiste 4 figurinhas seguidas para reconquistar 1 figurinha perdida"}
                </p>
                <Lock size={64} className="mx-auto text-indigo-100 mb-2" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
