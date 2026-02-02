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

  const fireEpicConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 40, spread: 360, ticks: 110, zIndex: 10000 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 70 * (timeLeft / duration);

      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 220);
  };

  const playUnlockSound = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      master.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.12);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(660, now);
      osc2.frequency.exponentialRampToValueAtTime(990, now + 0.12);

      osc1.connect(master);
      osc2.connect(master);
      osc1.start(now);
      osc2.start(now);

      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);

      setTimeout(() => {
        try { ctx.close(); } catch {}
      }, 700);
    } catch {
      // sem som se o browser bloquear
    }
  };

  const setRevealedAndPersist = useCallback(
    (week: number) => {
      const existing = data.studentStickers.find(s => s.alunoId === user.id && s.week === week);

      const next = existing
        ? data.studentStickers.map(s =>
            s.alunoId === user.id && s.week === week ? { ...s, liberada: true, revelada: true, isFalta: false } : s
          )
        : [...data.studentStickers, { alunoId: user.id, week, liberada: true, revelada: true, reconquistada: false, isFalta: false }];

      updateData({ studentStickers: next });
    },
    [data.studentStickers, updateData, user.id]
  );

  // ---------- Scratch modal (raspadinha real) ----------
  const ScratchModal: React.FC<{
    week: number;
    sticker?: StickerType;
    onClose: () => void;
    onDone: () => void;
  }> = ({ week, sticker, onClose, onDone }) => {
    const coverCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const crumbsCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const wrapRef = useRef<HTMLDivElement | null>(null);

    const isDownRef = useRef(false);
    const doneRef = useRef(false);
    const lastCheckRef = useRef(0);
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);

    const rafRef = useRef<number | null>(null);
    const crumbsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; size: number; rot: number; vr: number }>>([]);

    const getDpr = () => Math.max(1, Math.min(3, window.devicePixelRatio || 1));

    const resizeAndRedraw = useCallback(() => {
      const wrap = wrapRef.current;
      const cover = coverCanvasRef.current;
      const crumbs = crumbsCanvasRef.current;
      if (!wrap || !cover || !crumbs) return;

      const rect = wrap.getBoundingClientRect();
      const dpr = getDpr();

      // Cover
      cover.width = Math.floor(rect.width * dpr);
      cover.height = Math.floor(rect.height * dpr);
      cover.style.width = `${rect.width}px`;
      cover.style.height = `${rect.height}px`;

      // Crumbs
      crumbs.width = Math.floor(rect.width * dpr);
      crumbs.height = Math.floor(rect.height * dpr);
      crumbs.style.width = `${rect.width}px`;
      crumbs.style.height = `${rect.height}px`;

      const ctx = cover.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // textura “raspadinha”
      const w = rect.width;
      const h = rect.height;

      // base metálica
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#c7ccd3');
      g.addColorStop(0.35, '#aab1bb');
      g.addColorStop(0.65, '#c8cfd8');
      g.addColorStop(1, '#9aa3ad');
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // linhas diagonais bem leves (efeito foil)
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-0.22);
      ctx.translate(-w / 2, -h / 2);
      for (let y = -h; y < h * 2; y += 10) {
        ctx.fillStyle = y % 20 === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.10)';
        ctx.fillRect(-w, y, w * 3, 2);
      }
      ctx.restore();

      // “grão”/pontos
      const dots = Math.floor((w * h) / 420);
      for (let i = 0; i < dots; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * 1.5;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // brilho central (faixa)
      const shine = ctx.createRadialGradient(w * 0.35, h * 0.25, 10, w * 0.5, h * 0.5, Math.max(w, h) * 0.9);
      shine.addColorStop(0, 'rgba(255,255,255,0.18)');
      shine.addColorStop(0.35, 'rgba(255,255,255,0.06)');
      shine.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shine;
      ctx.fillRect(0, 0, w, h);

      // texto proporcional ao card
      const fontSize = Math.max(18, Math.min(w, h) * 0.095);
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${fontSize}px Fredoka, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-0.10);
      ctx.fillText('RASPE AQUI', 0, 0);
      ctx.restore();

      doneRef.current = false;
      lastPosRef.current = null;
      crumbsRef.current = [];
      const cctx = crumbs.getContext('2d');
      if (cctx) {
        cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cctx.clearRect(0, 0, w, h);
      }
    }, []);

    useEffect(() => {
      resizeAndRedraw();
      const onResize = () => resizeAndRedraw();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, [resizeAndRedraw]);

    const addCrumbs = (x: number, y: number) => {
      // poucas partículas por evento pra não pesar
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 0.6 + Math.random() * 1.6;
        crumbsRef.current.push({
          x: x + (Math.random() * 14 - 7),
          y: y + (Math.random() * 14 - 7),
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 0.8,
          life: 1,
          size: 1 + Math.random() * 2.4,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.25
        });
      }
    };

    const tickCrumbs = () => {
      const wrap = wrapRef.current;
      const crumbs = crumbsCanvasRef.current;
      if (!wrap || !crumbs) return;

      const rect = wrap.getBoundingClientRect();
      const cctx = crumbs.getContext('2d');
      if (!cctx) return;

      // já está em CSS pixels por causa do setTransform no resize
      cctx.clearRect(0, 0, rect.width, rect.height);

      const arr = crumbsRef.current;
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i];
        p.vy += 0.06; // gravidade leve
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.02;

        if (p.life <= 0) {
          arr.splice(i, 1);
          continue;
        }

        cctx.save();
        cctx.globalAlpha = Math.max(0, p.life) * 0.9;
        cctx.translate(p.x, p.y);
        cctx.rotate(p.rot);
        cctx.fillStyle = 'rgba(190, 190, 190, 0.95)';
        cctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        cctx.restore();
      }

      if (arr.length > 0) {
        rafRef.current = requestAnimationFrame(tickCrumbs);
      } else {
        rafRef.current = null;
      }
    };

    const ensureCrumbsLoop = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(tickCrumbs);
    };

    const eraseStroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const cover = coverCanvasRef.current;
      const wrap = wrapRef.current;
      if (!cover || !wrap) return;

      const rect = wrap.getBoundingClientRect();
      const ctx = cover.getContext('2d');
      if (!ctx) return;

      // cover ctx está em CSS px (setTransform no resize)
      const brush = Math.max(26, Math.min(rect.width, rect.height) * 0.055);

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = brush * 2;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      // garante “limpeza” do final do traço
      ctx.beginPath();
      ctx.arc(to.x, to.y, brush, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      addCrumbs(to.x, to.y);
      ensureCrumbsLoop();
    };

    const scratchedEnough = () => {
      const cover = coverCanvasRef.current;
      if (!cover) return false;

      // checagem leve: downscale e mede alpha (quanto foi apagado)
      const w = 140;
      const h = 190;
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const octx = off.getContext('2d');
      if (!octx) return false;

      octx.drawImage(cover, 0, 0, w, h);
      const img = octx.getImageData(0, 0, w, h).data;

      let cleared = 0;
      const total = w * h;
      for (let i = 3; i < img.length; i += 4) {
        if (img[i] < 40) cleared++; // alpha bem baixo = raspado
      }
      const percent = cleared / total;
      return percent >= 0.9; // ~90% raspado pra liberar
    };

    const getLocalXY = (clientX: number, clientY: number) => {
      const wrap = wrapRef.current;
      if (!wrap) return { x: 0, y: 0 };
      const rect = wrap.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const handleDown = (e: React.PointerEvent) => {
      if (doneRef.current) return;
      isDownRef.current = true;
      (e.target as any).setPointerCapture?.(e.pointerId);

      const p = getLocalXY(e.clientX, e.clientY);
      lastPosRef.current = p;
      eraseStroke(p, p);
    };

    const handleMove = (e: React.PointerEvent) => {
      if (!isDownRef.current || doneRef.current) return;

      const p = getLocalXY(e.clientX, e.clientY);
      const last = lastPosRef.current || p;
      lastPosRef.current = p;
      eraseStroke(last, p);

      const now = Date.now();
      if (now - lastCheckRef.current > 220) {
        lastCheckRef.current = now;
        if (scratchedEnough()) {
          doneRef.current = true;

          // limpa a camada inteira (fica 100% revelado)
          const wrap = wrapRef.current;
          const cover = coverCanvasRef.current;
          if (wrap && cover) {
            const rect = wrap.getBoundingClientRect();
            const ctx = cover.getContext('2d');
            if (ctx) {
              ctx.save();
              ctx.globalCompositeOperation = 'destination-out';
              ctx.fillRect(0, 0, rect.width, rect.height);
              ctx.restore();
            }
          }

          playUnlockSound();
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
        <div className="bg-white rounded-[4rem] w-full max-w-md border-[12px] border-indigo-950 shadow-2xl overflow-hidden relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-3 bg-red-500 rounded-2xl text-white border-4 border-indigo-950 shadow-xl z-10"
          >
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
            <div ref={wrapRef} className="relative w-full aspect-[3/4] rounded-[2.5rem] overflow-hidden border-[10px] border-indigo-950 bg-white">
              {/* abaixo: figurinha (o que aparece depois de raspar) */}
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
                ref={coverCanvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ touchAction: 'none' }}
                onPointerDown={handleDown}
                onPointerMove={handleMove}
                onPointerUp={handleUp}
                onPointerCancel={handleUp}
                onPointerLeave={handleUp}
              />

              {/* migalhinhas (por cima do cover) */}
              <canvas ref={crumbsCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
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
          <div
            className={`w-full h-full overflow-hidden flex flex-col relative ${
              isAllComboDone ? 'rounded-none' : (puzzleClasses || 'rounded-[1.5rem]') + ' bg-white border-2 ' + style.frame
            }`}
          >
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
          <div
            className={`w-full h-full ${isCombo ? 'bg-indigo-500' : 'bg-slate-400'} flex flex-col items-center justify-center p-2 relative overflow-hidden shadow-inner ${
              puzzleClasses || 'rounded-[1.5rem]'
            }`}
          >
            <div className="absolute inset-0 opacity-40 bg-slate-500/20"></div>
            <div className="relative z-10 flex flex-col items-center gap-1">
              <div className="bg-yellow-400 p-1.5 rounded-lg border-2 border-indigo-950 shadow-md rotate-3">
                <Sparkles size={16} className="text-indigo-950" />
              </div>
              <h4 className="text-[12px] font-black text-white uppercase italic leading-none tracking-tighter -rotate-6 text-center drop-shadow-md">
                RASPE!
              </h4>
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
            <div
              className="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full transition-all duration-1000 shadow-inner"
              style={{ width: `${stats.percent}%` }}
            />
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
            const wk = scratchingSticker.week;
            const dt = scratchingSticker.data;
            setScratchingSticker(null);

            if (dt) {
              setCelebratingSticker({ week: wk, data: dt });
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

      {/* avatar picker */}
      {isAvatarPickerOpen && (
        <AvatarPickerModal
          onClose={() => setIsAvatarPickerOpen(false)}
          onSelect={(updates) => {
            onUpdateProfile?.(updates);
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
