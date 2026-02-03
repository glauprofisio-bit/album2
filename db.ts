import type { AppData } from './types';
import { supabase } from './supabaseClient';

export const initialData: AppData = {
  professors: [],
  students: [],
  stickers: Array.from({ length: 45 }, (_, i) => {
    const week = i + 1;
    return {
      id: `sticker-${week}`,
      week,
      name: week >= 42 ? `Elo Supremo - Parte ${week - 40}` : `Semana ${week}`,
      imageUrl: '',
      rarity: 'NORMAL'
    };
  }),
  studentStickers: [],
  currentWeek: 1
};

export async function syncWithCloud(): Promise<AppData | null> {
  try {
    const res = await fetch('/api/load-data', { method: 'GET' });
    if (!res.ok) return null;
    const data = await res.json();
    return data as AppData;
  } catch (e) {
    console.error('syncWithCloud error:', e);
    return null;
  }
}

export async function saveData(appData: AppData): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Salvar student_stickers diretamente no Supabase
    if (appData.studentStickers && appData.studentStickers.length > 0) {
      const toUpsert = appData.studentStickers.map(ss => ({
        student_id: ss.alunoId,
        week: ss.week,
        liberada: !!ss.liberada,
        revelada: !!ss.revelada,
        is_falta: !!ss.isFalta
      }));

      const { error } = await supabase
        .from('student_stickers')
        .upsert(toUpsert, { onConflict: 'student_id, week' });

      if (error) throw error;
    }

    // 2. Salvar currentWeek se necessário
    await supabase
      .from('app_settings')
      .upsert({ id: 'global', current_week: appData.currentWeek }, { onConflict: 'id' });

    return { success: true };
  } catch (e: any) {
    console.error('Direct Save Error:', e);
    // Tenta via API como fallback se o Supabase direto falhar (opcional)
    return { success: false, error: e.message };
  }
}
