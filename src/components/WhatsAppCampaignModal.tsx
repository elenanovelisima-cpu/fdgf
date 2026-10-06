import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MessageSquare,
  Play,
  Pause,
  Square,
  FastForward,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  User,
  MapPin,
  ExternalLink,
  Settings,
  Sparkles,
  Phone,
  RefreshCw,
  Loader2,
  Send,
  Eye,
  Shuffle,
  Repeat,
  FileText,
  RotateCcw,
  FlaskConical,
  Plus,
  Trash2,
  Check,
  Image as ImageIcon,
  Copy,
  Download,
  Edit2,
  Puzzle,
  Search,
  MessageCircle,
  Flame,
} from 'lucide-react';
import type {
  AdItem,
  WhatsAppBusinessConfig,
  WhatsAppCampaignItem,
  WhatsAppTemplate,
} from '../types.ts';
import { TOP_SPANISH_CITIES } from '../constants/cities.ts';
import { ExtensionModal } from './ExtensionModal.tsx';

interface WhatsAppCampaignModalProps {
  selectedAds: AdItem[];
  onClose: () => void;
  onAdStatusUpdated: (id: string, status: 'contactado') => void;
}

const DEFAULT_TEMPLATES: WhatsAppTemplate[] = [
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

export const CONVERSATIONAL_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'tpl_conv_directo',
    title: 'Gancho 1: Directo y Natural',
    tag: 'Gancho 1 (Directo)',
    text: 'Hola {nombre}, buenas! Vi tu anuncio publicado en {portal}. ¿Sigues por {ciudad}?',
  },
  {
    id: 'tpl_conv_zona',
    title: 'Gancho 2: Consulta de Zona',
    tag: 'Gancho 2 (Zona)',
    text: 'Buenas {nombre} 👋 Vi tu anuncio en {portal}. Tenía una duda rápida sobre cómo te está funcionando la zona de {ciudad}, ¿te pillo disponible?',
  },
  {
    id: 'tpl_conv_perfil',
    title: 'Gancho 3: Disponibilidad y Pregunta Rápida',
    tag: 'Gancho 3 (Curiosidad)',
    text: 'Hola {nombre} 👋 ¿Qué tal? He visto tu anuncio en {portal} ({ciudad}) y quería hacerte una pregunta rápida sobre tus publicaciones. ¿Estás atendiendo hoy?',
  },
];

export const STEP2_RESPONSE_TEMPLATES = [
  {
    id: 'step2_explicativa',
    title: 'Respuesta 1: Explicativa + Posicionamiento 24h',
    badge: 'Explicativa y Solución',
    description: 'Enfocada en explicar el servicio de auto-subida 24h para multiplicar llamadas sin renovar a mano.',
    text: 'Genial {nombre}, ¡perdona la molestia! Te escribía rápido porque trabajamos con anunciantes de {ciudad} posicionando sus anuncios en primera posición en {portal} las 24h para que reciban más llamadas sin tener que renovar a mano. Hacemos que el anuncio suba automáticamente a las primeras posiciones. Si quieres te explico rápido cómo funciona y te paso un ejemplo sin compromiso.',
  },
  {
    id: 'step2_escasez',
    title: 'Respuesta 2: Exclusividad y Límite de 10 Plazas por Zona (Escasez)',
    badge: '🔥 Máximo 10 Plazas en Zona',
    description: 'Por motivos de cumplir la promesa y garantizar primeras posiciones, no aceptamos más de 10 plazas por zona. Quedan pocas plazas libres.',
    text: 'Genial {nombre}! Te comento rápido: en autopubli24 subimos los anuncios automáticamente a primera posición las 24h para que tengas llamadas todo el día. Por motivos de cumplir nuestra promesa y que los anuncios de nuestros clientes estén siempre en las primeras posiciones, no aceptamos más de 10 plazas por cada zona en {ciudad}. Hoy quedan muy pocas plazas libres; si quieres reservar tu plaza antes de que se agote en tu zona avísame y te explico cómo activarlo directamente.',
  },
];

