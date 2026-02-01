ALTER TABLE students ADD COLUMN IF NOT EXISTS login TEXT UNIQUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS password TEXT;

-- Atualizar políticas de segurança para garantir que o login funcione
DROP POLICY IF EXISTS "Allow public read on students" ON students;
CREATE POLICY "Allow public read on students" ON students FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on students" ON students;
CREATE POLICY "Allow public insert on students" ON students FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on students" ON students;
CREATE POLICY "Allow public update on students" ON students FOR UPDATE USING (true);
