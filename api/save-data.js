import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || 'https://bumcjbjnkblzvrjpvafn.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_vv0rmziTgicFQs1v36ANjw_md444UQy';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!url || !serviceKey) {
      return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    }

    const supabase = createClient(url, serviceKey);

    const {
      professors = [],
      students = [],
      stickers = [],
      studentStickers = [],
      currentWeek
    } = req.body || {};

    // 1) Config global
    if (currentWeek !== undefined && currentWeek !== null) {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ id: 'global', current_week: currentWeek }, { onConflict: 'id' });
      if (error) throw new Error(`app_settings: ${error.message}`);
    }

    // 2) Professores (upsert por login)
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
      if (error) throw new Error(`professors: ${error.message}`);
    }

    // mapa login->id real (uuid do banco)
    const { data: allProfs, error: eAllProfs } = await supabase.from('professors').select('id,login');
    if (eAllProfs) throw new Error(`professors select: ${eAllProfs.message}`);

    const profMap = new Map();
    (allProfs || []).forEach(p => profMap.set(p.login, p.id));

    // 3) Alunos (upsert por login)
    const studentsToUpsert = (students || [])
      .filter(s => s?.login)
      .map(s => {
        // resolve professor_id pelo LOGIN quando vier id temporário do app
        let resolvedProfId = s.professorId || null;

        // se professorId for algo tipo "prof-1", tenta achar o professor pelo objeto local e mapear pro uuid real
        const profObj = (professors || []).find(p => p.id === s.professorId || p.login === s.professorId);
        if (profObj?.login && profMap.has(profObj.login)) {
          resolvedProfId = profMap.get(profObj.login);
        }

        // se professorId já for UUID do banco, mantém
        return {
          name: s.name || '',
          login: s.login,
          password: s.password || '',
          professor_id: resolvedProfId,
          avatar_url: s.avatarUrl || '',
          avatar_seed: s.avatarSeed || '',
          serie: s.serie || '',
          ciclo: s.ciclo || null
        };
      });

    if (studentsToUpsert.length > 0) {
      const { error } = await supabase.from('students').upsert(studentsToUpsert, { onConflict: 'login' });
      if (error) throw new Error(`students: ${error.message}`);
    }

    // mapa login->id real (alunos)
    const { data: allStudents, error: eAllStudents } = await supabase.from('students').select('id,login');
    if (eAllStudents) throw new Error(`students select: ${eAllStudents.message}`);

    const studentMap = new Map();
    (allStudents || []).forEach(s => studentMap.set(s.login, s.id));

    // 4) Figurinhas (por week)
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
      if (error) throw new Error(`stickers: ${error.message}`);
    }

    // 5) Presenças / student_stickers (student_id uuid + week)
    const ssToUpsert = (studentStickers || [])
      .filter(ss => ss?.week)
      .map(ss => {
        // alunoId no app às vezes é login, às vezes id local.
        // aqui vamos tentar resolver pelo login primeiro:
        const resolvedStudentId =
          (typeof ss.alunoId === 'string' && studentMap.has(ss.alunoId))
            ? studentMap.get(ss.alunoId)
            : ss.alunoId;

        return {
          student_id: resolvedStudentId,
          week: ss.week,
          liberada: ss.liberada === true,
          is_falta: ss.isFalta === true,
          revelada: ss.revelada === true
        };
      })
      .filter(x => typeof x.student_id === 'string' && x.student_id.length > 20); // bem provável ser UUID

    if (ssToUpsert.length > 0) {
      const CHUNK_SIZE = 50;
      for (let i = 0; i < ssToUpsert.length; i += CHUNK_SIZE) {
        const chunk = ssToUpsert.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
          .from('student_stickers')
          .upsert(chunk, { onConflict: 'student_id,week' });
        if (error) throw new Error(`student_stickers: ${error.message}`);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Save error:', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
