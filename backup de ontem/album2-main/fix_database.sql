-- 1. Garantir que student_stickers tenha a coluna week para controle de conflito
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='student_stickers' AND column_name='week') THEN
        ALTER TABLE student_stickers ADD COLUMN week INTEGER;
    END IF;
END $$;

-- 2. Garantir que o índice de conflito use student_id e week
ALTER TABLE student_stickers DROP CONSTRAINT IF EXISTS student_stickers_student_id_week_key;
ALTER TABLE student_stickers DROP CONSTRAINT IF EXISTS student_stickers_student_id_sticker_id_key;
ALTER TABLE student_stickers ADD CONSTRAINT student_stickers_student_id_week_key UNIQUE (student_id, week);

-- 3. Tornar o email opcional (não obrigatório) para evitar erros de cadastro
ALTER TABLE professors ALTER COLUMN email DROP NOT NULL;
ALTER TABLE students ALTER COLUMN email DROP NOT NULL;

-- 4. Garantir que as colunas de login e senha existam nos alunos
ALTER TABLE students ADD COLUMN IF NOT EXISTS login TEXT UNIQUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS serie TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS ciclo TEXT;
