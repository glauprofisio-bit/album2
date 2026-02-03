import { createClient } from '@supabase/supabase-js';

// Se você já colocou ENV na Vercel, isso usa ENV.
// Se não colocou ainda, usa o fallback (mas recomendo MUITO mover pra ENV depois).
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bumcjbjnkblzvrjpvafn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_vv0rmziTgicFQs1v36ANjw_md444UQy';

function isUuidLike(x) {
  return typeof x === 'string' && x.includes('-') && x.length > 20;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
      professors = [],
      students = [],
      stickers = [],
      studentStickers = [],
      currentWeek
    } = req.body || {};

    // =========================
    // 0) SETTINGS
    // =========================
    if (currentWeek !== undefined && currentWeek !== null) {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ id: 'global', current_week: currentWeek }, { onConflict: 'id' });

      if (error) throw new Error(`app_settings: ${error.message}`);
    }

    // =========================
    // 1) PROFESSORS (UPSERT + DELETE missing)
    // =========================
    const profsToUpsert = (professors || [])
      .filter(p => p?.login && p.login !== 'admin' && p.id !== 'admin')
      .map(p => ({
        name: p.name || '',
        login: p.login,
        password: p.password || '',
        avatar_url: p.avatarUrl || '',
        avatar_seed: p.avatarSeed || '',
        role: 'professor'
      }));

    if (profsToUpsert.length > 0) {
      const { error } = await supabase.from('professors').upsert(profsToUpsert, { onConflict: 'login' });
      if (error) throw new Error(`professors upsert: ${error.message}`);
    }

    // sincroniza deletes de professores (remove os que não existem mais no appData)
    {
      const incomingLogins = new Set(profsToUpsert.map(p => p.login));
      const { data: existing, error } = await supabase.from('professors').select('id,login');
      if (error) throw new Error(`professors select: ${error.message}`);

      const toDelete = (existing || []).filter(p => p.login !== 'admin' && !incomingLogins.has(p.login));
      if (toDelete.length > 0) {
        const ids = toDelete.map(p => p.id);

        // solta vínculo dos alunos antes de deletar o professor
        const { error: e1 } = await supabase.from('students').update({ professor_id: null }).in('professor_id', ids);
        if (e1) throw new Error(`students unlink professor: ${e1.message}`);

        const { error: e2 } = await supabase.from('professors').delete().in('id', ids);
        if (e2) throw new Error(`professors delete: ${e2.message}`);
      }
    }

    // mapa professor login -> uuid
    const { data: dbProfs, error: eDbProfs } = await supabase.from('professors').select('id,login');
    if (eDbProfs) throw new Error(`professors select2: ${eDbProfs.message}`);
    const profMap = new Map();
    (dbProfs || []).forEach(p => profMap.set(p.login, p.id));

    // =========================
    // 2) STUDENTS (UPSERT + DELETE missing)
    // =========================
    const studentsToUpsert = (students || [])
      .filter(s => s?.login)
      .map(s => {
        // resolver professor_id
        let professor_id = s.professorId || null;

        // se veio id temporário (ex: prof-1), tenta achar no array local e mapear por login -> uuid
        const profObj = (professors || []).find(p => p.id === s.professorId || p.login === s.professorId);
        if (profObj?.login && profMap.has(profObj.login)) professor_id = profMap.get(profObj.login);

        // se já for uuid real
        if (isUuidLike(s.professorId)) professor_id = s.professorId;

        return {
          name: s.name || '',
          login: s.login,
          password: s.password || '',
          professor_id,
          avatar_url: s.avatarUrl || '',
          avatar_seed: s.avatarSeed || '',
          serie: s.serie || '',
          ciclo: s.ciclo || null
        };
      });

    if (studentsToUpsert.length > 0) {
      const { error } = await supabase.from('students').upsert(studentsToUpsert, { onConflict: 'login' });
      if (error) throw new Error(`students upsert: ${error.message}`);
    }

    // delete alunos que sumiram
    {
      const incomingLogins = new Set(studentsToUpsert.map(s => s.login));
      const { data: existing, error } = await supabase.from('students').select('id,login');
      if (error) throw new Error(`students select: ${error.message}`);

      const toDelete = (existing || []).filter(s => !incomingLogins.has(s.login));
      if (toDelete.length > 0) {
        const ids = toDelete.map(s => s.id);

        const { error: e1 } = await supabase.from('student_stickers').delete().in('student_id', ids);
        if (e1) throw new Error(`student_stickers delete removed students: ${e1.message}`);

        const { error: e2 } = await supabase.from('students').delete().in('id', ids);
        if (e2) throw new Error(`students delete: ${e2.message}`);
      }
    }

    // mapa aluno login -> uuid (e também idLocal -> login para resolver)
    const { data: dbStudents, error: eDbStudents } = await supabase.from('students').select('id,login');
    if (eDbStudents) throw new Error(`students select2: ${eDbStudents.message}`);

    const studentLoginToId = new Map();
    (dbStudents || []).forEach(s => studentLoginToId.set(s.login, s.id));

    const localStudentIdToLogin = new Map();
    (students || []).forEach(s => {
      if (s?.id && s?.login) localStudentIdToLogin.set(s.id, s.login);
    });

    // =========================
    // 3) STICKERS (UPSERT + DELETE empty)
    // =========================
    // regra: se imageUrl vazio, deletamos a semana no banco (fica “sem figurinha”)
    const stickersToUpsert = (stickers || [])
      .filter(st => st?.week && String(st.imageUrl || '').trim())
      .map(st => ({
        week: st.week,
        name: st.name || `Semana ${st.week}`,
        image_url: st.imageUrl,
        rarity: st.rarity || 'NORMAL'
      }));

    if (stickersToUpsert.length > 0) {
      const { error } = await supabase.from('stickers').upsert(stickersToUpsert, { onConflict: 'week' });
      if (error) throw new Error(`stickers upsert: ${error.message}`);
    }

    const weeksToDelete = (stickers || [])
      .filter(st => st?.week && !String(st.imageUrl || '').trim())
      .map(st => st.week);

    if (weeksToDelete.length > 0) {
      // apaga presenças relacionadas a semanas removidas (evita lixo)
      const { error: e1 } = await supabase.from('student_stickers').delete().in('week', weeksToDelete);
      if (e1) throw new Error(`student_stickers delete removed weeks: ${e1.message}`);

      const { error: e2 } = await supabase.from('stickers').delete().in('week', weeksToDelete);
      if (e2) throw new Error(`stickers delete weeks: ${e2.message}`);
    }

    // =========================
    // 4) PRESENÇA / student_stickers (UPSERT + DELETE missing)
    // =========================
    // Converte alunoId do app para UUID real SEMPRE.
    const desired = (studentStickers || [])
      .filter(ss => ss?.week)
      .map(ss => {
        let student_id = ss.alunoId;

        // caso 1: já veio uuid (load-data manda uuid)
        if (isUuidLike(student_id)) {
          // ok
        }
        // caso 2: veio login
        else if (typeof student_id === 'string' && studentLoginToId.has(student_id)) {
          student_id = studentLoginToId.get(student_id);
        }
        // caso 3: veio id local tipo student-1
        else if (typeof student_id === 'string' && localStudentIdToLogin.has(student_id)) {
          const login = localStudentIdToLogin.get(student_id);
          if (studentLoginToId.has(login)) student_id = studentLoginToId.get(login);
        }

        return {
          student_id,
          week: ss.week,
          liberada: ss.liberada === true,
          is_falta: ss.isFalta === true,
          revelada: ss.revelada === true
        };
      })
      .filter(x => isUuidLike(x.student_id));

    // upsert do que veio do app
    if (desired.length > 0) {
      const CHUNK = 50;
      for (let i = 0; i < desired.length; i += CHUNK) {
        const chunk = desired.slice(i, i + CHUNK);
        const { error } = await supabase
          .from('student_stickers')
          .upsert(chunk, { onConflict: 'student_id,week' }); // sem espaço!
        if (error) throw new Error(`student_stickers upsert: ${error.message}`);
      }
    }

    // delete do que sumiu do app (sincroniza “apagar presença”)
    // Obs: se você NÃO quer apagar do banco quando “não marcado”, então comente este bloco.
    {
      const { data: existing, error } = await supabase.from('student_stickers').select('student_id,week');
      if (error) throw new Error(`student_stickers select: ${error.message}`);

      const desiredKeys = new Set(desired.map(x => `${x.student_id}::${x.week}`));
      const toDelete = (existing || []).filter(x => !desiredKeys.has(`${x.student_id}::${x.week}`));

      for (const item of toDelete) {
        const { error: eDel } = await supabase
          .from('student_stickers')
          .delete()
          .eq('student_id', item.student_id)
          .eq('week', item.week);

        if (eDel) throw new Error(`student_stickers delete: ${eDel.message}`);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Save error:', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
