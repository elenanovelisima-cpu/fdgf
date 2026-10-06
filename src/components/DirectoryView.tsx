import React, { useState } from 'react';
import {
  Search,
  MessageCircle,
  Phone,
  Copy,
  Check,
  Star,
  Trash2,
  ExternalLink,
  MapPin,
  Calendar,
  Grid,
  List,
  User,
  Filter,
  CheckSquare,
  Square,
  AlertTriangle,
  X,
  Building,
  Globe,
  Images,
  MessageSquare,
  Send,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Edit2,
  Puzzle,
  ShieldAlert,
  Cloud,
  Database,
} from 'lucide-react';
import type { AdItem } from '../types.ts';
import { canonicalPhone } from '../utils/phone.ts';
import { WhatsAppCampaignModal } from './WhatsAppCampaignModal.tsx';
import { QuickEditAdModal } from './QuickEditAdModal.tsx';
import { ExtensionModal } from './ExtensionModal.tsx';
import { DuplicatePhoneDetectorModal } from './DuplicatePhoneDetectorModal.tsx';

interface DirectoryViewProps {
  ads: AdItem[];
  onSelectAd: (ad: AdItem) => void;
  onUpdateAd: (id: string, updates: Partial<AdItem>) => Promise<void>;
  onDeleteAd: (id: string) => Promise<void>;
  onDeleteBatch: (ids: string[]) => Promise<void>;
  onDeleteByCity: (city: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  onOpenScraper: () => void;
  onRefreshDirectory?: () => Promise<void>;
  onOpenSupabaseModal?: () => void;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  ads,
  onSelectAd,
  onUpdateAd,
  onDeleteAd,
  onDeleteBatch,
  onDeleteByCity,
  onClearAll,
  onOpenScraper,
  onRefreshDirectory,
  onOpenSupabaseModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'nuevo' | 'contactado' | 'favorito' | 'repetidos'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(24);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // WhatsApp Campaign Modal
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [extensionSyncFeedback, setExtensionSyncFeedback] = useState<{
    isOpen: boolean;
    total: number;
    uncontacted: number;
    alreadyContacted: number;
  } | null>(null);
  const [isSyncingToExtension, setIsSyncingToExtension] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [isDuplicateDetectorOpen, setIsDuplicateDetectorOpen] = useState(false);

  // Detect and group duplicate phone numbers across the directory
  const { duplicatePhoneSet, duplicatePhonesCount } = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const a of ads) {
      const norm = canonicalPhone(a.normalizedPhone || a.phone || '');
      if (!norm) continue;
      map.set(norm, (map.get(norm) || 0) + 1);
    }
    const set = new Set<string>();
    for (const [norm, count] of map.entries()) {
      if (count > 1) set.add(norm);
    }
    return { duplicatePhoneSet: set, duplicatePhonesCount: set.size };
  }, [ads]);

  // Modals state
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [customCityToDelete, setCustomCityToDelete] = useState('');
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quickEditAd, setQuickEditAd] = useState<AdItem | null>(null);

  const handleCopyPhone = (e: React.MouseEvent, id: string, phone: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleFavorite = async (e: React.MouseEvent, ad: AdItem) => {
    e.stopPropagation();
    const newStatus = ad.status === 'favorito' ? 'nuevo' : 'favorito';
    await onUpdateAd(ad.id, { status: newStatus });
  };

  const handleToggleContacted = async (e: React.MouseEvent, ad: AdItem) => {
    e.stopPropagation();
    const newStatus = ad.status === 'contactado' ? 'nuevo' : 'contactado';
    await onUpdateAd(ad.id, { status: newStatus });
  };

  // Toggle selection for a single ad
  const handleToggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Extract unique categories available in the ads
  const availableCategories = React.useMemo(() => {
    const set = new Set<string>();
    ads.forEach(a => {
      if (a.category && a.category !== 'Anuncios' && a.category !== 'Manual') {
        set.add(a.category);
      }
    });
    // Add common categories if not already present
    ['Escorts', 'Travestis', 'Masajes', 'Chicos'].forEach(c => set.add(c));
    return Array.from(set);
  }, [ads]);

  // Filter ads
  const filteredAds = ads.filter(ad => {
    if (statusFilter === 'repetidos') {
      const norm = canonicalPhone(ad.normalizedPhone || ad.phone || '');
      if (!norm || !duplicatePhoneSet.has(norm)) return false;
    } else if (statusFilter !== 'all' && ad.status !== statusFilter) {
      return false;
    }
    
    if (categoryFilter !== 'all') {
      const cat = categoryFilter.toLowerCase();
      const adCat = (ad.category || '').toLowerCase();
      const adTitle = (ad.title || '').toLowerCase();
      if (!adCat.includes(cat) && !adTitle.includes(cat)) {
        return false;
      }
    }

    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    return (
      ad.title?.toLowerCase().includes(term) ||
      ad.phone?.toLowerCase().includes(term) ||
      ad.location?.toLowerCase().includes(term) ||
      ad.detectedName?.toLowerCase().includes(term) ||
      ad.nationality?.toLowerCase().includes(term) ||
      ad.notes?.toLowerCase().includes(term) ||
      ad.sourceSite?.toLowerCase().includes(term)
    );
  });

  // Pagination calculation
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(filteredAds.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const pagedAds = pageSize === 0 ? filteredAds : filteredAds.slice((validCurrentPage - 1) * pageSize, validCurrentPage * pageSize);

  // Smart Selection Helpers
  const handleSelectCurrentPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      pagedAds.forEach(a => next.add(a.id));
      return next;
    });
  };

  const handleSelectAllCategory = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredAds.forEach(a => next.add(a.id));
      return next;
    });
  };

  const handleSelectUncontacted = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredAds.filter(a => a.status === 'nuevo').forEach(a => next.add(a.id));
      return next;
    });
  };

  // Select all or deselect all filtered
  const isAllFilteredSelected =
    filteredAds.length > 0 && filteredAds.every(ad => selectedIds.has(ad.id));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      // Deselect all filtered
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredAds.forEach(ad => next.delete(ad.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredAds.forEach(ad => next.add(ad.id));
        return next;
      });
    }
  };

  // Bulk delete selected
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `¿Confirmas que deseas eliminar los ${selectedIds.size} anuncios seleccionados?`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    await onDeleteBatch(Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsProcessing(false);
  };

  // Delete by specific city
  const handleDeleteCity = async (cityName: string) => {
    if (
      !confirm(
        `¿Deseas eliminar todos los anuncios que correspondan a "${cityName}"?`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    await onDeleteByCity(cityName);
    setSelectedIds(new Set());
    setIsProcessing(false);
    setIsCityModalOpen(false);
  };

  // Wipe entire directory
  const handleConfirmClearAll = async () => {
    setIsProcessing(true);
    await onClearAll();
    setSelectedIds(new Set());
    setIsProcessing(false);
    setIsClearAllModalOpen(false);
  };

  // Group ads by city to display in city modal
  const cityGroups: Record<string, number> = {};
  ads.forEach(ad => {
    const loc = ad.location || 'Sin ubicación';
    cityGroups[loc] = (cityGroups[loc] || 0) + 1;
  });

  const sortedCities = Object.entries(cityGroups).sort((a, b) => b[1] - a[1]);

  // Synchronize target ads to backend for Chrome Extension
  const syncTargetAdsToBackend = async (targetList: AdItem[], showFeedbackModal = false) => {
    try {
      setIsSyncingToExtension(true);
      const uncontactedList = targetList.filter(a => a.status !== 'contactado' && a.phone);
      const alreadyContactedCount = targetList.length - uncontactedList.length;

      await fetch('/api/whatsapp/active-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adIds: uncontactedList.map(a => a.id) }),
      });

      // Notify content_app.js if Chrome extension content script is present
      window.postMessage(
        {
          type: 'AUTOPUBLI24_SYNC_SELECTION',
          serverUrl: window.location.origin,
          count: uncontactedList.length,
        },
        '*'
      );

      if (showFeedbackModal) {
        setExtensionSyncFeedback({
          isOpen: true,
          total: targetList.length,
          uncontacted: uncontactedList.length,
          alreadyContacted: alreadyContactedCount,
        });
      }
    } catch (e) {
      console.error('Error al sincronizar con extensión:', e);
    } finally {
      setIsSyncingToExtension(false);
    }
  };

  const handleOpenWhatsAppCampaign = () => {
    // If specific ads are selected, use them. If none selected, default to uncontacted ads only!
    let targetAds: AdItem[];
    if (selectedIds.size > 0) {
      targetAds = ads.filter(a => selectedIds.has(a.id));
    } else {
      targetAds = filteredAds.filter(a => a.status === 'nuevo' || a.status === 'favorito');
      if (targetAds.length === 0) {
        targetAds = filteredAds;
      }
    }
    syncTargetAdsToBackend(targetAds, false);
    setIsWhatsAppModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Cleaning Toolbar */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por título, teléfono o ciudad..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Quick Management Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenWhatsAppCampaign}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors shadow-xs"
              title="Iniciar envío de mensajes por WhatsApp poco a poco"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-white/20" />
              <span>Campaña WhatsApp ({selectedIds.size > 0 ? selectedIds.size : filteredAds.length})</span>
            </button>

            <button
              onClick={() => setIsExtensionModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 flex items-center gap-1.5 transition-colors shadow-xs"
              title="Descargar o configurar la Extensión de Chrome para envío desatendido"
            >
              <Puzzle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Extensión Chrome</span>
            </button>

            {onOpenSupabaseModal && (
              <button
                onClick={onOpenSupabaseModal}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors shadow-xs"
                title="Conectar, sincronizar y asegurar tus datos en Supabase Cloud"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Supabase Cloud</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            )}

            {/* Botón Comprobar y Localizar Teléfonos Duplicados */}
            <button
              onClick={() => setIsDuplicateDetectorOpen(true)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-xs ${
                duplicatePhonesCount > 0
                  ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                  : 'border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
              title="Comprobar que no hay 2 anuncios con el mismo número y dar opción a dejar solo 1"
            >
              <ShieldAlert className={`w-3.5 h-3.5 ${duplicatePhonesCount > 0 ? 'text-white' : 'text-amber-500'}`} />
              <span>
                {duplicatePhonesCount > 0
                  ? `Comprobar Duplicados (${duplicatePhonesCount} repetidos)`
                  : 'Comprobar Teléfonos Duplicados'}
              </span>
            </button>

            <button
              onClick={() => setIsCityModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5 transition-colors"
            >
              <Building className="w-3.5 h-3.5 text-amber-500" />
              <span>Eliminar por Ciudad</span>
            </button>

            <button
              onClick={() => setIsClearAllModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar Todo</span>
            </button>
          </div>
        </div>

        {/* Second Row: Filters, Category, Status & Selection Helpers */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Todos ({ads.length})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('favorito');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  statusFilter === 'favorito'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                Favoritos
              </button>
              <button
                onClick={() => {
                  setStatusFilter('contactado');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  statusFilter === 'contactado'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <MessageCircle className="w-3 h-3 text-emerald-500" />
                Contactados
              </button>
              {duplicatePhonesCount > 0 && (
                <button
                  onClick={() => {
                    setStatusFilter('repetidos');
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                    statusFilter === 'repetidos'
                      ? 'bg-amber-600 text-white shadow-xs font-bold'
                      : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                  }`}
                  title="Ver sólo los anuncios cuyos teléfonos están repetidos"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  Repetidos ({duplicatePhonesCount})
                </button>
              )}
            </div>

            {/* Category Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 font-medium">Categoría:</span>
              <select
                value={categoryFilter}
                onChange={e => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Todas las Categorías</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* View mode */}
          <div className="flex items-center gap-1 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              title="Vista de cuadrícula"
              className={`p-1.5 rounded-md ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Vista de lista"
              className={`p-1.5 rounded-md ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Third Row: Smart Selection Helpers & Pagination Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white font-medium"
            >
              {isAllFilteredSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Square className="w-3.5 h-3.5 text-neutral-400" />
              )}
              <span>{isAllFilteredSelected ? 'Deseleccionar todos' : 'Seleccionar visibles'}</span>
            </button>

            <span className="text-neutral-300 dark:text-neutral-700">·</span>

            <button
              onClick={handleSelectCurrentPage}
              className="px-2 py-0.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium transition-colors"
              title="Selecciona únicamente los anuncios mostrados en la página actual"
            >
              + Seleccionar esta página ({pagedAds.length})
            </button>

            <button
              onClick={handleSelectAllCategory}
              className="px-2 py-0.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium transition-colors"
              title="Selecciona todos los anuncios filtrados en esta categoría"
            >
              + Seleccionar toda la categoría ({filteredAds.length})
            </button>

            <button
              onClick={handleSelectUncontacted}
              className="px-2 py-0.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-emerald-600 dark:text-emerald-400 font-semibold transition-colors"
              title="Selecciona todos los contactos pendientes (estado nuevo)"
            >
              + Seleccionar no contactados ({filteredAds.filter(a => a.status === 'nuevo').length})
            </button>
          </div>

          {/* Page size options */}
          <div className="flex items-center gap-1">
            <span>Mostrar por página:</span>
            {[12, 24, 48, 0].map(sz => (
              <button
                key={sz}
                onClick={() => {
                  setPageSize(sz);
                  setCurrentPage(1);
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  pageSize === sz
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500'
                }`}
              >
                {sz === 0 ? 'Todos' : sz}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Banner de alerta de teléfonos duplicados si existen */}
      {duplicatePhonesCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950 dark:text-amber-200">
                Se han localizado {duplicatePhonesCount} número{duplicatePhonesCount > 1 ? 's' : ''} de teléfono repetido{duplicatePhonesCount > 1 ? 's' : ''} en tu directorio
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Hay anuncios que comparten el mismo número. Puedes comprobarlos y eliminar los duplicados para dejar solo 1 por número.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDuplicateDetectorOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Comprobar & Dejar Solo 1</span>
          </button>
        </div>
      )}

      {/* Floating Bulk Actions Bar when items are selected */}
      {selectedIds.size > 0 && (
        <div className="sticky top-18 z-20 bg-neutral-900 text-white rounded-xl p-3 px-4 shadow-xl border border-neutral-800 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {selectedIds.size}
            </span>
            <span className="text-xs text-neutral-300">
              anuncio{selectedIds.size > 1 ? 's' : ''} seleccionado{selectedIds.size > 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenWhatsAppCampaign}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-white/20" />
              <span>Enviar WhatsApp por Lotes ({selectedIds.size})</span>
            </button>

            <button
              onClick={() => {
                const selectedList = ads.filter(a => selectedIds.has(a.id));
                syncTargetAdsToBackend(selectedList, true);
              }}
              disabled={isSyncingToExtension}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
              title="Sincronizar estos contactos seleccionados con la extensión de Chrome"
            >
              <Puzzle className="w-3.5 h-3.5" />
              <span>
                {isSyncingToExtension
                  ? 'Sincronizando...'
                  : `Enviar a Extensión (${selectedIds.size})`}
              </span>
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-xs text-neutral-300 hover:text-white transition-colors"
            >
              Deseleccionar
            </button>

            <button
              onClick={handleDeleteSelected}
              disabled={isProcessing}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar Selección ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredAds.length === 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
              {ads.length === 0
                ? 'Tu directorio está vacío'
                : 'No hay anuncios que coincidan con la búsqueda'}
            </h3>
            <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
              {ads.length === 0
                ? 'Ejecuta el scraper para extraer automáticamente anuncios con foto, título y teléfono deduplicado.'
                : 'Intenta ajustar los términos de búsqueda o cambiar el filtro.'}
            </p>
          </div>
          {ads.length === 0 && (
            <button
              onClick={onOpenScraper}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
            >
              Ir al Scraper
            </button>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && pagedAds.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pagedAds.map(ad => {
            const isSelected = selectedIds.has(ad.id);
            return (
              <div
                key={ad.id}
                onClick={() => onSelectAd(ad)}
                className={`group bg-white dark:bg-neutral-900 rounded-xl border overflow-hidden transition-all flex flex-col cursor-pointer shadow-xs hover:shadow-md relative ${
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                {/* Photo Area (1 foto para saber quién es) */}
                <div className="relative aspect-4/3 w-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  {ad.imageUrl ? (
                    <img
                      src={ad.imageUrl}
                      alt={ad.title}
                      referrerPolicy="no-referrer"
                      onError={e => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                      className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 p-4">
                      <User className="w-12 h-12 stroke-[1.5] opacity-40 mb-2" />
                      <span className="text-xs text-neutral-500">Sin foto disponible</span>
                    </div>
                  )}

                  {/* Top-left: Checkbox selector */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <button
                      onClick={e => handleToggleSelect(e, ad.id)}
                      className={`p-1.5 rounded-md backdrop-blur-md transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-black/50 text-white/80 hover:bg-black/70'
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Overlays top-right: Favorite, Contacted, Single Delete */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                    <button
                      onClick={e => handleToggleFavorite(e, ad)}
                      title={ad.status === 'favorito' ? 'Quitar de favoritos' : 'Marcar como favorito'}
                      className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${
                        ad.status === 'favorito'
                          ? 'bg-amber-500 text-white'
                          : 'bg-black/40 text-white/80 hover:bg-black/60'
                      }`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          ad.status === 'favorito' ? 'fill-current' : ''
                        }`}
                      />
                    </button>

                    <button
                      onClick={e => handleToggleContacted(e, ad)}
                      title={
                        ad.status === 'contactado'
                          ? 'Marcar como no contactado'
                          : 'Marcar como contactado'
                      }
                      className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${
                        ad.status === 'contactado'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-black/40 text-white/80 hover:bg-black/60'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={async e => {
                        e.stopPropagation();
                        if (confirm(`¿Eliminar este anuncio ("${ad.title}")?`)) {
                          await onDeleteAd(ad.id);
                        }
                      }}
                      title="Eliminar del directorio"
                      className="p-1.5 rounded-full backdrop-blur-md bg-black/40 text-white/80 hover:bg-rose-600 hover:text-white transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {ad.location && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setQuickEditAd(ad);
                      }}
                      className="absolute bottom-2 left-2 text-[11px] font-medium text-white bg-black/70 hover:bg-emerald-600 backdrop-blur-xs px-2 py-0.5 rounded-md flex items-center gap-1 max-w-[65%] truncate transition-colors z-10"
                      title="Clic para cambiar la ciudad"
                    >
                      <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{ad.location}</span>
                      <Edit2 className="w-2.5 h-2.5 opacity-70 shrink-0 ml-0.5" />
                    </button>
                  )}

                  {ad.images && ad.images.length > 1 && (
                    <div className="absolute bottom-2 right-2 text-[10px] font-bold text-white bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Images className="w-3 h-3 text-emerald-400" />
                      <span>{ad.images.length} fotos</span>
                    </div>
                  )}
                </div>

                {/* Content Area */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Name and Nationality badges (with quick edit) */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {ad.detectedName ? (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setQuickEditAd(ad);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800/60 transition-colors"
                          title="Clic para cambiar el nombre de la chica"
                        >
                          <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>{ad.detectedName}</span>
                          <Edit2 className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setQuickEditAd(ad);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 text-neutral-500 hover:text-emerald-600 font-medium text-[10px] transition-colors"
                          title="Añadir nombre de la chica para personalizar WhatsApp"
                        >
                          <User className="w-3 h-3" />
                          <span>+ Poner nombre</span>
                        </button>
                      )}
                      {ad.nationality && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] border border-indigo-200 dark:border-indigo-800/60">
                          <Globe className="w-3 h-3 text-indigo-500" />
                          {ad.nationality}
                        </span>
                      )}
                      {ad.isFullAd && (
                        <span className="text-[10px] font-mono text-neutral-400 border border-neutral-200 dark:border-neutral-800 px-1.5 py-0.5 rounded">
                          HD
                        </span>
                      )}
                    </div>

                    {/* Clean unboxed metadata */}
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">
                      <span>{ad.sourceSite || 'Anuncio'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{new Date(ad.scrapedAt).toLocaleDateString()}</span>
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-white line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors">
                      {ad.title}
                    </h4>
                  </div>

                  {/* Phone & Contact Actions */}
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-200 tabular-nums">
                          {ad.phone}
                        </span>
                        <button
                          onClick={e => handleCopyPhone(e, ad.id, ad.phone)}
                          title="Copiar teléfono"
                          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                        >
                          {copiedId === ad.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setQuickEditAd(ad);
                          }}
                          title="Editar nombre de la chica o ciudad"
                          className="p-1.5 rounded-md bg-neutral-100 hover:bg-emerald-100 dark:bg-neutral-800 dark:hover:bg-emerald-950/60 text-neutral-600 hover:text-emerald-700 dark:text-neutral-300 dark:hover:text-emerald-400 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {ad.hasWhatsapp && ad.whatsappUrl && (
                          <a
                            href={ad.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            title="Abrir WhatsApp"
                            className="p-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4 fill-emerald-600/20" />
                          </a>
                        )}

                        {ad.phone && ad.phone !== 'No especificado' && (
                          <a
                            href={`tel:${ad.phone.replace(/\s+/g, '')}`}
                            onClick={e => e.stopPropagation()}
                            title="Llamar"
                            className="p-1.5 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>

                    {ad.notes && (
                      <p className="text-xs text-neutral-500 italic line-clamp-1">
                        "{ad.notes}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && pagedAds.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-medium">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      onClick={handleToggleSelectAll}
                      className="text-neutral-500 hover:text-neutral-900"
                    >
                      {isAllFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 w-12 text-center">Foto</th>
                  <th className="py-3 px-3">Nombre</th>
                  <th className="py-3 px-3">Origen</th>
                  <th className="py-3 px-4">Título del Anuncio</th>
                  <th className="py-3 px-4">Teléfono / WhatsApp</th>
                  <th className="py-3 px-4">Ubicación</th>
                  <th className="py-3 px-4">Portal</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                {pagedAds.map(ad => {
                  const isSelected = selectedIds.has(ad.id);
                  return (
                    <tr
                      key={ad.id}
                      onClick={() => onSelectAd(ad)}
                      className={`hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={e => handleToggleSelect(e, ad.id)}
                          className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="w-9 h-9 rounded-md bg-neutral-100 dark:bg-neutral-800 overflow-hidden mx-auto">
                          {ad.imageUrl ? (
                            <img
                              src={ad.imageUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-400">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </td>

                      <td
                        className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors"
                        onClick={e => {
                          e.stopPropagation();
                          setQuickEditAd(ad);
                        }}
                        title="Clic para cambiar el nombre de la chica"
                      >
                        {ad.detectedName ? (
                          <span className="inline-flex items-center gap-1 group/name">
                            <User className="w-3 h-3 text-emerald-500" />
                            <span>{ad.detectedName}</span>
                            <Edit2 className="w-2.5 h-2.5 opacity-40 group-hover/name:opacity-100" />
                          </span>
                        ) : (
                          <span className="text-neutral-400 font-normal hover:text-emerald-600 text-xs flex items-center gap-1">
                            + Poner nombre
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-300">
                        {ad.nationality ? (
                          <span className="inline-flex items-center gap-1">
                            <Globe className="w-3 h-3 text-indigo-500" />
                            {ad.nationality}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 font-medium text-neutral-900 dark:text-white max-w-xs truncate">
                        {ad.title}
                      </td>

                      <td className="py-2.5 px-4 font-mono tabular-nums text-neutral-900 dark:text-neutral-200">
                        <div className="flex items-center gap-2">
                          <span>{ad.phone}</span>
                          {ad.hasWhatsapp && (
                            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950 px-1 py-0.5 rounded">
                              WA
                            </span>
                          )}
                        </div>
                      </td>

                      <td
                        className="py-2.5 px-4 text-neutral-600 dark:text-neutral-300 max-w-xs truncate cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 transition-colors"
                        onClick={e => {
                          e.stopPropagation();
                          setQuickEditAd(ad);
                        }}
                        title="Clic para cambiar la ciudad"
                      >
                        <div className="flex items-center gap-1.5 group/loc">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400 group-hover/loc:text-emerald-600 shrink-0" />
                          <span className="truncate">{ad.location || 'Madrid'}</span>
                          <Edit2 className="w-2.5 h-2.5 opacity-40 group-hover/loc:opacity-100 shrink-0" />
                        </div>
                      </td>

                      <td className="py-2.5 px-4 text-neutral-500">
                        {ad.sourceSite}
                      </td>

                      <td className="py-2.5 px-4">
                        <span className="capitalize text-neutral-600 dark:text-neutral-400">
                          {ad.status}
                        </span>
                      </td>

                      <td
                        className="py-2.5 px-4 text-right"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setQuickEditAd(ad);
                            }}
                            className="p-1 rounded text-neutral-500 hover:text-emerald-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            title="Editar nombre y ciudad"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {ad.whatsappUrl && (
                            <a
                              href={ad.whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={e => handleCopyPhone(e, ad.id, ad.phone)}
                            className="p-1 rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            title="Copiar"
                          >
                            {copiedId === ad.id ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={async e => {
                              e.stopPropagation();
                              if (confirm('¿Eliminar este anuncio del directorio?')) {
                                await onDeleteAd(ad.id);
                              }
                            }}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {pageSize > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs shadow-xs">
          <div className="text-neutral-500">
            Mostrando página <span className="font-bold text-neutral-900 dark:text-white">{validCurrentPage}</span> de{' '}
            <span className="font-bold text-neutral-900 dark:text-white">{totalPages}</span> ({filteredAds.length} anuncios encontrados)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={validCurrentPage <= 1}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1 font-medium transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <div className="flex items-center gap-1 font-mono">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && validCurrentPage > 3) {
                  pageNum = validCurrentPage - 2 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                      validCurrentPage === pageNum
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1 font-medium transition-colors"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Campaign Dispatcher Modal */}
      {isWhatsAppModalOpen && (
        <WhatsAppCampaignModal
          selectedAds={
            selectedIds.size > 0
              ? ads.filter(a => selectedIds.has(a.id))
              : filteredAds
          }
          onClose={() => setIsWhatsAppModalOpen(false)}
          onAdStatusUpdated={async (id) => {
            await onUpdateAd(id, { status: 'contactado' });
          }}
        />
      )}

      {/* Modal: Eliminar por Lote de Ciudad */}
      {isCityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Eliminar Anuncios por Lote de Ciudad
                </h3>
              </div>
              <button
                onClick={() => setIsCityModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <p className="text-xs text-neutral-500 leading-relaxed">
                Selecciona una ciudad o provincia detectada en tu directorio para eliminar en lote todos los anuncios pertenecientes a esa zona:
              </p>

              {/* City quick buttons list */}
              <div className="space-y-2">
                {sortedCities.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">No hay anuncios registrados en el directorio.</p>
                ) : (
                  sortedCities.map(([cityName, count]) => (
                    <div
                      key={cityName}
                      className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <div>
                        <span className="text-xs font-semibold text-neutral-900 dark:text-white block">
                          {cityName}
                        </span>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {count} anuncio{count > 1 ? 's' : ''}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteCity(cityName)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar {count}</span>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Manual input delete */}
              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  O purgar por término o provincia manual:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCityToDelete}
                    onChange={e => setCustomCityToDelete(e.target.value)}
                    placeholder="Ej: Madrid, Valencia, Girona..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  />
                  <button
                    onClick={() => {
                      if (customCityToDelete.trim()) {
                        handleDeleteCity(customCityToDelete.trim());
                      }
                    }}
                    disabled={!customCityToDelete.trim() || isProcessing}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-right">
              <button
                onClick={() => setIsCityModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Vaciar Todo */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                ¿Vaciar Todo el Directorio?
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Estás a punto de eliminar <strong>todos los {ads.length} anuncios</strong> guardados en tu directorio personal. Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-center gap-3">
              <button
                onClick={() => setIsClearAllModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmClearAll}
                disabled={isProcessing}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                {isProcessing ? 'Eliminando...' : 'Sí, Vaciar Directorio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Name & City Modal */}
      {quickEditAd && (
        <QuickEditAdModal
          ad={quickEditAd}
          onClose={() => setQuickEditAd(null)}
          onSave={onUpdateAd}
        />
      )}

      {/* Modal: Feedback Éxito al Enviar a Extensión */}
      {extensionSyncFeedback?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                <Puzzle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  ¡Contactos Enviados a la Extensión!
                </h3>
                <p className="text-xs text-neutral-500">
                  Selección sincronizada en memoria para WhatsApp Web
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold text-purple-950 dark:text-purple-200">
                <span>Contactos nuevos a enviar:</span>
                <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {extensionSyncFeedback.uncontacted} listos
                </span>
              </div>

              {extensionSyncFeedback.alreadyContacted > 0 && (
                <div className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-300 pt-1 border-t border-purple-200 dark:border-purple-800">
                  <span>Ya contactados anteriormente:</span>
                  <span className="font-semibold">
                    {extensionSyncFeedback.alreadyContacted} excluidos (sin duplicados)
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              <p>
                <strong>Siguiente paso en tu navegador:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] pl-1 text-neutral-700 dark:text-neutral-300">
                <li>Abre el icono de la <strong>Extensión de Chrome autopubli24</strong>.</li>
                <li>Pulsa en <strong>🔄 Sincronizar</strong> (cargará estos {extensionSyncFeedback.uncontacted} contactos).</li>
                <li>Haz clic en <strong>▶ Iniciar Automático</strong> para que envíe desatendido.</li>
              </ol>
            </div>

            <div className="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs">
              <span className="text-[11px] text-neutral-500 truncate mr-2 font-mono">
                {window.location.origin}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin);
                  setCopiedOrigin(true);
                  setTimeout(() => setCopiedOrigin(false), 2500);
                }}
                className="px-2 py-1 text-[10px] font-bold bg-white dark:bg-neutral-700 hover:bg-neutral-50 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-600 rounded shrink-0 transition-colors"
              >
                {copiedOrigin ? '✓ ¡Copiada!' : 'Copiar URL'}
              </button>
            </div>

            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setExtensionSyncFeedback(null);
                  setIsExtensionModalOpen(true);
                }}
                className="px-3 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-xl transition-colors"
              >
                Guía de Instalación
              </button>

              <button
                onClick={() => setExtensionSyncFeedback(null)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                ¡Entendido!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extension Info / Download Modal */}
      {isExtensionModalOpen && (
        <ExtensionModal onClose={() => setIsExtensionModalOpen(false)} />
      )}

      {/* Modal: Detector y Limpiador de Teléfonos Duplicados */}
      {isDuplicateDetectorOpen && (
        <DuplicatePhoneDetectorModal
          ads={ads}
          onClose={() => setIsDuplicateDetectorOpen(false)}
          onRefreshDirectory={onRefreshDirectory || (async () => {})}
          onDeleteBatch={onDeleteBatch}
        />
      )}
    </div>
  );
};
