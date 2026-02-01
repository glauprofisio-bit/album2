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
      await supabase.from('professors').delete().not('login', 'in', `(${profLogins.join(',')})`).neq('login', 'Tati');

      for (const prof of validProfs) {
        await supabase.from('professors').upsert({
          id: prof.id && prof.id.length > 20 ? prof.id : undefined, // Apenas se for UUID real
          name: prof.name,
          email: prof.email || `${prof.login}@escola.com`,
          login: prof.login,
          password: prof.password,
          role: 'professor', // Força o papel de professor
          avatar_url: prof.avatarUrl,
          avatar_seed: prof.avatarSeed
        }, { onConflict: 'login' });
      }
    }

    // 2. Sincronizar Alunos (Upsert + Delete)
    if (students) {
      const studentLogins = students.map(s => s.login);
      await supabase.from('students').delete().not('login', 'in', `(${studentLogins.join(',')})`);

      for (const student of students) {
        // Busca o UUID do professor pelo login dele
        const { data: profData } = await supabase.from('professors').select('id').eq('login', student.professorLogin || 'Tati').single();
        let profId = profData?.id;

        // Se não achou pelo login, tenta pelo ID que veio do app (se for UUID)
        if (!profId && student.professorId && student.professorId.length > 20) {
          profId = student.professorId;
        }

        // Fallback para o primeiro professor se ainda não tiver ID
        if (!profId) {
          const { data: firstProf } = await supabase.from('professors').select('id').limit(1).single();
          profId = firstProf?.id;
        }

        await supabase.from('students').upsert({
          id: student.id && student.id.length > 20 ? student.id : undefined,
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

      // Limpa figurinhas antigas para reinserir as atuais (mais seguro para sincronização total)
      // Nota: Em produção real usaríamos uma lógica de delta, mas para este app a sincronização total é mais simples
      
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
