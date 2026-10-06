import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AdItem, DuplicateRecord, DirectoryStats, PortalItem, WhatsAppBusinessConfig, WhatsAppTemplate } from '../types.js';
import {
  fetchDirectoryFromSupabase,
  upsertAdToSupabase,
  upsertBatchToSupabase,
  deleteAdFromSupabase,
  deleteBatchFromSupabase,
} from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DIRECTORY_FILE = path.join(DATA_DIR, 'directory.json');
const DUPLICATES_FILE = path.join(DATA_DIR, 'duplicates.json');
const PORTALS_FILE = path.join(DATA_DIR, 'portals.json');
const WHATSAPP_CONFIG_FILE = path.join(DATA_DIR, 'whatsapp_config.json');

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'tpl_exclusiva',
    title: 'Plantilla 1: autopubli24 + Exclusiva Zona (24h)',
    tag: 'Exclusiva Zona',
    text: `Hola {nombre} 👋 Vi tu anuncio en {portal} ({ciudad}).\n\nEn autopubli24 hacemos que tu anuncio suba automáticamente a primera posición cada 20 minutos las 24h sin que tengas que renovarlo a mano, para que recibas llamadas todo el día 📲\n\n⚠️ Límite en {ciudad}: Máximo 8 anunciantes por zona para garantizar siempre el puesto #1. Hoy solo quedan 3 plazas disponibles.\n\nSi te interesa, respóndeme por aquí y te reservo la plaza directamente. ¡Un saludo!`,
  },
  {
    id: 'tpl_direct',
    title: 'Plantilla 2: Directa y Posicionamiento 24h',
    tag: 'Directa',
    text: 'Hola {nombre}, he visto tu anuncio en {portal} ({ciudad}). ¿Te interesaría mantener tu anuncio en las primeras posiciones las 24h sin tener que renovarlo a mano? En autopubli24 automatizamos las publicaciones para que recibas más llamadas. Si quieres te paso info sin compromiso.',
  },
  {
    id: 'tpl_time',
    title: 'Plantilla 3: Ahorro de Tiempo y Auto-Subida',
    tag: 'Ahorro Tiempo',
    text: 'Buenas {nombre} 👋 Vi tu perfil en {portal}. Sabemos el tiempo que quita estar pendiente de subir y renovar anuncios todo el día. Con el sistema de autopubli24 tu anuncio se auto-publica solo y se mantiene arriba en {ciudad}. ¿Te gustaría probarlo o que te explique cómo funciona?',
  },
  {
    id: 'tpl_calls',
    title: 'Plantilla 4: Más Visitas y Duplicar Contactos',
    tag: 'Más Llamadas',
    text: 'Hola {nombre}, ¿cómo estás? Te escribo porque tenemos anunciantes en {ciudad} utilizando autopubli24 para posicionar sus anuncios en {portal} y están duplicando contactos. Si quieres multiplicar tus visitas y llamadas con publicación automática 24/7, avísame y te cuento detalles. ¡Un saludo!',
  },
];

export const CONVERSATIONAL_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'tpl_conv_directo',
    title: 'Gancho 1: Directo y Natural',
    tag: 'Gancho Directo',
    text: 'Hola {nombre}, buenas! Vi tu anuncio publicado en {portal}. ¿Sigues por {ciudad}?',
  },
  {
    id: 'tpl_conv_zona',
    title: 'Gancho 2: Consulta de Zona',
    tag: 'Consulta Zona',
    text: 'Buenas {nombre} 👋 Vi tu anuncio en {portal}. Tenía una duda rápida sobre cómo te está funcionando la zona de {ciudad}, ¿te pillo disponible?',
  },
  {
    id: 'tpl_conv_perfil',
    title: 'Gancho 3: Disponibilidad y Perfil',
    tag: 'Disponibilidad',
    text: 'Hola {nombre} 👋 ¿Qué tal? He visto tu perfil en {portal} ({ciudad}). ¿Estás atendiendo hoy?',
  },
];

