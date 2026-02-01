import { AppData, UserRole, Sticker } from './types';

const DB_KEY = 'album_figurinhas_db';
const DB_VERSION_KEY = 'album_db_version';
const CURRENT_DB_VERSION = '1.0.5';

const emptyStickers: Sticker[] = Array.from({ length: 45 }, (_, i) => ({
  id: `sticker-${i + 1}`,
  week: i + 1,
  name: i + 1 >= 42 ? `Elo Supremo - Parte ${i - 40}` : `Semana ${i + 1}`,
  imageUrl: '',
  rarity: 'NORMAL'
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
    } catch {
      return initialData;
    }
  }
  return initialData;
};

export const saveData = (data: AppData) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
    espelharNaNuvem(data);
  }
};

const espelharNaNuvem = async (data: AppData) => {
  try {
    await fetch('/api/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.error("Erro ao subir para nuvem:", err);
  }
};

export const syncWithCloud = async (): Promise<AppData | null> => {
  try {
    const response = await fetch('/api/load-data');
    if (!response.ok) return null;
    
    const cloudData = await response.json();
    const localData = loadData();

    // Mescla Alunos (Protege os novos criados localmente)
    const mergedStudents = [...cloudData.students];
    localData.students.forEach(ls => {
      if (!mergedStudents.find(cs => cs.login === ls.login)) {
        mergedStudents.push(ls);
      }
    });

    // Mescla progresso das Raspadinhas (Protege o "já raspei")
    const mergedStudentStickers = [...cloudData.studentStickers];
    localData.studentStickers.forEach(lss => {
      const cloudSticker = mergedStudentStickers.find(css => css.alunoId === lss.alunoId && css.week === lss.week);
      if (lss.revelada && (!cloudSticker || !cloudSticker.revelada)) {
        if (cloudSticker) cloudSticker.revelada = true;
        else mergedStudentStickers.push(lss);
      }
    });

    const finalData = {
      ...cloudData,
      students: mergedStudents,
      studentStickers: mergedStudentStickers
    };

    localStorage.setItem(DB_KEY, JSON.stringify(finalData));
    return finalData;
  } catch (error) {
    return null;
  }
};
