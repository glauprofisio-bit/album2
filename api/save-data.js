import { createClient } from '@supabase/supabase-js';

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    }

    const supabase = createClient(url, serviceKey);

    const { professors = [], students = [], stickers = [], studentStickers = [], currentWeek } = req.body || {};

    // current week
    if (currentWeek !== undefined && currentWeek !== null) {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ id: 'global', current_week: currentWeek }, { onConflict: 'id' });
      if (error) throw new Error(`app_settings upsert: ${error.message}`);
    }

    // PROFESSORS upsert (lote)
    const profRows = (Array.isArray(professors) ? professors : [])
      .filter(p => p?.login && p.login !== 'admin' && p.id !== 'admin')
      .map(p => ({
        name: p.name || '',
        login: p.login,
        password: p.password || '',
        avatar_url: p.avatarUrl || '',
        avatar_seed: p.avatarSeed || ''
      }));

    for (const part of chunk(profRows, 500)) {
      const { error } = await supabase.from('professors').upsert(part, { onConflict: 'login' });
      if (error) throw new Error(`professors upsert: ${error.message}`);
    }

    // STUDENTS upsert (lote)
    const studentRows = (Array.isArray(students) ? students : [])
      .filter(s => s?.login)
      .map(s => ({
        name: s.name || '',
        login: s.login,
        password: s.password || '',
        professor_id: s.professorId || null,
        avatar_url: s.avatarUrl || '',
        avatar_seed: s.avatarSeed || '',
        serie: s.serie || '',
        ciclo: s.ciclo || null
      }));

    for (const part of chunk(studentRows, 500)) {
      const { error } = await supabase.from('students').upsert(part, { onConflict: 'login' });
      if (error) throw new Error(`students upsert: ${error.message}`);
    }

    // STICKERS (delete se imagem vazia; upsert se tem imagem)
    const stickerDeletes = [];
    const stickerUpserts = [];

    for (const st of (Array.isArray(stickers) ? stickers : [])) {
      if (!st?.week) continue;
      const imageUrl = String(st.imageUrl || '').trim();
      if (!imageUrl) stickerDeletes.push(st.week);
      else {
        stickerUpserts.push({
          week: st.week,
          name: st.name || `Semana ${st.week}`,
          image_url: imageUrl,
          rarity: st.rarity || 'NORMAL'
        });
      }
    }

    if (stickerDeletes.length) {
      const { error } = await supabase.from('stickers').delete().in('week', stickerDeletes);
      if (error) throw new Error(`stickers delete: ${error.message}`);
    }

    for (const part of chunk(stickerUpserts, 500)) {
      const { error } = await supabase.from('stickers').upsert(part, { onConflict: 'week' });
      if (error) throw new Error(`stickers upsert: ${error.message}`);
    }

    // STUDENT_STICKERS (lote + 1 lookup)
    if (Array.isArray(studentStickers) && studentStickers.length) {
      const { data: allStudents, error: stErr } = await supabase.from('students').select('id,login');
      if (stErr) throw new Error(`students map select: ${stErr.message}`);

      const loginToId = new Map();
      for (const s of (allStudents || [])) loginToId.set(s.login, s.id);

      const ssRows = [];
      for (const ss of studentStickers) {
        if (!ss?.week) continue;

        let studentId = null;
        if (typeof ss.alunoId === 'string' && ss.alunoId.includes('-')) studentId = ss.alunoId;
        else {
          const login = ss.alunoLogin || ss.alunoId;
          if (login && loginToId.has(login)) studentId = loginToId.get(login);
        }

        if (!studentId) continue;

        ssRows.push({
          student_id: studentId,
          week: ss.week,
          liberada: !!ss.liberada,
          revelada: !!ss.revelada,
          is_falta: !!ss.isFalta,
          reconquistada: !!ss.reconquistada
        });
      }

      for (const part of chunk(ssRows, 500)) {
        const { error } = await supabase
          .from('student_stickers')
          .upsert(part, { onConflict: 'student_id, week' });
        if (error) throw new Error(`student_stickers upsert: ${error.message}`);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}          login: s.login,
          password: s.password || '',
          professor_id: s.professorId || null,
          avatar_url: s.avatarUrl || '',
          avatar_seed: s.avatarSeed || '',
          serie: s.serie || '',
          ciclo: s.ciclo || null
        },
        { onConflict: 'login' }
      );

      if (error) throw new Error(`students upsert ${s.login}: ${error.message}`);
    }

    // =========================
    // STUDENTS (DELETE SAFE)
    // só tenta deletar se a lista de alunos veio "de verdade"
    // =========================
    if (Array.isArray(students) && students.length > 0) {
      const { data: existingStudents, error } = await supabase.from('students').select('id,login');
      if (error) throw new Error(`students select: ${error.message}`);

      const toDelete = (existingStudents || [])
        .filter(r => r.login && !incomingStudentLogins.has(r.login));

      if (toDelete.length) {
        const idsToDelete = toDelete.map(x => x.id);
        const loginsToDelete = toDelete.map(x => x.login);

        // apaga student_stickers antes (evita FK)
        const { error: ssDelErr } = await supabase
          .from('student_stickers')
          .delete()
          .in('student_id', idsToDelete);

        if (ssDelErr) throw new Error(`student_stickers delete: ${ssDelErr.message}`);

        const { error: delErr } = await supabase.from('students').delete().in('login', loginsToDelete);
        if (delErr) throw new Error(`students delete: ${delErr.message}`);
      }
    }

    // =========================
    // STICKERS
    // =========================
    for (const st of stickers) {
      if (!st?.week) continue;

      const imageUrl = String(st.imageUrl || '').trim();

      if (!imageUrl) {
        const { error: delErr } = await supabase.from('stickers').delete().eq('week', st.week);
        if (delErr) throw new Error(`stickers delete week ${st.week}: ${delErr.message}`);
        continue;
      }

      const { error } = await supabase.from('stickers').upsert(
        {
          week: st.week,
          name: st.name || `Semana ${st.week}`,
          image_url: imageUrl,
          rarity: st.rarity || 'NORMAL'
        },
        { onConflict: 'week' }
      );

      if (error) throw new Error(`stickers upsert week ${st.week}: ${error.message}`);
    }

    // =========================
    // STUDENT_STICKERS
    // =========================
    for (const ss of studentStickers) {
      if (!ss?.week) continue;

      let studentId = null;

      if (ss.alunoId && typeof ss.alunoId === 'string' && ss.alunoId.includes('-')) {
        studentId = ss.alunoId;
      } else {
        const login = ss.alunoLogin || ss.alunoId;
        if (login) {
          const { data: st, error } = await supabase
            .from('students')
            .select('id')
            .eq('login', login)
            .single();
          if (!error && st?.id) studentId = st.id;
        }
      }

      if (!studentId) continue;

      const { error } = await supabase.from('student_stickers').upsert(
        {
          student_id: studentId,
          week: ss.week,
          liberada: !!ss.liberada,
          revelada: !!ss.revelada,
          is_falta: !!ss.isFalta,
          reconquistada: !!ss.reconquistada
        },
        { onConflict: 'student_id, week' }
      );

      if (error) throw new Error(`student_stickers upsert ${studentId}/${ss.week}: ${error.message}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
