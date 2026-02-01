import React, { useState, useMemo } from 'react';
import { AppData, User, UserRole } from '../types';
import { CheckCircle, Plus, LayoutGrid, Users as UsersIcon, UserCircle, Star, XCircle, BarChart3, Edit2, Trash2, X } from 'lucide-react';
import AvatarPickerModal from './AvatarPickerModal';

interface ProfessorDashboardProps {
  user: User;
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  onUpdateProfile?: (updates: Partial<User>) => void;
}

const ProfessorDashboard: React.FC<ProfessorDashboardProps> = ({ user, data, updateData, onUpdateProfile }) => {
  const [activeTab, setActiveTab] = useState<'students' | 'grid' | 'classification'>('grid');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingStudentForm, setEditingStudentForm] = useState({ name: '', login: '', password: '', serie: '', ciclo: 'Anos Iniciais' as User['ciclo'] });
  const [studentForm, setStudentForm] = useState({ 
    name: '', 
    login: '', 
    password: '', 
    serie: '', 
    ciclo: 'Anos Iniciais' as User['ciclo'] 
  });

  const [filterCiclo, setFilterCiclo] = useState<string>('Todos');
  const [filterSerie, setFilterSerie] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'presenca' | 'falta'>('falta');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filtra alunos que pertencem a este professor
  const myStudents = useMemo(() => data.students.filter(s => s.professorId === user.id), [data.students, user.id]);

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const newStudent: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: studentForm.name,
      email: '',
      login: studentForm.login,
      password: studentForm.password,
      serie: studentForm.serie,
      ciclo: studentForm.ciclo,
      role: UserRole.ALUNO,
      professorId: user.id
    };
    updateData({ students: [...data.students, newStudent] });
    setStudentForm({ name: '', login: '', password: '', serie: '', ciclo: 'Anos Iniciais' });
    setIsAddingStudent(false);
  };

  const handleEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudentId) {
      const updatedStudents = data.students.map(s => 
        s.id === editingStudentId ? { ...s, ...editingStudentForm } : s
      );
      updateData({ students: updatedStudents });
      setEditingStudentId(null);
    }
  };

  const toggleSticker = (alunoId: string, week: number) => {
    let newStickers = [...data.studentStickers];
    const existingIndex = newStickers.findIndex(s => s.alunoId === alunoId && s.week === week);
    
    if (existingIndex === -1) {
      newStickers.push({ 
        alunoId, 
        week, 
        liberada: true, 
        revelada: false,
        reconquistada: false,
        isFalta: false,
        date: new Date().toISOString()
      });
    } else {
      const sticker = newStickers[existingIndex];
      if (sticker.liberada && !sticker.isFalta) {
        newStickers[existingIndex] = { ...sticker, liberada: false, isFalta: true };
      } else {
        newStickers.splice(existingIndex, 1);
      }
    }
    updateData({ studentStickers: newStickers });
  };

  const classificationData = useMemo(() => {
    return myStudents.map(student => {
      const stickers = data.studentStickers.filter(s => s.alunoId === student.id);
      return {
        ...student,
        presencas: stickers.filter(s => s.liberada && !s.isFalta).length,
        faltas: stickers.filter(s => s.isFalta).length
      };
    })
    .filter(s => {
      const matchCiclo = filterCiclo === 'Todos' || s.ciclo === filterCiclo;
      const matchSerie = !filterSerie || s.serie?.toLowerCase().includes(filterSerie.toLowerCase());
      return matchCiclo && matchSerie;
    })
    .sort((a, b) => {
      const valA = sortOrder === 'presenca' ? a.presencas : a.faltas;
      const valB = sortOrder === 'presenca' ? b.presencas : b.faltas;
      return sortDirection === 'desc' ? valB - valA : valA - valB;
    });
  }, [myStudents, data.studentStickers, filterCiclo, filterSerie, sortOrder, sortDirection]);

  const getAvatarUrl = (u: User) => {
    if (u.avatarUrl) return u.avatarUrl;
    if (u.avatarSeed) return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${u.avatarSeed}`;
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="bg-white rounded-[3rem] p-8 md:p-10 border-[8px] border-indigo-950 shadow-[0_12px_0_0_rgba(30,27,75,1)] flex flex-col items-center gap-4">
        <div onClick={() => setIsAvatarPickerOpen(true)} className="relative group cursor-pointer">
          <div className="w-40 h-40 bg-slate-100 rounded-full border-[6px] border-indigo-950 shadow-xl overflow-hidden relative transition-transform group-hover:scale-105 active:scale-95">
             {getAvatarUrl(user) ? (
               <img src={getAvatarUrl(user)!} className="w-full h-full object-cover" />
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
        <div className="text-center">
          <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none text-indigo-950">
            Prof. {user.name}
          </h2>
          <div className="flex justify-center mt-4">
             <div className="bg-emerald-400 px-8 py-3 rounded-full text-[12px] font-black uppercase tracking-widest text-indigo-950 border-4 border-indigo-950 shadow-[0_4px_0_0_rgba(30,27,75,1)]">
               {myStudents.length} ALUNOS NA TURMA
             </div>
          </div>
        </div>
      </div>

      <div className="flex bg-indigo-950 p-2 rounded-[2.5rem] gap-2 border-4 border-white/20 shadow-xl flex-wrap">
        <button onClick={() => setActiveTab('grid')} className={`flex-1 min-w-[150px] flex items-center justify-center gap-3 py-5 rounded-[2rem] transition-all font-black text-xs uppercase tracking-widest ${activeTab === 'grid' ? 'bg-indigo-600 text-white shadow-lg border-2 border-white/20' : 'text-indigo-300 hover:bg-white/5'}`}>
          <LayoutGrid size={18} /> Painel de Presença
        </button>
        <button onClick={() => setActiveTab('classification')} className={`flex-1 min-w-[150px] flex items-center justify-center gap-3 py-5 rounded-[2rem] transition-all font-black text-xs uppercase tracking-widest ${activeTab === 'classification' ? 'bg-orange-500 text-white shadow-lg border-2 border-white/20' : 'text-indigo-300 hover:bg-white/5'}`}>
          <BarChart3 size={18} /> Classificação
        </button>
        <button onClick={() => setActiveTab('students')} className={`flex-1 min-w-[150px] flex items-center justify-center gap-3 py-5 rounded-[2rem] transition-all font-black text-xs uppercase tracking-widest ${activeTab === 'students' ? 'bg-indigo-600 text-white shadow-lg border-2 border-white/20' : 'text-indigo-300 hover:bg-white/5'}`}>
          <UsersIcon size={18} /> Gerenciar Alunos
        </button>
      </div>

      {activeTab === 'grid' && (
        <div className="bg-white rounded-[3rem] p-4 md:p-8 border-[8px] border-indigo-950 shadow-[0_12px_0_0_rgba(30,27,75,1)] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
           <h2 className="text-3xl font-black italic uppercase tracking-tighter text-indigo-950 mb-8 border-b-4 border-indigo-50 pb-4">Frequência da Turma</h2>
           <div className="overflow-x-auto custom-scrollbar">
             <table className="w-full text-left border-separate border-spacing-0">
               <thead>
                 <tr>
                   <th className="py-6 px-4 sticky left-0 bg-white z-30 border-b-4 border-indigo-50 min-w-[180px] max-w-[220px] text-[12px] font-black uppercase text-indigo-900 italic tracking-widest">Estudante</th>
                   {Array.from({ length: 45 }, (_, i) => i + 1).map(w => (
                     <th key={w} className={`py-6 px-2 border-b-4 border-indigo-50 text-center min-w-[60px] text-[11px] font-black ${w === data.currentWeek ? 'bg-yellow-100 text-indigo-900 shadow-inner' : 'text-slate-300'}`}>S{w}</th>
                   ))}
                 </tr>
               </thead>
               <tbody>
                 {myStudents.map(student => (
                  <tr key={student.id} className="group">
                    <td className="py-5 px-4 font-black text-indigo-950 sticky left-0 bg-white z-20 border-b-2 border-slate-50 border-r-2 uppercase italic text-[13px] tracking-tighter truncate">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg border-2 border-indigo-950 overflow-hidden bg-slate-100 flex-shrink-0">
                           {getAvatarUrl(student) ? <img src={getAvatarUrl(student)!} className="w-full h-full object-cover" /> : <UserCircle className="text-slate-300" />}
                        </div>
                        <div className="flex flex-col">
                           <span className="truncate">{student.name}</span>
                           <span className="text-[7px] text-indigo-400 leading-none">{student.serie} | {student.ciclo}</span>
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: 45 }, (_, i) => i + 1).map(w => {
                      const sticker = data.studentStickers.find(s => s.alunoId === student.id && s.week === w);
                      const isVerde = sticker?.liberada && !sticker?.isFalta;
                      const isVermelho = sticker?.isFalta;
                      return (
                        <td key={w} className={`py-4 px-1 border-b-2 border-slate-50 text-center ${w === data.currentWeek ? 'bg-yellow-50/20' : ''}`}>
                          <button 
                            onClick={() => toggleSticker(student.id, w)} 
                            className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-all active:scale-90 border-4 ${isVerde ? 'bg-green-500 border-indigo-950 text-white shadow-lg' : isVermelho ? 'bg-red-500 border-indigo-950 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-200 hover:border-indigo-400 hover:text-indigo-400'}`}
                          >
                            {isVerde ? <CheckCircle size={20} strokeWidth={4} /> : isVermelho ? <XCircle size={20} strokeWidth={4} /> : <div className="w-2 h-2 rounded-full bg-current" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
           <button 
             onClick={() => setIsAddingStudent(true)} 
             className="w-full py-8 bg-green-500 hover:bg-green-600 text-white rounded-[2.5rem] font-black text-2xl shadow-xl flex items-center justify-center gap-4 uppercase italic transition-all active:scale-95 border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)]"
           >
             <Plus size={32} strokeWidth={4} /> Novo Aluno
           </button>
           <div className="grid gap-6 md:grid-cols-2">
              {myStudents.map(s => (
                <div key={s.id} className="bg-white text-indigo-950 p-8 rounded-[3rem] border-[8px] border-indigo-950 shadow-[0_8px_0_0_rgba(30,27,75,1)] flex flex-col gap-4 group transition-all hover:-translate-y-1">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl border-4 border-indigo-950 overflow-hidden bg-slate-100">
                         {getAvatarUrl(s) ? <img src={getAvatarUrl(s)!} className="w-full h-full object-cover" /> : <UserCircle size={32} className="text-slate-300 m-auto mt-3" />}
                      </div>
                      <div>
                        <p className="font-black text-2xl uppercase italic tracking-tighter">{s.name}</p>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{s.serie} • {s.ciclo}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => { 
                          setEditingStudentId(s.id); 
                          setEditingStudentForm({ name: s.name, login: s.login, password: s.password || '', serie: s.serie || '', ciclo: s.ciclo || 'Anos Iniciais' }); 
                        }} 
                        className="bg-blue-100 p-3 rounded-2xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all border-2 border-blue-200"
                      >
                        <Edit2 size={20} strokeWidth={3} />
                      </button>
                      <button 
                        onClick={() => updateData({ students: data.students.filter(x => x.id !== s.id) })} 
                        className="bg-red-100 p-3 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all border-2 border-red-200"
                      >
                        <Trash2 size={20} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-2xl border-2 border-indigo-100 flex justify-between items-center">
                     <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Acesso:</span>
                     <span className="font-black text-indigo-600 text-xs">{s.login} / {s.password}</span>
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'classification' && (
        <div className="bg-white rounded-[3rem] p-8 border-[8px] border-indigo-950 shadow-[0_12px_0_0_rgba(30,27,75,1)] animate-in slide-in-from-bottom-4 duration-300">
           <h2 className="text-3xl font-black italic uppercase tracking-tighter text-indigo-950 mb-8">Classificação da Turma</h2>
           <div className="space-y-4">
              {classificationData.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                   <div className="w-10 h-10 bg-indigo-950 text-white rounded-full flex items-center justify-center font-black italic">{idx + 1}º</div>
                   <div className="flex-1">
                      <p className="font-black text-indigo-950 uppercase italic">{s.name}</p>
                      <p className="text-[9px] font-black text-indigo-400 uppercase">{s.serie}</p>
                   </div>
                   <div className="flex gap-4">
                      <div className="text-center">
                         <p className="text-[8px] font-black text-green-500 uppercase">Presenças</p>
                         <p className="text-xl font-black text-indigo-950">{s.presencas}</p>
                      </div>
                      <div className="text-center">
                         <p className="text-[8px] font-black text-red-500 uppercase">Faltas</p>
                         <p className="text-xl font-black text-indigo-950">{s.faltas}</p>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {isAddingStudent && (
        <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-xl z-[1000] flex items-center justify-center p-4" onClick={() => setIsAddingStudent(false)}>
           <div className="bg-white text-indigo-950 w-full max-w-lg rounded-[4rem] p-12 shadow-2xl relative border-[12px] border-indigo-950 animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
              <button onClick={() => setIsAddingStudent(false)} className="absolute -top-6 -right-6 p-4 bg-red-500 rounded-2xl text-white border-4 border-indigo-950 shadow-xl transition-all"><X size={24} strokeWidth={4}/></button>
              <h3 className="text-4xl font-black mb-10 text-center italic uppercase tracking-tighter">Novo Aluno</h3>
              <form onSubmit={handleAddStudent} className="space-y-6">
                <input required placeholder="Nome do Aluno" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none border-4 border-indigo-950 font-black text-indigo-950 text-lg" />
                <div className="grid grid-cols-2 gap-6">
                  <input required placeholder="Login" value={studentForm.login} onChange={e => setStudentForm({...studentForm, login: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 outline-none font-black" />
                  <input required placeholder="Senha" value={studentForm.password} onChange={e => setStudentForm({...studentForm, password: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 outline-none font-black" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <input required placeholder="Série (ex: 1A)" value={studentForm.serie} onChange={e => setStudentForm({...studentForm, serie: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 outline-none font-black" />
                  <select value={studentForm.ciclo} onChange={e => setStudentForm({...studentForm, ciclo: e.target.value as any})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 outline-none font-black">
                    <option value="Anos Iniciais">Anos Iniciais</option>
                    <option value="Anos Finais">Anos Finais</option>
                    <option value="Ensino Médio">Ensino Médio</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-7 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-xl mt-4 uppercase italic text-xl tracking-widest border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)] active:scale-95">Salvar Aluno</button>
              </form>
           </div>
        </div>
      )}

      {editingStudentId && (
        <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-xl z-[1000] flex items-center justify-center p-4" onClick={() => setEditingStudentId(null)}>
           <div className="bg-white text-indigo-950 w-full max-w-lg rounded-[4rem] p-12 shadow-2xl relative border-[12px] border-indigo-950 animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
              <button onClick={() => setEditingStudentId(null)} className="absolute -top-6 -right-6 p-4 bg-red-500 rounded-2xl text-white border-4 border-indigo-950 shadow-xl transition-all"><X size={24} strokeWidth={4}/></button>
              <h3 className="text-4xl font-black mb-10 text-center italic uppercase tracking-tighter">Editar Aluno</h3>
              <form onSubmit={handleEditStudent} className="space-y-6">
                <input required placeholder="Nome do Aluno" value={editingStudentForm.name} onChange={e => setEditingStudentForm({...editingStudentForm, name: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none border-4 border-indigo-950 font-black text-indigo-950 text-lg" />
                <div className="grid grid-cols-2 gap-6">
                  <input required placeholder="Login" value={editingStudentForm.login} onChange={e => setEditingStudentForm({...editingStudentForm, login: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 outline-none font-black" />
                  <input required placeholder="Senha" value={editingStudentForm.password} onChange={e => setEditingStudentForm({...editingStudentForm, password: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 outline-none font-black" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <input required placeholder="Série" value={editingStudentForm.serie} onChange={e => setEditingStudentForm({...editingStudentForm, serie: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 outline-none font-black" />
                  <select value={editingStudentForm.ciclo} onChange={e => setEditingStudentForm({...editingStudentForm, ciclo: e.target.value as any})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 outline-none font-black">
                    <option value="Anos Iniciais">Anos Iniciais</option>
                    <option value="Anos Finais">Anos Finais</option>
                    <option value="Ensino Médio">Ensino Médio</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-7 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-xl mt-4 uppercase italic text-xl tracking-widest border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)] active:scale-95">Salvar Alterações</button>
              </form>
           </div>
        </div>
      )}

      {isAvatarPickerOpen && (
        <AvatarPickerModal 
          isOpen={isAvatarPickerOpen} 
          onClose={() => setIsAvatarPickerOpen(false)} 
          onSelect={(seed) => onUpdateProfile?.({ avatarSeed: seed, avatarUrl: '' })} 
        />
      )}
    </div>
  );
};

export default ProfessorDashboard;
