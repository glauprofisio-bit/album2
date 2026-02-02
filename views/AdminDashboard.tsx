import React, { useMemo, useRef, useState, useEffect } from 'react';
import { AppData, User, UserRole, Sticker, StickerRarity } from '../types';
import {
  Users,
  LayoutGrid,
  Plus,
  Trash2,
  X,
  Image as ImageIcon,
  Calendar,
  Upload,
  Star,
  Loader2,
  Edit2,
  Cloud
} from 'lucide-react';

interface AdminDashboardProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => Promise<void>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ data, updateData }) => {
  const [activeTab, setActiveTab] = useState<'professors' | 'stickers' | 'config'>('professors');
  const [isAddingProf, setIsAddingProf] = useState(false);

  const [profForm, setProfForm] = useState({ name: '', email: '', login: '', password: '' });

  const [editingProfId, setEditingProfId] = useState<string | null>(null);
  const [editingProfForm, setEditingProfForm] = useState({ name: '', email: '', login: '', password: '' });

  const [isSyncing, setIsSyncing] = useState(false);

  // garante 45 semanas sempre no painel
  const stickersForGrid = useMemo(() => {
    const map = new Map<number, Sticker>();
    (data.stickers || []).forEach(s => map.set(s.week, s));

    return Array.from({ length: 45 }, (_, i) => {
      const week = i + 1;
      const existing = map.get(week);
      return (
        existing || {
          id: `sticker-${week}`,
          week,
          name: week >= 42 ? `Elo Supremo - Parte ${week - 40}` : `Semana ${week}`,
          imageUrl: '',
          rarity: StickerRarity.NORMAL
        }
      );
    });
  }, [data.stickers]);

