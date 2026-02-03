// src/views/ProfessorDashboard.tsx
import React, { useState, useMemo } from 'react';
import { AppData, User, UserRole } from '../types';
import {
  CheckCircle,
  Plus,
  LayoutGrid,
  Users as UsersIcon,
  UserCircle,
  Star,
  XCircle,
  BarChart3,
  Edit2,
  Trash2,
  X,
  ArrowDownAZ,
  ArrowUpAZ,
  Filter,
  Minus
} from 'lucide-react';
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
  const [editingStudentForm, setEditingStudentForm] = useState({
    name: '',
    login: '',
    password: '',
    serie: '',
    ciclo: 'Anos Iniciais' as User['ciclo']
  });

  // Estado para cadastro em massa
  const [bulkSerie, setBulkSerie] = useState('');
  const [bulkCiclo, setBulkCiclo] = useState<User['ciclo']>('Anos Iniciais');
  const [bulkStudents, setBulkStudents] = useState([{ name: '', login: '', password: '' }]);

  // filtros e ordenação da CLASSIFICAÇÃO
  const [filterCiclo, setFilterCiclo] = useState<string>('Todos');
  const [filterSerie, setFilterSerie] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'presenca' | 'falta'>('falta');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const myStudents = useMemo(() => data.students.filter(s => s.professorId === user.id), [data.students, user.id]);

  const getAvatarUrl = (u: User) => {
    if (u.avatarUrl) return u.avatarUrl;
    if (u.avatarSeed) return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${u.avatarSeed}`;
    return null;
  };

  const handleAddBulkStudents = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newStudents: User[] = bulkStudents
      .filter(s => s.name && s.login)
      .map(s => ({
        id: Math.random().toString(36).substr(2, 9),
        name: s.name,
        email: '',
        login: s.login,
        password: s.password,
        serie: bulkSerie,
        ciclo: bulkCiclo,
        role: UserRole.ALUNO,
        professorId: user.id
      }));

    if (newStudents.length === 0) return;

    updateData({ students: [...data.students, ...newStudents] });
    
    // Reset
    setBulkStudents([{ name: '', login: '', password: '' }]);
    setBulkSerie('');
    setIsAddingStudent(false);
  };

  const addStudentField = () => {
    setBulkStudents([...bulkStudents, { name: '', login: '', password: '' }]);
  };

  const removeStudentField = (index: number) => {
    if (bulkStudents.length > 1) {
      const next = [...bulkStudents];
      next.splice(index, 1);
      setBulkStudents(next);
    }
  };

  const updateBulkStudent = (index: number, field: string, value: string) => {
    const next = [...bulkStudents];
    next[index] = { ...next[index], [field]: value };
    setBulkStudents(next);
  };

  const handleEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudentId) {
      const updatedStudents = data.students.map(s => (s.id === editingStudentId ? { ...s, ...editingStudentForm } : s));
      updateData({ students: updatedStudents });
      setEditingStudentId(null);
    }
  };

  const toggleSticker = (alunoId: string, week: number) => {
    const existingIndex = data.studentStickers.findIndex(s => s.alunoId === alunoId && s.week === week);
    let newStickers = [...data.studentStickers];

    if (existingIndex === -1) {
      // Estado: Nada -> Verde (Presença)
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
        // Estado: Verde -> Vermelho (Falta)
        newStickers[existingIndex] = { ...sticker, liberada: false, isFalta: true };
      } else if (sticker.isFalta) {
        // Estado: Vermelho -> Nada
        newStickers.splice(existingIndex, 1);
      } else {
        // Fallback: se estiver liberada mas por algum motivo isFalta for false (ex: aluno liberou)
        // Remove para poder marcar de novo
        newStickers.splice(existingIndex, 1);
      }
    }

    // Atualização local imediata para feedback instantâneo
    data.studentStickers = newStickers;
    updateData({ studentStickers: newStickers });
  };

  const classificationData = useMemo(() => {
    return myStudents
      .map(student => {
        const stickers = data.studentStickers.filter(s => s.alunoId === student.id);
        return {
          ...student,
          presencas: stickers.filter(s => s.liberada && !s.isFalta).length,
          faltas: stickers.filter(s => s.isFalta).length
        };
      })
      .filter(s => {
        const matchCiclo = filterCiclo === 'Todos' || s.ciclo === filterCiclo;
        const matchSerie = !filterSerie || (s.serie || '').toLowerCase().includes(filterSerie.toLowerCase());
        return matchCiclo && matchSerie;
      })
      .sort((a, b) => {
        const valA = sortOrder === 'presenca' ? a.presencas : a.faltas;
        const valB = sortOrder === 'presenca' ? b.presencas : b.faltas;
        return sortDirection === 'desc' ? valB - valA : valA - valB;
      });
  }, [myStudents, data.studentStickers, filterCiclo, filterSerie, sortOrder, sortDirection]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="bg-white rounded-[3rem] p-8 md:p-10 border-[8px] border-indigo-950 shadow-[0_12px_0_0_rgba(30,27,75,1)] flex flex-col items-center gap-4">
        <div onClick={() => setIsAvatarPickerOpen(true)} className="relative group cursor-pointer">
          <div className="w-40 h-40 bg-slate-100 rounded-full border-[6px] border-indigo-950 shadow-xl overflow-hidden relative transition-transform group-hover:scale-105 active:scale-95">
            {getAvatarUrl(user) ? (
              <img src={getAvatarUrl(user)!} className="w-full h-full object-cover" alt="avatar" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-indigo-200">
                <UserCircle size={64} />
              </div>
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-yellow-400 p-3 rounded-2xl border-4 border-indigo-950 shadow-lg group-hover:rotate-0 transition-all">
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
        <button
          onClick={() => setActiveTab('grid')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-3 py-5 rounded-[2rem] transition-all font-black text-xs uppercase tracking-widest ${
            activeTab === 'grid' ? 'bg-indigo-600 text-white shadow-lg border-2 border-white/20' : 'text-indigo-300 hover:bg-white/5'
          }`}
        >
          <LayoutGrid size={18} /> Painel de Presença
        </button>
        <button
          onClick={() => setActiveTab('classification')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-3 py-5 rounded-[2rem] transition-all font-black text-xs uppercase tracking-widest ${
            activeTab === 'classification' ? 'bg-orange-500 text-white shadow-lg border-2 border-white/20' : 'text-indigo-300 hover:bg-white/5'
          }`}
        >
          <BarChart3 size={18} /> Classificação
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-3 py-5 rounded-[2rem] transition-all font-black text-xs uppercase tracking-widest ${
            activeTab === 'students' ? 'bg-indigo-600 text-white shadow-lg border-2 border-white/20' : 'text-indigo-300 hover:bg-white/5'
          }`}
        >
          <UsersIcon size={18} /> Gerenciar Alunos
        </button>
      </div>

      {activeTab === 'grid' && (
        <div className="bg-white rounded-[3rem] p-4 md:p-8 border-[8px] border-indigo-950 shadow-[0_12px_0_0_rgba(30,27,75,1)] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-indigo-950 mb-8 border-b-4 border-indigo-50 pb-4">
            Frequência da Turma
          </h2>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="py-6 px-4 sticky left-0 bg-white z-30 border-b-4 border-indigo-50 min-w-[180px] max-w-[220px] text-[12px] font-black uppercase text-indigo-900 italic tracking-widest">
                    Estudante
                  </th>
                  {Array.from({ length: 45 }, (_, i) => i + 1).map(w => (
                    <th
                      key={w}
                      className={`py-6 px-2 border-b-4 border-indigo-50 text-center min-w-[60px] text-[11px] font-black ${
                        w === data.currentWeek ? 'bg-yellow-100 text-indigo-900 shadow-inner' : 'text-slate-300'
                      }`}
                    >
                      S{w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myStudents.map(student => (
                  <tr key={student.id} className="group">
                    <td className="py-5 px-4 font-black text-indigo-950 sticky left-0 bg-white z-20 border-b-2 border-slate-50 border-r-2 uppercase italic text-[13px] tracking-tighter truncate">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg border-2 border-indigo-950 overflow-hidden bg-slate-100 flex-shrink-0">
                          {getAvatarUrl(student) ? (
                            <img src={getAvatarUrl(student)!} className="w-full h-full object-cover" alt="avatar" />
                          ) : (
                            <UserCircle className="text-slate-300" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="truncate">{student.name}</span>
                          <span className="text-[7px] text-indigo-400 leading-none">
                            {student.serie} | {student.ciclo}
                          </span>
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
                            className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-all active:scale-90 border-4 ${
                              isVerde
                                ? 'bg-green-500 border-indigo-950 text-white shadow-lg'
                                : isVermelho
                                ? 'bg-red-500 border-indigo-950 text-white shadow-lg'
                                : 'bg-slate-50 border-slate-200 text-slate-200 hover:border-indigo-400 hover:text-indigo-400'
                            }`}
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-indigo-950">Classificação da Turma</h2>

            <div className="flex items-center gap-2 bg-indigo-950/5 px-4 py-3 rounded-[1.5rem] border-2 border-indigo-950/10">
              <Filter size={16} className="text-indigo-950" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-950/70">Filtros</span>
            </div>
          </div>

          {/* Controles */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
              <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Ciclo</label>
              <select
                value={filterCiclo}
                onChange={(e) => setFilterCiclo(e.target.value)}
                className="w-full p-3 rounded-xl border-2 border-indigo-950 outline-none font-black text-indigo-950 bg-white"
              >
                <option value="Todos">Todos</option>
                <option value="Anos Iniciais">Anos Iniciais</option>
                <option value="Anos Finais">Anos Finais</option>
                <option value="Ensino Médio">Ensino Médio</option>
              </select>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
              <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Série</label>
              <input
                value={filterSerie}
                onChange={(e) => setFilterSerie(e.target.value)}
                placeholder="Ex: 9A, 1A..."
                className="w-full p-3 rounded-xl border-2 border-indigo-950 outline-none font-black text-indigo-950 bg-white"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
              <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Ordenar por</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full p-3 rounded-xl border-2 border-indigo-950 outline-none font-black text-indigo-950 bg-white"
              >
                <option value="falta">Mais faltas</option>
                <option value="presenca">Mais presenças</option>
              </select>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
              <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Ordem</label>
              <button
                onClick={() => setSortDirection(prev => (prev === 'desc' ? 'asc' : 'desc'))}
                className="w-full p-3 rounded-xl border-2 border-indigo-950 outline-none font-black text-indigo-950 bg-white flex items-center justify-center gap-2"
              >
                {sortDirection === 'desc' ? <ArrowDownAZ size={16} /> : <ArrowUpAZ size={16} />}
                {sortDirection === 'desc' ? 'Maior → Menor' : 'Menor → Maior'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {classificationData.length === 0 ? (
              <div className="py-10 text-center text-slate-300 font-black uppercase tracking-widest italic">
                Nenhum aluno encontrado com esses filtros.
              </div>
            ) : (
              classificationData.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                  <div className="w-10 h-10 bg-indigo-950 text-white rounded-full flex items-center justify-center font-black italic">
                    {idx + 1}º
                  </div>

                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-2xl border-4 border-indigo-950 overflow-hidden bg-white">
                      {getAvatarUrl(s) ? <img src={getAvatarUrl(s)!} className="w-full h-full object-cover" alt="avatar" /> : <UserCircle className="text-slate-200" />}
                    </div>

                    <div className="flex-1">
                      <p className="font-black text-indigo-950 uppercase italic">{s.name}</p>
                      <p className="text-[9px] font-black text-indigo-400 uppercase">{s.serie} • {s.ciclo}</p>
                    </div>
                  </div>

                  <div className="flex gap-6">
                    <div className="text-center">
                      <p className="text-[8px] font-black text-green-500 uppercase">Presenças</p>
                      <p className="text-2xl font-black text-indigo-950">{s.presencas}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-black text-red-500 uppercase">Faltas</p>
                      <p className="text-2xl font-black text-indigo-950">{s.faltas}</p>
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
          <button
            onClick={() => setIsAddingStudent(true)}
            className="w-full py-8 bg-green-500 hover:bg-green-600 text-white rounded-[2.5rem] font-black text-2xl shadow-xl flex items-center justify-center gap-4 uppercase italic transition-all active:scale-95 border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)]"
          >
            <Plus size={32} strokeWidth={4} /> Novo Aluno
          </button>

          <div className="grid gap-6 md:grid-cols-2">
            {myStudents.map(s => (
              <div
                key={s.id}
                className="bg-white text-indigo-950 p-8 rounded-[3rem] border-[8px] border-indigo-950 shadow-[0_8px_0_0_rgba(30,27,75,1)] flex flex-col gap-4 group transition-all hover:-translate-y-1"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl border-4 border-indigo-950 overflow-hidden bg-slate-100">
                      {getAvatarUrl(s) ? <img src={getAvatarUrl(s)!} className="w-full h-full object-cover" alt="avatar" /> : <UserCircle size={32} className="text-slate-300 m-auto mt-3" />}
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
                        setEditingStudentForm({
                          name: s.name,
                          login: s.login,
                          password: s.password || '',
                          serie: s.serie || '',
                          ciclo: s.ciclo || 'Anos Iniciais'
                        });
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

      {isAddingStudent && (
        <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-xl z-[1000] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setIsAddingStudent(false)}>
          <div className="bg-white text-indigo-950 w-full max-w-2xl rounded-[4rem] p-10 shadow-2xl relative border-[12px] border-indigo-950 animate-in zoom-in duration-300 my-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsAddingStudent(false)} className="absolute -top-6 -right-6 p-4 bg-red-500 rounded-2xl text-white border-4 border-indigo-950 shadow-xl transition-all">
              <X size={24} strokeWidth={4} />
            </button>
            <h3 className="text-4xl font-black mb-8 text-center italic uppercase tracking-tighter">Novo Aluno</h3>
            
            <form onSubmit={handleAddBulkStudents} className="space-y-8">
              {/* Dados da Sala (Série e Ciclo) */}
              <div className="grid grid-cols-2 gap-6 bg-indigo-50 p-6 rounded-[2.5rem] border-4 border-indigo-100">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-indigo-300 ml-4 tracking-widest">Série/Sala</label>
                  <input
                    required
                    placeholder="Ex: 9ºA"
                    value={bulkSerie}
                    onChange={e => setBulkSerie(e.target.value)}
                    className="w-full p-4 bg-white rounded-2xl outline-none border-4 border-indigo-950 font-black text-indigo-950"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-indigo-300 ml-4 tracking-widest">Ciclo</label>
                  <select
                    value={bulkCiclo}
                    onChange={e => setBulkCiclo(e.target.value as any)}
                    className="w-full p-4 bg-white rounded-2xl outline-none border-4 border-indigo-950 font-black text-indigo-950"
                  >
                    <option value="Anos Iniciais">Anos Iniciais</option>
                    <option value="Anos Finais">Anos Finais</option>
                    <option value="Ensino Médio">Ensino Médio</option>
                  </select>
                </div>
              </div>

              {/* Lista de Alunos */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {bulkStudents.map((s, idx) => (
                  <div key={idx} className="p-6 bg-slate-50 rounded-[2rem] border-4 border-slate-200 relative group">
                    {bulkStudents.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeStudentField(idx)}
                        className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-xl border-2 border-indigo-950 shadow-md opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Minus size={16} strokeWidth={4} />
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Nome</label>
                        <input
                          required
                          placeholder="Nome do Aluno"
                          value={s.name}
                          onChange={e => updateBulkStudent(idx, 'name', e.target.value)}
                          className="w-full p-3 bg-white rounded-xl outline-none border-2 border-indigo-950 font-black text-indigo-950"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Login</label>
                        <input
                          required
                          placeholder="Login"
                          value={s.login}
                          onChange={e => updateBulkStudent(idx, 'login', e.target.value)}
                          className="w-full p-3 bg-white rounded-xl outline-none border-2 border-indigo-950 font-black text-indigo-950"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Senha</label>
                        <input
                          required
                          placeholder="Senha"
                          value={s.password}
                          onChange={e => updateBulkStudent(idx, 'password', e.target.value)}
                          className="w-full p-3 bg-white rounded-xl outline-none border-2 border-indigo-950 font-black text-indigo-950"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={addStudentField}
                  className="flex-1 py-5 bg-indigo-100 text-indigo-600 font-black rounded-2xl border-4 border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,1)] flex items-center justify-center gap-2 uppercase text-xs hover:bg-indigo-200 transition-all"
                >
                  <Plus size={20} strokeWidth={4} /> Adicionar outro aluno
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-5 bg-green-500 text-white font-black rounded-2xl border-4 border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,1)] uppercase text-xs hover:bg-green-600 transition-all"
                >
                  Cadastrar todos os alunos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingStudentId && (
        <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-xl z-[1000] flex items-center justify-center p-4" onClick={() => setEditingStudentId(null)}>
          <div className="bg-white text-indigo-950 w-full max-w-lg rounded-[4rem] p-12 shadow-2xl relative border-[12px] border-indigo-950 animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <button onClick={() => setEditingStudentId(null)} className="absolute -top-6 -right-6 p-4 bg-red-500 rounded-2xl text-white border-4 border-indigo-950 shadow-xl transition-all">
              <X size={24} strokeWidth={4} />
            </button>
            <h3 className="text-4xl font-black mb-10 text-center italic uppercase tracking-tighter">Editar Aluno</h3>
            <form onSubmit={handleEditStudent} className="space-y-6">
              <input
                required
                placeholder="Nome do Aluno"
                value={editingStudentForm.name}
                onChange={e => setEditingStudentForm({ ...editingStudentForm, name: e.target.value })}
                className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none border-4 border-indigo-950 font-black text-indigo-950 text-lg"
              />
              <div className="grid grid-cols-2 gap-6">
                <input
                  required
                  placeholder="Login"
                  value={editingStudentForm.login}
                  onChange={e => setEditingStudentForm({ ...editingStudentForm, login: e.target.value })}
                  className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none border-4 border-indigo-950 font-black text-indigo-950 text-lg"
                />
                <input
                  required
                  placeholder="Senha"
                  value={editingStudentForm.password}
                  onChange={e => setEditingStudentForm({ ...editingStudentForm, password: e.target.value })}
                  className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none border-4 border-indigo-950 font-black text-indigo-950 text-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <input
                  required
                  placeholder="Série"
                  value={editingStudentForm.serie}
                  onChange={e => setEditingStudentForm({ ...editingStudentForm, serie: e.target.value })}
                  className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none border-4 border-indigo-950 font-black text-indigo-950 text-lg"
                />
                <select
                  value={editingStudentForm.ciclo}
                  onChange={e => setEditingStudentForm({ ...editingStudentForm, ciclo: e.target.value as any })}
                  className="w-full p-6 bg-slate-50 rounded-[2rem] outline-none border-4 border-indigo-950 font-black text-indigo-950 text-lg"
                >
                  <option value="Anos Iniciais">Anos Iniciais</option>
                  <option value="Anos Finais">Anos Finais</option>
                  <option value="Ensino Médio">Ensino Médio</option>
                </select>
              </div>
              <button type="submit" className="w-full py-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[2.5rem] shadow-[0_12px_0_0_rgba(30,27,75,1)] transform active:scale-95 active:translate-y-1 active:shadow-none transition-all text-2xl uppercase italic tracking-tighter border-[8px] border-indigo-950">
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {isAvatarPickerOpen && (
        <AvatarPickerModal
          currentAvatarSeed={user.avatarSeed}
          currentAvatarUrl={user.avatarUrl}
          onSelect={(updates) => {
            if (onUpdateProfile) onUpdateProfile(updates);
            setIsAvatarPickerOpen(false);
          }}
          onClose={() => setIsAvatarPickerOpen(false)}
        />
      )}
    </div>
  );
};

export default ProfessorDashboard;
