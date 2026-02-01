import { createClient } from '@supabase/supabase-js';

// ✅ Você pode manter hardcoded por enquanto (já está assim no seu repo)
// (Depois, se quiser, a gente troca pra process.env)
const supabaseUrl = 'https://bumcjbjnkblzvrjpvafn.supabase.co';
const supabaseKey = 'sb_publishable_8jjRyS4uqL9yLU6JdpHx9A_l-UgLSYW';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { professors, students, stickers, studentStickers, currentWeek } = req.body;

    // 1) Semana global
    if (currentWeek !== undefined && currentWeek !== null) {
      await supabase.from('app_settings').upsert({ id: 'global', current_week: currentWeek });
    }

    // 2) Professores (só UPSERT, sem deletar)
    if (Array.isArray(professors)) {
      for (const p of professors) {
        if (!p?.login) continue;
        if (p.id === 'admin' || p.role === 'ADMIN') continue;

        await supabase.from('professors').upsert({
          name: p.name || p.login,
          email: p.email || `${p.login}@escola.com`,
          login: p.login,
          password: p.password || '',
          avatar_url: p.avatarUrl || null,
          avatar_seed: p.avatarSeed || null
        }, { onConflict: 'login' });
      }
    }

    // 3) Alunos (só UPSERT, sem deletar)
    if (Array.isArray(students)) {
      for (const s of students) {
        if (!s?.login) continue;

        await supabase.from('students').upsert({
          name: s.name || s.login,
          email: s.email || `${s.login}@aluno.com`,
          login: s.login,
          password: s.password || '',
          professor_id: s.professorId || null,   // ✅ importante
          avatar_url: s.avatarUrl || null,
          avatar_seed: s.avatarSeed || null,
          serie: s.serie || null,
          ciclo: s.ciclo || null
        }, { onConflict: 'login' });
      }
    }

    // 4) Figurinhas (upsert por week)
    if (Array.isArray(stickers)) {
      for (const st of stickers) {
        if (!st?.week) continue;

        await supabase.from('stickers').upsert({
          week: st.week,
          name: st.name || `Semana ${st.week}`,
          image_url: st.imageUrl || '',
          rarity: st.rarity || 'NORMAL'
        }, { onConflict: 'week' });
      }
    }

    // 5) Estado das raspadinhas (student_stickers)
    if (Array.isArray(studentStickers)) {
      // Pra funcionar mesmo quando alunoId for “id local”, a gente resolve pelo login.
      // Puxa todos os alunos do banco 1 vez e cria mapa login -> id
      const { data: dbStudents } = await supabase.from('students').select('id, login');
      const loginToId = new Map((dbStudents || []).map(r => [r.login, r.id]));

      // Mapa idLocal -> login (com base no payload students)
      const idLocalToLogin = new Map((Array.isArray(students) ? students : []).map(s => [s.id, s.login]));

      for (const ss of studentStickers) {
        if (!ss?.week) continue;

        // Tenta descobrir o login do aluno
        const login =
          ss.alunoLogin ||
          idLocalToLogin.get(ss.alunoId) ||
          null;

        // Resolve o student_id real do banco
        let studentId = null;

        // Se o alunoId já for UUID real e existir no banco, poderia usar direto.
        // Mas como é confuso, prioriza login -> id.
        if (login && loginToId.has(login)) {
          studentId = loginToId.get(login);
        }

        if (!studentId) continue;

        await supabase.from('student_stickers').upsert({
          student_id: studentId,
          week: ss.week,
          liberada: !!ss.liberada,
          revelada: !!ss.revelada,
          reconquistada: !!ss.reconquistada, // ✅ importante
          is_falta: !!ss.isFalta
        }, { onConflict: 'student_id,week' });
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro no save-data:', error);
    return res.status(500).json({ error: 'Internal server error', details: String(error?.message || error) });
  }
}
