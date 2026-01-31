
import React, { useState } from 'react';
import { User, UserRole, AppData } from '../types';
import { KeyRound, Users, UserCircle, Sparkles, Star, Trophy, Zap, GraduationCap } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
  appData: AppData;
}

const Login: React.FC<LoginProps> = ({ onLogin, appData }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedRole === UserRole.ADMIN) {
      if (login === 'Glau' && password === 'Smart200#') {
        onLogin({ id: 'admin', name: 'Administrador Glau', email: 'admin@escola.com', login: 'Glau', role: UserRole.ADMIN });
        return;
      }
    }

    if (selectedRole === UserRole.PROFESSOR) {
      const prof = appData.professors.find(p => p.login === login && p.password === password);
      if (prof) {
        onLogin(prof);
        return;
      }
    }

    if (selectedRole === UserRole.ALUNO) {
      const student = appData.students.find(s => s.login === login && s.password === password);
      if (student) {
        onLogin(student);
        return;
      }
    }

    setError('Login ou senha incorretos!');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden px-4 py-20">
      {/* Background Decorativo Estilo Stickers */}
      <div className="absolute top-[10%] left-[5%] text-yellow-400 opacity-20 animate-float hidden md:block" style={{ animationDelay: '0s' }}>
        <Star size={120} fill="currentColor" />
      </div>
      <div className="absolute bottom-[15%] right-[5%] text-pink-400 opacity-20 animate-float hidden md:block" style={{ animationDelay: '1s' }}>
        <Trophy size={140} fill="currentColor" />
      </div>
      <div className="absolute top-[20%] right-[10%] text-cyan-400 opacity-20 animate-float hidden md:block" style={{ animationDelay: '2s' }}>
        <Zap size={100} fill="currentColor" />
      </div>
      <div className="absolute bottom-[20%] left-[10%] text-emerald-400 opacity-20 animate-float hidden md:block" style={{ animationDelay: '1.5s' }}>
        <Sparkles size={110} fill="currentColor" />
      </div>

      <div className="w-full max-w-xl z-10">
        {/* Container Principal Estilo Card de Colecionador */}
        <div className="bg-white rounded-[4rem] p-10 md:p-16 border-[12px] border-indigo-950 shadow-[0_20px_0_0_rgba(30,27,75,1)] relative overflow-hidden">
          
          {/* Header da Capa */}
          <div className="flex flex-col items-center mb-16 relative">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-400 rounded-full border-8 border-indigo-950 flex items-center justify-center -rotate-12 shadow-xl z-20">
               <span className="font-black text-indigo-950 text-xl leading-none text-center">NOVA<br/>EDIÇÃO</span>
            </div>

            <div className="bg-indigo-600 px-10 py-6 rounded-[2.5rem] border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)] -rotate-2 transform hover:rotate-0 transition-transform duration-300">
               <h1 className="text-4xl md:text-5xl font-black text-center leading-none tracking-tighter uppercase italic text-white drop-shadow-md">
                 ÁLBUM DE<br/>FIGURINHAS
               </h1>
            </div>
            
            <div className="mt-8 text-center space-y-1">
               <p className="text-indigo-950 font-black text-lg uppercase tracking-widest italic">PEI Dr. Disnei</p>
               <div className="bg-pink-100 px-4 py-1 rounded-full border-2 border-pink-200 inline-block">
                 <p className="text-[10px] text-pink-600 font-black uppercase tracking-widest italic">"Cada semana é uma nova conquista!"</p>
               </div>
            </div>
          </div>

          {!selectedRole ? (
            <div className="grid gap-6">
              <p className="text-center font-black text-indigo-950 uppercase tracking-widest text-xs mb-4 opacity-50 italic">Quem vai colecionar hoje?</p>
              
              <button 
                onClick={() => setSelectedRole(UserRole.ALUNO)}
                className="group relative flex items-center justify-between bg-orange-400 hover:bg-orange-500 p-8 rounded-[2.5rem] border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)] hover:translate-y-1 hover:shadow-[0_5px_0_0_rgba(30,27,75,1)] transition-all active:scale-95 -rotate-1"
              >
                <div className="flex items-center gap-6">
                  <div className="bg-white p-4 rounded-2xl border-4 border-indigo-950 shadow-md">
                    <UserCircle size={32} className="text-orange-500" strokeWidth={3} />
                  </div>
                  <div className="text-left">
                    <span className="block text-2xl font-black text-indigo-950 uppercase italic tracking-tighter leading-none">Sou Aluno</span>
                    <span className="text-[10px] font-black text-indigo-900/60 uppercase tracking-widest">Acessar meu álbum</span>
                  </div>
                </div>
                <Zap className="text-white opacity-40 group-hover:animate-pulse" size={24} />
              </button>

              <button 
                onClick={() => setSelectedRole(UserRole.PROFESSOR)}
                className="group relative flex items-center justify-between bg-emerald-400 hover:bg-emerald-500 p-8 rounded-[2.5rem] border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)] hover:translate-y-1 hover:shadow-[0_5px_0_0_rgba(30,27,75,1)] transition-all active:scale-95 rotate-1"
              >
                <div className="flex items-center gap-6">
                  <div className="bg-white p-4 rounded-2xl border-4 border-indigo-950 shadow-md">
                    <GraduationCap size={32} className="text-emerald-500" strokeWidth={3} />
                  </div>
                  <div className="text-left">
                    <span className="block text-2xl font-black text-indigo-950 uppercase italic tracking-tighter leading-none">Sou Professor</span>
                    <span className="text-[10px] font-black text-indigo-900/60 uppercase tracking-widest">Gerenciar turmas</span>
                  </div>
                </div>
                <Users className="text-white opacity-40" size={24} />
              </button>

              <button 
                onClick={() => setSelectedRole(UserRole.ADMIN)}
                className="group relative flex items-center justify-between bg-indigo-500 hover:bg-indigo-600 p-8 rounded-[2.5rem] border-[8px] border-indigo-950 shadow-[0_10px_0_0_rgba(30,27,75,1)] hover:translate-y-1 hover:shadow-[0_5px_0_0_rgba(30,27,75,1)] transition-all active:scale-95 -rotate-1"
              >
                <div className="flex items-center gap-6">
                  <div className="bg-white p-4 rounded-2xl border-4 border-indigo-950 shadow-md">
                    <KeyRound size={32} className="text-indigo-600" strokeWidth={3} />
                  </div>
                  <div className="text-left">
                    <span className="block text-2xl font-black text-indigo-950 uppercase italic tracking-tighter leading-none">Sou Admin</span>
                    <span className="text-[10px] font-black text-indigo-900/60 uppercase tracking-widest">Configurar sistema</span>
                  </div>
                </div>
                <Zap className="text-white opacity-40" size={24} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-8 animate-in fade-in zoom-in duration-300">
              <button 
                type="button"
                onClick={() => setSelectedRole(null)}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-6 py-3 rounded-full text-indigo-950 text-[10px] font-black uppercase tracking-widest border-2 border-slate-200 transition-all mb-4"
              >
                ← Mudar de acesso
              </button>
              
              <div className="text-center">
                 <h2 className="text-4xl font-black text-indigo-950 uppercase italic tracking-tighter leading-none mb-2">
                   Login {selectedRole === UserRole.ADMIN ? 'Mestre' : selectedRole === UserRole.PROFESSOR ? 'Professor' : 'Colecionador'}
                 </h2>
                 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Identifique-se para entrar</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-indigo-300 ml-6 tracking-widest">Seu Usuário</label>
                  <input 
                    type="text" 
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="w-full p-6 rounded-[2rem] border-[6px] border-indigo-950 bg-slate-50 focus:bg-white outline-none transition-all font-black text-indigo-950 text-lg placeholder:opacity-20 shadow-inner"
                    placeholder="Ex: jaozinho123"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-indigo-300 ml-6 tracking-widest">Senha Secreta</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-6 rounded-[2rem] border-[6px] border-indigo-950 bg-slate-50 focus:bg-white outline-none transition-all font-black text-indigo-950 text-lg placeholder:opacity-20 shadow-inner"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-[10px] font-black text-center bg-red-50 p-4 rounded-2xl border-2 border-red-100 uppercase tracking-widest">{error}</p>}

              <button 
                type="submit"
                className="w-full py-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[2.5rem] shadow-[0_12px_0_0_rgba(30,27,75,1)] transform active:scale-95 active:translate-y-1 active:shadow-none transition-all text-2xl uppercase italic tracking-tighter border-[8px] border-indigo-950"
              >
                Entrar no Álbum
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
