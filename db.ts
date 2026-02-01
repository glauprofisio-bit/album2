
import { AppData, Sticker } from './types';

const DB_KEY = 'album_figurinhas_db';

const emptyStickers: Sticker[] = Array.from({ length: 45 }, (_, i) => ({
  id: `sticker-${i + 1}`,
  week: i + 1,
  name: i + 1 >= 42 ? `Elo Supremo - Parte ${i - 40}` : `Semana ${i + 1}`,
  imageUrl: '' 
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
    } catch (e) {
      return initialData;
    }
  }
  return initialData;
};

export const saveData = async (data: AppData) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DB_KEY, JSON.stringify(data));
  
  try {
    await fetch('/api/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.error('Erro ao sincronizar com a nuvem:', e);
  }
};

export const syncWithCloud = async (): Promise<AppData | null> => {
  try {
    const response = await fetch('/data.json');
    if (response.ok) {
      const cloudData = await response.json();
      if (cloudData && Object.keys(cloudData).length > 0) {
        // Garante que stickers estejam presentes
        if (!cloudData.stickers || cloudData.stickers.length === 0) {
          cloudData.stickers = emptyStickers;
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem(DB_KEY, JSON.stringify(cloudData));
        }
        return cloudData;
      }
    }
  } catch (e) {
    console.error('Erro ao buscar dados da nuvem:', e);
  }
  return null;
};

export const clearData = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DB_KEY);
    window.location.reload();
  }
};
