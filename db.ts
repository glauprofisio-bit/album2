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

// opcional: se você ainda usa isso no App.tsx para remoção,
// pode deixar como "não faz nada" por enquanto.
// A remoção dá pra fazer depois com segurança (sem risco de apagar o banco todo).
export const deleteFromCloud = async () => {
  return;
};
