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
  await supabase.from('config').upsert({ id: 1, current_week: data.currentWeek });
};

export const deleteFromCloud = async (table: 'professors' | 'students', id: string) => {
  await supabase.from(table).delete().eq('id', id);
};

export const syncWithCloud = async (): Promise<AppData | null> => {
  try {
    const { data: profs } = await supabase.from('professors').select('*');
    const { data: studs } = await supabase.from('students').select('*');
    const { data: config } = await supabase.from('config').select('*').single();
    return {
      professors: profs || [],
      students: studs || [],
      stickers: [],
      studentStickers: [],
      currentWeek: config?.current_week || 1
    };
  } catch (error) {
    return null;
  }
};    };
  } catch (error) {
    return null;
  }
};
