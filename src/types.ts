export interface AdItem {
  id: string;
  title: string;
  imageUrl: string;
  images?: string[];
  croppedImages?: string[];
  detectedName?: string;
  nationality?: string;
  description?: string;
  phone: string;
  normalizedPhone: string;
  hasWhatsapp: boolean;
  whatsappUrl?: string;
  sourceUrl?: string;
  category?: string;
  location?: string;
  scrapedAt: string;
  sourceSite: string;
  notes?: string;
  status: 'nuevo' | 'contactado' | 'descartado' | 'favorito';
  isFullAd?: boolean;
}

export interface DuplicateRecord {
  phone: string;
  normalizedPhone: string;
  title: string;
  existingTitle: string;
  sourceUrl?: string;
  detectedAt: string;
}

export interface DuplicatePhoneGroup {
  normalizedPhone: string;
  phone: string;
  count: number;
  ads: AdItem[];
}

export interface ScrapeJobRequest {
  url?: string;
  urls?: string[];
  city?: string;
  cityFilter?: string;
  category?: string;
  targetAdCount?: number;
  maxPages?: number;
  maxAds?: number;
  followDetailLinks?: boolean;
  fullAdMode?: boolean;
  cropWatermark?: boolean;
  rawHtml?: string;
  sourceName?: string;
}

export interface ScrapeProgressLog {
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export interface ScrapeJobResult {
  success: boolean;
  scrapedCount: number;
  newUniqueAdded: number;
  duplicatesSkipped: number;
  duplicates: DuplicateRecord[];
  ads: AdItem[];
  logs: ScrapeProgressLog[];
  durationMs: number;
  error?: string;
}

export interface DirectoryStats {
  totalAds: number;
  totalWithWhatsapp: number;
  totalContacted: number;
  totalFavorites: number;
  totalDuplicatesPrevented: number;
  topCities: { name: string; count: number }[];
}

export interface PortalItem {
  id: string;
  name: string;
  domain: string;
  url: string;
  logoUrl: string;
  seoRank?: number;
  monthlyVisitsEstimated?: string;
  description?: string;
  addedAt: string;
}

export interface WhatsAppTemplate {
  id: string;
  title: string;
  text: string;
  tag: string;
}

export interface WhatsAppBusinessConfig {
  businessNumber: string;
  senderName: string;
  dispatchMode: 'web_queue' | 'cloud_api';
  delaySeconds: number; // e.g. 15s
  randomizeDelay: boolean; // random jitter 2-5s
  maxBatchSize: number;
  pauseAfterBatchCount?: number;
  pauseDurationMinutes?: number;
  defaultMessageTemplate: string;
  templates: WhatsAppTemplate[];
  rotationMode: 'round_robin' | 'random' | 'fixed';
  selectedTemplateIndex?: number;
  sendImageAfterMessage?: boolean;
  campaignFlow?: 'two_step_conversational' | 'classic_direct';
  apiPhoneNumberId?: string;
  apiAccessToken?: string;
}

export interface WhatsAppCampaignItem {
  adId: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  location: string;
  category: string;
  sourceSite: string;
  templateTitle?: string;
  messageText: string;
  whatsappUrl: string;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'skipped';
  sentAt?: string;
  error?: string;
}
