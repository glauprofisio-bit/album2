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
      // Garante que stickers nunca fiquem vazios
      if (!parsed.stickers || parsed.stickers.length === 0) {
        parsed.stickers = emptyStickers;
      }
      return parsed;
    } catch (e) {
      return initialData;
    }
  }
  return initialData;
};

export const saveData = async (data: AppData) => {
  if (typeof window === 'undefined') return;
  
  // 1. Salva no LocalStorage IMEDIATAMENTE
  localStorage.setItem(DB_KEY, JSON.stringify(data));
  
  // 2. Envia para a nuvem
  try {
    const response = await fetch('/api/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Falha ao salvar na nuvem');
  } catch (err) {
    console.error("Erro ao salvar na nuvem:", err);
  }
};

export const syncWithCloud = async (): Promise<AppData | null> => {
  try {
    const response = await fetch('/api/load-data');
    if (response.ok) {
      const cloudData = await response.json();
      
      // VALIDAÇÃO CRÍTICA: Só aceita dados da nuvem se eles não estiverem "vazios" 
      // (a menos que o local também esteja vazio)
      if (cloudData && typeof cloudData === 'object') {
        const localData = loadData();
        
        // Se a nuvem tem menos professores que o local, e o local não está vazio, 
        // pode ser um erro de sincronização (a menos que tenha sido uma exclusão)
        // Por segurança, vamos apenas garantir que campos básicos existam
        if (!cloudData.stickers || cloudData.stickers.length === 0) {
          cloudData.stickers = localData.stickers.length > 0 ? localData.stickers : emptyStickers;
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem(DB_KEY, JSON.stringify(cloudData));
        }
        return cloudData;
      }
    }
  } catch (error) {
    console.error("Erro na sincronização de fundo:", error);
  }
  return null;
};

export const clearData = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DB_KEY);
  window.location.reload();
};
