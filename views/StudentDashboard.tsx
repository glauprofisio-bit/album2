// ---------- Scratch modal (CANVAS REAL, SEM BLUR) ----------
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
    const dprRef = useRef<number>(1);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    // 🔥 Ajuste DEFINITIVO:
    // dimensiona o canvas pelo TAMANHO REAL dele (canvas.getBoundingClientRect),
    // não pelo wrap (que tem borda e pode dar mismatch).
    const resizeCanvasToDpr = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // tamanho real na tela (CSS pixels)
      const rect = canvas.getBoundingClientRect();

      const dpr = Math.max(1, window.devicePixelRatio || 1);
      dprRef.current = dpr;

      const cssW = Math.max(1, rect.width);
      const cssH = Math.max(1, rect.height);

      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // desenhar em coordenadas CSS, com canvas em DPR
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      return { cssW, cssH, ctx };
    }, []);

    const drawTexture = useCallback(() => {
      const res = resizeCanvasToDpr();
      if (!res) return;

      const { cssW, cssH, ctx } = res;

      // base totalmente opaca (não vaza fundo)
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = '#9CA3AF';
      ctx.fillRect(0, 0, cssW, cssH);

      // textura/grão (escala com área)
      const dots = Math.floor(Math.min(5200, Math.max(1800, (cssW * cssH) / 35)));
      for (let i = 0; i < dots; i++) {
        const x = Math.random() * cssW;
        const y = Math.random() * cssH;
        const r = Math.random() * 1.9;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.085)' : 'rgba(0,0,0,0.075)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // brilho leve
      const grd = ctx.createLinearGradient(0, 0, cssW, cssH);
      grd.addColorStop(0, 'rgba(255,255,255,0.12)');
      grd.addColorStop(0.5, 'rgba(255,255,255,0.00)');
      grd.addColorStop(1, 'rgba(0,0,0,0.10)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, cssW, cssH);

      // texto central responsivo
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      const fontSize = Math.max(18, Math.floor(cssW * 0.12));
      ctx.font = `900 ${fontSize}px Fredoka, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.translate(cssW / 2, cssH / 2);
      ctx.rotate(-0.12);
      ctx.fillText('RASPE AQUI', 0, 0);
      ctx.restore();
    }, [resizeCanvasToDpr]);

    useEffect(() => {
      // pequeno delay garante layout pronto (evita medir 0px em alguns notebooks)
      const t = setTimeout(() => drawTexture(), 0);

      const onResize = () => drawTexture();
      window.addEventListener('resize', onResize);

      return () => {
        clearTimeout(t);
        window.removeEventListener('resize', onResize);
      };
    }, [drawTexture]);

    // ✅ brush baseado no tamanho VISUAL real do canvas
    const getBrushRadius = () => {
      const canvas = canvasRef.current;
      if (!canvas) return 28;

      const rect = canvas.getBoundingClientRect();
      const base = Math.min(rect.width, rect.height);

      // ajuste fino: antes estava ficando grande demais em telas maiores
      return Math.max(18, Math.min(36, Math.floor(base * 0.06)));
    };

    // ✅ pega ponto com escala correta (corrige offset em zoom/escala)
    const getPoint = (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();

      // tamanho do desenho em "CSS coords"
      const dpr = dprRef.current || 1;
      const cssW = canvas.width / dpr;
      const cssH = canvas.height / dpr;

      const x = (e.clientX - rect.left) * (cssW / rect.width);
      const y = (e.clientY - rect.top) * (cssH / rect.height);

      return { x, y };
    };

    const eraseLine = (x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = dprRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const r = getBrushRadius();
      ctx.lineWidth = r * 2;

      const last = lastPointRef.current;
      ctx.beginPath();
      if (last) ctx.moveTo(last.x, last.y);
      else ctx.moveTo(x, y);

      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();

      lastPointRef.current = { x, y };
    };

    const scratchedEnough = () => {
      const canvas = canvasRef.current;
      if (!canvas) return false;

      const w = 140;
      const h = 190;
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
        if (img[i] < 80) cleared++;
      }

      return cleared / total >= 0.55;
    };

    const handleDown = (e: React.PointerEvent) => {
      if (doneRef.current) return;

      isDownRef.current = true;
      lastPointRef.current = null;

      (e.currentTarget as any).setPointerCapture?.(e.pointerId);

      const pt = getPoint(e);
      if (!pt) return;

      eraseLine(pt.x, pt.y);
    };

    const handleMove = (e: React.PointerEvent) => {
      if (!isDownRef.current || doneRef.current) return;

      const pt = getPoint(e);
      if (!pt) return;

      eraseLine(pt.x, pt.y);

      const now = Date.now();
      if (now - lastCheckRef.current > 220) {
        lastCheckRef.current = now;
        if (scratchedEnough()) {
          doneRef.current = true;
          onDone();
        }
      }
    };

    const handleUp = () => {
      isDownRef.current = false;
      lastPointRef.current = null;
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
            <div
              ref={wrapRef}
              className="relative w-full aspect-[3/4] rounded-[2.5rem] overflow-hidden border-[10px] border-indigo-950 bg-white"
            >
              {/* abaixo: figurinha */}
              <div className="absolute inset-0">
                <div className={`w-full h-full flex flex-col border-4 ${getRarityStyle(sticker?.rarity).frame} rounded-[2rem] overflow-hidden`}>
                  <div className="flex-1 bg-slate-50 flex items-center justify-center">
                    {sticker?.imageUrl ? (
                      <img src={sticker.imageUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-sm uppercase">
                        Sem imagem
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-white text-center border-t-4 border-slate-50">
                    <p className="text-lg font-black text-indigo-950 uppercase italic tracking-tighter">
                      {sticker?.name || `Semana ${week}`}
                    </p>
                    <span className={`inline-block mt-2 px-5 py-2 rounded-full text-white font-black text-[9px] uppercase tracking-widest ${getRarityStyle(sticker?.rarity).badge}`}>
                      {getRarityStyle(sticker?.rarity).name}
                    </span>
                  </div>
                </div>
              </div>

              {/* acima: camada raspável */}
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
            </div>

            <p className="text-center mt-4 text-[10px] font-black uppercase tracking-widest text-indigo-300">
              Raspe com o dedo ou o mouse até liberar
            </p>
          </div>
        </div>
      </div>
    );
  };
export default StudentDashboard;
