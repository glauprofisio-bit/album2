import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

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

    // 1. Configurações Globais
    if (currentWeek !== undefined && currentWeek !== null) {
      await supabase
        .from('app_settings')
        .upsert({ id: 'global', current_week: currentWeek }, { onConflict: 'id' });
    }

    // 2. PROFESSORES (Operação em Lote)
    if (professors.length > 0) {
      const profsToUpsert = professors
        .filter(p => p?.login && p.id !== 'admin' && p.login !== 'admin')
        .map(p => ({
          name: p.name || '',
          login: p.login,
          password: p.password || '',
          avatar_url: p.avatarUrl || '',
          avatar_seed: p.avatarSeed || ''
        }));

      if (profsToUpsert.length > 0) {
        const { error } = await supabase.from('professors').upsert(profsToUpsert, { onConflict: 'login' });
        if (error) throw new Error(`Professors bulk upsert: ${error.message}`);
      }

      // Lógica de Deletar Professors (Sincronização de lista)
      const incomingProfLogins = new Set(profsToUpsert.map(p => p.login));
      const { data: existingProfs } = await supabase.from('professors').select('id,login');
      const toDelete = (existingProfs || []).filter(r => r.login !== 'admin' && !incomingProfLogins.has(r.login));

      if (toDelete.length > 0) {
        const idsToDelete = toDelete.map(x => x.id);
        await supabase.from('students').update({ professor_id: null }).in('professor_id', idsToDelete);
        await supabase.from('professors').delete().in('id', idsToDelete);
      }
    }

    // 3. ALUNOS (Operação em Lote)
    if (students.length > 0) {
      const studentsToUpsert = students
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

      if (studentsToUpsert.length > 0) {
        const { error } = await supabase.from('students').upsert(studentsToUpsert, { onConflict: 'login' });
        if (error) throw new Error(`Students bulk upsert: ${error.message}`);
      }

      // Lógica de Deletar Alunos
      const incomingStudentLogins = new Set(studentsToUpsert.map(s => s.login));
      const { data: existingStudents } = await supabase.from('students').select('id,login');
      const toDelete = (existingStudents || []).filter(r => !incomingStudentLogins.has(r.login));

      if (toDelete.length > 0) {
        const idsToDelete = toDelete.map(x => x.id);
        await supabase.from('student_stickers').delete().in('student_id', idsToDelete);
        await supabase.from('students').delete().in('id', idsToDelete);
      }
    }

    // 4. FIGURINHAS (Operação em Lote)
    if (stickers.length > 0) {
      const stickersToUpsert = stickers
        .filter(st => st?.week && String(st.imageUrl || '').trim())
        .map(st => ({
          week: st.week,
          name: st.name || `Semana ${st.week}`,
          image_url: st.imageUrl,
          rarity: st.rarity || 'NORMAL'
        }));

      if (stickersToUpsert.length > 0) {
        await supabase.from('stickers').upsert(stickersToUpsert, { onConflict: 'week' });
      }

      // Deletar figurinhas sem imagem
      const weeksWithImage = new Set(stickersToUpsert.map(s => s.week));
      const weeksToEmpty = stickers.filter(st => st?.week && !String(st.imageUrl || '').trim()).map(st => st.week);
      if (weeksToEmpty.length > 0) {
        await supabase.from('stickers').delete().in('week', weeksToEmpty);
      }
    }

    // 5. FIGURINHAS DOS ALUNOS (A operação mais crítica)
    if (studentStickers.length > 0) {
      // Para evitar timeouts, processamos em pedaços de 100
      const CHUNK_SIZE = 100;
      for (let i = 0; i < studentStickers.length; i += CHUNK_SIZE) {
        const chunk = studentStickers.slice(i, i + CHUNK_SIZE);
        const ssToUpsert = chunk
          .filter(ss => ss?.alunoId && ss?.week)
          .map(ss => ({
            student_id: ss.alunoId,
            week: ss.week,
            liberada: !!ss.liberada,
            revelada: !!ss.revelada,
            is_falta: !!ss.isFalta,
            reconquistada: !!ss.reconquistada
          }));

        if (ssToUpsert.length > 0) {
          const { error } = await supabase.from('student_stickers').upsert(ssToUpsert, { onConflict: 'student_id, week' });
          if (error) throw new Error(`Student Stickers chunk upsert: ${error.message}`);
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Save error:', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
