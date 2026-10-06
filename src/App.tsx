/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { DirectoryView } from './components/DirectoryView.tsx';
import { ScraperPanel } from './components/ScraperPanel.tsx';
import { PortalsView } from './components/PortalsView.tsx';
import { DuplicatesModal } from './components/DuplicatesModal.tsx';
import { AdDetailModal } from './components/AdDetailModal.tsx';
import { AddAdModal } from './components/AddAdModal.tsx';
import { ExportModal } from './components/ExportModal.tsx';
import { ExtensionModal } from './components/ExtensionModal.tsx';
import { DuplicatePhoneDetectorModal } from './components/DuplicatePhoneDetectorModal.tsx';
import { SupabaseModal } from './components/SupabaseModal.tsx';
import type { AdItem, DuplicateRecord, DirectoryStats, ScrapeJobResult } from './types.ts';
import { canonicalPhone } from './utils/phone.ts';
import { Check, ShieldAlert, Sparkles, AlertCircle, Database, Phone, MessageSquare } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'directory' | 'scraper' | 'portals' | 'duplicates'>('directory');
  const [initialScraperUrl, setInitialScraperUrl] = useState<string>('');
  const [ads, setAds] = useState<AdItem[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateRecord[]>([]);
  const [stats, setStats] = useState<DirectoryStats>({
    totalAds: 0,
    totalWithWhatsapp: 0,
    totalContacted: 0,
    totalFavorites: 0,
    totalDuplicatesPrevented: 0,
    topCities: [],
  });
  const [selectedAd, setSelectedAd] = useState<AdItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [isDuplicateDetectorOpen, setIsDuplicateDetectorOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'warn' | 'info'>('success');
  const [isLoading, setIsLoading] = useState(true);

  // Calculate live count of phone numbers that appear more than once in ads
  const duplicatePhonesCount = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const a of ads) {
      const norm = canonicalPhone(a.normalizedPhone || a.phone || '');
      if (!norm) continue;
      map.set(norm, (map.get(norm) || 0) + 1);
    }
    let count = 0;
    for (const val of map.values()) {
      if (val > 1) count++;
    }
    return count;
  }, [ads]);

  const showToast = (message: string, type: 'success' | 'warn' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchDirectoryData = async () => {
    try {
      const [dirRes, dupRes] = await Promise.all([
        fetch('/api/directory'),
        fetch('/api/duplicates'),
      ]);

      const dirData = await dirRes.json();
      const dupData = await dupRes.json();

      if (dirData.success) {
        setAds(dirData.ads || []);
        if (dirData.stats) setStats(dirData.stats);
      }

      if (dupData.success) {
        setDuplicates(dupData.duplicates || []);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectoryData();
  }, []);

  const handleScrapeComplete = (result: ScrapeJobResult) => {
    if (result.success) {
      fetchDirectoryData();
      if (result.newUniqueAdded > 0 && result.duplicatesSkipped > 0) {
        showToast(
          `¡Éxito! +${result.newUniqueAdded} anuncios únicos guardados. ${result.duplicatesSkipped} repetidos fueron filtrados.`,
          'success'
        );
      } else if (result.newUniqueAdded > 0) {
        showToast(`¡Éxito! +${result.newUniqueAdded} anuncios únicos guardados en tu directorio.`, 'success');
      } else if (result.duplicatesSkipped > 0) {
        showToast(
          `Se detectaron ${result.duplicatesSkipped} anuncios con teléfonos ya existentes. Ninguno duplicado se guardó.`,
          'warn'
        );
      } else {
        showToast('Escaneo completado. No se encontraron anuncios nuevos.', 'info');
      }
    }
  };

  const handleUpdateAd = async (id: string, updates: Partial<AdItem>) => {
    try {
      const res = await fetch(`/api/directory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success && data.ad) {
        setAds(prev => prev.map(a => (a.id === id ? data.ad : a)));
        if (selectedAd && selectedAd.id === id) {
          setSelectedAd(data.ad);
        }
        if (data.stats) setStats(data.stats);
        showToast('Anuncio actualizado', 'success');
      }
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const handleDeleteAd = async (id: string) => {
    try {
      const res = await fetch(`/api/directory/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAds(prev => prev.filter(a => a.id !== id));
        if (selectedAd && selectedAd.id === id) setSelectedAd(null);
        if (data.stats) setStats(data.stats);
        showToast('Anuncio eliminado del directorio', 'info');
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleDeleteBatch = async (ids: string[]) => {
    try {
      const res = await fetch('/api/directory/delete-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (data.success) {
        const idSet = new Set(ids);
        setAds(prev => prev.filter(a => !idSet.has(a.id)));
        if (selectedAd && idSet.has(selectedAd.id)) setSelectedAd(null);
        if (data.stats) setStats(data.stats);
        showToast(`${data.removedCount} anuncios eliminados del directorio`, 'info');
      }
    } catch (err) {
      console.error('Batch delete failed:', err);
    }
  };

  const handleDeleteByCity = async (city: string) => {
    try {
      const res = await fetch('/api/directory/delete-by-city', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city }),
      });
      const data = await res.json();
      if (data.success) {
        const cityLower = city.toLowerCase();
        setAds(prev => prev.filter(a => !(a.location || '').toLowerCase().includes(cityLower)));
        if (selectedAd && (selectedAd.location || '').toLowerCase().includes(cityLower)) setSelectedAd(null);
        if (data.stats) setStats(data.stats);
        showToast(`${data.removedCount} anuncios de "${city}" eliminados del directorio`, 'info');
      }
    } catch (err) {
      console.error('Delete by city failed:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      const res = await fetch('/api/directory', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAds([]);
        setSelectedAd(null);
        if (data.stats) setStats(data.stats);
        showToast('Directorio vaciado por completo', 'info');
      }
    } catch (err) {
      console.error('Clear all failed:', err);
    }
  };

  const handleClearDuplicates = async () => {
    // optional reset of duplicate log
    setDuplicates([]);
    showToast('Historial de bloqueos limpiado', 'info');
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border bg-white dark:bg-neutral-900 text-sm font-medium transition-all animate-in fade-in slide-in-from-bottom-4">
          {toastType === 'success' && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
          {toastType === 'warn' && <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />}
          {toastType === 'info' && <AlertCircle className="w-4 h-4 text-sky-500 shrink-0" />}
          <span className="text-neutral-800 dark:text-neutral-200">{toastMessage}</span>
        </div>
      )}

      {/* Header Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalAds={ads.length}
        duplicatesCount={duplicates.length}
        activeDuplicatePhonesCount={duplicatePhonesCount}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenExtensionModal={() => setIsExtensionModalOpen(true)}
        onOpenDuplicateDetector={() => setIsDuplicateDetectorOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <span className="text-xs text-neutral-500 block mb-0.5">Total Contactos Únicos</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
                {ads.length}
              </span>
              <span className="text-xs text-emerald-600 font-medium">sin repetidos</span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <span className="text-xs text-neutral-500 block mb-0.5">Con WhatsApp Directo</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {stats.totalWithWhatsapp}
              </span>
              <span className="text-xs text-neutral-400">móviles activos</span>
            </div>
          </div>

          <div
            onClick={() => setIsDuplicateDetectorOpen(true)}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              duplicatePhonesCount > 0
                ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 hover:border-amber-500'
                : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
            }`}
            title="Comprobar que no hay 2 anuncios con el mismo número y dejar solo 1"
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-neutral-500 block">Comprobar Duplicados</span>
              {duplicatePhonesCount > 0 ? (
                <span className="text-[10px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded">
                  {duplicatePhonesCount} repetidos
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-600">✓ 0 repetidos</span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold font-mono tabular-nums ${
                duplicatePhonesCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-900 dark:text-white'
              }`}>
                {duplicatePhonesCount}
              </span>
              <span className="text-xs text-neutral-400">
                {duplicatePhonesCount > 0 ? 'clic para dejar solo 1' : 'teléfonos repetidos'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <span className="text-xs text-neutral-500 block mb-0.5">Favoritos Guardados</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white">
                {stats.totalFavorites}
              </span>
              <span className="text-xs text-neutral-400">destacados</span>
            </div>
          </div>
        </div>

        {/* Tab 1: Directory View */}
        {activeTab === 'directory' && (
          <DirectoryView
            ads={ads}
            onSelectAd={ad => setSelectedAd(ad)}
            onUpdateAd={handleUpdateAd}
            onDeleteAd={handleDeleteAd}
            onDeleteBatch={handleDeleteBatch}
            onDeleteByCity={handleDeleteByCity}
            onClearAll={handleClearAll}
            onOpenScraper={() => setActiveTab('scraper')}
            onRefreshDirectory={fetchDirectoryData}
          />
        )}

        {/* Tab 2: Scraper Control */}
        {activeTab === 'scraper' && (
          <ScraperPanel
            initialUrl={initialScraperUrl}
            onScrapeComplete={handleScrapeComplete}
            onNavigateToDirectory={() => setActiveTab('directory')}
            onNavigateToDuplicates={() => setActiveTab('duplicates')}
          />
        )}

        {/* Tab 3: Portales SEO (Top portals ranking in Google with Logo & Name) */}
        {activeTab === 'portals' && (
          <PortalsView
            onSelectPortalForScraping={(portalUrl: string) => {
              setInitialScraperUrl(portalUrl);
              setActiveTab('scraper');
              showToast('URL cargada en el Scraper. Listo para configurar o iniciar.', 'info');
            }}
          />
        )}

        {/* Tab 4: Duplicates Inspector */}
        {activeTab === 'duplicates' && (
          <DuplicatesModal
            duplicates={duplicates}
            onClose={() => setActiveTab('directory')}
            onClearDuplicates={handleClearDuplicates}
            ads={ads}
            onDeleteBatch={handleDeleteBatch}
            onRefreshDirectory={fetchDirectoryData}
          />
        )}
      </main>

      {/* Ad Detail Modal */}
      {selectedAd && (
        <AdDetailModal
          ad={selectedAd}
          onClose={() => setSelectedAd(null)}
          onUpdateAd={handleUpdateAd}
          onDeleteAd={handleDeleteAd}
        />
      )}

      {/* Add Ad Modal */}
      {isAddModalOpen && (
        <AddAdModal
          onClose={() => setIsAddModalOpen(false)}
          onAdAdded={(newAd: AdItem) => {
            setAds(prev => [newAd, ...prev]);
            showToast('Anuncio añadido correctamente a tu directorio', 'success');
            fetchDirectoryData();
          }}
        />
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <ExportModal
          onClose={() => setIsExportModalOpen(false)}
          totalAds={ads.length}
        />
      )}

      {/* Chrome Extension Modal */}
      {isExtensionModalOpen && (
        <ExtensionModal
          onClose={() => setIsExtensionModalOpen(false)}
        />
      )}

      {/* Duplicate Phone Detector Modal (global access) */}
      {isDuplicateDetectorOpen && (
        <DuplicatePhoneDetectorModal
          ads={ads}
          onClose={() => setIsDuplicateDetectorOpen(false)}
          onRefreshDirectory={fetchDirectoryData}
          onDeleteBatch={handleDeleteBatch}
        />
      )}
    </div>
  );
}
