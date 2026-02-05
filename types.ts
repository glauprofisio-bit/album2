export enum UserRole {
  ADMIN = 'ADMIN',
  PROFESSOR = 'PROFESSOR',
  ALUNO = 'ALUNO'
}

export enum StickerRarity {
  NORMAL = 'NORMAL',
  RUBY = 'RUBY',
  EMERALD = 'EMERALD',
  OBSIDIAN = 'OBSIDIAN',
  GOLD = 'GOLD',
  DIAMOND = 'DIAMOND'
}

export type Ciclo = 'Anos Iniciais' | 'Anos Finais' | 'Ensino Médio';

export interface User {
  id: string;
  name: string;
  email?: string;
  login: string;
  password?: string;
  role: UserRole | 'ADMIN' | 'PROFESSOR' | 'ALUNO';
  professorId?: string | null;
  avatarUrl?: string;
  avatarSeed?: string;
  serie?: string;
  ciclo?: Ciclo;
  jotas?: number;
}

export interface Sticker {
  id: string;
  week: number;
  name: string;
  imageUrl: string;
  rarity: StickerRarity | 'NORMAL' | 'RUBY' | 'EMERALD' | 'OBSIDIAN' | 'GOLD' | 'DIAMOND';
}

export interface AlunoSticker {
  alunoId: string;
  week: number;
  liberada: boolean;
  revelada: boolean;
  reconquistada: boolean;
  isFalta: boolean;
  date?: string;
}

export interface AppData {
  professors: User[];
  students: User[];
  stickers: Sticker[];
  studentStickers: AlunoSticker[];
  currentWeek: number;
}
