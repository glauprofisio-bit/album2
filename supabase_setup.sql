-- Criar tabela de professores
CREATE TABLE IF NOT EXISTS professors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  login TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'professor',
  avatar_url TEXT,
  avatar_seed TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de alunos
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  professor_id UUID NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  avatar_url TEXT,
  avatar_seed TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de figurinhas
CREATE TABLE IF NOT EXISTS stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de figurinhas dos alunos
CREATE TABLE IF NOT EXISTS student_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  sticker_id UUID NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  collected_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, sticker_id)
);

-- Inserir professor Tati
INSERT INTO professors (name, email, login, password, role, avatar_url, avatar_seed)
VALUES ('Tati', 'tati@escola.com', 'Tati', '385126', 'professor', '', '')
ON CONFLICT (login) DO NOTHING;

-- Inserir figurinhas (45 semanas)
INSERT INTO stickers (week, name, image_url)
SELECT 
  i,
  CASE 
    WHEN i >= 42 THEN 'Elo Supremo - Parte ' || (i - 40)
    ELSE 'Semana ' || i
  END,
  ''
FROM generate_series(1, 45) AS t(i)
ON CONFLICT (week) DO NOTHING;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_students_professor_id ON students(professor_id);
CREATE INDEX IF NOT EXISTS idx_student_stickers_student_id ON student_stickers(student_id);
CREATE INDEX IF NOT EXISTS idx_student_stickers_sticker_id ON student_stickers(sticker_id);

-- Habilitar RLS (Row Level Security) para segurança
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_stickers ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso público (para simplificar por enquanto)
CREATE POLICY "Allow public read on professors" ON professors FOR SELECT USING (true);
CREATE POLICY "Allow public read on students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public read on stickers" ON stickers FOR SELECT USING (true);
CREATE POLICY "Allow public read on student_stickers" ON student_stickers FOR SELECT USING (true);

CREATE POLICY "Allow public insert on students" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on student_stickers" ON student_stickers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on students" ON students FOR UPDATE USING (true);
CREATE POLICY "Allow public update on student_stickers" ON student_stickers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on student_stickers" ON student_stickers FOR DELETE USING (true);
