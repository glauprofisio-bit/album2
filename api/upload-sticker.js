import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://bumcjbjnkblzvrjpvafn.supabase.co';

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_vv0rmziTgicFQs1v36ANjw_md444UQy';

// Bucket fixo no Supabase Storage
const BUCKET = 'stickers';

function parseDataUrl(dataUrl) {
  // data:image/png;base64,XXXX
  const match = /^data:(.+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}

function extFromMime(mime) {
  if (!mime) return 'png';
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  return 'png';
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { week, dataUrl } = req.body || {};

    if (!week || !dataUrl) {
      return res.status(400).json({ error: 'week e dataUrl sao obrigatorios' });
    }

    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      return res.status(400).json({ error: 'dataUrl invalido (precisa ser base64 data:image/...)' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const ext = extFromMime(parsed.mime);
    const bytes = Buffer.from(parsed.base64, 'base64');

    // Nome fixo por semana (substitui sempre, não acumula lixo)
    const path = `week-${week}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: parsed.mime,
        upsert: true
      });

    if (upErr) {
      throw new Error(`upload storage: ${upErr.message}`);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = data?.publicUrl;

    if (!publicUrl) throw new Error('nao consegui gerar publicUrl do storage');

    return res.status(200).json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('upload-sticker error:', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
