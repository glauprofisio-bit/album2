
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

export interface User {
  id: string;
  name: string;
  email: string;
  login: string;
  password?: string;
  role: UserRole;
  professorId?: string; // Only for ALUNO
  avatarSeed?: string; // Semente para o gerador de avatar (DiceBear)
  avatarUrl?: string; // URL da imagem ou base64 da figurinha de perfil
  serie?: string; // Ex: "1A", "9B"
  ciclo?: 'Anos Iniciais' | 'Anos Finais' | 'Ensino Médio';
}

export interface Sticker {
  id: string;
  week: number;
  name: string;
  imageUrl: string;
  rarity?: StickerRarity; // Define o nível de raridade da figurinha
}

export interface AlunoSticker {
  alunoId: string;
  week: number;
  liberada: boolean;
  revelada: boolean;
  reconquistada: boolean;
  isFalta?: boolean; // Indica se o aluno faltou e perdeu a figurinha
  date?: string;
}

export interface AppData {
  professors: User[];
  students: User[];
  stickers: Sticker[];
  studentStickers: AlunoSticker[];
  currentWeek: number;
}
