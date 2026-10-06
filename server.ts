import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import sharp from 'sharp';
import * as cheerio from 'cheerio';
import { ZipArchive } from 'archiver';
import {
  getDirectory,
  saveAdsBatch,
  updateAd,
  addAdDirectly,
  markAdContacted,
  deleteAd,
  deleteAdsBatch,
  deleteAdsByCity,
  clearDirectory,
  findDuplicatePhoneGroups,
  deduplicateDirectoryKeepOne,
  getDuplicateLogs,
  getDirectoryStats,
  getPortals,
  savePortal,
  deletePortal,
  resetPortals,
  getWhatsAppConfig,
  saveWhatsAppConfig,
} from './src/server/storage.ts';
import { executeScrapingJob, normalizePhoneNumber } from './src/server/scraper.ts';
import {
  checkSupabaseStatus,
  upsertBatchToSupabase,
  SUPABASE_SQL_SCHEMA,
  SUPABASE_URL,
} from './src/server/supabase.ts';
import type { AdItem, PortalItem, WhatsAppBusinessConfig } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // GET directory
  app.get('/api/directory', async (req, res) => {
    try {
      const ads = await getDirectory();
      const stats = await getDirectoryStats();
      res.json({ success: true, ads, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET stats
  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await getDirectoryStats();
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET duplicate history
  app.get('/api/duplicates', async (req, res) => {
    try {
      const duplicates = await getDuplicateLogs();
      res.json({ success: true, duplicates });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET scan directory for duplicate phones
  app.get('/api/directory/duplicate-phones', async (req, res) => {
    try {
      const groups = await findDuplicatePhoneGroups();
      const allAds = await getDirectory();
      const totalRedundantAds = groups.reduce((acc, g) => acc + (g.count - 1), 0);
      res.json({
        success: true,
        totalAds: allAds.length,
        duplicateGroupsCount: groups.length,
        totalRedundantAds,
        groups,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST resolve duplicates keeping only 1 ad per phone number
  app.post('/api/directory/deduplicate-keep-one', async (req, res) => {
    try {
      const { preference } = req.body;
      const result = await deduplicateDirectoryKeepOne(preference || 'favorite_or_newest');
      const ads = await getDirectory();
      const stats = await getDirectoryStats();
      res.json({
        success: true,
        ...result,
        ads,
        stats,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST generate a pair of duplicate ads for testing detection & keep-one
  app.post('/api/directory/test-duplicate-pair', async (req, res) => {
    try {
      const testPhone = '+34 699 88 77 66';
      const norm = '34699887766';
      const now = Date.now();
      const ad1: AdItem = {
        id: `test_dup_${now}_1`,
        title: 'Anuncio A (Prueba teléfono repetido en Chamberí)',
        phone: testPhone,
        normalizedPhone: norm,
        location: 'Madrid Centro',
        sourceSite: 'MundoSexAnuncio',
        status: 'nuevo',
        category: 'Escorts',
        imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        hasWhatsapp: true,
        whatsappUrl: `https://wa.me/${norm}`,
        scrapedAt: new Date(now - 3600000).toISOString(),
        notes: 'Anuncio A con teléfono repetido para probar deduplicación.',
      };
      const ad2: AdItem = {
        id: `test_dup_${now}_2`,
        title: 'Anuncio B (Prueba mismo número en Salamanca)',
        phone: testPhone,
        normalizedPhone: norm,
        location: 'Madrid Salamanca',
        sourceSite: 'Pasion',
        status: 'favorito',
        category: 'Escorts',
        imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        hasWhatsapp: true,
        whatsappUrl: `https://wa.me/${norm}`,
        scrapedAt: new Date(now).toISOString(),
        notes: 'Anuncio B con el mismo número para probar que el usuario puede eliminar y dejar solo 1.',
      };

      await addAdDirectly(ad1);
      await addAdDirectly(ad2);

      const groups = await findDuplicatePhoneGroups();
      const stats = await getDirectoryStats();
      const ads = await getDirectory();
      res.json({ success: true, ads, groups, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET Cropped image proxy (crops out bottom website logo/watermark)
  app.get('/api/image/crop', async (req, res) => {
    try {
      const rawUrl = req.query.url as string;
      const percentStr = req.query.percent as string;
      const cropBottomPercent = Math.min(30, Math.max(0, Number(percentStr) || 10)); // default 10% bottom crop

      if (!rawUrl || (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://'))) {
        return res.status(400).send('Invalid or missing image URL');
      }

      let referer = 'https://www.mundosexanuncio.com/';
      try {
        referer = new URL(rawUrl).origin + '/';
      } catch {
        // fallback
      }

      const imgResponse = await fetch(rawUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Referer: referer,
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });

      if (!imgResponse.ok) {
        return res.status(imgResponse.status).send('Failed to fetch source image');
      }

      const buffer = Buffer.from(await imgResponse.arrayBuffer());

      if (cropBottomPercent === 0) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(buffer);
      }

      const image = sharp(buffer);
      const meta = await image.metadata();

      if (!meta.width || !meta.height) {
        res.setHeader('Content-Type', 'image/jpeg');
        return res.send(buffer);
      }

      // Crop the bottom watermark
      const newHeight = Math.max(10, Math.round(meta.height * (1 - cropBottomPercent / 100)));

      const croppedBuffer = await sharp(buffer)
        .extract({
          left: 0,
          top: 0,
          width: meta.width,
          height: newHeight,
        })
        .jpeg({ quality: 92 })
        .toBuffer();

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(croppedBuffer);
    } catch (err: any) {
      console.error('Error in /api/image/crop:', err.message);
      if (req.query.url && typeof req.query.url === 'string') {
        return res.redirect(req.query.url);
      }
      res.status(500).send('Error processing image');
    }
  });

  // POST add single ad manually
  app.post('/api/directory/item', async (req, res) => {
    try {
      const { title, phone, imageUrl, location, notes, status } = req.body;
      const { normalized, formatted } = normalizePhoneNumber(phone || '');
      
      const newAd: AdItem = {
        id: `man_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: title || 'Anuncio manual',
        phone: formatted || phone || 'Sin número',
        normalizedPhone: normalized,
        imageUrl: imageUrl || '',
        location: location || 'España',
        category: 'Manual',
        sourceSite: 'Manual',
        hasWhatsapp: Boolean(normalized.startsWith('346') || normalized.startsWith('347')),
        whatsappUrl: normalized ? `https://wa.me/${normalized}` : undefined,
        scrapedAt: new Date().toISOString(),
        notes: notes || '',
        status: status || 'nuevo',
      };

      const result = await saveAdsBatch([newAd]);
      if (result.duplicatesCount > 0) {
        return res.status(409).json({
          success: false,
          error: `El teléfono ${formatted} ya existe en tu directorio. No se admiten repetidos.`,
          duplicate: result.duplicatesList[0],
        });
      }

      const stats = await getDirectoryStats();
      res.json({ success: true, ad: result.added[0], stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT update ad (notes, status)
  app.put('/api/directory/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await updateAd(id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Anuncio no encontrado' });
      }
      const stats = await getDirectoryStats();
      res.json({ success: true, ad: updated, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE single ad
  app.delete('/api/directory/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await deleteAd(id);
      const stats = await getDirectoryStats();
      res.json({ success: true, deleted, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST batch delete selected ads by IDs
  app.post('/api/directory/delete-batch', async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: 'No se enviaron IDs para eliminar' });
      }
      const removedCount = await deleteAdsBatch(ids);
      const stats = await getDirectoryStats();
      res.json({ success: true, removedCount, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST bulk delete ads by city/province
  app.post('/api/directory/delete-by-city', async (req, res) => {
    try {
      const { city } = req.body;
      if (!city || !city.trim()) {
        return res.status(400).json({ success: false, error: 'Ciudad no especificada' });
      }
      const removedCount = await deleteAdsByCity(city.trim());
      const stats = await getDirectoryStats();
      res.json({ success: true, removedCount, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE clear all directory
  app.delete('/api/directory', async (req, res) => {
    try {
      await clearDirectory();
      const stats = await getDirectoryStats();
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- PORTALS MANAGEMENT & SEO ANALYSIS ---

  // GET all registered portals
  app.get('/api/portals', async (req, res) => {
    try {
      const portals = await getPortals();
      res.json({ success: true, portals });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST add or update portal (only name and logo image required)
  app.post('/api/portals', async (req, res) => {
    try {
      const { name, domain, url, logoUrl, seoRank, monthlyVisitsEstimated, description } = req.body;
      if (!name || !domain) {
        return res.status(400).json({ success: false, error: 'Se requiere nombre y dominio' });
      }

      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      const finalLogo = logoUrl || `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`;
      const finalUrl = url || `https://${cleanDomain}/`;

      const portal = await savePortal({
        name,
        domain: cleanDomain,
        url: finalUrl,
        logoUrl: finalLogo,
        seoRank: Number(seoRank) || undefined,
        monthlyVisitsEstimated,
        description,
      });

      const all = await getPortals();
      res.json({ success: true, portal, portals: all });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE portal
  app.delete('/api/portals/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await deletePortal(id);
      const all = await getPortals();
      res.json({ success: true, portals: all });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST reset portals to initial top SEO list
  app.post('/api/portals/reset', async (req, res) => {
    try {
      const portals = await resetPortals();
      res.json({ success: true, portals });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST analyze portal or search ranking portals in Google
  app.post('/api/portals/analyze', async (req, res) => {
    try {
      const { domainOrUrl, searchKeyword } = req.body;

      if (!domainOrUrl && !searchKeyword) {
        return res.status(400).json({ success: false, error: 'Especifica un dominio o palabra clave de búsqueda' });
      }

      if (domainOrUrl) {
        let cleanDomain = String(domainOrUrl).trim().toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .split('/')[0];

        let siteName = cleanDomain.split('.')[0];
        siteName = siteName.charAt(0).toUpperCase() + siteName.slice(1);
        let logoUrl = `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`;
        let description = `Portal clasificado analizado para ${cleanDomain}`;

        try {
          const fetchRes = await fetch(`https://${cleanDomain}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            signal: AbortSignal.timeout(6000),
          });

          if (fetchRes.ok) {
            const html = await fetchRes.text();
            const $ = cheerio.load(html);

            const ogSiteName = $('meta[property="og:site_name"]').attr('content');
            const pageTitle = $('title').text().trim();

            if (ogSiteName && ogSiteName.length < 40) {
              siteName = ogSiteName.trim();
            } else if (pageTitle) {
              const cleanedTitle = pageTitle.split(/[-–|·•]/)[0]?.trim();
              if (cleanedTitle && cleanedTitle.length > 2 && cleanedTitle.length < 35) {
                siteName = cleanedTitle;
              }
            }

            const appleTouch = $('link[rel*="apple-touch-icon"]').attr('href');
            if (appleTouch) {
              try {
                logoUrl = new URL(appleTouch, `https://${cleanDomain}`).href;
              } catch {}
            }
          }
        } catch {
          // fallback to domain name and Google favicon
        }

        const registered = await savePortal({
          name: siteName,
          domain: cleanDomain,
          url: `https://${cleanDomain}/`,
          logoUrl,
          description,
        });

        const all = await getPortals();
        return res.json({ success: true, portal: registered, portals: all });
      }

      // Keyword search in search engine
      if (searchKeyword) {
        const query = encodeURIComponent(`${searchKeyword} espana`);
        const searchUrl = `https://html.duckduckgo.com/html/?q=${query}`;
        
        let detectedPortals: { name: string; domain: string; url: string; logoUrl: string }[] = [];

        try {
          const searchRes = await fetch(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            },
            signal: AbortSignal.timeout(6000),
          });

          if (searchRes.ok) {
            const html = await searchRes.text();
            const $ = cheerio.load(html);
            const seen = new Set<string>();

            $('.result__url, .result__snippet, a.result__url').each((_, el) => {
              const text = $(el).text().trim();
              const match = text.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/);
              if (match && match[1]) {
                const dom = match[1].toLowerCase();
                const skip = ['duckduckgo.com', 'google.com', 'bing.com', 'wikipedia.org', 'youtube.com', 'twitter.com', 'facebook.com', 'instagram.com'];
                if (!skip.includes(dom) && !seen.has(dom)) {
                  seen.add(dom);
                  let name = dom.split('.')[0];
                  name = name.charAt(0).toUpperCase() + name.slice(1);
                  detectedPortals.push({
                    name,
                    domain: dom,
                    url: `https://${dom}/`,
                    logoUrl: `https://www.google.com/s2/favicons?domain=${dom}&sz=128`,
                  });
                }
              }
            });
          }
        } catch {
          // ignore search failure
        }

        return res.json({ success: true, keyword: searchKeyword, results: detectedPortals });
      }

    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- SUPABASE CLOUD DATABASE SYNC ---

  // GET Supabase connection status
  app.get('/api/supabase/status', async (req, res) => {
    try {
      const status = await checkSupabaseStatus();
      res.json({
        success: true,
        status,
        schemaSql: SUPABASE_SQL_SCHEMA,
        url: SUPABASE_URL,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST Sync local directory to Supabase
  app.post('/api/supabase/sync', async (req, res) => {
    try {
      const allAds = await getDirectory();
      const uploaded = await upsertBatchToSupabase(allAds);
      const status = await checkSupabaseStatus();
      res.json({
        success: true,
        total: allAds.length,
        uploaded,
        status,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET Supabase SQL Schema for creating the table
  app.get('/api/supabase/schema', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.send(SUPABASE_SQL_SCHEMA);
  });

  // --- WHATSAPP BUSINESS & CAMPAIGNS ---

  // GET WhatsApp Business config
  app.get('/api/whatsapp/config', async (req, res) => {
    try {
      const config = await getWhatsAppConfig();
      res.json({ success: true, config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST save WhatsApp Business config
  app.post('/api/whatsapp/config', async (req, res) => {
    try {
      const updated = await saveWhatsAppConfig(req.body);
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET app info (origin URL for Extension sync)
  app.get('/api/app-info', (req, res) => {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host');
    const detectedUrl = `${proto}://${host}`;
    res.json({
      success: true,
      appUrl: process.env.APP_URL || detectedUrl,
      host,
    });
  });

  // POST mark ad as contacted (and mark any duplicate ads with same phone)
  app.post('/api/whatsapp/mark-contacted', async (req, res) => {
    try {
      const { adId, phone } = req.body;
      if (!adId && !phone) {
        return res.status(400).json({ success: false, error: 'adId o phone requerido' });
      }
      const result = await markAdContacted({ adId, phone });
      
      // Remove affected IDs from active selection in memory
      if (result.affectedIds.length > 0) {
        activeSelectedAdIds = activeSelectedAdIds.filter(id => !result.affectedIds.includes(id));
      }

      const stats = await getDirectoryStats();
      res.json({
        success: true,
        updatedCount: result.updatedCount,
        affectedIds: result.affectedIds,
        stats,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Active selection in memory for Chrome Extension sync
  let activeSelectedAdIds: string[] = [];

  // POST save active selection of ads
  app.post('/api/whatsapp/active-selection', async (req, res) => {
    try {
      const { adIds } = req.body;
      if (Array.isArray(adIds)) {
        activeSelectedAdIds = adIds;
      }
      const allAds = await getDirectory();
      // Count how many of these are pending (not yet contacted)
      const pendingCount = allAds.filter(
        a => activeSelectedAdIds.includes(a.id) && a.phone && a.status !== 'contactado'
      ).length;

      res.json({
        success: true,
        totalSelected: activeSelectedAdIds.length,
        pendingCount,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET active selection of ads
  app.get('/api/whatsapp/active-selection', async (req, res) => {
    try {
      const allAds = await getDirectory();
      const includeContacted = req.query.includeContacted === 'true';
      const selected = allAds.filter(a => {
        if (!activeSelectedAdIds.includes(a.id) || !a.phone) return false;
        // Never return already contacted unless explicitly requested
        if (!includeContacted && a.status === 'contactado') return false;
        return true;
      });
      res.json({ success: true, count: selected.length, ads: selected });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET promowhatsapp image directly
  app.get('/api/promo-image', (req, res) => {
    const promoPath = path.resolve(__dirname, 'src/assets/images/promowhatsapp.jpg');
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(promoPath);
  });

  // Helper to package the extension folder to zip dynamically
  const buildExtensionZip = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const zipPath = path.resolve(__dirname, 'public/autopubli24-whatsapp-extension.zip');
      const extDir = path.resolve(__dirname, 'chrome-extension');
      const output = fs.createWriteStream(zipPath);
      const archive = new ZipArchive({ zlib: { level: 9 } });

      output.on('close', () => resolve(zipPath));
      output.on('error', reject);
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(extDir, false);
      archive.finalize();
    });
  };

  // GET download Chrome Extension ZIP package (dynamically packaged)
  app.get('/api/extension/download', async (req, res) => {
    try {
      await buildExtensionZip();
      const zipPath = path.resolve(__dirname, 'public/autopubli24-whatsapp-extension.zip');
      res.download(zipPath, 'autopubli24-whatsapp-extension.zip');
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST send single test message to verify the flow
  app.post('/api/whatsapp/send-test', async (req, res) => {
    try {
      const { testPhone, messageText, sendImage } = req.body;
      if (!testPhone || !messageText) {
        return res.status(400).json({ success: false, error: 'testPhone y messageText son requeridos' });
      }

      const cleanPhone = testPhone.replace(/[^0-9]/g, '');
      const config = await getWhatsAppConfig();
      let sentVia = 'web_link';

      if (config.dispatchMode === 'cloud_api' && config.apiPhoneNumberId && config.apiAccessToken) {
        const metaRes = await fetch(
          `https://graph.facebook.com/v20.0/${config.apiPhoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.apiAccessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: cleanPhone,
              type: 'text',
              text: { preview_url: false, body: messageText },
            }),
          }
        );
        const metaData = await metaRes.json();
        if (!metaRes.ok) {
          return res.status(metaRes.status).json({
            success: false,
            error: metaData.error?.message || 'Error en la API de Meta',
          });
        }

        // If sendImage requested, send promowhatsapp as second message
        if (sendImage ?? config.sendImageAfterMessage) {
          const host = req.get('host');
          const proto = req.protocol;
          const imageUrl = `${proto}://${host}/api/promo-image`;

          await fetch(
            `https://graph.facebook.com/v20.0/${config.apiPhoneNumberId}/messages`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${config.apiAccessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: cleanPhone,
                type: 'image',
                image: { link: imageUrl },
              }),
            }
          );
        }

        sentVia = 'cloud_api';
      }

      const encoded = encodeURIComponent(messageText);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;

      res.json({
        success: true,
        sentVia,
        cleanPhone,
        whatsappUrl,
        promoImageUrl: '/api/promo-image',
        message: 'Prueba generada correctamente',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST send message via Meta WhatsApp Business Cloud API (optional backend direct mode)
  app.post('/api/whatsapp/send-cloud-api', async (req, res) => {
    try {
      const { toPhone, messageText, sendImage } = req.body;
      const config = await getWhatsAppConfig();

      if (!config.apiPhoneNumberId || !config.apiAccessToken) {
        return res.status(400).json({
          success: false,
          error: 'No se han configurado las credenciales de Meta Cloud API (Phone Number ID o Token)',
        });
      }

      const cleanPhone = toPhone.replace(/[^0-9]/g, '');
      const metaRes = await fetch(
        `https://graph.facebook.com/v20.0/${config.apiPhoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: { preview_url: false, body: messageText },
          }),
        }
      );

      const metaData = await metaRes.json();
      if (!metaRes.ok) {
        return res.status(metaRes.status).json({
          success: false,
          error: metaData.error?.message || 'Error en la API de WhatsApp de Meta',
          details: metaData,
        });
      }

      // If sendImage requested, send image after text
      if (sendImage ?? config.sendImageAfterMessage) {
        const host = req.get('host');
        const proto = req.protocol;
        const imageUrl = `${proto}://${host}/api/promo-image`;

        await fetch(
          `https://graph.facebook.com/v20.0/${config.apiPhoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.apiAccessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: cleanPhone,
              type: 'image',
              image: { link: imageUrl },
            }),
          }
        );
      }

      res.json({ success: true, metaData });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST Run scraper job
  app.post('/api/scrape', async (req, res) => {
    try {
      const {
        url,
        urls,
        cityFilter,
        maxAds = 100,
        targetAdCount,
        maxPages = 15,
        followDetailLinks = false,
        fullAdMode = false,
        cropWatermark = true,
        rawHtml,
      } = req.body;

      const targetGoal = Number(targetAdCount || maxAds || 100);

      const targetUrls: string[] = urls && Array.isArray(urls) && urls.length > 0 
        ? urls 
        : [url || 'https://www.mundosexanuncio.com/'];

      // Fetch existing phones in directory for real-time deduplication
      const currentDirectory = await getDirectory();
      const existingPhones = new Set<string>();
      for (const ad of currentDirectory) {
        if (ad.normalizedPhone) {
          existingPhones.add(ad.normalizedPhone);
        }
      }

      let allScrapedAds: AdItem[] = [];
      let allDuplicates: any[] = [];
      let allLogs: any[] = [];
      let totalDurationMs = 0;

      for (const targetUrl of targetUrls) {
        const result = await executeScrapingJob(targetUrl, {
          targetAdCount: targetGoal,
          maxAds: targetGoal,
          maxPages: Number(maxPages),
          followDetailLinks: Boolean(followDetailLinks || fullAdMode),
          fullAdMode: Boolean(fullAdMode),
          cropWatermark: Boolean(cropWatermark),
          rawHtml: rawHtml,
          cityFilter: cityFilter ? String(cityFilter) : undefined,
          existingPhones,
        });

        allLogs = [...allLogs, ...result.logs];
        totalDurationMs += result.durationMs;

        if (result.ads.length > 0) {
          allScrapedAds = [...allScrapedAds, ...result.ads];
          for (const ad of result.ads) {
            if (ad.normalizedPhone) existingPhones.add(ad.normalizedPhone);
          }
        }

        if (result.duplicates.length > 0) {
          allDuplicates = [...allDuplicates, ...result.duplicates];
        }

        if (allScrapedAds.length >= targetGoal) {
          break;
        }
      }

      // Save new ads to persistent directory (applying server-side atomic deduplication)
      const saveResult = await saveAdsBatch(allScrapedAds);
      const updatedDirectory = await getDirectory();
      const updatedStats = await getDirectoryStats();

      res.json({
        success: true,
        scrapedCount: saveResult.added.length + saveResult.duplicatesCount,
        newUniqueAdded: saveResult.added.length,
        duplicatesSkipped: saveResult.duplicatesCount,
        duplicates: saveResult.duplicatesList,
        adsAdded: saveResult.added,
        totalDirectoryCount: updatedDirectory.length,
        logs: allLogs,
        stats: updatedStats,
        durationMs: totalDurationMs,
      });
    } catch (err: any) {
      console.error('Scrape execution error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET Export directory (CSV, JSON, VCF)
  app.get('/api/export', async (req, res) => {
    try {
      const format = (req.query.format as string) || 'csv';
      const directory = await getDirectory();

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="directorio_anuncios.json"');
        return res.send(JSON.stringify(directory, null, 2));
      }

      if (format === 'vcf') {
        // vCard 3.0 format for direct mobile address book import
        let vcardText = '';
        for (const ad of directory) {
          vcardText += 'BEGIN:VCARD\r\n';
          vcardText += 'VERSION:3.0\r\n';
          vcardText += `FN:${ad.title.replace(/[;,\n]/g, ' ')}\r\n`;
          if (ad.phone) {
            vcardText += `TEL;TYPE=CELL,VOICE:${ad.phone}\r\n`;
          }
          if (ad.imageUrl) {
            vcardText += `PHOTO;VALUE=uri:${ad.imageUrl}\r\n`;
          }
          if (ad.sourceUrl) {
            vcardText += `URL:${ad.sourceUrl}\r\n`;
          }
          if (ad.location) {
            vcardText += `ADR;TYPE=HOME:;;${ad.location};;;;\r\n`;
          }
          if (ad.notes) {
            vcardText += `NOTE:${ad.notes.replace(/\n/g, ' ')}\r\n`;
          }
          vcardText += 'END:VCARD\r\n\r\n';
        }

        res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="contactos_directorio.vcf"');
        return res.send(vcardText);
      }

      // Default: CSV format
      const headers = ['ID', 'Título', 'Teléfono', 'Teléfono_Normalizado', 'WhatsApp', 'Ubicación', 'Portal', 'URL_Foto', 'URL_Original', 'Estado', 'Notas', 'Fecha_Registro'];
      const rows = directory.map(ad => [
        `"${ad.id}"`,
        `"${(ad.title || '').replace(/"/g, '""')}"`,
        `"${(ad.phone || '').replace(/"/g, '""')}"`,
        `"${ad.normalizedPhone || ''}"`,
        `"${ad.hasWhatsapp ? 'SI' : 'NO'}"`,
        `"${(ad.location || '').replace(/"/g, '""')}"`,
        `"${(ad.sourceSite || '').replace(/"/g, '""')}"`,
        `"${(ad.imageUrl || '').replace(/"/g, '""')}"`,
        `"${(ad.sourceUrl || '').replace(/"/g, '""')}"`,
        `"${ad.status}"`,
        `"${(ad.notes || '').replace(/"/g, '""')}"`,
        `"${ad.scrapedAt}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="directorio_anuncios.csv"');
      return res.send(csvContent);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware in dev, static files in prod
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Classifieds Scraper Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
