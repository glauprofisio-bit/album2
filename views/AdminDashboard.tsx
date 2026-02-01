import React, { useState } from 'react';
import { AppData, User, UserRole, Sticker, StickerRarity } from '../types';
import { Users, LayoutGrid, Plus, Trash2, X, Calendar, Star, Edit2 } from 'lucide-react';

interface AdminDashboardProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ data, updateData }) => {
  const [activeTab, setActiveTab] = useState<'professors' | 'stickers' | 'config'>('professors');
  const [isAddingProf, setIsAddingProf] = useState(false);
  const [profForm, setProfForm] = useState({ name: '', email: '', login: '', password: '' });
  const [editingProfId, setEditingProfId] = useState<string | null>(null);
  const [editingProfForm, setEditingProfForm] = useState({ name: '', email: '', login: '', password: '' });

  const handleAddProfessor = (e: React.FormEvent) => {
    e.preventDefault();
    const newProf: User = {
      id: Math.random().toString(36).substr(2, 9),
      ...profForm,
      role: UserRole.PROFESSOR
    };
    updateData({ professors: [...data.professors, newProf] });
    setProfForm({ name: '', email: '', login: '', password: '' });
    setIsAddingProf(false);
  };

  const handleEditProfessor = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProfId) {
      const updatedProfs = data.professors.map(p => 
        p.id === editingProfId ? { ...p, ...editingProfForm } : p
      );
      updateData({ professors: updatedProfs });
      setEditingProfId(null);
    }
  };

  const handleUpdateSticker = (week: number, imageUrl: string, name: string, rarity: StickerRarity) => {
    const newStickers = [...data.stickers];
    const index = newStickers.findIndex(s => s.week === week);
    if (index !== -1) {
      newStickers[index] = { ...newStickers[index], imageUrl, name, rarity };
    } else {
      newStickers.push({ id: `sticker-${week}`, week, imageUrl, name, rarity });
    }
    updateData({ stickers: newStickers });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex bg-indigo-950 p-2 rounded-[2rem] gap-2 border-4 border-white/20 shadow-xl">
        <button onClick={() => setActiveTab('professors')} className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.5rem] transition-all font-black text-xs uppercase tracking-widest ${activeTab === 'professors' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-300 hover:bg-white/5'}`}><Users size={18} /><span>Professores</span></button>
        <button onClick={() => setActiveTab('stickers')} className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.5rem] transition-all font-black text-xs uppercase tracking-widest ${activeTab === 'stickers' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-300 hover:bg-white/5'}`}><LayoutGrid size={18} /><span>Figurinhas</span></button>
        <button onClick={() => setActiveTab('config')} className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.5rem] transition-all font-black text-xs uppercase tracking-widest ${activeTab === 'config' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-300 hover:bg-white/5'}`}><Calendar size={18} /><span>Semana</span></button>
      </div>

      {activeTab === 'professors' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
           <button 
             onClick={() => setIsAddingProf(true)} 
             className="w-full py-8 bg-green-500 hover:bg-green-600 text-white rounded-[2.5rem] font-black text-2xl shadow-xl flex items-center justify-center gap-4 uppercase italic transition-all active:scale-95 border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)]"
           >
             <Plus size={32} strokeWidth={4} /> Novo Professor
           </button>
           <div className="grid gap-6 md:grid-cols-2">
              {data.professors.map(p => (
                <div key={p.id} className="bg-white text-indigo-950 p-8 rounded-[3rem] border-[8px] border-indigo-950 shadow-[0_8px_0_0_rgba(30,27,75,1)] flex flex-col gap-4 group transition-all hover:-translate-y-1">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="font-black text-2xl uppercase italic tracking-tighter">{p.name}</p>
                      <p className="text-[10px] font-black text-indigo-600 mt-3 bg-indigo-50 inline-block px-3 py-2 rounded-full border-2 border-indigo-200 uppercase tracking-widest">Login: <span className="font-bold">{p.login}</span></p>
                      <p className="text-[10px] font-black text-indigo-600 mt-2 bg-indigo-50 inline-block px-3 py-2 rounded-full border-2 border-indigo-200 uppercase tracking-widest">Senha: <span className="font-bold">{p.password}</span></p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => { 
                          setEditingProfId(p.id); 
                          setEditingProfForm({ name: p.name, email: p.email || '', login: p.login, password: p.password }); 
                        }} 
                        className="bg-blue-100 p-3 rounded-2xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all border-2 border-blue-200"
                      >
                        <Edit2 size={20} strokeWidth={3} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`Deseja realmente excluir o professor ${p.name}?`)) {
                            updateData({ professors: data.professors.filter(x => x.id !== p.id) });
                          }
                        }} 
                        className="bg-red-100 p-3 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all border-2 border-red-200"
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
                onClick={() => updateData({ currentWeek: Math.max(1, data.currentWeek - 1) })} 
                className="w-20 h-20 bg-indigo-100 hover:bg-indigo-600 hover:text-white rounded-[2rem] text-4xl font-black border-4 border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,1)] active:translate-y-1 active:shadow-none transition-all text-indigo-950"
              >-</button>
              <div className="text-8xl font-black bg-white text-indigo-950 p-8 rounded-[3rem] border-[10px] border-indigo-950 shadow-[0_12px_0_0_rgba(30,27,75,1)] min-w-[180px]">
                {data.currentWeek}
              </div>
              <button 
                onClick={() => updateData({ currentWeek: Math.min(45, data.currentWeek + 1) })} 
                className="w-20 h-20 bg-indigo-100 hover:bg-indigo-600 hover:text-white rounded-[2rem] text-4xl font-black border-4 border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,1)] active:translate-y-1 active:shadow-none transition-all text-indigo-950"
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
                <button type="submit" className="w-full py-7 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-xl mt-4 uppercase italic text-xl tracking-widest border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)] active:scale-95">Salvar Alterações</button>
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
                <button type="submit" className="w-full py-7 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-xl mt-4 uppercase italic text-xl tracking-widest border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)] active:scale-95">Salvar Acesso</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

