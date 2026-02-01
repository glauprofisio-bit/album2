// src/db.ts
import { AppData } from './types';

export const initialData: AppData = {
  professors: [],
  students: [],
  stickers: [],
  studentStickers: [],
  currentWeek: 1
};

export const loadData = () => initialData;

// Puxa tudo do backend
export const syncWithCloud = async (): Promise<AppData | null> => {
  try {
    const res = await fetch('/api/load-data', { method: 'GET' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

// Salva tudo no backend
export const saveData = async (data: AppData) => {
  const res = await fetch('/api/save-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || 'Falha ao salvar');
  }
};

// Mantido só pra não quebrar imports antigos
export const deleteFromCloud = async () => {};
