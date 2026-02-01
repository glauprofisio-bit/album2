import { supabase } from './supabaseClient';
import { AppData, Sticker } from './types';

// Dados iniciais padrão para evitar que o app quebre enquanto carrega
export const initialData: AppData = {
  professors: [],
  students: [],
  stickers: [],
  studentStickers: [],
  currentWeek: 1
};

// Gera as figurinhas padrão caso o banco esteja vazio
const emptyStickers: Sticker[] = Array.from({ length: 45 }, (_, i) => ({
  id: `sticker-${i + 1}`,
  week: i + 1,
  name: i + 1 >= 42 ? `Elo Supremo - Parte ${i - 40}` : `Semana ${i + 1}`,
  imageUrl: '',
  rarity: 'NORMAL'
}));

export const saveData = async (data: AppData) => {
  // O Supabase usa .upsert para salvar ou atualizar registros
  if (data.professors.length > 0) {
    await supabase.from('professors').upsert(data.professors);
  }
  if (data.students.length > 0) {
    await supabase.from('students').upsert(data.students);
  }
};

export const syncWithCloud = async (): Promise<AppData | null> => {
  try {
    // Busca todas as tabelas em paralelo
    const [
      { data: profs },
      { data: studs },
      { data: sticks },
      { data: sSticks }
    ] = await Promise.all([
      supabase.from('professors').select('*'),
      supabase.from('students').select('*'),
      supabase.from('stickers').select('*'),
      supabase.from('student_stickers').select('*')
    ]);

    return {
      professors: profs || [],
      students: studs || [],
      stickers: (sticks && sticks.length > 0) ? sticks : emptyStickers,
      studentStickers: sSticks || [],
      currentWeek: 1
    };
  } catch (error) {
    console.error("Erro na sincronização com Supabase:", error);
    return null;
  }
};
