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
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    }

    const supabase = createClient(url, serviceKey);

    const { professors = [], students = [], stickers = [], studentStickers = [], currentWeek } = req.body || {};

    // settings
    if (currentWeek !== undefined && currentWeek !== null) {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ id: 'global', current_week: currentWeek }, { onConflict: 'id' });
      if (error) throw new Error(`app_settings: ${error.message}`);
    }

    // professors
    const profsToUpsert = (Array.isArray(professors) ? professors : [])
      .filter(p => p?.login && p.login !== 'admin' && p.id !== 'admin')
      .map(p => ({
        name: p.name || '',
        login: p.login,
        password: p.password || '',
        avatar_url: p.avatarUrl || '',
        avatar_seed: p.avatarSeed || '',
      }));

    if (profsToUpsert.length) {
      const { error } = await supabase.from('professors').upsert(profsToUpsert, { onConflict: 'login' });
      if (error) throw new Error(`professors upsert: ${error.message}`);
    }

    // students
    const studentsToUpsert = (Array.isArray(students) ? students : [])
      .filter(s => s?.login)
      .map(s => ({
        name: s.name || '',
        login: s.login,
        password: s.password || '',
        professor_id: s.professorId || null,
        avatar_url: s.avatarUrl || '',
        avatar_seed: s.avatarSeed || '',
        serie: s.serie || '',
        ciclo: s.ciclo || null,
      }));

    if (studentsToUpsert.length) {
      const { error } = await supabase.from('students').upsert(studentsToUpsert, { onConflict: 'login' });
      if (error) throw new Error(`students upsert: ${error.message}`);
    }

    // stickers: upsert or delete empty
    const stickersToUpsert = (Array.isArray(stickers) ? stickers : [])
      .filter(st => st?.week && String(st.imageUrl || '').trim())
      .map(st => ({
        week: st.week,
        name: st.name || `Semana ${st.week}`,
        image_url: String(st.imageUrl || '').trim(),
        rarity: st.rarity || 'NORMAL',
      }));

    if (stickersToUpsert.length) {
      const { error } = await supabase.from('stickers').upsert(stickersToUpsert, { onConflict: 'week' });
      if (error) throw new Error(`stickers upsert: ${error.message}`);
    }

    const weeksToDelete = (Array.isArray(stickers) ? stickers : [])
      .filter(st => st?.week && !String(st.imageUrl || '').trim())
      .map(st => st.week);

    if (weeksToDelete.length) {
      const { error } = await supabase.from('stickers').delete().in('week', weeksToDelete);
      if (error) throw new Error(`stickers delete: ${error.message}`);
    }

    // student_stickers upsert
    const ssToUpsert = [];
    for (const ss of (Array.isArray(studentStickers) ? studentStickers : [])) {
      if (!ss?.week) continue;

      const studentId = ss.alunoId; // aqui já vem UUID do load-data
      if (!studentId || typeof studentId !== 'string' || studentId.length < 30) continue;

      ssToUpsert.push({
        student_id: studentId,
        week: ss.week,
        liberada: ss.liberada === true,
        revelada: ss.revelada === true,
        is_falta: ss.isFalta === true,
        reconquistada: ss.reconquistada === true,
      });
    }

    if (ssToUpsert.length) {
      const { error } = await supabase
        .from('student_stickers')
        .upsert(ssToUpsert, { onConflict: 'student_id, week' });

      if (error) throw new Error(`student_stickers upsert: ${error.message}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}      // Sincronização de Alunos
      const incomingStudentLogins = new Set(studentsToUpsert.map(s => s.login));
      const { data: existingStudents } = await supabase.from('students').select('id,login');
      const toDelete = (existingStudents || []).filter(r => !incomingStudentLogins.has(r.login));

      if (toDelete.length > 0) {
        const idsToDelete = toDelete.map(x => x.id);
        await supabase.from('student_stickers').delete().in('student_id', idsToDelete);
        await supabase.from('students').delete().in('id', idsToDelete);
      }
    }

    // 4. FIGURINHAS
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

      const weeksToEmpty = stickers.filter(st => st?.week && !String(st.imageUrl || '').trim()).map(st => st.week);
      if (weeksToEmpty.length > 0) {
        await supabase.from('stickers').delete().in('week', weeksToEmpty);
      }
    }

    // 5. FIGURINHAS DOS ALUNOS
    if (studentStickers.length > 0) {
      // Precisamos dos IDs reais dos alunos e das figurinhas
      const { data: allStudents } = await supabase.from('students').select('id, login');
      const { data: allStickers } = await supabase.from('stickers').select('id, week');
      
      const studentMap = new Map();
      (allStudents || []).forEach(s => studentMap.set(s.login, s.id));
      
      const stickerMap = new Map();
      (allStickers || []).forEach(s => stickerMap.set(s.week, s.id));

      const ssToUpsert = [];
      for (const ss of studentStickers) {
        if (!ss?.week) continue;

        // Tenta achar o ID do aluno pelo login ou ID enviado
        let realStudentId = ss.alunoId;
        
        // Mapeamento direto e simples: prioriza o ID que já é UUID, senão busca pelo login
        if (ss.alunoId && ss.alunoId.length > 30) { 
           realStudentId = ss.alunoId; // Provavelmente já é o UUID do banco afn
        } else {
           const studentObj = students.find(s => s.login === ss.alunoId || s.id === ss.alunoId);
           if (studentObj) realStudentId = studentObj.id;
        }

        if (realStudentId) {
          // Simplificação máxima para garantir o salvamento no banco afn
          ssToUpsert.push({
            student_id: realStudentId,
            week: ss.week,
            liberada: ss.liberada === true,
            is_falta: ss.isFalta === true,
            revelada: ss.revelada === true
          });
        }
           if (ssToUpsert.length > 0) {
        const CHUNK_SIZE = 50;
        for (let i = 0; i < ssToUpsert.length; i += CHUNK_SIZE) {
          const chunk = ssToUpsert.slice(i, i + CHUNK_SIZE);
          console.log(`Upserting chunk of ${chunk.length} stickers...`);
          const { error: ssError } = await supabase
            .from('student_stickers')
            .upsert(chunk, { onConflict: 'student_id, week' });
          
          if (ssError) {
            console.error('Erro no upsert de student_stickers:', ssError);
            throw new Error(`Erro ao salvar figurinhas: ${ssError.message}`);
          }
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Save error:', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
