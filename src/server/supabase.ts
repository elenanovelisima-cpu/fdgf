import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AdItem } from '../types.js';

export const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://ypzuigwxnxzuzufkkemb.supabase.co';
export const SUPABASE_KEY =
  process.env.SUPABASE_KEY || 'sb_publishable_m7vJfwBPzVZSLwMYU54n1Q_m6hftW7K';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (err) {
      console.error('[Supabase] Error al inicializar cliente:', err);
      return null;
    }
  }
  return supabaseClient;
}

export function parseAdFromSupabaseRow(row: any): AdItem {
  if (row.data && typeof row.data === 'object' && row.data.id) {
    return {
      ...row.data,
      id: row.id || row.data.id,
      title: row.title || row.data.title || '',
      phone: row.phone || row.data.phone || '',
      location: row.location || row.data.location || '',
      status: row.status || row.data.status || 'nuevo',
      detectedName: row.detectedName || row.detected_name || row.data.detectedName || '',
      notes: row.notes ?? row.data.notes ?? '',
    };
  }

  return {
    id: row.id,
    title: row.title || '',
    imageUrl: row.imageUrl || row.image_url || '',
    images: Array.isArray(row.images) ? row.images : [],
    croppedImages: Array.isArray(row.croppedImages)
      ? row.croppedImages
      : Array.isArray(row.cropped_images)
      ? row.cropped_images
      : [],
    detectedName: row.detectedName || row.detected_name || '',
    nationality: row.nationality || '',
    description: row.description || '',
    phone: row.phone || '',
    normalizedPhone: row.normalizedPhone || row.normalized_phone || '',
    hasWhatsapp: row.hasWhatsapp ?? row.has_whatsapp ?? true,
    whatsappUrl: row.whatsappUrl || row.whatsapp_url || '',
    sourceUrl: row.sourceUrl || row.source_url || '',
    category: row.category || 'Anuncio',
    location: row.location || '',
    scrapedAt: row.scrapedAt || row.scraped_at || new Date().toISOString(),
    sourceSite: row.sourceSite || row.source_site || '',
    notes: row.notes || '',
    status: row.status || 'nuevo',
    isFullAd: row.isFullAd ?? row.is_full_ad ?? false,
  };
}

export function formatAdForSupabase(ad: AdItem) {
  return {
    id: ad.id,
    title: ad.title || '',
    imageUrl: ad.imageUrl || '',
    images: ad.images || (ad.imageUrl ? [ad.imageUrl] : []),
    croppedImages: ad.croppedImages || [],
    detectedName: ad.detectedName || '',
    nationality: ad.nationality || '',
    description: ad.description || '',
    phone: ad.phone || '',
    normalizedPhone: ad.normalizedPhone || '',
    hasWhatsapp: ad.hasWhatsapp ?? true,
    whatsappUrl: ad.whatsappUrl || '',
    sourceUrl: ad.sourceUrl || '',
    category: ad.category || 'Anuncio',
    location: ad.location || '',
    scrapedAt: ad.scrapedAt || new Date().toISOString(),
    sourceSite: ad.sourceSite || '',
    notes: ad.notes || '',
    status: ad.status || 'nuevo',
    isFullAd: ad.isFullAd ?? false,
    data: ad,
  };
}

export async function checkSupabaseStatus(): Promise<{
  connected: boolean;
  tableExists: boolean;
  count: number;
  url: string;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      connected: false,
      tableExists: false,
      count: 0,
      url: SUPABASE_URL,
      error: 'Cliente de Supabase no configurado',
    };
  }

  try {
    const { count, error } = await client
      .from('directory')
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return {
          connected: true,
          tableExists: false,
          count: 0,
          url: SUPABASE_URL,
          error: "Tabla 'directory' aún no creada en Supabase",
        };
      }
      return {
        connected: false,
        tableExists: false,
        count: 0,
        url: SUPABASE_URL,
        error: error.message,
      };
    }

    return {
      connected: true,
      tableExists: true,
      count: count ?? 0,
      url: SUPABASE_URL,
    };
  } catch (err: any) {
    return {
      connected: false,
      tableExists: false,
      count: 0,
      url: SUPABASE_URL,
      error: err.message,
    };
  }
}

