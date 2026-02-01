import { createClient } from '@supabase/supabase-js';
import { AppData, Sticker, UserRole } from './types';

// Usa as variáveis de ambiente do Vite configuradas no Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zcrjsvgjnbzawrnajgva.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_t01dpjzy6r1Qdag45eAMvQ_dJtOBG23';

export const supabase = createClient(supabaseUrl, supabaseKey);

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
    // Tenta salvar via API (Vercel Functions)
    await fetch('/api/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.error('Erro ao sincronizar com API:', e);
  }
};

export const syncWithCloud = async (): Promise<AppData | null> => {
  try {
    const response = await fetch('/api/load-data');
    if (response.ok) {
      const cloudData = await response.json();
      if (typeof window !== 'undefined') {
        localStorage.setItem(DB_KEY, JSON.stringify(cloudData));
      }
      return cloudData;
    }
  } catch (e) {
    console.error('Erro ao buscar dados da nuvem via API:', e);
  }
  return null;
};

export const clearData = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DB_KEY);
  window.location.reload();
};
