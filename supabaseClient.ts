import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zcrjsvgjnbzawrnajgva.supabase.co';
const supabaseKey = 'sb_publishable_t01dpjzy6r1Qdag45eAMvQ_dJtOBG23';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Função para inicializar as tabelas
export const initializeDatabase = async () => {
  try {
    // Criar tabela de professores
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS professors (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          login TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'professor',
          avatar_url TEXT,
          avatar_seed TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    }).catch(() => {
      // Tabela pode já existir, ignorar erro
    });

    // Inserir professor Tati
    const { data: existingProf } = await supabase
      .from('professors')
      .select('*')
      .eq('login', 'Tati')
      .single();

    if (!existingProf) {
      await supabase
        .from('professors')
        .insert([
          {
            name: 'Tati',
            email: 'tati@escola.com',
            login: 'Tati',
            password: '385126',
            role: 'professor',
            avatar_url: '',
            avatar_seed: ''
          }
        ]);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};
