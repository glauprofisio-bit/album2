import { createClient } from '@supabase/supabase-js';
import { AppData, Sticker } from './types';

const supabaseUrl = 'https://zcrjsvgjnbzawrnajgva.supabase.co';
const supabaseKey = 'sb_publishable_t01dpjzy6r1Qdag45eAMvQ_dJtOBG23';

export const supabase = createClient(supabaseUrl, supabaseKey);

const DB_KEY = 'album_figurinhas_db';

const emptyStickers: Sticker[] = Array.from({ length: 45 }, (_, i) => ({
  id: `sticker-${i + 1}`,
  week: i + 1,
  name: i + 1 >= 42 ? `Elo Supremo - Parte ${i - 40}` : `Semana ${i + 1}`,
  imageUrl: '' 
}));

export const initialData: AppData = {
  professors: [],
  students: [],
  stickers: emptyStickers,
  studentStickers: [],
  currentWeek: 1
};

export const loadData = (): AppData => {
  if (typeof window === 'undefined') return initialData;
  const saved = localStorage.getItem(DB_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return initialData;
    }
  }
  return initialData;
};

export const saveData = async (data: AppData) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DB_KEY, JSON.stringify(data));
  
  // Sincronizar com Supabase
  try {
    // Salvar professores
    for (const prof of data.professors) {
      const { error } = await supabase
        .from('professors')
        .upsert({
          id: prof.id,
          name: prof.name,
          email: prof.email,
          login: prof.login,
          password: prof.password,
          role: prof.role,
          avatar_url: prof.avatarUrl,
          avatar_seed: prof.avatarSeed
        });
      
      if (error) console.error('Erro ao salvar professor:', error);
    }

    // Salvar alunos
    for (const student of data.students) {
      const { error } = await supabase
        .from('students')
        .upsert({
          id: student.id,
          name: student.name,
          email: student.email,
          professor_id: student.professorId,
          avatar_url: student.avatarUrl,
          avatar_seed: student.avatarSeed
        });
      
      if (error) console.error('Erro ao salvar aluno:', error);
    }

    // Salvar figurinhas dos alunos
    for (const ss of data.studentStickers) {
      const { error } = await supabase
        .from('student_stickers')
        .upsert({
          id: ss.id,
          student_id: ss.studentId,
          sticker_id: ss.stickerId,
          collected_at: ss.collectedAt
        });
      
      if (error) console.error('Erro ao salvar figurinha do aluno:', error);
    }
  } catch (e) {
    console.error('Erro ao sincronizar com Supabase:', e);
  }
};

export const syncWithCloud = async (): Promise<AppData | null> => {
  try {
    // Carregar professores
    const { data: profData, error: profError } = await supabase
      .from('professors')
      .select('*');

    if (profError) throw profError;

    // Carregar alunos
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*');

    if (studentError) throw studentError;

    // Carregar figurinhas dos alunos
    const { data: stickerData, error: stickerError } = await supabase
      .from('student_stickers')
      .select('*');

    if (stickerError) throw stickerError;

    const cloudData: AppData = {
      professors: (profData || []).map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        login: p.login,
        password: p.password,
        role: p.role,
        avatarUrl: p.avatar_url,
        avatarSeed: p.avatar_seed
      })),
      students: (studentData || []).map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        professorId: s.professor_id,
        avatarUrl: s.avatar_url,
        avatarSeed: s.avatar_seed
      })),
      stickers: emptyStickers,
      studentStickers: (stickerData || []).map(ss => ({
        id: ss.id,
        studentId: ss.student_id,
        stickerId: ss.sticker_id,
        collectedAt: ss.collected_at
      })),
      currentWeek: 1
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(DB_KEY, JSON.stringify(cloudData));
    }

    return cloudData;
  } catch (e) {
    console.error('Erro ao buscar dados da nuvem:', e);
  }
  return null;
};

export const clearData = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DB_KEY);
    window.location.reload();
  }
};
