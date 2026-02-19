import { createClient } from '@supabase/supabase-js';

// Chaves reais forçadas para evitar erro 500 na Vercel e garantir conexão com banco afn
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawLogin = req.body?.login;
const rawPassword = req.body?.password;
const role = req.body?.role;

const login = String(rawLogin ?? '').trim();
const password = String(rawPassword ?? '').trim();

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