export const WhatsAppCampaignModal: React.FC<WhatsAppCampaignModalProps> = ({
  selectedAds,
  onClose,
  onAdStatusUpdated,
}) => {
  // Campaign Flow Strategy: two_step_conversational (safe anti-ban) vs classic_direct (autopubli24 full pitch)
  const [campaignFlow, setCampaignFlow] = useState<'two_step_conversational' | 'classic_direct'>('two_step_conversational');
  const [activeStepTab, setActiveStepTab] = useState<'both' | 'step1' | 'step2'>('both');
  const [selectedStep2ContactIdx, setSelectedStep2ContactIdx] = useState<number>(0);
  const [step2SearchQuery, setStep2SearchQuery] = useState<string>('');
  const [copiedResponseKey, setCopiedResponseKey] = useState<string | null>(null);
  const [step2CustomTextA, setStep2CustomTextA] = useState<string>(STEP2_RESPONSE_TEMPLATES[0].text);
  const [step2CustomTextB, setStep2CustomTextB] = useState<string>(STEP2_RESPONSE_TEMPLATES[1].text);
  const [isEditingStep2A, setIsEditingStep2A] = useState<boolean>(false);
  const [isEditingStep2B, setIsEditingStep2B] = useState<boolean>(false);
  const step2SectionRef = useRef<HTMLDivElement>(null);

  // Config state
  const [config, setConfig] = useState<WhatsAppBusinessConfig>({
    businessNumber: '+34 600 00 00 00',
    senderName: 'autopubli24',
    dispatchMode: 'web_queue',
    campaignFlow: 'two_step_conversational',
    delaySeconds: 15,
    randomizeDelay: true,
    maxBatchSize: 50,
    pauseAfterBatchCount: 20,
    pauseDurationMinutes: 2,
    defaultMessageTemplate: CONVERSATIONAL_TEMPLATES[0].text,
    templates: CONVERSATIONAL_TEMPLATES,
    rotationMode: 'round_robin',
    selectedTemplateIndex: 0,
    sendImageAfterMessage: false,
  });

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(CONVERSATIONAL_TEMPLATES);
  const [activeTemplateTab, setActiveTemplateTab] = useState<number>(0);
  const [rotationMode, setRotationMode] = useState<'round_robin' | 'random' | 'fixed'>('round_robin');
  const [sendImageAfterMessage, setSendImageAfterMessage] = useState<boolean>(false);

  // Image helpers
  const [isCopyingImage, setIsCopyingImage] = useState<boolean>(false);
  const [imageCopiedSuccess, setImageCopiedSuccess] = useState<boolean>(false);
  const [showFullImageModal, setShowFullImageModal] = useState<boolean>(false);

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);

  // Test Message Sending State (Send 1 example to user's number)
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testContactName, setTestContactName] = useState('Laura');
  const [testContactCity, setTestContactCity] = useState('Madrid');
  const [testContactPortal, setTestContactPortal] = useState('Mundosexanuncio');
  const [testTemplateIndex, setTestTemplateIndex] = useState<number>(0);
  const [testIncludeImage, setTestIncludeImage] = useState<boolean>(true);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);
  const [testErrorMessage, setTestErrorMessage] = useState<string | null>(null);

  // Queue state
  const [queue, setQueue] = useState<WhatsAppCampaignItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [totalSent, setTotalSent] = useState<number>(0);
  const [totalFailed, setTotalFailed] = useState<number>(0);
  const [excludeAlreadyContacted, setExcludeAlreadyContacted] = useState<boolean>(true);
  const [excludedAlreadyContactedCount, setExcludedAlreadyContactedCount] = useState<number>(0);
  const [popupBlockedNotice, setPopupBlockedNotice] = useState<boolean>(false);

  // Quick edit queue item name and city
  const [editingQueueItemIndex, setEditingQueueItemIndex] = useState<number | null>(null);
  const [editQueueName, setEditQueueName] = useState('');
  const [editQueueCity, setEditQueueCity] = useState('');
  const [editQueueCityCustom, setEditQueueCityCustom] = useState('');

  const timerRef = useRef<any>(null);
  const isRunningRef = useRef<boolean>(false);
  isRunningRef.current = isRunning;
  const isPausedRef = useRef<boolean>(false);
  isPausedRef.current = isPaused;

  // Load config on mount
  useEffect(() => {
    fetch('/api/whatsapp/config')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.config) {
          setConfig(data.config);
          if (data.config.campaignFlow) {
            setCampaignFlow(data.config.campaignFlow);
          }
          if (Array.isArray(data.config.templates) && data.config.templates.length > 0) {
            setTemplates(data.config.templates);
          } else if (data.config.campaignFlow === 'two_step_conversational' || !data.config.campaignFlow) {
            setTemplates(CONVERSATIONAL_TEMPLATES);
          }
          if (data.config.rotationMode) {
            setRotationMode(data.config.rotationMode);
          }
          if (data.config.businessNumber && !testPhoneNumber) {
            setTestPhoneNumber(data.config.businessNumber);
          }
          if (typeof data.config.sendImageAfterMessage === 'boolean') {
            setSendImageAfterMessage(data.config.sendImageAfterMessage);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSwitchFlow = (flow: 'two_step_conversational' | 'classic_direct') => {
    setCampaignFlow(flow);
    if (flow === 'two_step_conversational') {
      setTemplates(CONVERSATIONAL_TEMPLATES);
      setActiveTemplateTab(0);
      setSendImageAfterMessage(false);
      setConfig(prev => ({
        ...prev,
        campaignFlow: 'two_step_conversational',
        sendImageAfterMessage: false,
        templates: CONVERSATIONAL_TEMPLATES,
      }));
    } else {
      setTemplates(DEFAULT_TEMPLATES);
      setActiveTemplateTab(0);
      setSendImageAfterMessage(true);
      setConfig(prev => ({
        ...prev,
        campaignFlow: 'classic_direct',
        sendImageAfterMessage: true,
        templates: DEFAULT_TEMPLATES,
      }));
    }
  };

  // Format Step 2 response message with personalized {nombre}, {ciudad} and {portal}
  const renderStep2Response = (
    templateText: string,
    contact?: { name?: string; location?: string; sourceSite?: string } | null
  ) => {
    const rawName = contact?.name?.trim();
    const cleanCity = contact?.location?.split('(')[0]?.trim() || 'tu zona';
    let cleanPortal = (contact?.sourceSite || 'el portal')
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\.(com|es|net|org|co|eu|info|cat|club|online).*$/i, '')
      .trim();

    const lowerPortal = cleanPortal.toLowerCase();
    if (lowerPortal.includes('mundosexanuncio')) cleanPortal = 'Mundosexanuncio';
    else if (lowerPortal.includes('milanuncios')) cleanPortal = 'Milanuncios';
    else if (lowerPortal.includes('pasion')) cleanPortal = 'Pasión';
    else if (lowerPortal.includes('loquo')) cleanPortal = 'Loquo';
    else if (lowerPortal.includes('slumi')) cleanPortal = 'Slumi';
    else if (lowerPortal.includes('skokka')) cleanPortal = 'Skokka';
    else if (cleanPortal && cleanPortal !== 'el portal') {
      cleanPortal = cleanPortal.charAt(0).toUpperCase() + cleanPortal.slice(1);
    }

    let text = templateText;
    if (rawName) {
      text = text.replace(/{nombre}/gi, rawName);
    } else {
      text = text
        .replace(/\b(genial|hola|buenas)\s*\{nombre\}\s*,/gi, '$1,')
        .replace(/\b(genial|hola|buenas)\s*\{nombre\}\s*!/gi, '$1!')
        .replace(/\s*\{nombre\}\s*/gi, ' ')
        .replace(/{nombre}/gi, '');
    }
    text = text.replace(/{ciudad}/gi, cleanCity);
    text = text.replace(/{portal}/gi, cleanPortal || 'el portal');
    return text;
  };

  const handleCopyStep2Text = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedResponseKey(key);
    setTimeout(() => setCopiedResponseKey(null), 2500);
  };

  // Format message text with dynamic tags
  const renderMessageText = (templateText: string, ad: AdItem) => {
    const rawName = ad.detectedName?.trim();
    const cleanCity = ad.location?.split('(')[0]?.trim() || 'tu zona';

    // Clean portal name: remove http, https, www, and any domain extensions (.com, .es, .net, etc.) so it NEVER becomes a link in WhatsApp
    let cleanPortal = (ad.sourceSite || 'el portal')
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\.(com|es|net|org|co|eu|info|cat|club|online).*$/i, '')
      .trim();

    const lowerPortal = cleanPortal.toLowerCase();
    if (lowerPortal.includes('mundosexanuncio')) cleanPortal = 'Mundosexanuncio';
    else if (lowerPortal.includes('milanuncios')) cleanPortal = 'Milanuncios';
    else if (lowerPortal.includes('pasion')) cleanPortal = 'Pasión';
    else if (lowerPortal.includes('loquo')) cleanPortal = 'Loquo';
    else if (lowerPortal.includes('slumi')) cleanPortal = 'Slumi';
    else if (lowerPortal.includes('skokka')) cleanPortal = 'Skokka';
    else if (cleanPortal && cleanPortal !== 'el portal') {
      cleanPortal = cleanPortal.charAt(0).toUpperCase() + cleanPortal.slice(1);
    }

    let text = templateText;

    if (rawName) {
      // If name is present, substitute {nombre}
      text = text.replace(/{nombre}/gi, rawName);
    } else {
      // If name is empty, omit it cleanly without leaving awkward punctuation or words
      // e.g., "Hola {nombre} 👋" -> "Hola 👋", "Hola {nombre}," -> "Hola,", "Buenas {nombre} 👋" -> "Buenas 👋"
      text = text
        .replace(/\b(hola|buenas)\s*\{nombre\}\s*,/gi, '$1,')
        .replace(/\b(hola|buenas)\s*\{nombre\}\s*/gi, '$1 ')
        .replace(/\s*\{nombre\}\s*/gi, ' ')
        .replace(/{nombre}/gi, '');
    }

    text = text
      .replace(/{ciudad}/gi, cleanCity)
      .replace(/{portal}/gi, cleanPortal);

    // Clean whitespace while preserving paragraphs and newlines
    return text
      .split('\n')
      .map(line => line.replace(/[^\S\r\n]+/g, ' ').trim())
      .join('\n')
      .trim();
  };

  // Copy promowhatsapp image directly to clipboard for instant Ctrl+V pasting in WhatsApp Web
  const copyPromoImageToClipboard = async (): Promise<boolean> => {
    try {
      setIsCopyingImage(true);
      const res = await fetch('/api/promo-image');
      const blob = await res.blob();
      const img = new Image();
      const objectUrl = URL.createObjectURL(blob);
      img.src = objectUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);

      return new Promise<boolean>((resolve) => {
        canvas.toBlob(async (pngBlob) => {
          if (pngBlob && navigator.clipboard && navigator.clipboard.write) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': pngBlob }),
              ]);
              setImageCopiedSuccess(true);
              setTimeout(() => setImageCopiedSuccess(false), 3500);
              resolve(true);
            } catch {
              resolve(false);
            }
          } else {
            resolve(false);
          }
          URL.revokeObjectURL(objectUrl);
        }, 'image/png');
      });
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      setIsCopyingImage(false);
    }
  };

  // Re-generate queue with rotating templates whenever selectedAds, templates or rotationMode changes
  useEffect(() => {
    if (isRunning) return;

    const seenPhones = new Set<string>();
    const eligibleAds: AdItem[] = [];
    let excluded = 0;

    for (const ad of selectedAds) {
      if (excludeAlreadyContacted && ad.status === 'contactado') {
        excluded++;
        continue;
      }
      const cleanPhone = (ad.normalizedPhone || ad.phone || '').replace(/[^0-9]/g, '');
      if (!cleanPhone) continue;
      if (seenPhones.has(cleanPhone)) {
        excluded++;
        continue; // Prevent sending twice to same phone in same queue
      }
      seenPhones.add(cleanPhone);
      eligibleAds.push(ad);
    }

    setExcludedAlreadyContactedCount(excluded);

    const items: WhatsAppCampaignItem[] = eligibleAds.map((ad, i) => {
      let chosenTpl: WhatsAppTemplate;

      if (rotationMode === 'round_robin') {
        chosenTpl = templates[i % templates.length] || templates[0];
      } else if (rotationMode === 'random') {
        const randIdx = Math.floor(Math.random() * templates.length);
        chosenTpl = templates[randIdx] || templates[0];
      } else {
        chosenTpl = templates[activeTemplateTab] || templates[0];
      }

      const formattedText = renderMessageText(chosenTpl.text, ad);
      const cleanPhone = ad.normalizedPhone || ad.phone.replace(/[^0-9]/g, '');
      const encoded = encodeURIComponent(formattedText);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;

      return {
        adId: ad.id,
        name: ad.detectedName || ad.title.slice(0, 25),
        phone: ad.phone,
        normalizedPhone: cleanPhone,
        location: ad.location || 'España',
        category: ad.category || 'Anuncio',
        sourceSite: ad.sourceSite,
        templateTitle: chosenTpl.tag || chosenTpl.title.split(':')[0],
        messageText: formattedText,
        whatsappUrl,
        status: 'pending',
      };
    });

    setQueue(items);
  }, [selectedAds, templates, rotationMode, activeTemplateTab, excludeAlreadyContacted, isRunning]);

  // Open inline editor for a specific recipient in the queue
  const handleOpenEditQueueItem = (idx: number) => {
    const item = queue[idx];
    if (!item) return;
    setEditingQueueItemIndex(idx);
    setEditQueueName(item.name || '');
    const cleanCity = item.location?.split('(')[0]?.trim() || '';
    if (TOP_SPANISH_CITIES.includes(cleanCity)) {
      setEditQueueCity(cleanCity);
      setEditQueueCityCustom('');
    } else {
      setEditQueueCity('__custom__');
      setEditQueueCityCustom(cleanCity);
    }
  };

  // Save changes to recipient name and city, recalculating their personalized message
  const handleSaveQueueItemEdit = () => {
    if (editingQueueItemIndex === null) return;
    const finalCity =
      editQueueCity === '__custom__' ? editQueueCityCustom.trim() || 'Madrid' : editQueueCity;
    const finalName = editQueueName.trim();

    setQueue(prev =>
      prev.map((item, idx) => {
        if (idx !== editingQueueItemIndex) return item;

        let templateText = templates[0]?.text || '';
        const matchingTpl = templates.find(
          t => t.tag === item.templateTitle || t.title.startsWith(item.templateTitle || '')
        );
        if (matchingTpl) {
          templateText = matchingTpl.text;
        }

        const dummyAd: AdItem = {
          id: item.adId,
          title: item.name,
          phone: item.phone,
          normalizedPhone: item.normalizedPhone,
          location: finalCity,
          detectedName: finalName,
          sourceSite: item.sourceSite,
          imageUrl: '',
          hasWhatsapp: true,
          scrapedAt: '',
          status: 'nuevo',
        };

        const newFormattedText = renderMessageText(templateText, dummyAd);
        const encoded = encodeURIComponent(newFormattedText);
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${item.normalizedPhone}&text=${encoded}`;

        return {
          ...item,
          name: finalName || item.phone,
          location: finalCity,
          messageText: newFormattedText,
          whatsappUrl,
        };
      })
    );

    // Persist to backend directory permanently
    const currentItem = queue[editingQueueItemIndex];
    if (currentItem) {
      fetch(`/api/directory/${currentItem.adId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detectedName: finalName,
          location: finalCity,
        }),
      }).catch(() => {});
    }

    setEditingQueueItemIndex(null);
  };

  // State for permanent template saving
  const [isSavingTemplates, setIsSavingTemplates] = useState(false);
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState(false);
  const autoSaveTimerRef = useRef<any>(null);

  // Save templates permanently to database
  const handleSaveTemplatesPermanently = async (newTemplatesList: WhatsAppTemplate[]) => {
    setIsSavingTemplates(true);
    try {
      await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          templates: newTemplatesList,
          rotationMode,
          sendImageAfterMessage,
          defaultMessageTemplate: newTemplatesList[0]?.text || '',
        }),
      });
      setTemplateSaveSuccess(true);
      setTimeout(() => setTemplateSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Error al guardar plantilla permanentemente:', e);
    } finally {
      setIsSavingTemplates(false);
    }
  };

  // Update specific template text and trigger auto-save
  const handleUpdateActiveTemplateText = (newText: string) => {
    const updated = templates.map((t, idx) =>
      idx === activeTemplateTab ? { ...t, text: newText } : t
    );
    setTemplates(updated);

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleSaveTemplatesPermanently(updated);
    }, 700);
  };

  // Insert dynamic tag into active template and save
  const handleInsertTag = (tag: string) => {
    const updated = templates.map((t, idx) =>
      idx === activeTemplateTab ? { ...t, text: t.text + tag } : t
    );
    setTemplates(updated);
    handleSaveTemplatesPermanently(updated);
  };

  // Reset templates to defaults according to current flow and save permanently
  const handleResetToDefaults = async () => {
    const targetTemplates = campaignFlow === 'two_step_conversational' ? CONVERSATIONAL_TEMPLATES : DEFAULT_TEMPLATES;
    if (confirm('¿Restablecer las plantillas a los textos por defecto de este flujo?')) {
      setTemplates(targetTemplates);
      await handleSaveTemplatesPermanently(targetTemplates);
    }
  };

  // Add new template and save permanently
  const handleAddNewTemplate = async () => {
    const newIdx = templates.length + 1;
    const newTpl: WhatsAppTemplate = {
      id: `tpl_custom_${Date.now()}`,
      title: `Plantilla ${newIdx}: Personalizada`,
      tag: `Plantilla ${newIdx}`,
      text: 'Hola {nombre} 👋 Vi tu anuncio en {portal} ({ciudad}). Queremos presentarte el servicio de autopubli24 para que tu anuncio esté siempre en primera posición.',
    };
    const updated = [...templates, newTpl];
    setTemplates(updated);
    setActiveTemplateTab(templates.length);
    await handleSaveTemplatesPermanently(updated);
  };

  // Save all config and templates
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          campaignFlow,
          templates,
          rotationMode,
          sendImageAfterMessage,
          defaultMessageTemplate: templates[0]?.text || '',
        }),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
        setSaveSuccessMsg(true);
        setTimeout(() => setSaveSuccessMsg(false), 2500);
      }
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Send single test message to verify the process
  const handleSendTestMessage = async () => {
    if (!testPhoneNumber.trim()) {
      setTestErrorMessage('Introduce un número de teléfono al que enviar el mensaje de prueba.');
      return;
    }

    setIsSendingTest(true);
    setTestSuccessMessage(null);
    setTestErrorMessage(null);

    try {
      const selectedTpl = templates[testTemplateIndex] || templates[0];
      const mockAd: AdItem = {
        id: 'test_preview',
        title: 'Anuncio de Prueba',
        phone: testPhoneNumber,
        normalizedPhone: testPhoneNumber.replace(/[^0-9]/g, ''),
        detectedName: testContactName,
        location: testContactCity,
        sourceSite: testContactPortal,
        imageUrl: '',
        hasWhatsapp: true,
        scrapedAt: new Date().toISOString(),
        status: 'nuevo',
      };

      const formattedText = renderMessageText(selectedTpl.text, mockAd);

      const res = await fetch('/api/whatsapp/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPhone: testPhoneNumber,
          messageText: formattedText,
          sendImage: testIncludeImage,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al generar la prueba');
      }

      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank');
      }

      // If testIncludeImage and in web mode, copy image to clipboard
      if (testIncludeImage && config.dispatchMode === 'web_queue') {
        await copyPromoImageToClipboard();
        setTestSuccessMessage(
          `✓ Prueba lista para ${testPhoneNumber}. Se ha abierto el chat con el texto, y la imagen promowhatsapp se ha copiado en tu portapapeles. ¡En el chat solo pulsa Ctrl+V y Enter para enviarla!`
        );
      } else {
        setTestSuccessMessage(
          `✓ Prueba generada con éxito para ${testPhoneNumber}. ${testIncludeImage ? 'El texto y la imagen promowhatsapp se envían por Meta Cloud API.' : 'Chat abierto con el texto listo.'}`
        );
      }
    } catch (err: any) {
      setTestErrorMessage(err.message || 'Error al enviar la prueba');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Dispatch single message in queue
  const dispatchItem = async (index: number) => {
    if (index >= queue.length) {
      setIsRunning(false);
      setCountdown(0);
      return;
    }

    const item = queue[index];

    setQueue(prev =>
      prev.map((it, idx) => (idx === index ? { ...it, status: 'sending' } : it))
    );

    let sendSuccess = false;

    if (config.dispatchMode === 'cloud_api' && config.apiPhoneNumberId && config.apiAccessToken) {
      try {
        const res = await fetch('/api/whatsapp/send-cloud-api', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toPhone: item.normalizedPhone,
            messageText: item.messageText,
            sendImage: sendImageAfterMessage,
          }),
        });
        const data = await res.json();
        if (data.success) {
          sendSuccess = true;
        } else {
          throw new Error(data.error || 'Error API Meta');
        }
      } catch (err: any) {
        setQueue(prev =>
          prev.map((it, idx) =>
            idx === index
              ? { ...it, status: 'failed', error: err.message }
              : it
          )
        );
        setTotalFailed(c => c + 1);
      }
    } else {
      // In Web Queue mode: open WhatsApp Web chat
      const openedWin = window.open(item.whatsappUrl, '_blank');
      if (!openedWin || openedWin.closed || typeof openedWin.closed === 'undefined') {
        setPopupBlockedNotice(true);
      } else {
        setPopupBlockedNotice(false);
      }
      sendSuccess = true;

      // Automatically copy promowhatsapp.jpg to clipboard so the user only presses Ctrl+V in WhatsApp Web
      if (sendImageAfterMessage) {
        copyPromoImageToClipboard();
      }
    }

    if (sendSuccess) {
      setQueue(prev =>
        prev.map((it, idx) =>
          idx === index
            ? { ...it, status: 'sent', sentAt: new Date().toLocaleTimeString() }
            : it
        )
      );
      setTotalSent(c => c + 1);

      fetch('/api/whatsapp/mark-contacted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: item.adId, phone: item.phone }),
      }).catch(() => {});
      onAdStatusUpdated(item.adId, 'contactado');
    }

    const nextIdx = index + 1;
    setCurrentIndex(nextIdx);

    if (nextIdx < queue.length) {
      let delay = config.delaySeconds || 15;
      if (config.randomizeDelay) {
        const jitter = Math.floor(Math.random() * 7) - 3;
        delay = Math.max(6, delay + jitter);
      }

      setCountdown(delay);

      const intervalId = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(intervalId);
            if (isRunningRef.current && !isPausedRef.current) {
              dispatchItem(nextIdx);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      timerRef.current = intervalId;
    } else {
      setIsRunning(false);
      setCountdown(0);
    }
  };

  const handleStartCampaign = () => {
    setIsRunning(true);
    setIsPaused(false);
    dispatchItem(currentIndex);
  };

  const handlePauseCampaign = () => {
    setIsPaused(true);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleResumeCampaign = () => {
    setIsPaused(false);
    dispatchItem(currentIndex);
  };

  const handleStopCampaign = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCountdown(0);
    setPopupBlockedNotice(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Keyboard shortcut listener to advance queue smoothly with Space or Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isRunning) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (timerRef.current) clearInterval(timerRef.current);
        setPopupBlockedNotice(false);
        dispatchItem(currentIndex);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, currentIndex]);

  const handleSkipCurrent = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setQueue(prev =>
      prev.map((it, idx) =>
        idx === currentIndex ? { ...it, status: 'skipped' } : it
      )
    );
    const nextIdx = currentIndex + 1;
    setCurrentIndex(nextIdx);
    if (nextIdx < queue.length) {
      dispatchItem(nextIdx);
    } else {
      setIsRunning(false);
    }
  };

  const progressPercent = queue.length > 0 ? Math.round((totalSent / queue.length) * 100) : 0;
  const currentEditingTemplate = templates[activeTemplateTab] || templates[0];
  const sampleContact = selectedAds[0];
  const activeStep2Contact = queue[selectedStep2ContactIdx] || queue[0] || (selectedAds[0] ? {
    adId: selectedAds[0].id,
    name: selectedAds[0].detectedName || selectedAds[0].title.slice(0, 25),
    location: selectedAds[0].location || 'tu zona',
    phone: selectedAds[0].phone,
    normalizedPhone: selectedAds[0].normalizedPhone,
    category: 'Anuncio',
    sourceSite: selectedAds[0].sourceSite,
    messageText: '',
    whatsappUrl: selectedAds[0].whatsappUrl || '',
    status: 'pending' as const,
  } : {
    adId: 'mock',
    name: 'Laura',
    location: 'Madrid',
    phone: '+34 600 00 00 00',
    normalizedPhone: '34600000000',
    category: 'Anuncio',
    sourceSite: 'Mundosexanuncio',
    messageText: '',
    whatsappUrl: '',
    status: 'pending' as const,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-4xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-50/50 dark:bg-neutral-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <MessageSquare className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Campaña WhatsApp autopubli24
                </h3>
                <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <Repeat className="w-3 h-3 text-emerald-600" />
                  {templates.length} Plantillas Rotativas
                </span>
                {sendImageAfterMessage && (
                  <span className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-blue-600" />
                    + Imagen promowhatsapp
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {selectedAds.length} contacto{selectedAds.length > 1 ? 's' : ''} preparado{selectedAds.length > 1 ? 's' : ''} con rotación de mensajes de autopubli24
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Test Button */}
            <button
              onClick={() => setIsTestOpen(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                isTestOpen
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
              }`}
              title="Enviar 1 mensaje de prueba a un número manual para verificar el proceso"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Probar a Mi Número</span>
            </button>

            <button
              onClick={() => setIsConfigOpen(prev => !prev)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isConfigOpen
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900'
                  : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100'
              }`}
              title="Configurar número de WhatsApp Business y ritmo anti-bloqueo"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Ajustes</span>
            </button>

            {/* Extension Modal Button */}
            <button
              onClick={() => setIsExtensionModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              title="Descargar Extensión de Chrome para enviar de forma 100% desatendida sin pulsar Enter"
            >
              <Puzzle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="hidden sm:inline">Extensión Chrome</span>
            </button>

            <button
              onClick={() => {
                if (isRunning && !confirm('¿Deseas detener la campaña y salir?')) return;
                handleStopCampaign();
                onClose();
              }}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Popup Blocked Warning Notice */}
          {popupBlockedNotice && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Tu navegador bloqueó la apertura automática de la siguiente pestaña</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPopupBlockedNotice(false);
                    dispatchItem(currentIndex);
                  }}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors shrink-0"
                >
                  Abrir Chat #{currentIndex + 1} (o pulsa Enter / Espacio)
                </button>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                Por seguridad, los navegadores impiden que scripts abran múltiples ventanas automáticamente sin una pulsación de tecla o clic. Pulsa <strong>Enter</strong> o <strong>Espacio</strong> para lanzar cada chat, o instala la <strong>Extensión de Chrome</strong> para enviar 100% desatendido sin bloqueos.
              </p>
            </div>
          )}

          {/* Contact Deduplication & Already Contacted Exclusion Guard */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <label className="flex items-center gap-2 text-xs font-bold text-emerald-950 dark:text-emerald-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeAlreadyContacted}
                  onChange={e => setExcludeAlreadyContacted(e.target.checked)}
                  disabled={isRunning}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span>Protección Anti-Duplicados: Excluir contactos ya contactados y teléfonos repetidos</span>
              </label>
            </div>
            <div className="flex items-center gap-2 text-[11px] shrink-0">
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700">
                {queue.length} en cola
              </span>
              {excludedAlreadyContactedCount > 0 && (
                <span className="text-amber-700 dark:text-amber-300 font-semibold bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  {excludedAlreadyContactedCount} excluidos (ya contactados)
                </span>
              )}
            </div>
          </div>

          {/* STRATEGY FLOW SELECTOR: Conversacional 2 Pasos vs Clásica Directa */}
          <div className="p-4 sm:p-5 rounded-2xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Estrategia de Campaña y Protección Anti-Baneo
                </span>
                <span className="text-[11px] text-neutral-500 block">
                  Elige cómo quieres enfocar el contacto para maximizar respuestas y blindar tu número.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Option 1: 2 Pasos Conversacional */}
              <div
                onClick={() => handleSwitchFlow('two_step_conversational')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  campaignFlow === 'two_step_conversational'
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/50 shadow-xs'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-850/40 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Flujo Antispam en 2 Pasos (Recomendado)
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                    🛡️ Blindaje Total
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-snug">
                  <strong>Paso 1:</strong> Envía un gancho corto y humano (3 variantes rotando en semi-automático, sin foto) para conseguir respuesta.<br />
                  <strong>Paso 2:</strong> Respuestas preparadas con 1 clic con propuesta explicativa y escasez de 10 plazas en &#123;ciudad&#125;.
                </p>
              </div>

              {/* Option 2: Clásica Directa */}
              <div
                onClick={() => handleSwitchFlow('classic_direct')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  campaignFlow === 'classic_direct'
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/50 shadow-xs'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-850/40 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-neutral-500" />
                    Campaña Directa autopubli24 (Clásica)
                  </span>
                  <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700">
                    Todo en 1 Mensaje
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-snug">
                  Envía el texto promocional completo de autopubli24 + imagen adjunta directamente en el primer mensaje frío.
                </p>
              </div>
            </div>
          </div>

          {/* FLOW SUB-NAVIGATION (PASO 1 VS PASO 2) */}
          {campaignFlow === 'two_step_conversational' && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-neutral-100 dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveStepTab('both')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeStepTab === 'both'
                      ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Vista Completa (Flujo 1 + 2)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStepTab('step1')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeStepTab === 'step1'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <span>1️⃣ Secuencia Inicial ({templates.length} Ganchos)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveStepTab('step2');
                    setTimeout(() => step2SectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeStepTab === 'step2'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>2️⃣ Playbook de Respuestas</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200 font-bold">
                    2 Opciones
                  </span>
                </button>
              </div>

              <div className="text-[11px] text-neutral-500 font-medium px-2">
                Modo semi-automático seguro contra reportes
              </div>
            </div>
          )}

          {/* SECTION: ENVIAR 1 MENSAJE DE PRUEBA A MI NÚMERO */}
          {isTestOpen && (
            <div className="p-5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-purple-200 dark:border-purple-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-purple-950 dark:text-purple-200">
                      Enviar 1 Mensaje de Ejemplo a Mi Número (Verificar Proceso)
                    </h4>
                    <p className="text-[11px] text-purple-700 dark:text-purple-300">
                      Envía un WhatsApp directo a tu móvil para comprobar exactamente cómo lo recibe el cliente sin alterar el directorio.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTestOpen(false)}
                  className="p-1 rounded-md text-purple-500 hover:text-purple-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Phone to test */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-200">
                    Número de Teléfono para la Prueba
                  </label>
                  <input
                    type="text"
                    value={testPhoneNumber}
                    onChange={e => setTestPhoneNumber(e.target.value)}
                    placeholder="+34 600 00 00 00"
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>

                {/* Test Name */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-200">
                    Nombre simulado &#123;nombre&#125;
                  </label>
                  <input
                    type="text"
                    value={testContactName}
                    onChange={e => setTestContactName(e.target.value)}
                    placeholder="Laura"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>

                {/* Test City */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-200">
                    Ciudad simulada &#123;ciudad&#125;
                  </label>
                  <input
                    type="text"
                    value={testContactCity}
                    onChange={e => setTestContactCity(e.target.value)}
                    placeholder="Madrid"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Template selection for test */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-200">
                  ¿Qué plantilla deseas probar en este envío?
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {templates.map((tpl, idx) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setTestTemplateIndex(idx)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                        testTemplateIndex === idx
                          ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                          : 'bg-white dark:bg-neutral-800 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-300 hover:bg-purple-100'
                      }`}
                    >
                      {idx + 1}. {tpl.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option to include promo image in test */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-100/60 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-purple-950 dark:text-purple-200">
                  <input
                    type="checkbox"
                    checked={testIncludeImage}
                    onChange={e => setTestIncludeImage(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded-sm"
                  />
                  <span>Enviar después del mensaje la imagen promowhatsapp</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyPromoImageToClipboard}
                    className="px-2.5 py-1 bg-white dark:bg-neutral-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 rounded-lg text-[11px] font-bold flex items-center gap-1 hover:bg-purple-50"
                  >
                    {imageCopiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{imageCopiedSuccess ? '¡Copiada!' : 'Copiar Imagen (Ctrl+V)'}</span>
                  </button>
                </div>
              </div>

              {/* Live Test Preview Box */}
              <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-purple-200 dark:border-purple-800 space-y-1.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                  Mensaje que se enviará al número {testPhoneNumber || '(pon tu número arriba)'}:
                </span>
                <p className="text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap font-sans leading-relaxed">
                  {renderMessageText(
                    (templates[testTemplateIndex] || templates[0]).text,
                    {
                      id: 'test',
                      title: 'Test',
                      phone: testPhoneNumber,
                      normalizedPhone: testPhoneNumber,
                      detectedName: testContactName,
                      location: testContactCity,
                      sourceSite: testContactPortal,
                      imageUrl: '',
                      hasWhatsapp: true,
                      scrapedAt: '',
                      status: 'nuevo',
                    }
                  )}
                </p>
                {testIncludeImage && (
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2 text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                    <span>+ Se adjuntará la imagen <strong>promowhatsapp.jpg</strong></span>
                  </div>
                )}
              </div>

              {/* Toast Feedback */}
              {testSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{testSuccessMessage}</span>
                </div>
              )}

              {testErrorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{testErrorMessage}</span>
                </div>
              )}

              {/* Action Button */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSendTestMessage}
                  disabled={isSendingTest || !testPhoneNumber.trim()}
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md"
                >
                  {isSendingTest ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>📲 Enviar Mensaje de Prueba a Mi Número</span>
                </button>
              </div>
            </div>
          )}

          {/* Config Drawer / Settings Panel (Collapsible) */}
          {isConfigOpen && (
            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-5 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Configuración de Tu WhatsApp Business y Protección Anti-Ban</span>
                </div>
                <span className="text-[11px] text-neutral-400">Guarda en memoria permanente</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Business Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Tu Número de WhatsApp Business Vinculado
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      value={config.businessNumber}
                      onChange={e => {
                        setConfig({ ...config, businessNumber: e.target.value });
                        if (!testPhoneNumber) setTestPhoneNumber(e.target.value);
                      }}
                      placeholder="+34 612 34 56 78"
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    />
                  </div>
                  <span className="text-[10px] text-neutral-500 block">
                    El número con el que tienes iniciada sesión en tu WhatsApp Business (Web o App).
                  </span>
                </div>

                {/* Sender Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Nombre del Negocio / Marca
                  </label>
                  <input
                    type="text"
                    value={config.senderName}
                    onChange={e => setConfig({ ...config, senderName: e.target.value })}
                    placeholder="autopubli24"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>

                {/* Delay between messages */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      Intervalo "Poco a Poco" entre mensajes
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {config.delaySeconds} seg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={45}
                    step={1}
                    value={config.delaySeconds}
                    onChange={e => setConfig({ ...config, delaySeconds: Number(e.target.value) })}
                    className="w-full accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400">
                    <span>5s (Rápido)</span>
                    <span>15s (Recomendado)</span>
                    <span>45s (Máxima precaución)</span>
                  </div>
                </div>

                {/* Randomize jitter checkbox */}
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-800 dark:text-neutral-200">
                    <input
                      type="checkbox"
                      checked={config.randomizeDelay}
                      onChange={e => setConfig({ ...config, randomizeDelay: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded-sm border-neutral-300"
                    />
                    <span className="font-medium">
                      Simulación Humana: variar ±3 segundos cada envío
                    </span>
                  </label>
                  <span className="text-[10px] text-neutral-500 block leading-tight">
                    Evita ritmos mecánicos de bot que alertan a WhatsApp.
                  </span>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 space-y-2">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
                  Método de Despacho
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => setConfig({ ...config, dispatchMode: 'web_queue' })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      config.dispatchMode === 'web_queue'
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-neutral-900 dark:text-white">
                      <span>✓ Cola Automática WhatsApp Web / Business App</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-snug">
                      Abre cada conversación con tu mensaje rotativo listo para enviar desde tu WhatsApp Business activo.
                    </p>
                  </label>

                  <label
                    onClick={() => setConfig({ ...config, dispatchMode: 'cloud_api' })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      config.dispatchMode === 'cloud_api'
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-neutral-900 dark:text-white">
                      <span>Meta WhatsApp Cloud API (Oficial de Fondo)</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-snug">
                      Envío silencioso 100% de fondo vía Meta Developers API.
                    </p>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {saveSuccessMsg ? (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    ¡Ajustes guardados correctamente!
                  </span>
                ) : (
                  <span />
                )}
                <button
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  {isSavingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>Guardar Preferencias</span>
                </button>
              </div>
            </div>
          )}

          {/* DEDICATED PROMO IMAGE CARD: promowhatsapp.jpg */}
          <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-blue-300 dark:border-blue-800 bg-white shrink-0 shadow-xs cursor-pointer" onClick={() => setShowFullImageModal(true)}>
                  <img
                    src="/api/promo-image"
                    alt="promowhatsapp"
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-neutral-900 dark:text-white">
                      <input
                        type="checkbox"
                        checked={sendImageAfterMessage}
                        onChange={e => setSendImageAfterMessage(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded-sm"
                      />
                      <span>Enviar después del mensaje la imagen promowhatsapp</span>
                    </label>
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-mono px-2 py-0.5 rounded-md font-semibold">
                      promowhatsapp.jpg
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {config.dispatchMode === 'cloud_api'
                      ? '✓ En modo Cloud API se enviará automáticamente como 2º mensaje tras el texto.'
                      : '✓ En modo WhatsApp Web se copia sola al portapapeles: solo pulsas Ctrl+V y Enter tras el texto.'}
                  </p>
                </div>
              </div>

              {/* Action buttons for image */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={copyPromoImageToClipboard}
                  disabled={isCopyingImage}
                  className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-neutral-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Copiar imagen al portapapeles para pegar directamente con Ctrl + V en WhatsApp"
                >
                  {imageCopiedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">¡Imagen Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Imagen (Ctrl+V)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowFullImageModal(true)}
                  className="p-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  title="Ver imagen completa en tamaño real"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <a
                  href="/api/promo-image"
                  download="promowhatsapp.jpg"
                  className="p-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  title="Descargar promowhatsapp.jpg"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* TEMPLATES & ROTATION CONTROLLER FOR AUTOPUBLI24 */}
          <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
            {/* Top Toolbar: Rotation Mode Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-700/80 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    Modo de Rotación de Plantillas (Para que no sea siempre igual)
                  </span>
                </div>
                <span className="text-[11px] text-neutral-500 block mt-0.5">
                  Alternar textos diferentes evita filtros anti-spam de WhatsApp y aumenta las respuestas.
                </span>
              </div>

              {/* Rotation Mode Selector Buttons */}
              <div className="flex items-center gap-1 p-1 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setRotationMode('round_robin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    rotationMode === 'round_robin'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                  title="Envía: Anuncio 1 con Plantilla 1, Anuncio 2 con Plantilla 2, Anuncio 3 con Plantilla 3..."
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Alternada (1 ➔ 2 ➔ 3...)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRotationMode('random')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    rotationMode === 'random'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                  title="Elige aleatoriamente 1 plantilla para cada persona"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Aleatoria</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRotationMode('fixed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    rotationMode === 'fixed'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                  title="Envía sólo la plantilla activa actual"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Fija</span>
                </button>
              </div>
            </div>

            {/* Template Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {templates.map((tpl, idx) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setActiveTemplateTab(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                      activeTemplateTab === idx
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 shadow-xs'
                        : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span>{tpl.tag}</span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={handleAddNewTemplate}
                  className="px-2.5 py-1.5 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
                  title="Añadir una nueva plantilla"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Plantilla</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetToDefaults}
                className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 transition-colors"
                title="Restaurar los textos originales de autopubli24"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restablecer autopubli24</span>
              </button>
            </div>

            {/* Template Editor Box */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  Editando: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{currentEditingTemplate.title}</span>
                </span>
                <span className="text-[11px] text-neutral-400">
                  {currentEditingTemplate.text.length} caracteres
                </span>
              </div>

              {/* Dynamic tag buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-neutral-400 mr-1">Insertar variable:</span>
                <button
                  type="button"
                  onClick={() => handleInsertTag(' {nombre}')}
                  className="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                >
                  + &#123;nombre&#125;
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag(' {ciudad}')}
                  className="px-2 py-0.5 text-xs font-semibold rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors"
                >
                  + &#123;ciudad&#125;
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag(' {portal}')}
                  className="px-2 py-0.5 text-xs font-semibold rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
                >
                  + &#123;portal&#125;
                </button>
              </div>

              <textarea
                rows={6}
                value={currentEditingTemplate.text}
                onChange={e => handleUpdateActiveTemplateText(e.target.value)}
                placeholder="Escribe el texto de esta plantilla..."
                className="w-full p-3 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans whitespace-pre-wrap"
              />

              {/* Permanent Save Action & Feedback */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-xs">
                  {templateSaveSuccess && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px] bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
                      <Check className="w-3.5 h-3.5" />
                      Plantilla guardada permanentemente en la base de datos
                    </span>
                  )}
                  {isSavingTemplates && !templateSaveSuccess && (
                    <span className="text-neutral-400 text-[11px] flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Guardando cambios...
                    </span>
                  )}
                  {!isSavingTemplates && !templateSaveSuccess && (
                    <span className="text-[11px] text-neutral-400">
                      Cualquier cambio que hagas se guarda permanentemente en la base de datos.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveTemplatesPermanently(templates)}
                  disabled={isSavingTemplates}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar Plantilla Permanente</span>
                </button>
              </div>

              {/* Live Preview with Real Contact Data */}
              {sampleContact && (
                <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase tracking-wider font-bold">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <Eye className="w-3.5 h-3.5" />
                      Vista previa de esta plantilla con contacto real:
                    </span>
                    <span>Destino: {sampleContact.detectedName || sampleContact.phone} ({sampleContact.location || 'Madrid'})</span>
                  </div>
                  <p className="text-neutral-800 dark:text-neutral-200 italic font-medium leading-relaxed whitespace-pre-wrap bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                    "{renderMessageText(currentEditingTemplate.text, sampleContact)}"
                  </p>
                  {sendImageAfterMessage && (
                    <div className="flex items-center gap-2 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>+ Seguido de la imagen promocional <strong>promowhatsapp.jpg</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PROGRESS BAR & DISPATCH CONTROLS */}
          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 text-white space-y-4 shadow-lg border border-neutral-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Progreso de Envío Gradual ("Poco a Poco")
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold font-mono text-emerald-400">
                    {totalSent} / {queue.length}
                  </span>
                  <span className="text-xs text-neutral-400">
                    mensajes enviados ({progressPercent}%)
                  </span>
                </div>
              </div>

              {/* Status / Countdown badge */}
              <div className="flex items-center gap-2">
                {isRunning && !isPaused && countdown > 0 && (
                  <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-2 text-xs font-mono font-bold animate-pulse">
                    <Clock className="w-4 h-4" />
                    <span>Próximo envío en {countdown}s</span>
                  </div>
                )}

                {isPaused && (
                  <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                    Pausado
                  </div>
                )}
              </div>
            </div>

            {/* If sendImageAfterMessage is enabled in web queue mode, show helpful reminder bar */}
            {sendImageAfterMessage && isRunning && (
              <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-800 text-[11px] text-blue-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    <strong>Imagen promowhatsapp copiada en portapapeles:</strong> tras enviar el texto en WhatsApp, pulsa <strong>Ctrl + V</strong> y <strong>Enter</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copyPromoImageToClipboard}
                  className="px-2 py-0.5 bg-blue-700 hover:bg-blue-600 text-white rounded text-[10px] font-bold shrink-0"
                >
                  {imageCopiedSuccess ? '¡Copiada!' : 'Recopiar'}
                </button>
              </div>
            )}

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                {!isRunning ? (
                  <button
                    onClick={handleStartCampaign}
                    disabled={queue.length === 0}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Iniciar Envío Poco a Poco</span>
                  </button>
                ) : isPaused ? (
                  <button
                    onClick={handleResumeCampaign}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Reanudar</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePauseCampaign}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Pausar</span>
                  </button>
                )}

                {isRunning && (
                  <>
                    <button
                      onClick={handleSkipCurrent}
                      className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Omitir este contacto y pasar al siguiente inmediatamente"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                      <span>Saltar espera</span>
                    </button>

                    <button
                      onClick={handleStopCampaign}
                      className="px-3 py-2 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Detener toda la campaña"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Detener</span>
                    </button>
                  </>
                )}
              </div>

              <div className="text-[11px] text-neutral-400 font-mono">
                Modo: <span className="text-emerald-400 font-bold">{rotationMode === 'round_robin' ? 'Alternada (1➔2➔3...)' : rotationMode === 'random' ? 'Aleatoria' : 'Fija'}</span> · ~{config.delaySeconds}s {config.randomizeDelay ? '(±3s variable)' : ''} {sendImageAfterMessage ? '· + Imagen' : ''}
              </div>
            </div>
          </div>

          {/* QUEUE CONTACT LIST */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-700 dark:text-neutral-300">
                Lista de Destinatarios y Plantilla Asignada ({queue.length})
              </span>
              <span className="text-[11px] text-neutral-400">
                Cada contacto recibe una plantilla rotada para no repetir
              </span>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-xl max-h-64 overflow-y-auto bg-white dark:bg-neutral-900">
              {queue.map((item, idx) => {
                const isCurrent = isRunning && idx === currentIndex;
                return editingQueueItemIndex === idx ? (
                  <div
                    key={item.adId}
                    className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl space-y-2 border border-emerald-300 dark:border-emerald-700 text-xs"
                  >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                          <Edit2 className="w-3.5 h-3.5" />
                          Editar Nombre y Ciudad para este contacto ({item.phone})
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          Se actualizará el mensaje de WhatsApp al instante
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 block mb-0.5">
                            Nombre de la chica &#123;nombre&#125;:
                          </label>
                          <input
                            type="text"
                            value={editQueueName}
                            onChange={e => setEditQueueName(e.target.value)}
                            placeholder="Ej: Laura"
                            className="w-full px-2.5 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 block mb-0.5">
                            Ciudad &#123;ciudad&#125;:
                          </label>
                          <select
                            value={editQueueCity}
                            onChange={e => setEditQueueCity(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                          >
                            <optgroup label="Ciudades de España">
                              {TOP_SPANISH_CITIES.map((c: string) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </optgroup>
                            <option value="__custom__">Escribir otra ciudad...</option>
                          </select>
                          {editQueueCity === '__custom__' && (
                            <input
                              type="text"
                              value={editQueueCityCustom}
                              onChange={e => setEditQueueCityCustom(e.target.value)}
                              placeholder="Localidad..."
                              className="w-full mt-1 px-2.5 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingQueueItemIndex(null)}
                          className="px-2.5 py-1 text-xs rounded-lg text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveQueueItemEdit}
                          className="px-3.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
                        >
                          Guardar y Actualizar Mensaje
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={item.adId}
                      className={`p-3 text-xs flex items-center justify-between gap-3 transition-colors ${
                        isCurrent
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 font-medium'
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-[11px] text-neutral-400 w-5 shrink-0 text-center">
                          {idx + 1}
                        </span>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-900 dark:text-white truncate">
                              {item.name}
                            </span>
                            <span className="font-mono text-neutral-500 text-[11px]">
                              {item.phone}
                            </span>
                            <span className="text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.2 rounded">
                              {item.location}
                            </span>
                            {item.templateTitle && (
                              <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 shrink-0">
                                {item.templateTitle}
                              </span>
                            )}
                            {sendImageAfterMessage && (
                              <span className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-0.5">
                                <ImageIcon className="w-2.5 h-2.5" />
                                + Imagen
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 italic">
                            "{item.messageText}"
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Quick edit button in queue */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditQueueItem(idx)}
                          className="p-1 rounded-md text-neutral-400 hover:text-emerald-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          title="Editar nombre de la chica o ciudad para este contacto"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick Step 2 Playbook button for this contact */}
                        {campaignFlow === 'two_step_conversational' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStep2ContactIdx(idx);
                              if (activeStepTab === 'step1') {
                                setActiveStepTab('both');
                              }
                              setTimeout(() => {
                                step2SectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }, 50);
                            }}
                            className="px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-[10px] font-bold flex items-center gap-1 transition-colors"
                            title="Ver y copiar las respuestas preparadas para este contacto"
                          >
                            <MessageCircle className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            <span className="hidden sm:inline">Respuestas (Paso 2)</span>
                          </button>
                        )}
                      {item.status === 'sent' && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Enviado {item.sentAt}</span>
                        </span>
                      )}

                      {item.status === 'sending' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Enviando...</span>
                        </span>
                      )}

                      {item.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[10px]">
                          En cola
                        </span>
                      )}

                      {item.status === 'skipped' && (
                        <span className="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-500 text-[10px]">
                          Omitido
                        </span>
                      )}

                      {item.status === 'failed' && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 text-[10px]">
                          Error
                        </span>
                      )}

                      <a
                        href={item.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-md text-neutral-400 hover:text-emerald-600 transition-colors"
                        title="Abrir este chat individualmente"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION: PASO 2 - PLAYBOOK DE RESPUESTAS (CUANDO TE CONTESTAN) */}
          {campaignFlow === 'two_step_conversational' && (activeStepTab === 'both' || activeStepTab === 'step2') && (
            <div
              ref={step2SectionRef}
              className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/90 via-white to-purple-50/40 dark:from-purple-950/30 dark:via-neutral-900 dark:to-purple-950/20 border-2 border-purple-300 dark:border-purple-800/80 shadow-md space-y-4"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-200 dark:border-purple-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                        Paso 2: Playbook de Respuestas (Cuando te contestan)
                      </h4>
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-300 dark:border-purple-800 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-purple-600" />
                        2 Opciones Listas
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Cuando te respondan por WhatsApp al gancho inicial, elige qué respuesta quieres dar. Se personaliza automáticamente con su nombre y ciudad (<strong>{activeStep2Contact?.location?.split('(')[0]?.trim() || 'tu zona'}</strong>) para copiar y pegar con 1 clic.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={copyPromoImageToClipboard}
                    disabled={isCopyingImage}
                    className="px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-neutral-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                    title="Copiar imagen promowhatsapp.jpg al portapapeles para pegar con Ctrl+V"
                  >
                    {imageCopiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{imageCopiedSuccess ? '¡Imagen Copiada!' : 'Copiar Imagen (Ctrl+V)'}</span>
                  </button>
                </div>
              </div>

              {/* Recipient Picker Bar */}
              <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-purple-200 dark:border-purple-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-bold text-purple-950 dark:text-purple-200 shrink-0 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-purple-600" />
                    Destinatario que respondió:
                  </span>
                  <select
                    value={selectedStep2ContactIdx}
                    onChange={e => setSelectedStep2ContactIdx(Number(e.target.value))}
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium text-xs truncate"
                  >
                    {queue.map((item, idx) => (
                      <option key={item.adId} value={idx}>
                        #{idx + 1} — {item.name || item.phone} ({item.location}) · {item.phone}
                      </option>
                    ))}
                    {queue.length === 0 && (
                      <option value={0}>Ejemplo: Laura (Madrid) · +34 600 00 00 00</option>
                    )}
                  </select>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg">
                    📍 Ciudad activa: <strong className="text-purple-700 dark:text-purple-300">{activeStep2Contact?.location?.split('(')[0]?.trim() || 'tu zona'}</strong>
                  </span>
                  {activeStep2Contact?.phone && (
                    <a
                      href={activeStep2Contact.whatsappUrl || `https://api.whatsapp.com/send?phone=${activeStep2Contact.normalizedPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 transition-colors"
                      title="Abrir chat de WhatsApp para pegar la respuesta"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Abrir Chat</span>
                    </a>
                  )}
                </div>
              </div>

              {/* The Two Response Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option A: Explicativa + Posicionamiento */}
                <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-purple-200 dark:border-purple-800/80 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        Opción 1: Explicativa + Posicionamiento 24h
                      </span>
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                        Propuesta de Valor
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-snug">
                      Ideal si te preguntan «¿Quién eres?» o «¿De qué es?». Explica la subida continua a primera posición sin renovar a mano.
                    </p>

                    {isEditingStep2A ? (
                      <textarea
                        rows={5}
                        value={step2CustomTextA}
                        onChange={e => setStep2CustomTextA(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-lg border border-purple-300 dark:border-purple-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-sans"
                      />
                    ) : (
                      <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed font-sans select-all whitespace-pre-wrap">
                        "{renderStep2Response(step2CustomTextA, activeStep2Contact)}"
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setIsEditingStep2A(prev => !prev)}
                      className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{isEditingStep2A ? 'Guardar edición' : 'Editar texto base'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyStep2Text(renderStep2Response(step2CustomTextA, activeStep2Contact), 'step2_A')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                        copiedResponseKey === 'step2_A'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      {copiedResponseKey === 'step2_A' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>¡Respuesta 1 Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Respuesta 1</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Option B: Urgencia + Exclusividad 10 Plazas en Zona */}
                <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border-2 border-amber-300 dark:border-amber-800/80 shadow-xs flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-600" />
                        Opción 2: Máximo 10 Plazas por Zona (Escasez)
                      </span>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                        🔥 Máximo 10 Plazas en {activeStep2Contact?.location?.split('(')[0]?.trim() || 'Zona'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-snug">
                      Por cumplir la promesa y que los anuncios estén siempre en 1ª posición, no aceptas más de 10 plazas en su zona. Quedan pocas para reservar.
                    </p>

                    {isEditingStep2B ? (
                      <textarea
                        rows={5}
                        value={step2CustomTextB}
                        onChange={e => setStep2CustomTextB(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-sans"
                      />
                    ) : (
                      <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-neutral-800/70 border border-amber-200/70 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed font-sans select-all whitespace-pre-wrap">
                        "{renderStep2Response(step2CustomTextB, activeStep2Contact)}"
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setIsEditingStep2B(prev => !prev)}
                      className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{isEditingStep2B ? 'Guardar edición' : 'Editar texto base'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyStep2Text(renderStep2Response(step2CustomTextB, activeStep2Contact), 'step2_B')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                        copiedResponseKey === 'step2_B'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      {copiedResponseKey === 'step2_B' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>¡Respuesta 2 Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Respuesta 2</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Advice Note */}
              <div className="p-3 rounded-xl bg-purple-100/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-950 dark:text-purple-200 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-[11px] leading-relaxed">
                  <p className="font-bold">
                    🛡️ Por qué este flujo es 100% seguro contra baneos:
                  </p>
                  <p className="text-purple-800 dark:text-purple-300">
                    Al responderte la chica primero, WhatsApp registra la conversación como un intercambio mutuo y consentido (Opt-In bidireccional). El riesgo de que te reporten o bloqueen se reduce prácticamente a cero. Ahora puedes explicar el servicio, enviar capturas o cerrar la venta con total tranquilidad.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex items-center justify-between shrink-0">
          <div className="text-xs text-neutral-500">
            {totalSent > 0
              ? `${totalSent} contacto${totalSent > 1 ? 's marcados' : ' marcado'} automáticamente como "contactado"`
              : 'Los contactos enviados se actualizarán a estado "contactado" automáticamente'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveConfig}
              disabled={isSavingConfig}
              className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Guardar Plantillas y Ajustes
            </button>

            <button
              onClick={() => {
                if (isRunning && !confirm('¿Deseas detener la campaña y cerrar?')) return;
                handleStopCampaign();
                onClose();
              }}
              className="px-5 py-2 bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              {totalSent > 0 ? 'Finalizar y Cerrar' : 'Cerrar'}
            </button>
          </div>
        </div>
      </div>

      {/* FULL IMAGE VIEWER MODAL */}
      {showFullImageModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-xl w-full p-4 space-y-3 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  promowhatsapp.jpg (Imagen Promocional)
                </span>
              </div>
              <button
                onClick={() => setShowFullImageModal(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 max-h-[70vh] flex items-center justify-center">
              <img
                src="/api/promo-image"
                alt="promowhatsapp"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-neutral-400">
                Resolución: 1339 × 1345 px (JPEG de alta calidad)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyPromoImageToClipboard}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  {imageCopiedSuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{imageCopiedSuccess ? '¡Copiada!' : 'Copiar Imagen'}</span>
                </button>
                <a
                  href="/api/promo-image"
                  download="promowhatsapp.jpg"
                  className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chrome Extension Modal */}
      {isExtensionModalOpen && (
        <ExtensionModal onClose={() => setIsExtensionModalOpen(false)} />
      )}
    </div>
  );
};
