import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bumcjbjnkblzvrjpvafn.supabase.co';
const supabaseKey = 'sb_publishable_8jjRyS4uqL9yLU6JdpHx9A_l-UgLSYW';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { professors, students, studentStickers, stickers, currentWeek } = req.body;

    // Salvar Professores
    if (professors) {
      for (const prof of professors) {
        if (prof.id === 'admin') continue;
        await supabase.from('professors').upsert({
          id: prof.id && prof.id.length > 10 ? prof.id : undefined, // UUID check
          name: prof.name,
          email: prof.email || `${prof.login}@escola.com`,
          login: prof.login,
          password: prof.password,
          role: prof.role || 'professor',
          avatar_url: prof.avatarUrl,
          avatar_seed: prof.avatarSeed
        }, { onConflict: 'login' });
      }
    }

    // Salvar Alunos
    if (students) {
      for (const student of students) {
        // Buscar o UUID do professor pelo login se necessário, mas aqui assumimos que o professor já existe
        // Para simplificar, vamos garantir que o professor_id seja um UUID válido ou buscar o primeiro professor se falhar
        let profId = student.professorId;
        if (!profId || profId.length < 10) {
           const { data: pData } = await supabase.from('professors').select('id').limit(1).single();
           profId = pData?.id;
        }

        await supabase.from('students').upsert({
          id: student.id && student.id.length > 10 ? student.id : undefined,
          name: student.name,
          email: student.email || `${student.login}@aluno.com`,
          login: student.login,
          password: student.password,
          professor_id: profId,
          avatar_url: student.avatarUrl,
          avatar_seed: student.avatarSeed
        }, { onConflict: 'login' });
      }
    }

    // Salvar Figurinhas (Stickers)
    if (stickers) {
      for (const s of stickers) {
        await supabase.from('stickers').upsert({
          week: s.week,
          name: s.name,
          image_url: s.imageUrl
        }, { onConflict: 'week' });
      }
    }

    // Salvar Figurinhas dos Alunos (student_stickers)
    if (studentStickers) {
      // Primeiro precisamos mapear os IDs do LocalStorage para os UUIDs do Supabase
      // Para simplificar esta versão, vamos assumir que os logins são únicos e buscar os IDs
      const { data: dbStudents } = await supabase.from('students').select('id, login');
      const { data: dbStickers } = await supabase.from('stickers').select('id, week');

      for (const ss of studentStickers) {
        const student = students.find(s => s.id === ss.alunoId);
        const dbStudent = dbStudents.find(dbs => dbs.login === student?.login);
        const dbSticker = dbStickers.find(dbs => dbs.week === ss.week);

        if (dbStudent && dbSticker) {
          await supabase.from('student_stickers').upsert({
            student_id: dbStudent.id,
            sticker_id: dbSticker.id,
            collected_at: ss.date || new Date().toISOString()
          }, { onConflict: 'student_id,sticker_id' });
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro no handler save-data:', error);
    return res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