export async function fetchDirectoryFromSupabase(): Promise<AdItem[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('directory')
      .select('*')
      .order('scrapedAt', { ascending: false });

    if (error) {
      return null;
    }

    if (Array.isArray(data)) {
      return data.map(parseAdFromSupabaseRow);
    }
    return [];
  } catch {
    return null;
  }
}

export async function upsertAdToSupabase(ad: AdItem): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = formatAdForSupabase(ad);
    const { error } = await client.from('directory').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] Error en upsert individual:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] Excepción en upsert individual:', err.message);
    return false;
  }
}

export async function upsertBatchToSupabase(ads: AdItem[]): Promise<number> {
  const client = getSupabaseClient();
  if (!client || ads.length === 0) return 0;

  try {
    const payload = ads.map(formatAdForSupabase);
    const { error, data } = await client
      .from('directory')
      .upsert(payload, { onConflict: 'id' })
      .select('id');

    if (error) {
      console.warn('[Supabase] Error en upsert batch:', error.message);
      return 0;
    }
    return Array.isArray(data) ? data.length : ads.length;
  } catch (err: any) {
    console.warn('[Supabase] Excepción en upsert batch:', err.message);
    return 0;
  }
}

export async function deleteAdFromSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('directory').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteBatchFromSupabase(ids: string[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || ids.length === 0) return false;

  try {
    const { error } = await client.from('directory').delete().in('id', ids);
    return !error;
  } catch {
    return false;
  }
}

export const SUPABASE_SQL_SCHEMA = `-- ====================================================================
-- SCRIPT DE INSTALACIÓN DE SUPABASE PARA AUTOPUBLI24 / DIRECTORIO
-- Copia y pega este script en: Supabase Dashboard > SQL Editor > Run
-- ====================================================================

-- 1. Crear tabla 'directory'
CREATE TABLE IF NOT EXISTS public.directory (
  id TEXT PRIMARY KEY,
  title TEXT,
  "imageUrl" TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  "croppedImages" JSONB DEFAULT '[]'::jsonb,
  "detectedName" TEXT,
  nationality TEXT,
  description TEXT,
  phone TEXT,
  "normalizedPhone" TEXT,
  "hasWhatsapp" BOOLEAN DEFAULT true,
  "whatsappUrl" TEXT,
  "sourceUrl" TEXT,
  category TEXT,
  location TEXT,
  "scrapedAt" TEXT,
  "sourceSite" TEXT,
  notes TEXT,
  status TEXT DEFAULT 'nuevo',
  "isFullAd" BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Índices para búsquedas ultra rápidas
CREATE INDEX IF NOT EXISTS idx_directory_phone ON public.directory (phone);
CREATE INDEX IF NOT EXISTS idx_directory_norm_phone ON public.directory ("normalizedPhone");
CREATE INDEX IF NOT EXISTS idx_directory_location ON public.directory (location);
CREATE INDEX IF NOT EXISTS idx_directory_status ON public.directory (status);

-- 3. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.directory ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acceso para clave pública / anon (lectura, inserción, actualización y borrado)
DROP POLICY IF EXISTS "Acceso total lectura directorio" ON public.directory;
CREATE POLICY "Acceso total lectura directorio" ON public.directory
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Acceso total insercion directorio" ON public.directory;
CREATE POLICY "Acceso total insercion directorio" ON public.directory
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total actualizacion directorio" ON public.directory;
CREATE POLICY "Acceso total actualizacion directorio" ON public.directory
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total eliminacion directorio" ON public.directory;
CREATE POLICY "Acceso total eliminacion directorio" ON public.directory
  FOR DELETE TO anon, authenticated USING (true);
`;
