import type { AppData } from './types';

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
    const res = await fetch('/api/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appData),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false, error: json?.error || 'Falha no salvamento (api/save-data)' };
    }

    return { success: true };
  } catch (e: any) {
    console.error('saveData error:', e);
    return { success: false, error: e?.message || String(e) };
  }
}

// Agora deletar aluno também passa pela API (não salva direto no Supabase no browser)
export async function deleteStudent(studentId: string): Promise<void> {
  const res = await fetch('/api/delete-student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error || 'Falha ao deletar aluno');
  }
}
