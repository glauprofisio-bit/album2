import { supabase } from './supabaseClient';
import { AppData } from './types';

export const initialData: AppData = {
  professors: [],
  students: [],
  stickers: [],
  studentStickers: [],
  currentWeek: 1
};

export const loadData = () => initialData;

export const saveData = async (data: AppData) => {
  if (data.professors.length > 0) await supabase.from('professors').upsert(data.professors);
  if (data.students.length > 0) await supabase.from('students').upsert(data.students);
  await supabase.from('config').upsert({ id: 1, current_week: data.current_week });
};

export const deleteFromCloud = async (table: 'professors' | 'students', id: string) => {
  await supabase.from(table).delete().eq('id', id);
};

export const syncWithCloud = async (): Promise<AppData | null> => {
  try {
    const { data: profs } = await supabase.from('professors').select('*');
    const { data: studs } = await supabase.from('students').select('*');
    const { data: configs } = await supabase.from('config').select('*').single();
    const { data: sticks } = await supabase.from('stickers').select('*');

    return {
      professors: profs || [],
      students: studs || [],
      stickers: sticks || [],
      studentStickers: [],
      currentWeek: configs?.current_week || 1
    };
  } catch (error) {
    return null;
  }
};
