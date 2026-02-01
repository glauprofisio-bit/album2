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

// Carrega dados do LocalStorage com fallback para inicial
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

// Salva localmente e tenta enviar para a nuvem
export const saveData = async (data: AppData) => {
  if (typeof window === 'undefined') return;
  
  // 1. Persistência Local Imediata (Soberana)
  localStorage.setItem(DB_KEY, JSON.stringify(data));
  
  // 2. Sincronização com a Nuvem (Background)
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
    console.log("✅ Nuvem atualizada com sucesso.");
  } catch (err) {
    console.error("❌ Falha ao espelhar na nuvem:", err);
    // Não lançamos erro para não travar a UI, o LocalStorage já salvou.
  }
};

// Busca dados da nuvem e resolve conflitos
export const syncWithCloud = async (force = false): Promise<AppData | null> => {
  try {
    const response = await fetch('/api/load-data');
    if (!response.ok) return null;
    
    const cloudData = await response.json();
    if (!cloudData || typeof cloudData !== 'object') return null;

    const localData = loadData();

    // LÓGICA DE PROTEÇÃO CONTRA DADOS VAZIOS
    // Se a nuvem vier vazia mas o local tiver dados, a nuvem está errada ou resetada.
    const cloudIsEmpty = cloudData.professors.length === 0 && cloudData.students.length === 0;
    const localHasData = localData.professors.length > 0 || localData.students.length > 0;

    if (localHasData && cloudIsEmpty && !force) {
      console.warn("⚠️ Nuvem vazia detectada. Ignorando para proteger dados locais.");
      // Opcional: Forçar um salvamento do local para a nuvem para "consertar" a nuvem
      saveData(localData);
      return localData;
    }

    // Se chegamos aqui, os dados da nuvem são válidos ou o local também está vazio
    if (typeof window !== 'undefined') {
      localStorage.setItem(DB_KEY, JSON.stringify(cloudData));
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
  window.location.reload();
};
