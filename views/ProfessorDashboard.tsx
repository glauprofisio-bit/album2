
import React, { useState, useMemo } from 'react';
import { AppData, User, UserRole, AlunoSticker } from '../types';
import { CheckCircle, Plus, X, User as UserIcon, Trash2, LayoutGrid, Users as UsersIcon, UserCircle, Star, Sparkles, XCircle, BarChart3, ArrowUpDown, Filter } from 'lucide-react';
import AvatarPickerModal from './AvatarPickerModal';
import confetti from 'canvas-confetti';

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
  const [studentForm, setStudentForm] = useState({ 
    name: '', 
    login: '', 
    password: '', 
    serie: '', 
    ciclo: 'Anos Iniciais' as User['ciclo'] 
  });

  // Filtros da Classificação
  const [filterCiclo, setFilterCiclo] = useState<string>('Todos');
  const [filterSerie, setFilterSerie] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'presenca' | 'falta'>('falta');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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
          <p className="text-indigo-300 font-black uppercase text-[10px] tracking-[0.3em] mt-6 italic">Gerenciando o progresso da escola</p>
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

      {activeTab === 'classification' && (
        <div className="bg-white rounded-[3rem] p-8 border-[8px] border-indigo-950 shadow-[0_12px_0_0_rgba(30,27,75,1)] animate-in slide-in-from-bottom-4 duration-300">
           <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 border-b-4 border-indigo-50 pb-8">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-indigo-950">Classificação Geral</h2>
              
              <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                 <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl border-2 border-indigo-100">
                    <Filter size={16} className="text-indigo-400" />
                    <select value={filterCiclo} onChange={e => setFilterCiclo(e.target.value)} className="bg-transparent font-black text-[10px] uppercase outline-none text-indigo-950 appearance-none pr-6 relative">
                       <option value="Todos">Todos os Ciclos</option>
                       <option value="Anos Iniciais">Anos Iniciais</option>
                       <option value="Anos Finais">Anos Finais</option>
                       <option value="Ensino Médio">Ensino Médio</option>
                    </select>
                 </div>
                 <input 
                   placeholder="Filtrar Série (ex: 1A)" 
                   value={filterSerie}
                   onChange={e => setFilterSerie(e.target.value.toUpperCase())}
                   className="bg-indigo-50 px-4 py-2 rounded-2xl border-2 border-indigo-100 font-black text-[10px] uppercase outline-none text-indigo-950 w-32 placeholder:text-indigo-200"
                 />
                 <button 
                   onClick={() => setSortOrder(sortOrder === 'presenca' ? 'falta' : 'presenca')}
                   className="bg-indigo-950 text-white px-6 py-2 rounded-2xl border-2 border-indigo-950 font-black text-[10px] uppercase flex items-center gap-2 active:scale-95 transition-all shadow-md"
                 >
                   <ArrowUpDown size={14} /> {sortOrder === 'presenca' ? 'Ver Mais Faltantes' : 'Ver Mais Presentes'}
                 </button>
                 <button 
                   onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                   className="bg-white text-indigo-950 px-6 py-2 rounded-2xl border-2 border-indigo-950 font-black text-[10px] uppercase active:scale-95 transition-all"
                 >
                   {sortDirection === 'desc' ? 'MAIOR → MENOR' : 'MENOR → MAIOR'}
                 </button>
              </div>
           </div>

           <div className="space-y-4">
              {classificationData.length === 0 ? (
                <div className="py-20 text-center text-indigo-200 font-black uppercase tracking-widest italic">Nenhum aluno encontrado com esses filtros</div>
              ) : (
                classificationData.map((s, idx) => (
                  <div key={s.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2.5rem] border-4 border-indigo-950/10 hover:border-indigo-600 transition-all group">
                     <div className="flex items-center gap-6">
                        <span className="text-2xl font-black text-indigo-200 w-10 text-center group-hover:text-indigo-600 transition-colors">#{idx + 1}</span>
                        <div className="w-16 h-16 rounded-2xl border-4 border-indigo-950 overflow-hidden bg-white shadow-md">
                           {getAvatarUrl(s) ? <img src={getAvatarUrl(s)!} className="w-full h-full object-cover" /> : <UserCircle className="text-slate-200" />}
                        </div>
                        <div>
                           <p className="font-black text-indigo-950 uppercase italic text-xl tracking-tighter leading-none mb-1">{s.name}</p>
                           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic">{s.serie} • {s.ciclo}</p>
                        </div>
                     </div>
                     <div className="flex gap-10">
                        <div className="text-center">
                           <p className={`text-4xl font-black leading-none ${sortOrder === 'presenca' ? 'text-green-500' : 'text-slate-200'}`}>{s.presencas}</p>
                           <p className="text-[9px] font-black uppercase text-indigo-300 tracking-widest mt-1">Presente</p>
                        </div>
                        <div className="text-center">
                           <p className={`text-4xl font-black leading-none ${sortOrder === 'falta' ? 'text-red-500' : 'text-slate-200'}`}>{s.faltas}</p>
                           <p className="text-[9px] font-black uppercase text-indigo-300 tracking-widest mt-1">Faltas</p>
                        </div>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
           <button onClick={() => setIsAddingStudent(true)} className="w-full py-8 bg-green-500 hover:bg-green-600 text-white rounded-[2.5rem] font-black text-2xl shadow-xl flex items-center justify-center gap-4 uppercase italic transition-all active:scale-95 border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)]">
             <Plus size={32} strokeWidth={4} /> Adicionar Aluno
           </button>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myStudents.map(student => (
                  <div key={student.id} className="bg-white text-indigo-950 p-8 rounded-[3rem] border-[8px] border-indigo-950 shadow-[0_8px_0_0_rgba(30,27,75,1)] flex flex-col justify-between group transition-all hover:-translate-y-2">
                    <div className="space-y-4 mb-8 text-center md:text-left">
                        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-indigo-600 border-4 border-indigo-950 mx-auto md:mx-0 overflow-hidden shadow-inner">
                           {getAvatarUrl(student) ? <img src={getAvatarUrl(student)!} className="w-full h-full object-cover" /> : <UserIcon size={32} strokeWidth={3} />}
                        </div>
                        <div>
                          <h3 className="font-black text-2xl uppercase italic tracking-tighter leading-none">{student.name}</h3>
                          <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                             <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 italic">Login: {student.login}</span>
                             <span className="text-[8px] font-black text-white uppercase tracking-widest bg-indigo-950 px-3 py-1 rounded-full italic">{student.serie} | {student.ciclo}</span>
                          </div>
                        </div>
                    </div>
                    <button onClick={() => { if(confirm(`Excluir ${student.name}?`)) updateData({ students: data.students.filter(s => s.id !== student.id) }); }} className="w-full py-4 bg-red-100 text-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all border-2 border-red-200">Remover Estudante</button>
                  </div>
              ))}
           </div>
        </div>
      )}

      {isAvatarPickerOpen && (
        <AvatarPickerModal onSelect={(updates) => { onUpdateProfile?.(updates); setIsAvatarPickerOpen(false); confetti(); }} onClose={() => setIsAvatarPickerOpen(false)} />
      )}

      {isAddingStudent && (
        <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-xl z-[1000] flex items-center justify-center p-4" onClick={() => setIsAddingStudent(false)}>
           <div className="bg-white text-indigo-950 w-full max-w-lg rounded-[4rem] p-12 shadow-2xl relative border-[12px] border-indigo-950 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
              <button onClick={() => setIsAddingStudent(false)} className="absolute -top-6 -right-6 p-4 bg-red-500 rounded-2xl text-white border-4 border-indigo-950 shadow-xl transition-all z-20"><X size={24} strokeWidth={4} /></button>
              <h3 className="text-4xl font-black mb-10 text-center italic uppercase tracking-tighter">Novo Aluno</h3>
              <form onSubmit={handleAddStudent} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-indigo-300 ml-4 tracking-widest">Nome Completo</label>
                   <input required placeholder="Ex: João Silva" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 font-black text-indigo-900 text-lg outline-none focus:bg-white" />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-indigo-300 ml-4 tracking-widest">Série</label>
                    <input required placeholder="Ex: 1A" value={studentForm.serie} onChange={e => setStudentForm({...studentForm, serie: e.target.value.toUpperCase()})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 font-black text-indigo-900 outline-none uppercase focus:bg-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-indigo-300 ml-4 tracking-widest">Ciclo</label>
                    <div className="relative">
                      <select value={studentForm.ciclo} onChange={e => setStudentForm({...studentForm, ciclo: e.target.value as User['ciclo']})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 font-black text-indigo-900 outline-none appearance-none focus:bg-white">
                         <option value="Anos Iniciais">Anos Iniciais</option>
                         <option value="Anos Finais">Anos Finais</option>
                         <option value="Ensino Médio">Ensino Médio</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-indigo-300 ml-4 tracking-widest">Usuário</label>
                    <input required placeholder="Login" value={studentForm.login} onChange={e => setStudentForm({...studentForm, login: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 font-black text-indigo-900 outline-none focus:bg-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-indigo-300 ml-4 tracking-widest">Senha</label>
                    <input required placeholder="Senha" value={studentForm.password} onChange={e => setStudentForm({...studentForm, password: e.target.value})} className="w-full p-6 bg-slate-50 rounded-[2rem] border-4 border-indigo-950 font-black text-indigo-900 outline-none focus:bg-white" />
                  </div>
                </div>

                <button type="submit" className="w-full py-8 bg-green-500 text-white font-black rounded-[2.5rem] mt-8 uppercase italic text-xl tracking-widest border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)]">Cadastrar no Sistema</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default ProfessorDashboard;
