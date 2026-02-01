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
      return JSON.parse(saved);
    } catch (e) {
      return initialData;
    }
  }
  return initialData;
};

// Função para salvar localmente e IMEDIATAMENTE na nuvem
export const saveData = async (data: AppData) => {
  if (typeof window === 'undefined') return;
  
  // 1. Salva no LocalStorage primeiro (velocidade)
  localStorage.setItem(DB_KEY, JSON.stringify(data));
  
  // 2. Envia para a nuvem IMEDIATAMENTE e espera a confirmação
  // Isso evita que o loop de 30s puxe dados antigos antes da exclusão ser processada
  try {
    const response = await fetch('/api/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Falha ao salvar na nuvem');
    console.log("Dados sincronizados com sucesso após alteração.");
  } catch (err) {
    console.error("Erro crítico ao salvar na nuvem:", err);
  }
};

export const syncWithCloud = async (): Promise<AppData | null> => {
  try {
    const response = await fetch('/api/load-data');
    if (response.ok) {
      const cloudData = await response.json();
      if (cloudData && typeof cloudData === 'object') {
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
