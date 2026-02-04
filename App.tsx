// src/App.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, UserRole, AppData } from './types';
import { saveData, syncWithCloud, initialData } from './db';
import Login from './views/Login';
import AdminDashboard from './views/AdminDashboard';
import ProfessorDashboard from './views/ProfessorDashboard';
import StudentDashboard from './views/StudentDashboard';
import HallOfFame from './views/HallOfFame';
import { LogOut, Trophy, LayoutDashboard, RefreshCw, Cloud } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<AppData>(initialData);
  const [currentView, setCurrentView] = useState<'dashboard' | 'ranking'>('dashboard');

  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // status real da nuvem
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);

  const isBusyRef = useRef(false);
  const pendingUpdateRef = useRef<AppData | null>(null);

  const performSync = useCallback(async (showLoader = false) => {
    if (isBusyRef.current || pendingUpdateRef.current) return;

    if (showLoader) setIsSyncing(true);
    setCloudMessage(null);

    try {
      const cloudData = await syncWithCloud();

      if (cloudData) {
        setData(cloudData);
      } else {
        throw new Error('Falha no sync');
      }
    } catch (e) {
      console.error('Erro na sincronização:', e);
      setCloudMessage('Estamos configurando as novas figurinhas. Tente novamente em instantes.');
    } finally {
      if (showLoader) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    performSync(true);
  }, [performSync]);

  const updateData = async (newData: Partial<AppData>) => {
    const updatedData = { ...data, ...newData };
    setData(updatedData);

    if (isBusyRef.current) {
      pendingUpdateRef.current = updatedData;
      return;
    }

    isBusyRef.current = true;
    setIsSaving(true);
    setCloudMessage(null);

    const trySave = async (payload: AppData) => {
      try {
        const result = await saveData(payload);
        if (!result.success) throw new Error(result.error || 'Falha no salvamento');

        if (pendingUpdateRef.current) {
          const next = pendingUpdateRef.current;
          pendingUpdateRef.current = null;
          await trySave(next);
        }
      } catch (e) {
        console.error('Erro ao salvar:', e);
        pendingUpdateRef.current = null;
        setCloudMessage(
          'Derrubaram um balde de cola nas figurinhas! 🎨 A Rita já pegou o culpado no flagra e está supervisionando a limpeza para a mágica voltar. Tente de novo em breve!'
        );
      }
    };

    try {
      await trySave(updatedData);
    } finally {
      isBusyRef.current = false;
      setIsSaving(false);
    }
  };

  const currentUser = useMemo(() => {
    if (!user) return null;
    if (user.id === 'admin') return { ...user, role: UserRole.ADMIN };

    const prof = data.professors.find(p => String(p.id) === String(user.id));
    if (prof) return { ...prof, role: UserRole.PROFESSOR };

    const student = data.students.find(s => String(s.id) === String(user.id));
    if (student) return { ...student, role: UserRole.ALUNO };

    return user;
  }, [user, data]);

  // bottts em todo o app (header inclusive)
  const getAvatarUrl = (u: User) =>
    u.avatarUrl || (u.avatarSeed ? `https://api.dicebear.com/9.x/bottts/svg?seed=${u.avatarSeed}` : null);

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

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg border-4 border-indigo-950 overflow-hidden relative bg-slate-100">
                    {getAvatarUrl(currentUser) && <img src={getAvatarUrl(currentUser)!} alt="avatar" />}

                    {(isSyncing || isSaving) && (
                      <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                        <RefreshCw size={14} className="animate-spin text-indigo-600" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col leading-tight">
                    <span className="font-black uppercase text-xs text-indigo-950">{currentUser.name}</span>

                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-500">
                      <Cloud size={12} />
                      {cloudMessage
                        ? cloudMessage
                        : isSaving
                        ? 'Salvando...'
                        : isSyncing
                        ? 'Sincronizando...'
                        : 'Sincronizado'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setUser(null)}
                className="bg-red-500 p-2 rounded-xl border-4 border-indigo-950 text-white"
              >
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
              <ProfessorDashboard user={currentUser} data={data} updateData={updateData} />
            ) : (
              <StudentDashboard user={currentUser} data={data} updateData={updateData} />
            )}
          </main>
        </>
      )}
    </div>
  );
};

export default App;
