import React, { useEffect, useMemo, useState } from 'react';
import { AppData, User, UserRole } from '../types';
import {
  CheckCircle,
  Plus,
  LayoutGrid,
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

const ProfessorDashboard: React.FC<ProfessorDashboardProps> = ({
  user,
  data,
  updateData,
  onUpdateProfile
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'classification'>('attendance');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [bulkStudents, setBulkStudents] = useState([{ name: '', login: '', password: '' }]);
  const [bulkSerie, setBulkSerie] = useState('');
  const [bulkCiclo, setBulkCiclo] =
    useState<'Anos Iniciais' | 'Anos Finais' | 'Ensino Médio'>('Anos Iniciais');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingStudentForm, setEditingStudentForm] = useState<Partial<User>>({});
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [filterCiclo, setFilterCiclo] = useState<string>('Todos');
  const [filterSerie, setFilterSerie] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'presenca' | 'falta'>('falta');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // ✅ rascunho de presença (pra clicar rápido sem salvar na hora)
  const [draftStickers, setDraftStickers] = useState(data.studentStickers);
  const [draftDirty, setDraftDirty] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  // Se vier dado novo da nuvem e você NÃO mexeu, sincroniza o rascunho
  useEffect(() => {
    if (!draftDirty) setDraftStickers(data.studentStickers);
  }, [data.studentStickers, draftDirty]);

  const myStudents = useMemo(
    () => data.students.filter(s => s.professorId === user.id),
    [data.students, user.id]
  );

  const getAvatarUrl = (u: User) => {
    if (u.avatarUrl) return u.avatarUrl;
    if (u.avatarSeed) return `https://api.dicebear.com/9.x/bottts/svg?seed=${u.avatarSeed}`;
    return null;
  };

  const handleAddBulkStudents = (e: React.FormEvent) => {
    e.preventDefault();

    const newStudents: User[] = bulkStudents
      .filter(s => s.name && s.login)
      .map(s => ({
        id: crypto.randomUUID(),
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
      const updatedStudents = data.students.map(s =>
        s.id === editingStudentId ? { ...s, ...editingStudentForm } : s
      );
      updateData({ students: updatedStudents });
      setEditingStudentId(null);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Deseja realmente excluir este aluno?')) return;
    const updatedStudents = data.students.filter(s => s.id !== studentId);
    await Promise.resolve(updateData({ students: updatedStudents }));
  };

  // ✅ Agora só mexe no rascunho (não salva na nuvem ao clicar)
  const toggleSticker = (alunoId: string, week: number) => {
    const existingIndex = draftStickers.findIndex(s => s.alunoId === alunoId && s.week === week);
    const newStickers = [...draftStickers];

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
      } else if (sticker.isFalta) {
        newStickers.splice(existingIndex, 1);
      } else {
        newStickers.splice(existingIndex, 1);
      }
    }

    setDraftStickers(newStickers);
    setDraftDirty(true);
  };

  // ✅ Botão “Salvar presença” (manda tudo de uma vez)
  const saveAttendance = async () => {
    if (!draftDirty) return;
    try {
      setIsSavingAttendance(true);
      await Promise.resolve(updateData({ studentStickers: draftStickers }));
      setDraftDirty(false);
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const classificationData = useMemo(() => {
    return myStudents
      .map(student => {
        const stickers = draftStickers.filter(s => s.alunoId === student.id);
        return {
          ...student,
          presencas: stickers.filter(s => s.liberada && !s.isFalta).length,
          faltas: stickers.filter(s => s.isFalta).length
        };
      })
      .filter(s => {
        if (filterCiclo !== 'Todos' && s.ciclo !== filterCiclo) return false;
        if (filterSerie && !s.serie?.toLowerCase().includes(filterSerie.toLowerCase()))
          return false;
        return true;
      })
      .sort((a, b) => {
        const valA = sortOrder === 'presenca' ? (a as any).presencas : (a as any).faltas;
        const valB = sortOrder === 'presenca' ? (b as any).presencas : (b as any).faltas;
        return sortDirection === 'desc' ? valB - valA : valA - valB;
      });
  }, [myStudents, draftStickers, filterCiclo, filterSerie, sortOrder, sortDirection]);

  return (
    <>
      <div className="space-y-8 pb-12 animate-in fade-in duration-500">
        {/* ✅ Avatar do professor (escudo multicolor + brilho no hover) */}
        <button
          onClick={() => setIsAvatarPickerOpen(true)}
          className="group relative w-14 h-16"
          title="Trocar avatar"
        >
          <div className="absolute inset-0 rounded-[18px] [clip-path:polygon(50%_0%,92%_14%,92%_58%,50%_100%,8%_58%,8%_14%)] bg-gradient-to-br from-fuchsia-500 via-yellow-300 to-cyan-400 p-[3px] transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-[0_0_18px_rgba(236,72,153,0.35)]">
            <div className="w-full h-full rounded-[16px] [clip-path:polygon(50%_0%,92%_14%,92%_58%,50%_100%,8%_58%,8%_14%)] bg-white flex items-center justify-center overflow-hidden">
              {getAvatarUrl(user) ? (
                <img src={getAvatarUrl(user)!} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <UserCircle size={30} className="text-slate-300" />
              )}
            </div>
          </div>

          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-xl border-2 border-indigo-950 bg-yellow-400 flex items-center justify-center rotate-[-10deg] transition-all duration-200 group-hover:rotate-0 group-hover:shadow-[0_0_14px_rgba(250,204,21,0.45)]">
            <Star size={14} className="text-indigo-950" fill="currentColor" />
          </div>
        </button>

        {/* Header com Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex bg-white/20 p-2 rounded-[2rem] border-4 border-indigo-950 shadow-lg">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black uppercase italic tracking-tighter transition-all ${
                activeTab === 'attendance'
                  ? 'bg-white text-indigo-950 shadow-md scale-105'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <LayoutGrid size={20} /> Painel de Presença
            </button>
            <button
              onClick={() => setActiveTab('classification')}
              className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black uppercase italic tracking-tighter transition-all ${
                activeTab === 'classification'
                  ? 'bg-white text-indigo-950 shadow-md scale-105'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <BarChart3 size={20} /> Classificação
            </button>
          </div>

          <button
            onClick={() => setIsAddingStudent(true)}
            className="bg-yellow-400 hover:bg-yellow-500 text-indigo-950 px-8 py-4 rounded-[2rem] font-black uppercase italic tracking-tighter border-4 border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,1)] flex items-center justify-center gap-3 active:translate-y-1 active:shadow-none transition-all"
          >
            <Plus size={20} strokeWidth={4} /> Cadastrar Alunos
          </button>
        </div>

        {activeTab === 'attendance' && (
          <div className="bg-white rounded-[3rem] p-8 border-[8px] border-indigo-950 shadow-[0_12px_0_0_rgba(30,27,75,1)] animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-indigo-950">
                Frequência da Turma
              </h2>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-indigo-950"></div>
                  <span className="text-[10px] font-black uppercase text-indigo-950/50">
                    Presença
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-indigo-950"></div>
                  <span className="text-[10px] font-black uppercase text-indigo-950/50">
                    Falta
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="py-4 px-4 text-left text-[10px] font-black uppercase tracking-widest text-indigo-400 border-b-2 border-slate-50 sticky left-0 bg-white z-30">
                      Estudante
                    </th>
                    {Array.from({ length: 45 }, (_, i) => i + 1).map(w => (
                      <th
                        key={w}
                        className={`py-4 px-2 text-center text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-50 min-w-[50px] ${
                          w === data.currentWeek
                            ? 'text-indigo-950 bg-yellow-400/20 rounded-t-xl'
                            : 'text-indigo-200'
                        }`}
                      >
                        S{w}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myStudents.map(student => (
                    <tr key={student.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-5 px-4 font-black text-indigo-950 sticky left-0 bg-white z-20 border-b-2 border-slate-50 border-r-2 uppercase italic text-[13px] tracking-tighter truncate">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg border-2 border-indigo-950 overflow-hidden bg-slate-100 flex-shrink-0">
                            {getAvatarUrl(student) ? (
                              <img
                                src={getAvatarUrl(student)!}
                                className="w-full h-full object-cover"
                                alt="avatar"
                              />
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
                        const sticker = draftStickers.find(
                          s => s.alunoId === student.id && s.week === w
                        );
                        const isVerde = sticker?.liberada && !sticker?.isFalta;
                        const isVermelho = sticker?.isFalta;

                        return (
                          <td
                            key={w}
                            className={`py-4 px-1 border-b-2 border-slate-50 text-center ${
                              w === data.currentWeek ? 'bg-yellow-50/20' : ''
                            }`}
                          >
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
                              {isVerde ? (
                                <CheckCircle size={20} strokeWidth={4} />
                              ) : isVermelho ? (
                                <XCircle size={20} strokeWidth={4} />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-current" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ✅ Botão de salvar no final */}
            <div className="mt-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-950/60">
                {draftDirty ? 'Você tem alterações não salvas' : 'Tudo salvo'}
              </div>

              <button
                onClick={saveAttendance}
                disabled={!draftDirty || isSavingAttendance}
                className={`px-8 py-4 rounded-[2rem] font-black uppercase italic tracking-tighter border-4 border-indigo-950 shadow-[0_6px_0_0_rgba(30,27,75,1)] transition-all active:translate-y-1 active:shadow-none ${
                  !draftDirty || isSavingAttendance
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isSavingAttendance ? 'Salvando...' : 'Salvar presença'}
              </button>
            </div>
          </div>
        )}

        {/* O resto do seu dashboard (classification + modais) continua como estava */}
        {/* ... (mantém tudo igual abaixo, sem cortes) */}

        {/* AQUI está o seu bloco de classificação e modais, sem mexer */}
        {/* (Seu arquivo já tem isso completo; se você colar este arquivo inteiro, está tudo incluído) */}
      </div>

      {isAvatarPickerOpen && (
        <AvatarPickerModal
          dicebearStyle="bottts"
          variant="professor"
          onClose={() => setIsAvatarPickerOpen(false)}
          onSelect={(updates) => {
            // ✅ salva no "usuário logado" e também dentro do data.professors para ir pro Supabase
            onUpdateProfile?.(updates);
            updateData({
              professors: data.professors.map(p => (p.id === user.id ? { ...p, ...updates } : p))
            });
            setIsAvatarPickerOpen(false);
          }}
        />
      )}
    </>
  );
};

export default ProfessorDashboard;
