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
    // 1. Salvar Professores
    if (appData.professors && appData.professors.length > 0) {
      const profsToUpsert = appData.professors.map(p => ({
        id: p.id.includes('-') ? p.id : undefined, // Só envia ID se for UUID
        name: p.name,
        login: p.login,
        password: p.password,
        role: p.role
      }));
      await supabase.from('professors').upsert(profsToUpsert, { onConflict: 'login' });
    }

    // 2. Salvar Alunos
    if (appData.students && appData.students.length > 0) {
      const studentsToUpsert = appData.students.map(s => ({
        id: s.id.includes('-') ? s.id : undefined,
        name: s.name,
        login: s.login,
        password: s.password,
        professor_id: s.professorId,
        serie: s.serie,
        ciclo: s.ciclo
      }));
      await supabase.from('students').upsert(studentsToUpsert, { onConflict: 'login' });
    }

    // 3. Salvar Presenças (student_stickers)
    if (appData.studentStickers && appData.studentStickers.length > 0) {
      const toUpsert = appData.studentStickers.map(ss => {
        const student = appData.students.find(s => s.id === ss.alunoId || s.login === ss.alunoId);
        return {
          student_id: student ? student.id : ss.alunoId,
          week: ss.week,
          liberada: !!ss.liberada,
          revelada: !!ss.revelada,
          is_falta: !!ss.isFalta
        };
      }).filter(item => item.student_id && item.student_id.includes('-'));

      if (toUpsert.length > 0) {
        const { error } = await supabase.from('student_stickers').upsert(toUpsert, { onConflict: 'student_id, week' });
        if (error) throw error;
      }
    }

    // 4. Salvar Configurações
    await supabase.from('app_settings').upsert({ id: 'global', current_week: appData.currentWeek }, { onConflict: 'id' });

    return { success: true };
  } catch (e: any) {
    console.error('Direct Save Error:', e);
    return { success: false, error: e.message };
  }
}

// Nova função para deletar aluno diretamente no Supabase
export async function deleteStudent(studentId: string): Promise<void> {
  if (studentId.includes('-')) {
    await supabase.from('students').delete().eq('id', studentId);
  } else {
    await supabase.from('students').delete().eq('login', studentId);
  }
}
