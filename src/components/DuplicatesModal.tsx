import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, Phone, Clock, ArrowRight, ExternalLink, ShieldAlert, Sparkles } from 'lucide-react';
import type { AdItem, DuplicateRecord } from '../types.ts';
import { canonicalPhone } from '../utils/phone.ts';
import { DuplicatePhoneDetectorModal } from './DuplicatePhoneDetectorModal.tsx';

interface DuplicatesModalProps {
  duplicates: DuplicateRecord[];
  onClose: () => void;
  onClearDuplicates?: () => void;
  ads?: AdItem[];
  onDeleteBatch?: (ids: string[]) => Promise<void>;
  onRefreshDirectory?: () => Promise<void>;
}

export const DuplicatesModal: React.FC<DuplicatesModalProps> = ({
  duplicates,
  onClose,
  onClearDuplicates,
  ads = [],
  onDeleteBatch = async () => {},
  onRefreshDirectory = async () => {},
}) => {
  const [isDetectorOpen, setIsDetectorOpen] = useState(false);

  // Quick check for existing duplicates in current directory ads
  const activeDuplicateCount = React.useMemo(() => {
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

  return (
    <div className="space-y-6">
      {/* Live Directory Duplicates Action Card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl text-white shrink-0 shadow-md ${
            activeDuplicateCount > 0 ? 'bg-amber-600' : 'bg-emerald-600'
          }`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Comprobar Teléfonos en Anuncios Activos
              </h3>
              {activeDuplicateCount > 0 ? (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  {activeDuplicateCount} repetidos detectados
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  0 repetidos en directorio
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
              Escanea tus {ads.length} anuncios guardados y, si detecta varios con el mismo número, te da la opción de eliminar y dejar solo 1.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDetectorOpen(true)}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shrink-0 ${
            activeDuplicateCount > 0
              ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>
            {activeDuplicateCount > 0
              ? `Revisar y Dejar Solo 1 (${activeDuplicateCount})`
              : 'Comprobar Teléfonos Ahora'}
          </span>
        </button>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-5 flex items-start gap-4">
        <div className="p-2.5 bg-amber-100 dark:bg-amber-900/50 rounded-lg text-amber-700 dark:text-amber-300 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Garantía de Cero Repetidos
          </h3>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
            Cada vez que el scraper encuentra un teléfono ya registrado (sea en un rastreo anterior o en la misma página con otro título), se omite de forma inmediata. A continuación se listan todos los intentos de registro duplicados prevenidos.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-900 dark:text-white">
            Historial de Duplicados Omitidos por el Scraper ({duplicates.length})
          </span>
          {duplicates.length > 0 && onClearDuplicates && (
            <button
              onClick={onClearDuplicates}
              className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            >
              Limpiar historial de bloqueos
            </button>
          )}
        </div>

        {duplicates.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 text-xs">
            No se han registrado números duplicados todavía. Todos los anuncios en tu directorio tienen teléfonos únicos.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[500px] overflow-y-auto">
            {duplicates.map((dup, idx) => (
              <div key={idx} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                      {dup.phone}
                    </span>
                    <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(dup.detectedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {dup.sourceUrl && (
                    <a
                      href={dup.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center gap-1"
                    >
                      <span>Ver enlace</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                    <span className="text-[10px] text-rose-500 uppercase tracking-wider block font-semibold">
                      Anuncio Repetido (Omitido)
                    </span>
                    <p className="text-neutral-900 dark:text-neutral-100 line-clamp-1 font-medium mt-0.5">
                      {dup.title}
                    </p>
                  </div>

                  <div className="p-2 rounded bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block font-semibold">
                      Anuncio ya existente en tu Directorio
                    </span>
                    <p className="text-neutral-900 dark:text-neutral-100 line-clamp-1 font-medium mt-0.5">
                      {dup.existingTitle}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detector Modal */}
      {isDetectorOpen && (
        <DuplicatePhoneDetectorModal
          ads={ads}
          onClose={() => setIsDetectorOpen(false)}
          onRefreshDirectory={onRefreshDirectory}
          onDeleteBatch={onDeleteBatch}
        />
      )}
    </div>
  );
};
