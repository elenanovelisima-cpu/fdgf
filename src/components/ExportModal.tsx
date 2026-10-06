import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, Contact, FileCode, Check } from 'lucide-react';

interface ExportModalProps {
  onClose: () => void;
  totalAds: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose, totalAds }) => {
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const handleDownload = (format: 'csv' | 'vcf' | 'json') => {
    setDownloadingFormat(format);
    const link = document.createElement('a');
    link.href = `/api/export?format=${format}`;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingFormat(null);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Exportar Directorio
              </h2>
              <p className="text-xs text-neutral-500">
                {totalAds} anuncios listos para descargar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-3">
          {/* CSV Option */}
          <button
            type="button"
            onClick={() => handleDownload('csv')}
            disabled={totalAds === 0}
            className="w-full p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-emerald-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-neutral-900 dark:text-white block group-hover:text-emerald-600 transition-colors">
                  Excel / CSV (.csv)
                </span>
                <span className="text-xs text-neutral-500 block">
                  Compatible con Excel, Google Sheets, LibreOffice.
                </span>
              </div>
            </div>
            {downloadingFormat === 'csv' ? (
              <Check className="w-4 h-4 text-emerald-600 animate-in zoom-in" />
            ) : (
              <Download className="w-4 h-4 text-neutral-400 group-hover:text-emerald-600 transition-colors" />
            )}
          </button>

          {/* VCF Option */}
          <button
            type="button"
            onClick={() => handleDownload('vcf')}
            disabled={totalAds === 0}
            className="w-full p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-emerald-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                <Contact className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-neutral-900 dark:text-white block group-hover:text-blue-600 transition-colors">
                  Agenda Móvil / vCard (.vcf)
                </span>
                <span className="text-xs text-neutral-500 block">
                  Importa todos los contactos con foto y notas directo a tu iPhone o Android.
                </span>
              </div>
            </div>
            {downloadingFormat === 'vcf' ? (
              <Check className="w-4 h-4 text-blue-600 animate-in zoom-in" />
            ) : (
              <Download className="w-4 h-4 text-neutral-400 group-hover:text-blue-600 transition-colors" />
            )}
          </button>

          {/* JSON Option */}
          <button
            type="button"
            onClick={() => handleDownload('json')}
            disabled={totalAds === 0}
            className="w-full p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-emerald-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-neutral-900 dark:text-white block group-hover:text-purple-600 transition-colors">
                  Copia de Seguridad (.json)
                </span>
                <span className="text-xs text-neutral-500 block">
                  Estructura completa de datos para migraciones o respaldo.
                </span>
              </div>
            </div>
            {downloadingFormat === 'json' ? (
              <Check className="w-4 h-4 text-purple-600 animate-in zoom-in" />
            ) : (
              <Download className="w-4 h-4 text-neutral-400 group-hover:text-purple-600 transition-colors" />
            )}
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
