import { supabase } from './supabaseClient';
import { AppData, Sticker } from './types';

export const initialData: AppData = {
  professors: [],
  students: [],
  stickers: [],
  studentStickers: [],
  currentWeek: 1
};

// Função para manter o App.tsx feliz
export const loadData = () => initialData;

export const saveData = async (data: AppData) => {
  if (data.professors.length > 0) await supabase.from('professors').upsert(data.professors);
  if (data.students.length > 0) await supabase.from('students').upsert(data.students);
};

export const syncWithCloud = async (): Promise<AppData | null> => {
  try {
    const { data: profs } = await supabase.from('professors').select('*');
    const { data: studs } = await supabase.from('students').select('*');
    const { data: sSticks } = await supabase.from('student_stickers').select('*');

    return {
      professors: profs || [],
      students: studs || [],
      stickers: [], // As figurinhas vamos carregar depois
      studentStickers: sSticks || [],
      currentWeek: 1
    };
  } catch (error) {
    return null;
  }
};
