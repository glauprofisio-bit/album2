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
  
  // Verifica versão do banco local
  const savedVersion = localStorage.getItem(DB_VERSION_KEY);
  if (savedVersion !== CURRENT_DB_VERSION) {
    console.log("🔄 Versão do banco local antiga. Resetando para sincronizar com a nuvem.");
    localStorage.setItem(DB_VERSION_KEY, CURRENT_DB_VERSION);
    return initialData; // Retorna inicial para forçar o syncWithCloud a preencher
  }

  const saved = localStorage.getItem(DB_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.stickers || parsed.stickers.length === 0) parsed.stickers = emptyStickers;
      return parsed;
    } catch (e) {
      return initialData;
    }
  }
  return initialData;
};

export const saveData = async (data: AppData) => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(DB_KEY, JSON.stringify(data));
  localStorage.setItem(DB_VERSION_KEY, CURRENT_DB_VERSION);
  
  try {
    const response = await fetch('/api/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.details || 'Erro na nuvem');
    }
  } catch (err) {
    console.error("❌ Falha ao espelhar na nuvem:", err);
  }
};

export const syncWithCloud = async (force = false): Promise<AppData | null> => {
  try {
    const response = await fetch('/api/load-data');
    if (!response.ok) return null;
    
    const cloudData = await response.json();
    if (!cloudData || typeof cloudData !== 'object') return null;

    const localData = loadData();

    // Proteção contra dados vazios da nuvem
    const cloudIsEmpty = (!cloudData.professors || cloudData.professors.length === 0) && 
                         (!cloudData.students || cloudData.students.length === 0);
    const localHasData = localData.professors.length > 0 || localData.students.length > 0;

    if (localHasData && cloudIsEmpty && !force) {
      console.warn("⚠️ Nuvem vazia detectada. Protegendo dados locais.");
      saveData(localData); // Tenta restaurar a nuvem com o local
      return localData;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(DB_KEY, JSON.stringify(cloudData));
      localStorage.setItem(DB_VERSION_KEY, CURRENT_DB_VERSION);
    }
    return cloudData;
  } catch (error) {
    console.error("Erro na sincronização:", error);
    return null;
  }
};

export const clearData = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(DB_VERSION_KEY);
  window.location.reload();
};
