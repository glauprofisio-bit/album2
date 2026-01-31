
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, AppData } from './types';
import { loadData, saveData, syncWithCloud } from './db';
import Login from './views/Login';
import AdminDashboard from './views/AdminDashboard';
import ProfessorDashboard from './views/ProfessorDashboard';
import StudentDashboard from './views/StudentDashboard';
import HallOfFame from './views/HallOfFame';
import { LogOut, Trophy, LayoutDashboard, UserCircle, RefreshCw, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<AppData>(loadData());
  const [currentView, setCurrentView] = useState<'dashboard' | 'ranking'>('dashboard');
  const [isSyncing, setIsSyncing] = useState(true);

  // Sincroniza com a nuvem ao abrir o app
  useEffect(() => {
    const performSync = async () => {
      setIsSyncing(true);
      try {
        const cloudData = await syncWithCloud();
        if (cloudData) {
          setData(cloudData);
        }
      } catch (error) {
        console.error("Falha na sincronização inicial:", error);
      } finally {
        setIsSyncing(false);
      }
    };
    performSync();
  }, []);

  // Salva na nuvem sempre que os dados mudarem (apenas se não estiver sincronizando)
  useEffect(() => { 
    if (!isSyncing) {
      saveData(data);
    }
  }, [data, isSyncing]);

  const updateData = (newData: Partial<AppData>) => { 
    setData(prev => ({ ...prev, ...newData })); 
  };

  const updateUserProfile = (userId: string, profileUpdates: Partial<User>) => {
    if (currentUser?.role === UserRole.ALUNO) {
      const newStudents = data.students.map(s => s.id === userId ? { ...s, ...profileUpdates } : s);
      updateData({ students: newStudents });
    } else if (currentUser?.role === UserRole.PROFESSOR) {
      const newProfs = data.professors.map(p => p.id === userId ? { ...p, ...profileUpdates } : p);
      updateData({ professors: newProfs });
    }
  };

  const currentUser = useMemo(() => {
    if (!user) return null;
    if (user.role === UserRole.ALUNO) {
      return data.students.find(s => s.id === user.id) || user;
    }
    if (user.role === UserRole.PROFESSOR) {
      return data.professors.find(p => p.id === user.id) || user;
    }
    return user;
  }, [user, data.students, data.professors]);

  const handleLogout = () => {
    setUser(null);
    setCurrentView('dashboard');
  };

  const getAvatarUrl = (u: User) => {
    if (u.avatarUrl) return u.avatarUrl;
    if (u.avatarSeed) return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${u.avatarSeed}`;
    return null;
  };

  // Tela de carregamento inicial
  if (isSyncing && !user) {
    return (
      <div className="min-h-screen bg-indigo-700 flex flex-col items-center justify-center font-['Fredoka']">
        <div className="bg-white p-12 rounded-[3rem] border-[10px] border-indigo-950 shadow-[0_15px_0_0_rgba(30,27,75,1)] flex flex-col items-center gap-6">
          <Loader2 size={64} className="animate-spin text-indigo-600" />
          <p className="font-black text-indigo-950 uppercase tracking-widest text-center">
            Abrindo o Álbum...<br/>
            <span className="text-[10px] opacity-50">Sincronizando figurinhas</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-700 flex flex-col font-['Fredoka']">
      {currentUser && (
        <header className="p-4 md:p-6 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto bg-white rounded-[2.5rem] p-3 md:p-4 flex justify-between items-center border-[6px] border-indigo-950 shadow-[0_8px_0_0_rgba(30,27,75,1)]">
            <div className="flex items-center gap-3 md:gap-4">
               {(currentUser.role === UserRole.ALUNO || currentUser.role === UserRole.PROFESSOR) && (
                 <button 
                   onClick={() => setCurrentView(currentView === 'dashboard' ? 'ranking' : 'dashboard')}
                   className={`p-3 md:p-4 rounded-2xl transition-all border-4 border-indigo-950 shadow-md active:scale-95 flex items-center gap-2 font-black uppercase text-[10px] tracking-widest ${currentView === 'ranking' ? 'bg-yellow-400 text-indigo-950' : 'bg-indigo-600 text-white'}`}
                 >
                   {currentView === 'dashboard' ? (
                     <><Trophy size={18} /> Ranking</>
                   ) : (
                     <><LayoutDashboard size={18} /> {currentUser.role === UserRole.ALUNO ? 'Álbum' : 'Painel'}</>
                   )}
                 </button>
               )}
               
               <div className="flex items-center gap-3 ml-2">
                 <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl border-4 border-indigo-950 bg-slate-100 overflow-hidden flex-shrink-0 relative">
                    {getAvatarUrl(currentUser) ? (
                      <img src={getAvatarUrl(currentUser)!} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-indigo-200"><UserCircle size={24} /></div>
                    )}
                    {isSyncing && (
                      <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                        <RefreshCw size={16} className="animate-spin text-indigo-600" />
                      </div>
                    )}
                 </div>
                 <div className="hidden sm:flex flex-col">
                   <h1 className="font-black text-sm md:text-base leading-none tracking-tighter uppercase italic text-indigo-950">
                     {currentUser.name}
                   </h1>
                   <p className="text-[8px] text-indigo-500 mt-0.5 uppercase font-black tracking-[0.1em] leading-none">
                     {currentUser.role === UserRole.ADMIN ? 'Admin' : currentUser.role === UserRole.PROFESSOR ? 'Professor' : 'Colecionador'}
                   </p>
                 </div>
               </div>
            </div>

            <div className="flex items-center gap-2">
               <button 
                 onClick={handleLogout} 
                 className="bg-indigo-950 hover:bg-red-600 transition-all p-3 md:p-4 rounded-2xl text-white active:scale-90 shadow-lg border-4 border-indigo-950"
               >
                 <LogOut size={20} strokeWidth={3} />
               </button>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-6">
        {!currentUser ? (
          <Login onLogin={setUser} appData={data} onSync={setData} />
        ) : currentView === 'ranking' ? (
          <HallOfFame data={data} onClose={() => setCurrentView('dashboard')} />
        ) : (
          currentUser.role === UserRole.ADMIN ? <AdminDashboard data={data} updateData={updateData} /> :
          currentUser.role === UserRole.PROFESSOR ? (
            <ProfessorDashboard 
              user={currentUser} 
              data={data} 
              updateData={updateData} 
              onUpdateProfile={(updates) => updateUserProfile(currentUser.id, updates)} 
            />
          ) : (
            <StudentDashboard 
              user={currentUser} 
              data={data} 
              onReveal={(w) => updateData({ studentStickers: data.studentStickers.map(s => s.alunoId === currentUser.id && s.week === w ? {...s, revelada: true} : s)})} 
              updateData={updateData}
              onUpdateProfile={(updates) => updateUserProfile(currentUser.id, updates)}
            />
          )
        )}
      </main>

      <footer className="p-8 text-center text-[10px] text-white/30 uppercase font-black tracking-[0.5em] italic">
        PEI E.E. Dr. Disnei Francisco Scornaienchi • Álbum Digital 2026
      </footer>
    </div>
  );
};

export default App;
