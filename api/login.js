import { createClient } from '@supabase/supabase-js';

// Chaves reais forçadas para evitar erro 500 na Vercel e garantir conexão com banco afn
const supabaseUrl = 'https://zcrjsvgjnbzawrnajgva.supabase.co';
const supabaseKey = process.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcmpzdmdqbmJ6YXdybmFqZ3ZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTkxMDQzNiwiZXhwIjoyMDg1NDg2NDM2fQ.jeGMKAjhPed06OR6NlOj316Emho6YdkUSylZsS49-Fs;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { login, password, role } = req.body;

    if (!login || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Admin login
    const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'Glau';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Smart200#';

    if (role === 'admin') {
      if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
        return res.status(200).json({
          success: true,
          user: {
            id: 'admin',
            name: 'Administrador Glau',
            email: 'admin@escola.com',
            login: 'Glau',
            role: 'admin'
          }
        });
      } else {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    // Professor login
    if (role === 'professor') {
      let { data, error } = await supabase
        .from('professors')
        .select('*')
        .eq('login', login)
        .eq('password', password)
        .single();

      // Migração automática: se não achar no banco novo, tenta criar com os dados padrão
      if (!data) {
          const knownProfs = [
              { name: 'Tati', login: 'Tati', password: '385126', role: 'professor' }
          ];
          const found = knownProfs.find(p => p.login === login && p.password === password);
          if (found) {
              const { data: newData, error: createError } = await supabase
                  .from('professors')
                  .upsert(found, { onConflict: 'login' })
                  .select()
                  .single();
              if (!createError) data = newData;
          }
      }

      if (error || !data) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: data.id,
          name: data.name,
          email: data.email,
          login: data.login,
          role: 'professor'
        }
      });
    }

    // Student login
    if (role === 'student' || role === 'aluno') {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('login', login)
        .eq('password', password)
        .single();

      if (error || !data) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: data.id,
          name: data.name,
          email: data.email,
          login: data.login,
          role: 'aluno',
          professorId: data.professor_id
        }
      });
    }

    return res.status(400).json({ error: 'Invalid role' });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
