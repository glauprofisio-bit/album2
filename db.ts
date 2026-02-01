import { AppData, UserRole, Sticker } from './types';

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

export const saveData = (data: AppData) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DB_KEY, JSON.stringify(data));
  
  // PASSO 3 da Cadeia 2-10: Enviar dados locais para a nuvem (Assíncrono)
  fetch('/api/save-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).catch(err => console.error("Erro ao salvar na nuvem:", err));
};

export const syncWithCloud = async (): Promise<AppData | null> => {
  try {
    // PASSO 2 da Cadeia 1: Puxar dados mais recentes da nuvem
    const response = await fetch('/api/load-data');
    if (response.ok) {
      const cloudData = await response.json();
      // PASSO 3 da Cadeia 1: Se dados da nuvem existirem, eles são a verdade absoluta
      if (cloudData && typeof cloudData === 'object') {
        if (typeof window !== 'undefined') {
          localStorage.setItem(DB_KEY, JSON.stringify(cloudData));
        }
        return cloudData;
      }
    }
  } catch (error) {
    console.error("Erro na sincronização com a nuvem:", error);
  }
  return null;
};

export const clearData = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DB_KEY);
  window.location.reload();
};
