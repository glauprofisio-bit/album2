import { AppData } from './types';

export const initialData: AppData = {
  professors: [],
  students: [],
  stickers: [],
  studentStickers: [],
  currentWeek: 1,
};

export const loadData = async (): Promise<AppData> => {
  const res = await fetch('/api/load-data', { method: 'GET' });
  if (!res.ok) throw new Error('Falha ao carregar dados');
  return res.json();
};

export const saveData = async (data: AppData): Promise<void> => {
  const res = await fetch('/api/save-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Falha ao salvar dados: ${msg}`);
  }
};

export const syncWithCloud = async (): Promise<AppData | null> => {
  try {
    return await loadData();
  } catch {
    return null;
  }
};

// Mantém a assinatura pra não quebrar o App.tsx, mas por enquanto não faz nada.
// (Depois a gente cria endpoints de delete com segurança.)
export const deleteFromCloud = async () => {};