const StickerEditor: React.FC<{ week: number, sticker?: Sticker, onSave: (w: number, u: string, n: string, r: StickerRarity) => void }> = ({ week, sticker, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState(sticker?.imageUrl || '');
  const [name, setName] = useState(sticker?.name || `Semana ${week}`);
  const [rarity, setRarity] = useState<StickerRarity>(sticker?.rarity || StickerRarity.NORMAL);

  return (
    <div className="bg-white p-4 rounded-[2rem] border-4 border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,1)] flex flex-col gap-3">
       <div className="aspect-square bg-slate-50 rounded-xl border-2 border-indigo-50 overflow-hidden flex items-center justify-center">
          {url ? <img src={url} className="w-full h-full object-cover" /> : <Star className="text-indigo-100" size={32} />}
       </div>
       <p className="text-[10px] font-black text-indigo-950 uppercase text-center truncate">{name}</p>
       <button onClick={() => setIsEditing(true)} className="w-full py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest border-2 border-indigo-950 shadow-[0_3px_0_0_rgba(30,27,75,1)] active:translate-y-0.5 active:shadow-none transition-all">Editar</button>
       
       {isEditing && (
         <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-xl z-[1000] flex items-center justify-center p-4" onClick={() => setIsEditing(false)}>
            <div className="bg-white text-indigo-950 w-full max-w-md rounded-[3rem] p-10 border-[10px] border-indigo-950 shadow-2xl" onClick={e => e.stopPropagation()}>
               <h3 className="text-2xl font-black mb-6 uppercase italic tracking-tighter">Figurinha S{week}</h3>
               <div className="space-y-4">
                  <input placeholder="Nome da Figurinha" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-4 border-indigo-950 font-black" />
                  <input placeholder="URL da Imagem" value={url} onChange={e => setUrl(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border-4 border-indigo-950 font-black" />
                  <select value={rarity} onChange={e => setRarity(e.target.value as StickerRarity)} className="w-full p-4 bg-slate-50 rounded-2xl border-4 border-indigo-950 font-black">
                     {Object.values(StickerRarity).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button onClick={() => { onSave(week, url, name, rarity); setIsEditing(false); }} className="w-full py-5 bg-green-500 text-white font-black rounded-2xl border-4 border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,1)] uppercase italic">Salvar Figurinha</button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default AdminDashboard;
