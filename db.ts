import { AppData, UserRole, Sticker } from './types';

const DB_KEY = 'album_figurinhas_db';

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
  
  // SALVAMENTO LOCAL É IMEDIATO E SOBERANO
  localStorage.setItem(DB_KEY, JSON.stringify(data));
  
  try {
    const response = await fetch('/api/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Erro na nuvem');
    console.log("✅ Sincronizado com a nuvem.");
  } catch (err) {
    console.error("❌ Erro ao enviar para nuvem, mas mantido localmente:", err);
  }
};

// Sincronização agora é apenas sob demanda ou em momentos específicos
export const syncWithCloud = async (): Promise<AppData | null> => {
  try {
    const response = await fetch('/api/load-data');
    if (response.ok) {
      const cloudData = await response.json();
      
      if (cloudData && typeof cloudData === 'object') {
        const localData = loadData();
        
        // PROTEÇÃO CRÍTICA: Se a nuvem vier vazia e o local tiver dados, NÃO SOBRESCREVE
        const cloudHasData = (cloudData.professors?.length > 0) || (cloudData.stickers?.some((s: any) => s.imageUrl));
        const localHasData = (localData.professors?.length > 0) || (localData.stickers?.some((s: any) => s.imageUrl));

        if (localHasData && !cloudHasData) {
          console.warn("⚠️ Nuvem parece vazia. Mantendo dados locais para evitar perda.");
          return localData;
        }

        localStorage.setItem(DB_KEY, JSON.stringify(cloudData));
        return cloudData;
      }
    }
  } catch (error) {
    console.error("Erro ao buscar dados da nuvem:", error);
  }
  return null;
};