export const STEP2_RESPONSE_TEMPLATES = [
  {
    id: 'step2_explicativa',
    title: 'Respuesta 1: Explicativa + Prueba (Captura de pantalla)',
    badge: 'Explicativa + Captura',
    text: 'Genial {nombre}, perdona la molestia! Te escribía rápido porque trabajamos con anunciantes de {ciudad} posicionando sus anuncios arriba las 24h para que reciban más llamadas sin renovar a mano. Te paso esta captura para que veas cómo funciona...',
  },
  {
    id: 'step2_escasez',
    title: 'Respuesta 2: Exclusividad y Límite de 10 Plazas por Zona (Escasez)',
    badge: 'Máximo 10 Plazas por Zona',
    text: 'Genial {nombre}! Te comento rápido: en autopubli24 subimos los anuncios automáticamente a primera posición las 24h para multiplicar llamadas. Por motivos de cumplir nuestra promesa y que los anuncios estén siempre en las primeras posiciones, no aceptamos más de 10 plazas por cada zona en {ciudad}. Hoy quedan muy pocas plazas libres; si quieres que te reserve la plaza antes de que se agote en tu zona, avísame y te paso detalles directamente.',
  },
];

const DEFAULT_WHATSAPP_CONFIG: WhatsAppBusinessConfig = {
  businessNumber: '+34 600 00 00 00',
  senderName: 'autopubli24',
  dispatchMode: 'web_queue',
  campaignFlow: 'two_step_conversational',
  delaySeconds: 15,
  randomizeDelay: true,
  maxBatchSize: 50,
  pauseAfterBatchCount: 20,
  pauseDurationMinutes: 2,
  defaultMessageTemplate: CONVERSATIONAL_WHATSAPP_TEMPLATES[0].text,
  templates: CONVERSATIONAL_WHATSAPP_TEMPLATES,
  rotationMode: 'round_robin',
  selectedTemplateIndex: 0,
  sendImageAfterMessage: false,
};