  const handleAddProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);

    const newProf: User = {
      id: Math.random().toString(36).substr(2, 9),
      ...profForm,
      role: UserRole.PROFESSOR
    };

    await updateData({ professors: [...data.professors, newProf] });

    setProfForm({ name: '', email: '', login: '', password: '' });
    setIsAddingProf(false);
    setIsSyncing(false);
  };

  const handleEditProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfId) return;

    setIsSyncing(true);
    const updatedProfs = data.professors.map(p => (p.id === editingProfId ? { ...p, ...editingProfForm } : p));
    await updateData({ professors: updatedProfs });
    setEditingProfId(null);
    setIsSyncing(false);
  };

  const handleDeleteProfessor = async (p: User) => {
    if (!confirm(`Deseja realmente excluir o professor ${p.name}?`)) return;

    setIsSyncing(true);
    const newProfs = data.professors.filter(x => x.id !== p.id);
    await updateData({ professors: newProfs });
    setIsSyncing(false);
  };

  const handleUpdateSticker = async (week: number, imageUrl: string, name: string, rarity: StickerRarity) => {
    setIsSyncing(true);

    const newStickers = [...stickersForGrid];
    const idx = newStickers.findIndex(s => s.week === week);

    const next: Sticker = {
      id: `sticker-${week}`,
      week,
      name: name || (week >= 42 ? `Elo Supremo - Parte ${week - 40}` : `Semana ${week}`),
      imageUrl: imageUrl || '',
      rarity: rarity || StickerRarity.NORMAL
    };

    if (idx >= 0) newStickers[idx] = next;
    else newStickers.push(next);

    await updateData({ stickers: newStickers });
    setIsSyncing(false);
  };

  const StickerEditor: React.FC<{
    week: number;
    sticker: Sticker;
    onSave: (w: number, u: string, n: string, r: StickerRarity) => Promise<void>;
  }> = ({ week, sticker, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [url, setUrl] = useState(sticker.imageUrl || '');
    const [name, setName] = useState(sticker.name || (week >= 42 ? `Elo Supremo - Parte ${week - 40}` : `Semana ${week}`));
    const [rarity, setRarity] = useState((sticker.rarity as StickerRarity) || StickerRarity.NORMAL);
    const [isCompressing, setIsCompressing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // quando abrir o modal, puxa o que está salvo (evita “não troca”)
    useEffect(() => {
      if (!isEditing) return;
      setUrl(sticker.imageUrl || '');
      setName(sticker.name || (week >= 42 ? `Elo Supremo - Parte ${week - 40}` : `Semana ${week}`));
      setRarity((sticker.rarity as StickerRarity) || StickerRarity.NORMAL);
    }, [isEditing, sticker.imageUrl, sticker.name, sticker.rarity, week]);

    const getRarityInfo = (r: StickerRarity) => {
      switch (r) {
        case StickerRarity.RUBY: return { color: 'text-red-500', bg: 'bg-red-500', label: 'Rubi' };
        case StickerRarity.EMERALD: return { color: 'text-emerald-500', bg: 'bg-emerald-500', label: 'Esmeralda' };
        case StickerRarity.OBSIDIAN: return { color: 'text-slate-950', bg: 'bg-indigo-950', label: 'Obsidiana' };
        case StickerRarity.GOLD: return { color: 'text-yellow-500', bg: 'bg-amber-500', label: 'Ouro' };
        case StickerRarity.DIAMOND: return { color: 'text-cyan-500', bg: 'bg-cyan-500', label: 'Diamante' };
        default: return { color: 'text-indigo-400', bg: 'bg-indigo-600', label: 'Padrão' };
      }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsCompressing(true);

      const reader = new FileReader();
      reader.onloadend = () => {
        setUrl(reader.result as string);
        setIsCompressing(false);
      };
      reader.readAsDataURL(file);
    };

    const currentInfo = getRarityInfo(rarity);

    return (
      <>
        <div
          onClick={() => setIsEditing(true)}
          className="bg-white p-4 rounded-[2.5rem] shadow-xl cursor-pointer hover:scale-105 transition-all text-indigo-950 border-[6px] border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,1)] active:translate-y-1 active:shadow-none"
        >
          <div className="aspect-[3/4] w-full rounded-[2rem] overflow-hidden border-4 border-indigo-950 bg-slate-50 flex items-center justify-center mb-3">
            {sticker.imageUrl ? (
              <img src={sticker.imageUrl} className="w-full h-full object-cover" />
            ) : (
              <div className="text-slate-300 font-black uppercase text-[10px] flex items-center gap-2">
                <ImageIcon size={16} /> Sem imagem
              </div>
            )}
          </div>

          <p className="font-black uppercase italic tracking-tighter text-lg truncate">{sticker.name}</p>
          <div className={`h-2 w-full rounded-full ${currentInfo.bg} border-2 border-indigo-950 shadow-inner mt-2`} />
        </div>

        {isEditing && (
          <div
            className="fixed inset-0 bg-indigo-950/95 backdrop-blur-xl z-[2000] flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setIsEditing(false)}
          >
            <div
              className="bg-white p-10 rounded-[4rem] w-full max-w-[520px] shadow-2xl relative border-[12px] border-indigo-950 my-auto animate-in zoom-in duration-300"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setIsEditing(false)}
                className="absolute -top-6 -right-6 p-4 bg-red-500 rounded-2xl text-white border-4 border-indigo-950 shadow-xl"
              >
                <X size={24} strokeWidth={4} />
              </button>

              <h3 className="text-4xl font-black text-indigo-950 mb-8 italic uppercase tracking-tighter">
                Editar Semana {week}
              </h3>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-indigo-300 ml-4 tracking-widest">Nome</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-5 bg-slate-50 rounded-3xl border-4 border-indigo-950 outline-none font-black text-indigo-950"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center ml-4">
                    <label className="text-[10px] font-black uppercase text-indigo-300 tracking-widest">Raridade</label>
                    <span className={`text-[10px] font-black px-4 py-2 rounded-full text-white uppercase tracking-widest ${currentInfo.bg} border-2 border-indigo-950`}>
                      {currentInfo.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 p-4 bg-indigo-50 rounded-[2.5rem] border-4 border-indigo-950">
                    {[
                      StickerRarity.NORMAL,
                      StickerRarity.RUBY,
                      StickerRarity.EMERALD,
                      StickerRarity.OBSIDIAN,
                      StickerRarity.GOLD,
                      StickerRarity.DIAMOND
                    ].map(r => {
                      const info = getRarityInfo(r);
                      return (
                        <button
                          key={r}
                          onClick={() => setRarity(r)}
                          className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-4 ${
                            rarity === r ? `bg-white border-indigo-950 shadow-md scale-105` : 'bg-transparent border-transparent opacity-40'
                          }`}
                        >
                          <div className={`p-2 rounded-xl ${info.bg} text-white shadow-sm border-2 border-indigo-950`}>
                            {r === StickerRarity.NORMAL ? <ImageIcon size={18} /> : <Star size={18} />}
                          </div>
                          <span className={`text-[8px] font-black uppercase tracking-tighter ${info.color}`}>{info.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-10 border-4 border-dashed border-indigo-200 rounded-[2.5rem] flex flex-col items-center gap-2 text-indigo-400 font-black hover:bg-indigo-50 transition-all hover:border-indigo-400"
                  >
                    {isCompressing ? <Loader2 className="animate-spin" /> : <Upload size={40} />}
                    <span className="text-[10px] uppercase tracking-[0.3em]">Importar ou Trocar Imagem</span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                </div>

                <div className="aspect-video w-full rounded-[2rem] overflow-hidden border-4 border-indigo-950 bg-indigo-50 flex items-center justify-center shadow-inner">
                  {url ? (
                    <img src={url} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="text-slate-300 font-black uppercase text-[10px] flex items-center gap-2">
                      <ImageIcon size={16} /> Sem imagem
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[11px] tracking-widest border-2 border-slate-200"
                  >
                    Voltar
                  </button>

                  {/* REMOVER FIGURINHA (zera e salva) */}
                  <button
                    disabled={isSaving}
                    onClick={async () => {
                      if (!confirm(`Remover a figurinha da Semana ${week}?`)) return;

                      setIsSaving(true);
                      const defaultName = week >= 42 ? `Elo Supremo - Parte ${week - 40}` : `Semana ${week}`;

                      // manda imageUrl vazio -> backend DELETA no Supabase
                      await onSave(week, '', defaultName, StickerRarity.NORMAL);

                      setIsSaving(false);
                      setIsEditing(false);
                    }}
                    className="flex-1 py-5 bg-red-500 text-white font-black rounded-2xl shadow-xl uppercase text-[11px] tracking-widest border-4 border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,1)] disabled:opacity-50"
                  >
                    Remover
                  </button>

                  {/* SALVAR (trocar/substituir) */}
                  <button
                    disabled={isSaving}
                    onClick={async () => {
                      setIsSaving(true);
                      await onSave(week, url, name, rarity);
                      setIsSaving(false);
                      setIsEditing(false);
                    }}
                    className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase text-[11px] tracking-widest border-4 border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,1)] disabled:opacity-50"
                  >
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* indicador */}
      <div className="flex items-center justify-center gap-2 text-white/80 font-black uppercase tracking-widest text-[10px]">
        <Cloud size={14} />
        {isSyncing ? 'Salvando na nuvem...' : 'Sincronizado'}
      </div>

      {/* tabs */}
      <div className="flex bg-indigo-950 p-2 rounded-[2rem] gap-2 border-4 border-white/20 shadow-xl">
        <button
          onClick={() => setActiveTab('professors')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.5rem] transition-all font-black text-xs uppercase tracking-widest ${
            activeTab === 'professors' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-300 hover:bg-white/5'
          }`}
        >
          <Users size={18} />
          <span>Professores</span>
        </button>

        <button
          onClick={() => setActiveTab('stickers')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.5rem] transition-all font-black text-xs uppercase tracking-widest ${
            activeTab === 'stickers' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-300 hover:bg-white/5'
          }`}
        >
          <LayoutGrid size={18} />
          <span>Figurinhas</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.5rem] transition-all font-black text-xs uppercase tracking-widest ${
            activeTab === 'config' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-300 hover:bg-white/5'
          }`}
        >
          <Calendar size={18} />
          <span>Semana</span>
        </button>
      </div>

      {/* professors */}
      {activeTab === 'professors' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={() => setIsAddingProf(true)}
            disabled={isSyncing}
            className="w-full py-8 bg-green-500 hover:bg-green-600 text-white rounded-[2.5rem] font-black text-2xl shadow-xl flex items-center justify-center gap-4 uppercase italic transition-all active:scale-95 border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)] disabled:opacity-50"
          >
            <Plus size={32} strokeWidth={4} /> Novo Professor
          </button>

          <div className="grid gap-6 md:grid-cols-2">
            {data.professors.map(p => (
              <div
                key={p.id}
                className="bg-white text-indigo-950 p-8 rounded-[3rem] border-[8px] border-indigo-950 shadow-[0_8px_0_0_rgba(30,27,75,1)] flex flex-col gap-4 group transition-all hover:-translate-y-1"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="font-black text-2xl uppercase italic tracking-tighter">{p.name}</p>
                    <p className="text-[10px] font-black text-indigo-600 mt-3 bg-indigo-50 inline-block px-3 py-2 rounded-full border-2 border-indigo-200 uppercase tracking-widest">
                      Login: <span className="font-bold">{p.login}</span>
                    </p>
                    <p className="text-[10px] font-black text-indigo-600 mt-2 bg-indigo-50 inline-block px-3 py-2 rounded-full border-2 border-indigo-200 uppercase tracking-widest">
                      Senha: <span className="font-bold">{p.password}</span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      disabled={isSyncing}
                      onClick={() => {
                        setEditingProfId(p.id);
                        setEditingProfForm({ name: p.name, email: p.email || '', login: p.login, password: p.password || '' });
                      }}
                      className="bg-blue-100 p-3 rounded-2xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all border-2 border-blue-200 disabled:opacity-50"
                    >
                      <Edit2 size={20} strokeWidth={3} />
                    </button>

                    <button
                      disabled={isSyncing}
                      onClick={() => handleDeleteProfessor(p)}
                      className="bg-red-100 p-3 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all border-2 border-red-200 disabled:opacity-50"
                    >
                      <Trash2 size={20} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {data.professors.length === 0 && (
              <p className="col-span-full text-center text-indigo-300 py-20 font-black uppercase tracking-widest opacity-40">
                Nenhum professor registrado
              </p>
            )}
          </div>
        </div>
      )}

      {/* stickers */}
      {activeTab === 'stickers' && (
        <div className="animate-in fade-in duration-300 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {stickersForGrid.map(sticker => (
            <StickerEditor
              key={sticker.week}
              week={sticker.week}
              sticker={sticker}
              onSave={handleUpdateSticker}
            />
          ))}
        </div>
      )}

      {/* config */}
      {activeTab === 'config' && (
        <div className="animate-in slide-in-from-bottom-4 duration-300 bg-white rounded-[4rem] p-16 border-[8px] border-indigo-950 shadow-[0_12px_0_0_rgba(30,27,75,1)] text-center space-y-10">
          <h2 className="text-4xl font-black italic uppercase text-indigo-950 tracking-tighter">Calendário Letivo</h2>

          <div className="flex items-center justify-center gap-10">
            <button
              disabled={isSyncing}
              onClick={() => updateData({ currentWeek: Math.max(1, data.currentWeek - 1) })}
              className="w-20 h-20 bg-indigo-100 hover:bg-indigo-600 hover:text-white rounded-[2rem] text-4xl font-black border-4 border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,1)] active:translate-y-1 active:shadow-none transition-all text-indigo-950 disabled:opacity-50"
            >
              -
            </button>

            <div className="text-8xl font-black bg-white text-indigo-950 p-8 rounded-[3rem] border-[10px] border-indigo-950 shadow-[0_12px_0_0_rgba(30,27,75,1)] min-w-[180px]">
              {data.currentWeek}
            </div>

            <button
              disabled={isSyncing}
              onClick={() => updateData({ currentWeek: Math.min(45, data.currentWeek + 1) })}
              className="w-20 h-20 bg-indigo-100 hover:bg-indigo-600 hover:text-white rounded-[2rem] text-4xl font-black border-4 border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,1)] active:translate-y-1 active:shadow-none transition-all text-indigo-950 disabled:opacity-50"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* modal editar professor */}
      {editingProfId && (
        <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-xl z-[1000] flex items-center justify-center p-4" onClick={() => setEditingProfId(null)}>
          <div className="bg-white text-indigo-950 w-full max-w-lg rounded-[4rem] p-12 shadow-2xl relative border-[12px] border-indigo-950 animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <button onClick={() => setEditingProfId(null)} className="absolute -top-6 -right-6 p-4 bg-red-500 rounded-2xl text-white border-4 border-indigo-950 shadow-xl transition-all">
              <X size={24} strokeWidth={4} />
            </button>

            <h3 className="text-4xl font-black mb-10 text-center italic uppercase tracking-tighter">Editar Professor</h3>

            <form onSubmit={handleEditProfessor} className="space-y-6">
              <input
                required
                placeholder="Nome do Professor"
                value={editingProfForm.name}
                onChange={e => setEditingProfForm({ ...editingProfForm, name: e.target.value })}
                className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none border-4 border-indigo-950 font-black text-indigo-950 text-lg"
              />

              <div className="grid grid-cols-2 gap-6">
                <input
                  required
                  placeholder="Login"
                  value={editingProfForm.login}
                  onChange={e => setEditingProfForm({ ...editingProfForm, login: e.target.value })}
                  className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 outline-none font-black"
                />
                <input
                  required
                  placeholder="Senha"
                  value={editingProfForm.password}
                  onChange={e => setEditingProfForm({ ...editingProfForm, password: e.target.value })}
                  className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 outline-none font-black"
                />
              </div>

              <button
                type="submit"
                disabled={isSyncing}
                className="w-full py-7 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-xl mt-4 uppercase italic text-xl tracking-widest border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)] active:scale-95 disabled:opacity-50"
              >
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal novo professor */}
      {isAddingProf && (
        <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-xl z-[1000] flex items-center justify-center p-4" onClick={() => setIsAddingProf(false)}>
          <div className="bg-white text-indigo-950 w-full max-w-lg rounded-[4rem] p-12 shadow-2xl relative border-[12px] border-indigo-950 animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsAddingProf(false)} className="absolute -top-6 -right-6 p-4 bg-red-500 rounded-2xl text-white border-4 border-indigo-950 shadow-xl transition-all">
              <X size={24} strokeWidth={4} />
            </button>

            <h3 className="text-4xl font-black mb-10 text-center italic uppercase tracking-tighter">Novo Professor</h3>

            <form onSubmit={handleAddProfessor} className="space-y-6">
              <input
                required
                placeholder="Nome do Professor"
                value={profForm.name}
                onChange={e => setProfForm({ ...profForm, name: e.target.value })}
                className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none border-4 border-indigo-950 font-black text-indigo-950 text-lg"
              />

              <div className="grid grid-cols-2 gap-6">
                <input
                  required
                  placeholder="Login"
                  value={profForm.login}
                  onChange={e => setProfForm({ ...profForm, login: e.target.value })}
                  className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 outline-none font-black"
                />
                <input
                  required
                  placeholder="Senha"
                  value={profForm.password}
                  onChange={e => setProfForm({ ...profForm, password: e.target.value })}
                  className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 outline-none font-black"
                />
              </div>

              <button
                type="submit"
                disabled={isSyncing}
                className="w-full py-7 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-xl mt-4 uppercase italic text-xl tracking-widest border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)] active:scale-95 disabled:opacity-50"
              >
                Salvar Acesso
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;                      <p className="text-[10px] font-black text-indigo-600 mt-3 bg-indigo-50 inline-block px-3 py-2 rounded-full border-2 border-indigo-200 uppercase tracking-widest">Login: <span className="font-bold">{p.login}</span></p>
                      <p className="text-[10px] font-black text-indigo-600 mt-2 bg-indigo-50 inline-block px-3 py-2 rounded-full border-2 border-indigo-200 uppercase tracking-widest">Senha: <span className="font-bold">{p.password}</span></p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button 
                        disabled={isSyncing}
                        onClick={() => { 
                          setEditingProfId(p.id); 
                          setEditingProfForm({ name: p.name, email: p.email || '', login: p.login, password: p.password }); 
                        }} 
                        className="bg-blue-100 p-3 rounded-2xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all border-2 border-blue-200 disabled:opacity-50"
                      >
                        <Edit2 size={20} strokeWidth={3} />
                      </button>
                      <button 
                        disabled={isSyncing}
                        onClick={() => handleDeleteProfessor(p)} 
                        className="bg-red-100 p-3 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all border-2 border-red-200 disabled:opacity-50"
                      >
                        <Trash2 size={20} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {data.professors.length === 0 && <p className="col-span-full text-center text-indigo-300 py-20 font-black uppercase tracking-widest opacity-40">Nenhum professor registrado</p>}
           </div>
        </div>
      )}

      {activeTab === 'stickers' && (
        <div className="animate-in fade-in duration-300 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {data.stickers.sort((a,b) => a.week - b.week).map(sticker => (
            <StickerEditor key={sticker.week} week={sticker.week} sticker={sticker} onSave={handleUpdateSticker} />
          ))}
        </div>
      )}

      {activeTab === 'config' && (
        <div className="animate-in slide-in-from-bottom-4 duration-300 bg-white rounded-[4rem] p-16 border-[8px] border-indigo-950 shadow-[0_12px_0_0_rgba(30,27,75,1)] text-center space-y-10">
           <h2 className="text-4xl font-black italic uppercase text-indigo-950 tracking-tighter">Calendário Letivo</h2>
           <div className="flex items-center justify-center gap-10">
              <button 
                disabled={isSyncing}
                onClick={() => updateData({ currentWeek: Math.max(1, data.currentWeek - 1) })} 
                className="w-20 h-20 bg-indigo-100 hover:bg-indigo-600 hover:text-white rounded-[2rem] text-4xl font-black border-4 border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,1)] active:translate-y-1 active:shadow-none transition-all text-indigo-950 disabled:opacity-50"
              >-</button>
              <div className="text-8xl font-black bg-white text-indigo-950 p-8 rounded-[3rem] border-[10px] border-indigo-950 shadow-[0_12px_0_0_rgba(30,27,75,1)] min-w-[180px]">
                {data.currentWeek}
              </div>
              <button 
                disabled={isSyncing}
                onClick={() => updateData({ currentWeek: Math.min(45, data.currentWeek + 1) })} 
                className="w-20 h-20 bg-indigo-100 hover:bg-indigo-600 hover:text-white rounded-[2rem] text-4xl font-black border-4 border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,1)] active:translate-y-1 active:shadow-none transition-all text-indigo-950 disabled:opacity-50"
              >+</button>
           </div>
        </div>
      )}

      {editingProfId && (
        <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-xl z-[1000] flex items-center justify-center p-4" onClick={() => setEditingProfId(null)}>
           <div className="bg-white text-indigo-950 w-full max-w-lg rounded-[4rem] p-12 shadow-2xl relative border-[12px] border-indigo-950 animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
              <button onClick={() => setEditingProfId(null)} className="absolute -top-6 -right-6 p-4 bg-red-500 rounded-2xl text-white border-4 border-indigo-950 shadow-xl transition-all"><X size={24} strokeWidth={4}/></button>
              <h3 className="text-4xl font-black mb-10 text-center italic uppercase tracking-tighter">Editar Professor</h3>
              <form onSubmit={handleEditProfessor} className="space-y-6">
                <input required placeholder="Nome do Professor" value={editingProfForm.name} onChange={e => setEditingProfForm({...editingProfForm, name: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none border-4 border-indigo-950 font-black text-indigo-950 text-lg" />
                <div className="grid grid-cols-2 gap-6">
                  <input required placeholder="Login" value={editingProfForm.login} onChange={e => setEditingProfForm({...editingProfForm, login: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 outline-none font-black" />
                  <input required placeholder="Senha" value={editingProfForm.password} onChange={e => setEditingProfForm({...editingProfForm, password: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 outline-none font-black" />
                </div>
                <button type="submit" disabled={isSyncing} className="w-full py-7 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-xl mt-4 uppercase italic text-xl tracking-widest border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)] active:scale-95 disabled:opacity-50">Salvar Alterações</button>
              </form>
           </div>
        </div>
      )}

      {isAddingProf && (
        <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-xl z-[1000] flex items-center justify-center p-4" onClick={() => setIsAddingProf(false)}>
           <div className="bg-white text-indigo-950 w-full max-w-lg rounded-[4rem] p-12 shadow-2xl relative border-[12px] border-indigo-950 animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
              <button onClick={() => setIsAddingProf(false)} className="absolute -top-6 -right-6 p-4 bg-red-500 rounded-2xl text-white border-4 border-indigo-950 shadow-xl transition-all"><X size={24} strokeWidth={4}/></button>
              <h3 className="text-4xl font-black mb-10 text-center italic uppercase tracking-tighter">Novo Professor</h3>
              <form onSubmit={handleAddProfessor} className="space-y-6">
                <input required placeholder="Nome do Professor" value={profForm.name} onChange={e => setProfForm({...profForm, name: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none border-4 border-indigo-950 font-black text-indigo-950 text-lg" />
                <div className="grid grid-cols-2 gap-6">
                  <input required placeholder="Login" value={profForm.login} onChange={e => setProfForm({...profForm, login: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 outline-none font-black" />
                  <input required placeholder="Senha" value={profForm.password} onChange={e => setProfForm({...profForm, password: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 outline-none font-black" />
                </div>
                <button type="submit" disabled={isSyncing} className="w-full py-7 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-xl mt-4 uppercase italic text-xl tracking-widest border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)] active:scale-95 disabled:opacity-50">Salvar Acesso</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

const StickerEditor: React.FC<{ week: number, sticker?: Sticker, onSave: (w: number, u: string, n: string, r: StickerRarity) => Promise<void> }> = ({ week, sticker, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState(sticker?.imageUrl || '');
  const [name, setName] = useState(sticker?.name || `Semana ${week}`);
  const [rarity, setRarity] = useState<StickerRarity>(sticker?.rarity || StickerRarity.NORMAL);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getRarityInfo = (r: StickerRarity) => {
    switch(r) {
      case StickerRarity.RUBY: return { color: 'text-red-500', bg: 'bg-red-500', label: 'Rubi' };
      case StickerRarity.EMERALD: return { color: 'text-emerald-500', bg: 'bg-emerald-500', label: 'Esmeralda' };
      case StickerRarity.OBSIDIAN: return { color: 'text-slate-950', bg: 'bg-indigo-950', label: 'Obsidiana' };
      case StickerRarity.GOLD: return { color: 'text-yellow-500', bg: 'bg-amber-500', label: 'Ouro' };
      case StickerRarity.DIAMOND: return { color: 'text-cyan-500', bg: 'bg-cyan-500', label: 'Diamante' };
      default: return { color: 'text-indigo-400', bg: 'bg-indigo-600', label: 'Padrão' };
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onloadend = () => { setUrl(reader.result as string); setIsCompressing(false); };
      reader.readAsDataURL(file);
    }
  };

  const currentInfo = getRarityInfo(rarity);

  return (
    <>
      <div onClick={() => setIsEditing(true)} className={`bg-white p-4 rounded-[2.5rem] shadow-xl cursor-pointer hover:scale-105 transition-all text-indigo-950 border-[6px] border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,1)] active:translate-y-1 active:shadow-none`}>
        <div className="aspect-square bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center mb-3 border-2 border-slate-100">
           {url ? <img src={url} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-200" size={32} />}
        </div>
        <p className="text-[10px] font-black text-center truncate uppercase italic tracking-tighter leading-none mb-1">{name}</p>
        <div className={`h-2 w-full rounded-full ${currentInfo.bg} border-2 border-indigo-950 shadow-inner`} />
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-xl z-[2000] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setIsEditing(false)}>
          <div className="bg-white p-10 rounded-[4rem] w-full max-w-[460px] shadow-2xl relative border-[12px] border-indigo-950 my-auto animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsEditing(false)} className="absolute -top-6 -right-6 p-4 bg-red-500 rounded-2xl text-white border-4 border-indigo-950 shadow-xl"><X size={24} strokeWidth={4}/></button>
            <h3 className="text-4xl font-black text-indigo-950 mb-8 italic uppercase tracking-tighter">Editar Semana {week}</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-indigo-300 ml-4 tracking-widest">Identificação</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full p-5 bg-slate-50 rounded-3xl border-4 border-indigo-950 outline-none font-black text-indigo-950" />
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center ml-4">
                  <label className="text-[10px] font-black uppercase text-indigo-300 tracking-widest">Raridade</label>
                  <span className={`text-[10px] font-black px-4 py-2 rounded-full text-white uppercase tracking-widest ${currentInfo.bg} border-2 border-indigo-950`}>{currentInfo.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 p-4 bg-indigo-50 rounded-[2.5rem] border-4 border-indigo-950">
                  {[StickerRarity.NORMAL, StickerRarity.RUBY, StickerRarity.EMERALD, StickerRarity.OBSIDIAN, StickerRarity.GOLD, StickerRarity.DIAMOND].map(r => {
                    const info = getRarityInfo(r);
                    return (
                      <button 
                        key={r} 
                        onClick={() => setRarity(r)} 
                        className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-4 ${rarity === r ? `bg-white border-indigo-950 shadow-md scale-105` : 'bg-transparent border-transparent opacity-40'}`}
                      >
                        <div className={`p-2 rounded-xl ${info.bg} text-white shadow-sm border-2 border-indigo-950`}>
                           {r === StickerRarity.NORMAL ? <ImageIcon size={18} /> : <Star size={18} />}
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-tighter ${info.color}`}>{info.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <button onClick={() => fileInputRef.current?.click()} className="w-full py-10 border-4 border-dashed border-indigo-200 rounded-[2.5rem] flex flex-col items-center gap-2 text-indigo-400 font-black hover:bg-indigo-50 transition-all hover:border-indigo-400">
                  {isCompressing ? <Loader2 className="animate-spin" /> : <Upload size={40} />}
                  <span className="text-[10px] uppercase tracking-[0.3em]">Importar Imagem</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>

              {url && (
                <div className="aspect-video w-full rounded-[2rem] overflow-hidden border-4 border-indigo-950 bg-indigo-50 flex items-center justify-center shadow-inner relative">
                  <img src={url} className="max-w-full max-h-full object-contain" />
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsEditing(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[11px] tracking-widest border-2 border-slate-200">Voltar</button>
                <button 
                  disabled={isSaving}
                  onClick={async () => { 
                    setIsSaving(true);
                    await onSave(week, url, name, rarity); 
                    setIsSaving(false);
                    setIsEditing(false); 
                  }} 
                  className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase text-[11px] tracking-widest border-4 border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,1)] disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
