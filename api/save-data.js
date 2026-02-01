import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // CORS básico (não atrapalha em Vercel; ajuda se algum ambiente bater de fora)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { professors, students, stickers, studentStickers, currentWeek } = req.body || {};

    // 1) Atualiza semana global
    if (typeof currentWeek === 'number') {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ id: 'global', current_week: currentWeek });

      if (error) throw new Error(`app_settings: ${error.message}`);
    }

    // 2) Salva professores (upsert por login)
    if (Array.isArray(professors)) {
      for (const p of professors) {
        if (!p) continue;
        if (p.id === 'admin') continue;

        const payload = {
          name: p.name || '',
          login: p.login || '',
          password: p.password || '',
          avatar_url: p.avatarUrl || '',
          avatar_seed: p.avatarSeed || '',
        };

        if (!payload.login) continue;

        const { error } = await supabase
          .from('professors')
          .upsert(payload, { onConflict: 'login' });

        if (error) throw new Error(`professors upsert: ${error.message}`);
      }
    }

    // 3) Salva alunos (upsert por login)
    if (Array.isArray(students)) {
      for (const s of students) {
        if (!s) continue;

        const payload = {
          name: s.name || '',
          login: s.login || '',
          password: s.password || '',
          professor_id: s.professorId || null,
          avatar_url: s.avatarUrl || '',
          avatar_seed: s.avatarSeed || '',
          serie: s.serie || null,
          ciclo: s.ciclo || null,
        };

        if (!payload.login) continue;

        const { error } = await supabase
          .from('students')
          .upsert(payload, { onConflict: 'login' });

        if (error) throw new Error(`students upsert: ${error.message}`);
      }
    }

    // 4) Salva figurinhas (upsert por week)
    if (Array.isArray(stickers)) {
      for (const st of stickers) {
        if (!st) continue;

        const payload = {
          week: Number(st.week),
          name: st.name || '',
          image_url: st.imageUrl || '',
          rarity: st.rarity || 'NORMAL',
        };

        if (!payload.week || Number.isNaN(payload.week)) continue;

        const { error } = await supabase
          .from('stickers')
          .upsert(payload, { onConflict: 'week' });

        if (error) throw new Error(`stickers upsert: ${error.message}`);
      }
    }

    // 5) Salva estado da raspadinha (student_stickers)
    // Aceita alunoId (id do banco) OU alunoLogin. Se vier alunoId mas for login, tenta resolver por login.
    if (Array.isArray(studentStickers) && studentStickers.length > 0) {
      for (const ss of studentStickers) {
        if (!ss) continue;

        const week = Number(ss.week);
        if (!week || Number.isNaN(week)) continue;

        let studentId = ss.alunoId || ss.studentId || null;
        const alunoLogin = ss.alunoLogin || ss.login || null;

        // Se não veio studentId, tenta resolver por login
        if (!studentId && alunoLogin) {
          const { data: st, error } = await supabase
            .from('students')
            .select('id')
            .eq('login', alunoLogin)
            .single();

          if (error) {
            // se não achou, só pula
            continue;
          }
          studentId = st?.id || null;
        }

        // Se veio algo em alunoId mas parece ser login, tenta resolver
        if (studentId && typeof studentId === 'string' && studentId.length < 20 && !alunoLogin) {
          const { data: st } = await supabase
            .from('students')
            .select('id')
            .eq('login', studentId)
            .single();
          studentId = st?.id || null;
        }

        if (!studentId) continue;

        const payload = {
          student_id: studentId,
          week,
          liberada: !!ss.liberada,
          revelada: !!ss.revelada,
          reconquistada: !!ss.reconquistada,
          is_falta: !!ss.isFalta,
        };

        const { error } = await supabase
          .from('student_stickers')
          .upsert(payload, { onConflict: 'student_id,week' });

        if (error) throw new Error(`student_stickers upsert: ${error.message}`);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    const message = err?.message ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