const INITIAL_TOP_PORTALS: PortalItem[] = [
  {
    id: 'portal_01',
    name: 'Mundosexanuncio',
    domain: 'mundosexanuncio.com',
    url: 'https://www.mundosexanuncio.com/',
    logoUrl: 'https://static.mundosexanuncio.com/images/mundosexlogo.png',
    seoRank: 1,
    monthlyVisitsEstimated: '3.5M visitas/mes',
    description: 'Top 1 posicionamiento SEO en España por provincias y ciudades',
    addedAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'portal_02',
    name: 'NuevoLoquo',
    domain: 'nuevoloquo.es',
    url: 'https://www.nuevoloquo.es/',
    logoUrl: 'https://www.google.com/s2/favicons?domain=nuevoloquo.es&sz=128',
    seoRank: 2,
    monthlyVisitsEstimated: '2.4M visitas/mes',
    description: 'Portal de alta autoridad con 89% de su tráfico procedente de España',
    addedAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'portal_03',
    name: 'Skokka España',
    domain: 'es.skokka.com',
    url: 'https://es.skokka.com/',
    logoUrl: 'https://www.google.com/s2/favicons?domain=es.skokka.com&sz=128',
    seoRank: 3,
    monthlyVisitsEstimated: '1.8M visitas/mes',
    description: 'Portal internacional de anuncios con fuerte indexación en Google España',
    addedAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'portal_04',
    name: 'Erosguía',
    domain: 'erosguia.com',
    url: 'https://www.erosguia.com/',
    logoUrl: 'https://www.google.com/s2/favicons?domain=erosguia.com&sz=128',
    seoRank: 4,
    monthlyVisitsEstimated: '1.1M visitas/mes',
    description: 'Guía y directorio especializado con filtros por localidad y servicios',
    addedAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'portal_05',
    name: 'Slumi',
    domain: 'slumi.com',
    url: 'https://www.slumi.com/',
    logoUrl: 'https://www.google.com/s2/favicons?domain=slumi.com&sz=128',
    seoRank: 5,
    monthlyVisitsEstimated: '500K visitas/mes',
    description: 'Portal de contactos y clasificados en crecimiento continuo en España',
    addedAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'portal_06',
    name: 'Locanto España',
    domain: 'locanto.es',
    url: 'https://www.locanto.es/',
    logoUrl: 'https://www.google.com/s2/favicons?domain=locanto.es&sz=128',
    seoRank: 6,
    monthlyVisitsEstimated: '850K visitas/mes',
    description: 'Tablón de clasificados con sección activa de contactos por comunidades',
    addedAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'portal_07',
    name: 'Destacamos',
    domain: 'destacamos.com',
    url: 'https://www.destacamos.com/',
    logoUrl: 'https://www.google.com/s2/favicons?domain=destacamos.com&sz=128',
    seoRank: 7,
    monthlyVisitsEstimated: '420K visitas/mes',
    description: 'Directorio de anuncios clasificados y perfiles por capitales de provincia',
    addedAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'portal_08',
    name: 'CitaPerfecta',
    domain: 'citaperfecta.com',
    url: 'https://www.citaperfecta.com/',
    logoUrl: 'https://www.google.com/s2/favicons?domain=citaperfecta.com&sz=128',
    seoRank: 8,
    monthlyVisitsEstimated: '280K visitas/mes',
    description: 'Plataforma para publicar y buscar contactos independientes',
    addedAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'portal_09',
    name: 'TuAd España',
    domain: 'tuad.es',
    url: 'https://www.tuad.es/',
    logoUrl: 'https://www.google.com/s2/favicons?domain=tuad.es&sz=128',
    seoRank: 9,
    monthlyVisitsEstimated: '190K visitas/mes',
    description: 'Portal de publicación rápida de anuncios clasificados',
    addedAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'portal_10',
    name: 'Evisos España',
    domain: 'evisos.es',
    url: 'https://www.evisos.es/',
    logoUrl: 'https://www.google.com/s2/favicons?domain=evisos.es&sz=128',
    seoRank: 10,
    monthlyVisitsEstimated: '150K visitas/mes',
    description: 'Anuncios clasificados tradicionales divididos por zonas postales',
    addedAt: '2026-10-01T00:00:00.000Z',
  },
];

