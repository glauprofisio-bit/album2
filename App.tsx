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

type SessionUser = Pick<User, 'id' | 'login' | 'name'> & { role: UserRole };

const App: React.FC = () => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [data, setData] = useState<AppData>(initialData);
  const dataRef = useRef<AppData>(initialData);

  const [currentView, setCurrentView] = useState<'dashboard' | 'ranking'>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isBusyRef = useRef(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const performSync = useCallback(async (showLoader = false) => {
    if (isBusyRef.current) return;
    if (showLoader) setIsSyncing(true);
    try {
      const cloudData = await syncWithCloud();
      if (cloudData) {
        setData(cloudData);
        dataRef.current = cloudData;
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
    } finally {
      if (showLoader) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    performSync(true);
    const interval = setInterval(() => performSync(false), 30000);
    return () => clearInterval(interval);
  }, [performSync]);

  const updateData = useCallback(async (newData: Partial<AppData>) => {
    if (isBusyRef.current) return;

    isBusyRef.current = true;
    setIsSaving(true);

    const updatedData = { ...dataRef.current, ...newData };
    setData(updatedData);
    dataRef.current = updatedData;

    try {
      await saveData(updatedData);
    } catch (e) {
      console.error('Erro ao salvar:', e);
    } finally {
      setTimeout(() => {
        isBusyRef.current = false;
        setIsSaving(false);
      }, 350);
    }
  }, []);

  const currentUser = useMemo<User | null>(() => {
    if (!user) return null;

    if (user.id === 'admin') {
      return { ...user, email: 'admin@escola.com', password: '', role: UserRole.ADMIN } as any;
    }

    const d = dataRef.current;

    if (user.role === UserRole.PROFESSOR) {
      const prof = d.professors.find(p => p.id === user.id);
      if (prof) return { ...prof, role: UserRole.PROFESSOR } as any;
    }

    if (user.role === UserRole.ALUNO) {
      const student = d.students.find(s => s.id === user.id);
      if (student) return { ...student, role: UserRole.ALUNO } as any;
    }

    // fallback (só pra não te deixar travada se algum dado vier estranho)
    const p = d.professors.find(p => p.login === user.login);
    if (p) return { ...p, role: UserRole.PROFESSOR } as any;

    const s = d.students.find(s => s.login === user.login);
    if (s) return { ...s, role: UserRole.ALUNO } as any;

    return user as any;
  }, [user]);

  const getAvatarUrl = (u: User) =>
    u.avatarUrl || (u.avatarSeed ? `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${u.avatarSeed}` : null);

  const updateCurrentProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;

    if (currentUser.role === UserRole.PROFESSOR) {
      const nextProfs = dataRef.current.professors.map(p => (p.id === currentUser.id ? { ...p, ...updates } : p));
      await updateData({ professors: nextProfs });
      setUser(prev => (prev ? { ...prev, ...updates } : prev) as any);
      return;
    }

    if (currentUser.role === UserRole.ALUNO) {
      const nextStudents = dataRef.current.students.map(s => (s.id === currentUser.id ? { ...s, ...updates } : s));
      await updateData({ students: nextStudents });
      setUser(prev => (prev ? { ...prev, ...updates } : prev) as any);
      return;
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('dashboard');
  };

  return (
    <div className="min-h-screen bg-indigo-700 flex flex-col font-['Fredoka']">
      {!currentUser ? (
        <Login
          onLogin={(u) => {
            // fixa a sessão por ID + role (isso é o que mata o bug de trocar sozinho)
            setUser({ id: u.id, login: u.login, name: u.name, role: u.role });
            setCurrentView('dashboard');
          }}
          appData={data}
        />
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

              <button onClick={handleLogout} className="bg-red-500 p-2 rounded-xl border-4 border-indigo-950 text-white">
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
