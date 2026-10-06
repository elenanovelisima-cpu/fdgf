import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Phone,
  Trash2,
  Check,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle2,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  User,
  Star,
  PlusCircle,
} from 'lucide-react';
import type { AdItem, DuplicatePhoneGroup } from '../types.ts';
import { canonicalPhone, formatPhoneNumber } from '../utils/phone.ts';

interface DuplicatePhoneDetectorModalProps {
  ads: AdItem[];
  onClose: () => void;
  onRefreshDirectory: () => Promise<void>;
  onDeleteBatch: (ids: string[]) => Promise<void>;
}

export const DuplicatePhoneDetectorModal: React.FC<DuplicatePhoneDetectorModalProps> = ({
  ads,
  onClose,
  onRefreshDirectory,
  onDeleteBatch,
}) => {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicatePhoneGroup[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [isCreatingTest, setIsCreatingTest] = useState<boolean>(false);
  const [cleaningGroupId, setCleaningGroupId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Scan ads for duplicate phone numbers using canonicalPhone
  const scanDuplicates = () => {
    setIsScanning(true);
    const map = new Map<string, AdItem[]>();

    for (const ad of ads) {
      const norm = canonicalPhone(ad.normalizedPhone || ad.phone || '');
      if (!norm) continue;
      const existing = map.get(norm) || [];
      existing.push(ad);
      map.set(norm, existing);
    }

    const groups: DuplicatePhoneGroup[] = [];
    for (const [norm, groupAds] of map.entries()) {
      if (groupAds.length > 1) {
        groups.push({
          normalizedPhone: norm,
          phone: formatPhoneNumber(groupAds[0].phone || norm),
          count: groupAds.length,
          ads: groupAds,
        });
      }
    }

    // Sort by most duplicates first
    groups.sort((a, b) => b.count - a.count);
    setDuplicateGroups(groups);
    setIsScanning(false);
  };

  useEffect(() => {
    scanDuplicates();
  }, [ads]);

  // Total redundant ads that could be removed
  const totalRedundantAds = duplicateGroups.reduce((acc, g) => acc + (g.count - 1), 0);

  // Create test duplicate ads to verify the detection and deduplication
  const handleCreateTestDuplicates = async () => {
    setIsCreatingTest(true);
    try {
      const res = await fetch('/api/directory/test-duplicate-pair', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await onRefreshDirectory();
        setSuccessMessage('✓ Creados 2 anuncios de prueba con el mismo número (+34 699 88 77 66). ¡Comprobación activa: ahora puedes probar la opción de eliminar y dejar solo 1!');
        setTimeout(() => setSuccessMessage(null), 4500);
      } else {
        throw new Error(data.error || 'Error al crear prueba');
      }
    } catch (err: any) {
      alert('Error creando anuncios de prueba: ' + err.message);
    } finally {
      setIsCreatingTest(false);
    }
  };

  // Clean all duplicates across the directory in 1 click (keeping only 1 ad per phone)
  const handleCleanAllDuplicates = async () => {
    if (totalRedundantAds === 0) return;
    if (
      !confirm(
        `¿Confirmas que deseas eliminar los ${totalRedundantAds} anuncios repetidos de forma automática?\n\nSe conservará únicamente 1 anuncio por cada teléfono (priorizando favoritos y los más recientes).`
      )
    ) {
      return;
    }

    setIsCleaning(true);
    try {
      const idsToDelete: string[] = [];

      for (const group of duplicateGroups) {
        // Sort: favorites first, contacted, then newest scrapedAt
        const sorted = [...group.ads].sort((a, b) => {
          if (a.status === 'favorito' && b.status !== 'favorito') return -1;
          if (b.status === 'favorito' && a.status !== 'favorito') return 1;
          if (a.status === 'contactado' && b.status === 'nuevo') return -1;
          if (b.status === 'contactado' && a.status === 'nuevo') return 1;
          return new Date(b.scrapedAt || 0).getTime() - new Date(a.scrapedAt || 0).getTime();
        });

        // Delete all except the first one
        sorted.slice(1).forEach(ad => idsToDelete.push(ad.id));
      }

      await onDeleteBatch(idsToDelete);
      await onRefreshDirectory();
      setSuccessMessage(`✓ Se han eliminado ${idsToDelete.length} anuncios duplicados. ¡Ahora cada teléfono tiene solo 1 anuncio!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(`Error al limpiar duplicados: ${err.message}`);
    } finally {
      setIsCleaning(false);
    }
  };

  // Keep a specific ad in a group and delete the rest
  const handleKeepSpecificAdInGroup = async (group: DuplicatePhoneGroup, keepAdId: string) => {
    const toDeleteIds = group.ads.filter(a => a.id !== keepAdId).map(a => a.id);
    if (toDeleteIds.length === 0) return;

    setCleaningGroupId(group.normalizedPhone);
    try {
      await onDeleteBatch(toDeleteIds);
      await onRefreshDirectory();
      setSuccessMessage(`✓ Se conservó 1 anuncio para el teléfono ${group.phone} y se eliminaron ${toDeleteIds.length} repetidos.`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    } finally {
      setCleaningGroupId(null);
    }
  };

  // Delete a single specific ad from a group
  const handleDeleteSingleAd = async (group: DuplicatePhoneGroup, deleteAdId: string) => {
    setCleaningGroupId(group.normalizedPhone);
    try {
      await onDeleteBatch([deleteAdId]);
      await onRefreshDirectory();
      setSuccessMessage(`✓ Anuncio duplicado eliminado.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    } finally {
      setCleaningGroupId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-4xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-50/70 dark:bg-neutral-800/40">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${
              duplicateGroups.length > 0 ? 'bg-amber-600' : 'bg-emerald-600'
            }`}>
              {duplicateGroups.length > 0 ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Comprobar & Localizar Teléfonos Duplicados
                </h3>
                {duplicateGroups.length > 0 ? (
                  <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    {duplicateGroups.length} teléfono{duplicateGroups.length > 1 ? 's' : ''} repetido{duplicateGroups.length > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    0 duplicados
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Escaneo completo de tus {ads.length} anuncios para garantizar que no hay dos anuncios con el mismo número
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={scanDuplicates}
              disabled={isScanning}
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Volver a escanear"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="px-6 py-3 bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shrink-0 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-neutral-800 dark:text-neutral-200">
          {/* STATE 1: NO DUPLICATES FOUND (CLEAN DIRECTORY) */}
          {duplicateGroups.length === 0 && !isScanning && (
            <div className="p-8 sm:p-12 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
                  ¡Directorio 100% Limpio y Sin Repetidos!
                </h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  Se han analizado todos los <strong>{ads.length} anuncios</strong> guardados en tu directorio. Ningún número de teléfono está compartido por más de un anuncio. Cada anunciante es único.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleCreateTestDuplicates}
                  disabled={isCreatingTest}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-neutral-300 dark:border-neutral-700 shadow-2xs"
                  title="Crea dos anuncios con el mismo número de teléfono para probar la detección y la eliminación de duplicados"
                >
                  <PlusCircle className="w-4 h-4 text-amber-500" />
                  <span>{isCreatingTest ? 'Creando prueba...' : 'Crear 2 anuncios de prueba con mismo número'}</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                >
                  Cerrar Comprobación
                </button>
              </div>
            </div>
          )}

          {/* STATE 2: DUPLICATES FOUND! */}
          {duplicateGroups.length > 0 && (
            <div className="space-y-6">
              {/* Main Callout with Bulk 1-Click Action */}
              <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-950 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>
                      {duplicateGroups.length} teléfono{duplicateGroups.length > 1 ? 's' : ''} con anuncios repetidos
                    </span>
                    <span className="text-[11px] font-mono bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full font-bold">
                      {totalRedundantAds} anuncio{totalRedundantAds > 1 ? 's' : ''} sobrante{totalRedundantAds > 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    Hemos localizado anuncios que comparten el mismo número. Puedes pulsar el botón para eliminarlos todos a la vez dejando solo 1 por número, o decidir abajo cuál conservar de cada anunciante.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCleanAllDuplicates}
                  disabled={isCleaning}
                  className="px-5 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>
                    {isCleaning
                      ? 'Eliminando repetidos...'
                      : `⚡ Limpiar Todos (${totalRedundantAds} sobrantes)`}
                  </span>
                </button>
              </div>

              {/* Group-by-Group Review */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider px-1">
                  <span>Revisión por Número ({duplicateGroups.length}):</span>
                  <span>Opción de conservar el que prefieras</span>
                </div>

                <div className="space-y-4">
                  {duplicateGroups.map((group, groupIdx) => {
                    const isCurrentGroupCleaning = cleaningGroupId === group.normalizedPhone;

                    return (
                      <div
                        key={group.normalizedPhone}
                        className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs"
                      >
                        {/* Group Header */}
                        <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center">
                              {groupIdx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-neutral-400" />
                              <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                                {group.phone}
                              </span>
                              <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                {group.count} anuncios con este número
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                // Default keep the first one (most recent or favorite)
                                handleKeepSpecificAdInGroup(group, group.ads[0].id);
                              }}
                              disabled={isCurrentGroupCleaning}
                              className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                              title="Deja el primer anuncio y elimina los demás automáticamente"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                              <span>Dejar solo 1 en este teléfono</span>
                            </button>
                          </div>
                        </div>

                        {/* Ads Cards in this duplicate group */}
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {group.ads.map((ad, adIdx) => {
                            const isRecommended = adIdx === 0;

                            return (
                              <div
                                key={ad.id}
                                className={`rounded-xl border p-3.5 flex flex-col justify-between transition-all relative ${
                                  isRecommended
                                    ? 'border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/20 dark:bg-emerald-950/20'
                                    : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30'
                                }`}
                              >
                                {isRecommended && (
                                  <div className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-2xs flex items-center gap-1">
                                    <Star className="w-2.5 h-2.5 fill-white" />
                                    <span>Recomendado conservar (más reciente)</span>
                                  </div>
                                )}

                                <div className="flex items-start gap-3">
                                  {/* Photo Thumbnail */}
                                  <div className="w-16 h-16 rounded-lg bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700">
                                    {ad.imageUrl ? (
                                      <img
                                        src={ad.imageUrl}
                                        alt={ad.title}
                                        referrerPolicy="no-referrer"
                                        onError={e => {
                                          (e.target as HTMLElement).style.display = 'none';
                                        }}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                        <User className="w-6 h-6 opacity-40" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Ad Info */}
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <h5 className="text-xs font-bold text-neutral-900 dark:text-white line-clamp-2 leading-snug">
                                      {ad.title}
                                    </h5>

                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-neutral-500">
                                      {ad.location && (
                                        <span className="flex items-center gap-1">
                                          <MapPin className="w-3 h-3 text-neutral-400" />
                                          {ad.location}
                                        </span>
                                      )}
                                      <span>·</span>
                                      <span>{ad.sourceSite || 'Portal'}</span>
                                      {ad.scrapedAt && (
                                        <>
                                          <span>·</span>
                                          <span className="text-[10px]">
                                            {new Date(ad.scrapedAt).toLocaleDateString()}
                                          </span>
                                        </>
                                      )}
                                    </div>

                                    {/* Status Badge */}
                                    <div className="pt-0.5">
                                      {ad.status === 'favorito' && (
                                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                                          ★ Favorito
                                        </span>
                                      )}
                                      {ad.status === 'contactado' && (
                                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                          ✓ Contactado
                                        </span>
                                      )}
                                      {ad.status === 'nuevo' && (
                                        <span className="text-[10px] text-neutral-500">
                                          Nuevo
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Per-card Action buttons */}
                                <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleKeepSpecificAdInGroup(group, ad.id)}
                                    disabled={isCurrentGroupCleaning}
                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 transition-colors shadow-2xs"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Conservar este</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSingleAd(group, ad.id)}
                                    disabled={isCurrentGroupCleaning}
                                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Eliminar este</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 flex items-center justify-between shrink-0">
          <span className="text-xs text-neutral-500">
            {duplicateGroups.length > 0
              ? `${totalRedundantAds} anuncios repetidos listos para ser limpiados`
              : 'Garantía de unicidad activa'}
          </span>

          <div className="flex items-center gap-2">
            {duplicateGroups.length > 0 && (
              <button
                type="button"
                onClick={handleCleanAllDuplicates}
                disabled={isCleaning}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Limpiar Todos ({totalRedundantAds})</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
