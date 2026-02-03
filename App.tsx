// src/App.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, UserRole, AppData } from './types';
import { saveData, syncWithCloud, initialData } from './db';
import Login from './views/Login';
import AdminDashboard from './views/AdminDashboard';
import ProfessorDashboard from './views/ProfessorDashboard';
import StudentDashboard from './views/StudentDashboard';
import HallOfFame from './views/HallOfFame';
import { LogOut, Trophy, LayoutDashboard, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<AppData>(initialData);
  const [currentView, setCurrentView] = useState<'dashboard' | 'ranking'>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isBusyRef = useRef(false);
  const pendingUpdateRef = useRef<AppData | null>(null);

  const performSync = useCallback(async (showLoader = false) => {
    // Se estiver salvando ou houver atualizações pendentes, NÃO sincroniza do cloud
    // Isso evita que os dados "sumam" da tela antes de serem gravados no banco
    if (isBusyRef.current || pendingUpdateRef.current) return;

    if (showLoader) setIsSyncing(true);
    try {
      const cloudData = await syncWithCloud();
      // Só atualiza se o cloud trouxer dados e não estivermos no meio de uma operação local
      if (cloudData && !isBusyRef.current && !pendingUpdateRef.current) {
        setData(cloudData);
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
    } finally {
      if (showLoader) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    performSync(true);
    // DESATIVADO: Sincronização automática agressiva removida para evitar perda de dados local
    // const interval = setInterval(() => performSync(false), 30000);
    // return () => clearInterval(interval);
  }, [performSync]);

  const updateData = async (newData: Partial<AppData>) => {
    // 1. Calcular o novo estado imediatamente
    const updatedData = { ...data, ...newData };
    
    // 2. Atualizar a UI imediatamente (Otimista)
    setData(updatedData);

    // 3. Gerenciar a fila de salvamento
    if (isBusyRef.current) {
      // Se já estiver salvando, apenas atualizamos o que precisa ser salvo na próxima rodada
      pendingUpdateRef.current = updatedData;
      return;
    }

    isBusyRef.current = true;
    setIsSaving(true);

    const trySave = async (dataToSave: AppData) => {
      try {
        await saveData(dataToSave);
        
        if (pendingUpdateRef.current) {
          const nextData = pendingUpdateRef.current;
          pendingUpdateRef.current = null;
          await trySave(nextData);
        }
      } catch (e: any) {
        console.error('Erro ao salvar dados:', e);
        // MOSTRAR ERRO NA TELA PARA O USUÁRIO
        alert('ERRO AO SALVAR NO BANCO: ' + (e.message || 'Erro desconhecido'));
        // NÃO rodar performSync(true) em caso de erro para não apagar o que o usuário fez
      }
    };

    try {
      await trySave(updatedData);
    } finally {
      isBusyRef.current = false;
      setIsSaving(false);
    }
  };

  // ✅ RESOLVE USUÁRIO PELO ID (evita “voltar pro aluno”)
  const currentUser = useMemo(() => {
    if (!user) return null;

    if (user.id === 'admin') return { ...user, role: UserRole.ADMIN };

    const prof = data.professors.find(p => p.id === user.id);
    if (prof) return { ...prof, role: UserRole.PROFESSOR };

    const student = data.students.find(s => s.id === user.id);
    if (student) return { ...student, role: UserRole.ALUNO };

    return user;
  }, [user, data.professors, data.students]);

  const getAvatarUrl = (u: User) =>
    u.avatarUrl || (u.avatarSeed ? `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${u.avatarSeed}` : null);

  const updateCurrentProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;

    if (currentUser.role === UserRole.PROFESSOR) {
      const nextProfs = data.professors.map(p => (p.id === currentUser.id ? { ...p, ...updates } : p));
      await updateData({ professors: nextProfs });
      setUser({ ...currentUser, ...updates });
      return;
    }

    if (currentUser.role === UserRole.ALUNO) {
      const nextStudents = data.students.map(s => (s.id === currentUser.id ? { ...s, ...updates } : s));
      await updateData({ students: nextStudents });
      setUser({ ...currentUser, ...updates });
      return;
    }
  };

  return (
    <div className="min-h-screen bg-indigo-700 flex flex-col font-['Fredoka']">
      {!currentUser ? (
        <Login onLogin={setUser} appData={data} />
      ) : (
        <>
          <header className="p-4 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto bg-white rounded-[2rem] p-3 flex justify-between items-center border-[6px] border-indigo-950 shadow-[0_8px_0_0_rgba(30,27,75,1)]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView(currentView === 'dashboard' ? 'ranking' : 'dashboard')}
                  className="bg-indigo-600 text-white p-2 rounded-xl border-4 border-indigo-950"
                >
                  {currentView === 'dashboard' ? <Trophy size={20} /> : <LayoutDashboard size={20} />}
                </button>

                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg border-4 border-indigo-950 overflow-hidden relative bg-slate-100">
                    {getAvatarUrl(currentUser) ? <img src={getAvatarUrl(currentUser)!} alt="avatar" /> : null}
                    {(isSyncing || isSaving) && (
                      <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                        <RefreshCw size={14} className="animate-spin text-indigo-600" />
                      </div>
                    )}
                  </div>
                  <span className="font-black uppercase text-xs text-indigo-950">{currentUser.name}</span>
                </div>
              </div>

              <button onClick={() => setUser(null)} className="bg-red-500 p-2 rounded-xl border-4 border-indigo-950 text-white">
                <LogOut size={20} />
              </button>
            </div>
          </header>

          <main className="flex-1 w-full max-w-6xl mx-auto p-4">
            {currentView === 'ranking' ? (
              <HallOfFame data={data} onClose={() => setCurrentView('dashboard')} />
            ) : currentUser.role === UserRole.ADMIN ? (
              <AdminDashboard data={data} updateData={updateData} />
            ) : currentUser.role === UserRole.PROFESSOR ? (
              <ProfessorDashboard user={currentUser} data={data} updateData={updateData} onUpdateProfile={updateCurrentProfile} />
            ) : (
              <StudentDashboard user={currentUser} data={data} updateData={updateData} onUpdateProfile={updateCurrentProfile} />
            )}
          </main>
        </>
      )}
    </div>
  );
};

export default App;
