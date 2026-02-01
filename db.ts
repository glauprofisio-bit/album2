import { supabase } from './supabaseClient';
import { AppData, Sticker } from './types';

const emptyStickers: Sticker[] = Array.from({ length: 45 }, (_, i) => ({
  id: `sticker-${i + 1}`,
  week: i + 1,
  name: i + 1 >= 42 ? `Elo Supremo - Parte ${i - 40}` : `Semana ${i + 1}`,
  imageUrl: '',
  rarity: 'NORMAL' // Isso é apenas um padrão inicial, o banco vai atualizar isso!
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

// Mantendo compatibilidade com o resto do seu app
export const loadData = async (): Promise<AppData> => {
  const professors = await loadFromSupabase('professors');
  const students = await loadFromSupabase('students');
  const stickers = await loadFromSupabase('stickers');

  return {
    professors,
    students,
    stickers: stickers.length > 0 ? stickers : emptyStickers,
    studentStickers: await loadFromSupabase('student_stickers'),
    currentWeek: 1
  };
};

export const saveData = async (data: AppData) => {
  await saveToSupabase('professors', data.professors);
  await saveToSupabase('students', data.students);
};
    return finalData;
  } catch (error) {
    return null;
  }
};
