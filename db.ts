import { supabase } from './supabaseClient';
import { AppData, Sticker } from './types';

const emptyStickers: Sticker[] = Array.from({ length: 45 }, (_, i) => ({
  id: `sticker-${i + 1}`,
  week: i + 1,
  name: i + 1 >= 42 ? `Elo Supremo - Parte ${i - 40}` : `Semana ${i + 1}`,
  imageUrl: '',
  rarity: 'NORMAL'
}));

export const saveToSupabase = async (table: string, data: any) => {
  try {
    const { error } = await supabase.from(table).upsert(data);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Erro ao salvar:", e);
    return false;
  }
};

export const loadFromSupabase = async (table: string) => {
  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
};

export const loadData = async (): Promise<AppData> => {
  const professors = await loadFromSupabase('professors');
  const students = await loadFromSupabase('students');
  const stickers = await loadFromSupabase('stickers');
  const studentStickers = await loadFromSupabase('student_stickers');

  return {
    professors: professors || [],
    students: students || [],
    stickers: stickers.length > 0 ? stickers : emptyStickers,
    studentStickers: studentStickers || [],
    currentWeek: 1
  };
};

export const saveData = async (data: AppData) => {
  // Salva professores e alunos de uma vez no banco
  if (data.professors.length > 0) await saveToSupabase('professors', data.professors);
  if (data.students.length > 0) await saveToSupabase('students', data.students);
};
