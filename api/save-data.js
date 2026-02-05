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

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    const body = req.body || {};
    const professors = Array.isArray(body.professors) ? body.professors : [];
    const students = Array.isArray(body.students) ? body.students : [];
    const stickers = Array.isArray(body.stickers) ? body.stickers : [];
    const studentStickers = Array.isArray(body.studentStickers) ? body.studentStickers : [];
    const currentWeek = body.currentWeek;

    // 0) settings
    if (currentWeek !== undefined && currentWeek !== null) {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ id: 'global', current_week: currentWeek }, { onConflict: 'id' });
      if (error) throw new Error(`app_settings upsert: ${error.message}`);
    }

    // 1) professors
    const profRows = professors
      .filter(p => p?.login && p.login !== 'admin' && p.id !== 'admin')
      .map(p => ({
        name: p.name || '',
        login: p.login,
        password: p.password || '',
        avatar_url: p.avatarUrl || '',
        avatar_seed: p.avatarSeed || ''
      }));

    for (const part of chunk(profRows, 300)) {
      const { error } = await supabase.from('professors').upsert(part, { onConflict: 'login' });
      if (error) throw new Error(`professors upsert: ${error.message}`);
    }

    // ✅ DELETE REAL: remove do banco quem não está mais no payload
const profLogins = profRows.map(p => p.login);

if (profLogins.length > 0) {
  const { error: delProfErr } = await supabase
    .from('professors')
    .delete()
    .neq('login', 'admin')
    .not('login', 'in', `(${profLogins.map(l => `"${l}"`).join(',')})`);

  if (delProfErr) throw new Error(`professors delete missing: ${delProfErr.message}`);
} else {
  // se não veio nenhum professor (exceto admin), limpa tudo menos admin
  const { error: delAllProfErr } = await supabase
    .from('professors')
    .delete()
    .neq('login', 'admin');

  if (delAllProfErr) throw new Error(`professors delete all: ${delAllProfErr.message}`);
}

    // 2) students
    // precisa mapear professorId que veio do front (que pode ser id fake) para id real no banco
    const { data: profDb, error: profErr } = await supabase.from('professors').select('id,login');
    if (profErr) throw new Error(`professors select: ${profErr.message}`);

    const profLoginToId = new Map((profDb || []).map(p => [p.login, p.id]));

    const studentRows = students
      .filter(s => s?.login)
      .map(s => {
        let professorId = s.professorId || null;

        // se veio um "id fake", tenta resolver pelo login do professor existente no payload
        if (professorId && typeof professorId === 'string' && !professorId.includes('-')) {
          const profObj = professors.find(p => p.id === professorId);
          if (profObj?.login && profLoginToId.has(profObj.login)) professorId = profLoginToId.get(profObj.login);
        }

        return {
  name: s.name || '',
  login: s.login,
  password: s.password || '',
  professor_id: professorId || null,
  avatar_url: s.avatarUrl || '',
  avatar_seed: s.avatarSeed || '',
  serie: s.serie || '',
  ciclo: s.ciclo || null,
  jotas: Number.isFinite(Number(s.jotas)) ? Number(s.jotas) : 0,
};
      });

    for (const part of chunk(studentRows, 300)) {
      const { error } = await supabase.from('students').upsert(part, { onConflict: 'login' });
      if (error) throw new Error(`students upsert: ${error.message}`);
    }

    // ✅ DELETE REAL: remove do banco quem não está mais no payload
const studentLogins = studentRows.map(s => s.login);

if (studentLogins.length > 0) {
  const { error: delStudErr } = await supabase
    .from('students')
    .delete()
    .not('login', 'in', `(${studentLogins.map(l => `"${l}"`).join(',')})`);

  if (delStudErr) throw new Error(`students delete missing: ${delStudErr.message}`);
} else {
  // se não veio nenhum aluno, limpa todos
  const { error: delAllStudErr } = await supabase.from('students').delete().gt('id', '0');
  if (delAllStudErr) throw new Error(`students delete all: ${delAllStudErr.message}`);
}

    // 3) stickers
    const stickerUpserts = [];
    const stickerDeletes = [];

    for (const st of stickers) {
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

    for (const part of chunk(stickerUpserts, 300)) {
      const { error } = await supabase.from('stickers').upsert(part, { onConflict: 'week' });
      if (error) throw new Error(`stickers upsert: ${error.message}`);
    }

    // 4) student_stickers
    // resolve student_id: se for UUID usa, senão busca por login
    const { data: studDb, error: studErr } = await supabase.from('students').select('id,login');
    if (studErr) throw new Error(`students map select: ${studErr.message}`);

    const studentLoginToId = new Map((studDb || []).map(s => [s.login, s.id]));

    const ssRows = [];
    for (const ss of studentStickers) {
      if (!ss?.week) continue;

      let studentId = null;
      const raw = ss.alunoId || ss.alunoLogin;

      if (typeof raw === 'string' && raw.includes('-')) studentId = raw;
      else if (raw && studentLoginToId.has(raw)) studentId = studentLoginToId.get(raw);

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
// ✅ ZERA e recria: assim, quando você "desmarca" presença, some do banco também
const { error: wipeErr } = await supabase
  .from('student_stickers')
  .delete()
  .gt('week', 0);

if (wipeErr) throw new Error(`student_stickers wipe: ${wipeErr.message}`);
    for (const part of chunk(ssRows, 300)) {
      const { error } = await supabase
        .from('student_stickers')
        .upsert(part, { onConflict: 'student_id,week' });
      if (error) throw new Error(`student_stickers upsert: ${error.message}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