// Ensure data directory and files exist
async function initStorage() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(DIRECTORY_FILE);
      const content = await fs.readFile(DIRECTORY_FILE, 'utf-8');
      if (!content || JSON.parse(content).length === 0) {
        throw new Error('empty');
      }
    } catch {
      // Seed with initial sample ads so user immediately sees how their directory looks
      const initialSeed: AdItem[] = [
        {
          id: 'ad_init_01',
          title: 'Elena 24 años nueva en el centro, simpática y divertida',
          imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
          phone: '+34 612 89 45 23',
          normalizedPhone: '34612894523',
          hasWhatsapp: true,
          whatsappUrl: 'https://wa.me/34612894523?text=Hola,%20he%20visto%20tu%20anuncio',
          sourceUrl: 'https://www.mundosexanuncio.com/madrid/',
          location: 'Madrid Centro',
          category: 'Anuncios',
          scrapedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          sourceSite: 'mundosexanuncio.com',
          notes: 'Disponibilidad tardes y fines de semana',
          status: 'favorito',
        },
        {
          id: 'ad_init_02',
          title: 'Carla morena independiente en Eixample, trato muy agradable',
          imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
          phone: '+34 678 12 34 56',
          normalizedPhone: '34678123456',
          hasWhatsapp: true,
          whatsappUrl: 'https://wa.me/34678123456?text=Hola,%20he%20visto%20tu%20anuncio',
          sourceUrl: 'https://www.mundosexanuncio.com/barcelona/',
          location: 'Barcelona',
          category: 'Anuncios',
          scrapedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          sourceSite: 'mundosexanuncio.com',
          notes: '',
          status: 'nuevo',
        },
        {
          id: 'ad_init_03',
          title: 'Lucía dulce y cariñosa cerca de Ruzafa, fotos 100% reales',
          imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
          phone: '+34 695 78 90 12',
          normalizedPhone: '34695789012',
          hasWhatsapp: true,
          whatsappUrl: 'https://wa.me/34695789012?text=Hola,%20he%20visto%20tu%20anuncio',
          sourceUrl: 'https://www.mundosexanuncio.com/valencia/',
          location: 'Valencia',
          category: 'Anuncios',
          scrapedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
          sourceSite: 'mundosexanuncio.com',
          notes: 'Contactada por WhatsApp. Muy amable.',
          status: 'contactado',
        },
      ];
      await fs.writeFile(DIRECTORY_FILE, JSON.stringify(initialSeed, null, 2), 'utf-8');
    }

    try {
      await fs.access(DUPLICATES_FILE);
      const dupContent = await fs.readFile(DUPLICATES_FILE, 'utf-8');
      if (!dupContent || JSON.parse(dupContent).length === 0) {
        throw new Error('empty');
      }
    } catch {
      const initialDuplicates: DuplicateRecord[] = [
        {
          phone: '+34 612 89 45 23',
          normalizedPhone: '34612894523',
          title: 'Elena rubia universitaria en Chamberí (Anuncio repetido)',
          existingTitle: 'Elena 24 años nueva en el centro, simpática y divertida',
          sourceUrl: 'https://www.mundosexanuncio.com/madrid/',
          detectedAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ];
      await fs.writeFile(DUPLICATES_FILE, JSON.stringify(initialDuplicates, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Failed to initialize storage:', err);
  }
}

export async function getDirectory(): Promise<AdItem[]> {
  await initStorage();

  // 1. Try fetching from Supabase cloud database first
  try {
    const supabaseAds = await fetchDirectoryFromSupabase();
    if (Array.isArray(supabaseAds) && supabaseAds.length > 0) {
      // Keep local backup synchronized asynchronously
      fs.writeFile(DIRECTORY_FILE, JSON.stringify(supabaseAds, null, 2), 'utf-8').catch(() => {});
      return supabaseAds;
    }
  } catch (err) {
    console.warn('[Storage] Fallback a almacenamiento local:', err);
  }

  // 2. Fallback to local persistent JSON file
  try {
    const data = await fs.readFile(DIRECTORY_FILE, 'utf-8');
    return JSON.parse(data) as AdItem[];
  } catch (err) {
    console.error('Error reading directory:', err);
    return [];
  }
}

export async function getDuplicateLogs(): Promise<DuplicateRecord[]> {
  await initStorage();
  try {
    const data = await fs.readFile(DUPLICATES_FILE, 'utf-8');
    return JSON.parse(data) as DuplicateRecord[];
  } catch (err) {
    console.error('Error reading duplicates log:', err);
    return [];
  }
}

export async function saveDuplicateLogs(duplicates: DuplicateRecord[]): Promise<void> {
  if (!duplicates || duplicates.length === 0) return;
  await initStorage();
  try {
    const current = await getDuplicateLogs();
    const updated = [...duplicates, ...current].slice(0, 1000); // keep last 1000 logs
    await fs.writeFile(DUPLICATES_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving duplicate logs:', err);
  }
}

export async function saveAdsBatch(incomingAds: AdItem[]): Promise<{
  added: AdItem[];
  duplicatesCount: number;
  duplicatesList: DuplicateRecord[];
}> {
  await initStorage();
  const currentDirectory = await getDirectory();
  const existingPhonesMap = new Map<string, AdItem>();
  
  for (const ad of currentDirectory) {
    if (ad.normalizedPhone) {
      existingPhonesMap.set(ad.normalizedPhone, ad);
    }
  }

  const added: AdItem[] = [];
  const duplicatesList: DuplicateRecord[] = [];
  const seenInBatch = new Set<string>();

  for (const ad of incomingAds) {
    const norm = ad.normalizedPhone;
    if (!norm) {
      // Ad without phone cannot be deduplicated properly, but we still assign an ID
      added.push(ad);
      continue;
    }

    if (existingPhonesMap.has(norm)) {
      const existing = existingPhonesMap.get(norm)!;
      duplicatesList.push({
        phone: ad.phone,
        normalizedPhone: norm,
        title: ad.title,
        existingTitle: existing.title,
        sourceUrl: ad.sourceUrl,
        detectedAt: new Date().toISOString(),
      });
      continue;
    }

    if (seenInBatch.has(norm)) {
      const firstInBatch = added.find(a => a.normalizedPhone === norm);
      duplicatesList.push({
        phone: ad.phone,
        normalizedPhone: norm,
        title: ad.title,
        existingTitle: firstInBatch?.title || 'Anuncio anterior del mismo lote',
        sourceUrl: ad.sourceUrl,
        detectedAt: new Date().toISOString(),
      });
      continue;
    }

    // New unique ad!
    seenInBatch.add(norm);
    existingPhonesMap.set(norm, ad);
    added.push(ad);
  }

  if (added.length > 0) {
    const updatedDirectory = [...added, ...currentDirectory];
    await fs.writeFile(DIRECTORY_FILE, JSON.stringify(updatedDirectory, null, 2), 'utf-8');
    // Persist new unique ads to Supabase database
    upsertBatchToSupabase(added).catch(err => {
      console.warn('[Storage] Error al subir batch a Supabase:', err);
    });
  }

  if (duplicatesList.length > 0) {
    await saveDuplicateLogs(duplicatesList);
  }

  return {
    added,
    duplicatesCount: duplicatesList.length,
    duplicatesList,
  };
}

export async function updateAd(id: string, updates: Partial<AdItem>): Promise<AdItem | null> {
  await initStorage();
  const current = await getDirectory();
  const index = current.findIndex(ad => ad.id === id);
  if (index === -1) return null;

  current[index] = { ...current[index], ...updates };
  await fs.writeFile(DIRECTORY_FILE, JSON.stringify(current, null, 2), 'utf-8');
  upsertAdToSupabase(current[index]).catch(() => {});
  return current[index];
}

export async function markAdContacted(options: { adId?: string; phone?: string }): Promise<{ updatedCount: number; affectedIds: string[] }> {
  await initStorage();
  const current = await getDirectory();
  let cleanPhone = options.phone ? options.phone.replace(/[^0-9]/g, '') : '';

  if (options.adId && !cleanPhone) {
    const found = current.find(ad => ad.id === options.adId);
    if (found?.normalizedPhone) {
      cleanPhone = found.normalizedPhone;
    } else if (found?.phone) {
      cleanPhone = found.phone.replace(/[^0-9]/g, '');
    }
  }

  const affectedIds: string[] = [];
  const affectedAds: AdItem[] = [];
  let updatedCount = 0;

  for (let i = 0; i < current.length; i++) {
    const ad = current[i];
    const adCleanPhone = (ad.normalizedPhone || ad.phone || '').replace(/[^0-9]/g, '');
    const matchesId = options.adId && ad.id === options.adId;
    const matchesPhone = cleanPhone && adCleanPhone && adCleanPhone === cleanPhone;

    if (matchesId || matchesPhone) {
      affectedIds.push(ad.id);
      if (ad.status !== 'contactado') {
        current[i] = {
          ...ad,
          status: 'contactado',
        };
        affectedAds.push(current[i]);
        updatedCount++;
      }
    }
  }

  if (updatedCount > 0) {
    await fs.writeFile(DIRECTORY_FILE, JSON.stringify(current, null, 2), 'utf-8');
    upsertBatchToSupabase(affectedAds).catch(() => {});
  }

  return { updatedCount, affectedIds };
}

export async function addAdDirectly(ad: AdItem): Promise<AdItem> {
  await initStorage();
  const current = await getDirectory();
  current.unshift(ad);
  await fs.writeFile(DIRECTORY_FILE, JSON.stringify(current, null, 2), 'utf-8');
  upsertAdToSupabase(ad).catch(err => {
    console.warn('[Storage] Error al subir anuncio directo a Supabase:', err);
  });
  return ad;
}

export async function deleteAd(id: string): Promise<boolean> {
  await initStorage();
  const current = await getDirectory();
  const filtered = current.filter(ad => ad.id !== id);
  if (filtered.length === current.length) return false;

  await fs.writeFile(DIRECTORY_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  deleteAdFromSupabase(id).catch(() => {});
  return true;
}

export async function deleteAdsBatch(ids: string[]): Promise<number> {
  await initStorage();
  const current = await getDirectory();
  const idSet = new Set(ids);
  const filtered = current.filter(ad => !idSet.has(ad.id));
  const removedCount = current.length - filtered.length;

  if (removedCount > 0) {
    await fs.writeFile(DIRECTORY_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    deleteBatchFromSupabase(ids).catch(() => {});
  }
  return removedCount;
}

export async function deleteAdsByCity(cityTerm: string): Promise<number> {
  await initStorage();
  const current = await getDirectory();
  const term = cityTerm.toLowerCase().trim();

  const filtered = current.filter(ad => {
    const loc = (ad.location || '').toLowerCase();
    return !loc.includes(term);
  });

  const removedCount = current.length - filtered.length;
  if (removedCount > 0) {
    await fs.writeFile(DIRECTORY_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  }
  return removedCount;
}

export async function clearDirectory(): Promise<boolean> {
  await initStorage();
  await fs.writeFile(DIRECTORY_FILE, JSON.stringify([], null, 2), 'utf-8');
  return true;
}

export interface DuplicatePhoneGroup {
  normalizedPhone: string;
  phone: string;
  count: number;
  ads: AdItem[];
}

export function normalizeCanonicalPhone(raw?: string | null): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits || digits.length < 6) return digits;
  if (digits.startsWith('0034')) return '34' + digits.slice(4);
  if (digits.startsWith('34') && digits.length >= 11) return digits;
  if (digits.length === 9) return '34' + digits;
  if (digits.length > 9 && (digits.slice(-9).startsWith('6') || digits.slice(-9).startsWith('7'))) {
    return '34' + digits.slice(-9);
  }
  return digits;
}

export async function findDuplicatePhoneGroups(): Promise<DuplicatePhoneGroup[]> {
  await initStorage();
  const current = await getDirectory();
  const map = new Map<string, AdItem[]>();

  for (const ad of current) {
    const norm = normalizeCanonicalPhone(ad.normalizedPhone || ad.phone || '');
    if (!norm) continue;
    const existing = map.get(norm) || [];
    existing.push(ad);
    map.set(norm, existing);
  }

  const groups: DuplicatePhoneGroup[] = [];
  for (const [norm, ads] of map.entries()) {
    if (ads.length > 1) {
      groups.push({
        normalizedPhone: norm,
        phone: ads[0].phone || norm,
        count: ads.length,
        ads,
      });
    }
  }

  // Sort groups with the highest duplicate count first
  return groups.sort((a, b) => b.count - a.count);
}

export async function deduplicateDirectoryKeepOne(preference: 'newest' | 'favorite_or_newest' = 'favorite_or_newest'): Promise<{
  removedCount: number;
  removedIds: string[];
  keptCount: number;
  groupsResolved: number;
}> {
  await initStorage();
  const current = await getDirectory();
  const groups = await findDuplicatePhoneGroups();

  const idsToRemove: string[] = [];

  for (const group of groups) {
    // Sort ads: prioritize favorites and contacted, then newest scrapedAt
    const sorted = [...group.ads].sort((a, b) => {
      if (preference === 'favorite_or_newest') {
        if (a.status === 'favorito' && b.status !== 'favorito') return -1;
        if (b.status === 'favorito' && a.status !== 'favorito') return 1;
        if (a.status === 'contactado' && b.status === 'nuevo') return -1;
        if (b.status === 'contactado' && a.status === 'nuevo') return 1;
      }
      return new Date(b.scrapedAt || 0).getTime() - new Date(a.scrapedAt || 0).getTime();
    });

    // Keep the top 1, delete all remaining duplicates
    const toDelete = sorted.slice(1);
    for (const del of toDelete) {
      idsToRemove.push(del.id);
    }
  }

  if (idsToRemove.length > 0) {
    await deleteAdsBatch(idsToRemove);
  }

  return {
    removedCount: idsToRemove.length,
    removedIds: idsToRemove,
    keptCount: current.length - idsToRemove.length,
    groupsResolved: groups.length,
  };
}

export async function getDirectoryStats(): Promise<DirectoryStats> {
  const directory = await getDirectory();
  const duplicates = await getDuplicateLogs();

  const cityCounts: Record<string, number> = {};
  let totalWithWhatsapp = 0;
  let totalContacted = 0;
  let totalFavorites = 0;

  for (const ad of directory) {
    if (ad.hasWhatsapp) totalWithWhatsapp++;
    if (ad.status === 'contactado') totalContacted++;
    if (ad.status === 'favorito') totalFavorites++;

    const loc = ad.location || 'Sin ubicación';
    cityCounts[loc] = (cityCounts[loc] || 0) + 1;
  }

  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    totalAds: directory.length,
    totalWithWhatsapp,
    totalContacted,
    totalFavorites,
    totalDuplicatesPrevented: duplicates.length,
    topCities,
  };
}

export async function getPortals(): Promise<PortalItem[]> {
  await initStorage();
  try {
    const data = await fs.readFile(PORTALS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // initialize
  }

  // Save default initial top portals
  await fs.writeFile(PORTALS_FILE, JSON.stringify(INITIAL_TOP_PORTALS, null, 2), 'utf-8');
  return INITIAL_TOP_PORTALS;
}

export async function savePortal(
  newPortal: Omit<PortalItem, 'id' | 'addedAt'>
): Promise<PortalItem> {
  const current = await getPortals();
  const cleanDomain = newPortal.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  
  // Check if domain already exists
  const existingIdx = current.findIndex(p => p.domain.toLowerCase() === cleanDomain.toLowerCase());
  
  const portalItem: PortalItem = {
    ...newPortal,
    id: `portal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    domain: cleanDomain,
    addedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    current[existingIdx] = { ...current[existingIdx], ...portalItem, id: current[existingIdx].id };
  } else {
    current.unshift(portalItem);
  }

  await fs.writeFile(PORTALS_FILE, JSON.stringify(current, null, 2), 'utf-8');
  return portalItem;
}

export async function deletePortal(id: string): Promise<boolean> {
  const current = await getPortals();
  const filtered = current.filter(p => p.id !== id);
  await fs.writeFile(PORTALS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  return true;
}

export async function resetPortals(): Promise<PortalItem[]> {
  await fs.writeFile(PORTALS_FILE, JSON.stringify(INITIAL_TOP_PORTALS, null, 2), 'utf-8');
  return INITIAL_TOP_PORTALS;
}

export async function getWhatsAppConfig(): Promise<WhatsAppBusinessConfig> {
  await initStorage();
  try {
    const data = await fs.readFile(WHATSAPP_CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    const templates = Array.isArray(parsed.templates) && parsed.templates.length > 0
      ? parsed.templates
      : DEFAULT_WHATSAPP_TEMPLATES;
    const rotationMode = parsed.rotationMode || 'round_robin';
    return {
      ...DEFAULT_WHATSAPP_CONFIG,
      ...parsed,
      templates,
      rotationMode,
    };
  } catch {
    await fs.writeFile(WHATSAPP_CONFIG_FILE, JSON.stringify(DEFAULT_WHATSAPP_CONFIG, null, 2), 'utf-8');
    return DEFAULT_WHATSAPP_CONFIG;
  }
}

export async function saveWhatsAppConfig(
  updates: Partial<WhatsAppBusinessConfig>
): Promise<WhatsAppBusinessConfig> {
  const current = await getWhatsAppConfig();
  const merged: WhatsAppBusinessConfig = {
    ...current,
    ...updates,
  };
  await fs.writeFile(WHATSAPP_CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

