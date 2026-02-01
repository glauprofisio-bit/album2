import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bumcjbjnkblzvrjpvafn.supabase.co';
const supabaseKey = 'sb_publishable_8jjRyS4uqL9yLU6JdpHx9A_l-UgLSYW';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { professors, students, studentStickers, stickers, currentWeek } = req.body;

    // 1. Sincronizar Professores (Upsert + Delete)
    if (professors) {
      const validProfs = professors.filter(p => p.id !== 'admin');
      const profLogins = validProfs.map(p => p.login);
      
      // Deletar professores que não estão mais na lista (excluídos no app)
      // Mantemos a 'Tati' como proteção se ela estiver na lista original
      if (profLogins.length > 0) {
        await supabase.from('professors').delete().not('login', 'in', `(${profLogins.map(l => `"${l}"`).join(',')})`).neq('login', 'Tati');
      } else {
        await supabase.from('professors').delete().neq('login', 'Tati');
      }

      for (const prof of validProfs) {
        await supabase.from('professors').upsert({
          name: prof.name,
          email: prof.email || `${prof.login}@escola.com`,
          login: prof.login,
          password: prof.password,
          role: 'PROFESSOR',
          avatar_url: prof.avatarUrl,
          avatar_seed: prof.avatarSeed
        }, { onConflict: 'login' });
      }
    }

    // 2. Sincronizar Alunos (Upsert + Delete)
    if (students) {
      const studentLogins = students.map(s => s.login);
      if (studentLogins.length > 0) {
        await supabase.from('students').delete().not('login', 'in', `(${studentLogins.map(l => `"${l}"`).join(',')})`);
      } else {
        await supabase.from('students').delete();
      }

      // Buscar todos os professores para mapear IDs
      const { data: dbProfs } = await supabase.from('professors').select('id, login');

      for (const student of students) {
        const prof = dbProfs?.find(p => p.login === student.professorLogin) || dbProfs?.find(p => p.id === student.professorId) || dbProfs?.[0];
        
        await supabase.from('students').upsert({
          name: student.name,
          email: student.email || `${student.login}@aluno.com`,
          login: student.login,
          password: student.password,
          professor_id: prof?.id,
          avatar_url: student.avatarUrl,
          avatar_seed: student.avatarSeed,
          serie: student.serie,
          ciclo: student.ciclo
        }, { onConflict: 'login' });
      }
    }

    // 3. Sincronizar Figurinhas (Stickers)
    if (stickers) {
      for (const s of stickers) {
        await supabase.from('stickers').upsert({
          week: s.week,
          name: s.name,
          image_url: s.imageUrl
        }, { onConflict: 'week' });
      }
    }

    // 4. Sincronizar Figurinhas dos Alunos (student_stickers)
    if (studentStickers) {
      const { data: dbStudents } = await supabase.from('students').select('id, login');
      const { data: dbStickers } = await supabase.from('stickers').select('id, week');

      // Para simplificar e garantir consistência, limpamos e reinserimos as relações de figurinhas
      // Isso evita que figurinhas "desmarcadas" continuem no banco
      const studentIds = dbStudents?.map(s => s.id) || [];
      if (studentIds.length > 0) {
        await supabase.from('student_stickers').delete().in('student_id', studentIds);
      }

      for (const ss of studentStickers) {
        const studentObj = students?.find(s => s.id === ss.alunoId);
        const dbStudent = dbStudents?.find(dbs => dbs.login === studentObj?.login);
        const dbSticker = dbStickers?.find(dbs => dbs.week === ss.week);

        if (dbStudent && dbSticker && ss.liberada) {
          await supabase.from('student_stickers').insert({
            student_id: dbStudent.id,
            sticker_id: dbSticker.id,
            collected_at: ss.date || new Date().toISOString()
          });
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro no handler save-data:', error);
    return res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
