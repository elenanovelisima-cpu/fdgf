import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  Copy,
  Check,
  Star,
  Trash2,
  ExternalLink,
  MapPin,
  Calendar,
  Save,
  User,
  Globe,
  Images,
  ChevronLeft,
  ChevronRight,
  Scissors,
  Eye,
  FileText,
  Edit2,
} from 'lucide-react';
import type { AdItem } from '../types.ts';
import { TOP_SPANISH_CITIES } from '../constants/cities.ts';

interface AdDetailModalProps {
  ad: AdItem;
  onClose: () => void;
  onUpdateAd: (id: string, updates: Partial<AdItem>) => Promise<void>;
  onDeleteAd: (id: string) => Promise<void>;
}

export const AdDetailModal: React.FC<AdDetailModalProps> = ({
  ad,
  onClose,
  onUpdateAd,
  onDeleteAd,
}) => {
  const [detectedName, setDetectedName] = useState(ad.detectedName || '');
  const [selectedCity, setSelectedCity] = useState(() => {
    const rawLoc = ad.location?.split('(')[0]?.trim() || '';
    if (TOP_SPANISH_CITIES.includes(rawLoc)) return rawLoc;
    return rawLoc ? '__custom__' : 'Madrid';
  });
  const [customCity, setCustomCity] = useState(() => {
    const rawLoc = ad.location?.split('(')[0]?.trim() || '';
    return TOP_SPANISH_CITIES.includes(rawLoc) ? '' : rawLoc;
  });
  const [notes, setNotes] = useState(ad.notes || '');
  const [status, setStatus] = useState(ad.status);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Gallery state
  const rawImages = ad.images && ad.images.length > 0 ? ad.images : (ad.imageUrl ? [ad.imageUrl] : []);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [useCropped, setUseCropped] = useState(true);

  const handleCopy = () => {
    navigator.clipboard.writeText(ad.phone);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    const finalCity = selectedCity === '__custom__' ? customCity.trim() : selectedCity;
    await onUpdateAd(ad.id, {
      notes,
      status,
      detectedName: detectedName.trim(),
      location: finalCity || 'Madrid',
    });
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDelete = async () => {
    if (confirm('¿Seguro que deseas eliminar este anuncio de tu directorio?')) {
      await onDeleteAd(ad.id);
      onClose();
    }
  };

  // Get current active photo URL
  const currentRawUrl = rawImages[activePhotoIndex] || ad.imageUrl || '';
  const currentDisplayUrl = useCropped && currentRawUrl
    ? (currentRawUrl.startsWith('/api/image/crop') ? currentRawUrl : `/api/image/crop?url=${encodeURIComponent(currentRawUrl)}&percent=10`)
    : currentRawUrl.replace('/api/image/crop?url=', '').split('&')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-3xl w-full overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-2xl my-8">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Ficha del Anuncio
            </span>
            <span className="text-xs text-neutral-400">·</span>
            <span className="text-xs text-neutral-500">{ad.sourceSite}</span>
            {ad.isFullAd && (
              <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                Anuncio Completo HD
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Main Photo Gallery Area */}
          <div className="space-y-3">
            <div className="relative aspect-16/10 rounded-xl overflow-hidden bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
              {currentDisplayUrl ? (
                <img
                  key={currentDisplayUrl}
                  src={currentDisplayUrl}
                  alt={ad.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400">
                  <User className="w-16 h-16 stroke-[1.5] opacity-40 mb-2" />
                  <span className="text-xs">No se encontró foto para este anuncio</span>
                </div>
              )}

              {/* Prev / Next photo buttons if multiple images */}
              {rawImages.length > 1 && (
                <>
                  <button
                    onClick={() => setActivePhotoIndex(prev => (prev === 0 ? rawImages.length - 1 : prev - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors"
                    title="Foto anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActivePhotoIndex(prev => (prev === rawImages.length - 1 ? 0 : prev + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors"
                    title="Siguiente foto"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Top controls: Crop toggle & Counter */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  onClick={() => setUseCropped(prev => !prev)}
                  className={`text-xs px-2.5 py-1 rounded-md backdrop-blur-md font-medium flex items-center gap-1.5 transition-colors ${
                    useCropped
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-black/60 text-neutral-200 hover:bg-black/80'
                  }`}
                  title="Activar/desactivar recorte de la franja inferior donde aparece el logo"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>{useCropped ? 'Recortada (Sin logo web)' : 'Original con logo'}</span>
                </button>

                {rawImages.length > 1 && (
                  <div className="bg-black/70 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded-md font-mono">
                    {activePhotoIndex + 1} / {rawImages.length}
                  </div>
                )}
              </div>

              {ad.location && (
                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-neutral-300" />
                  <span>{ad.location}</span>
                </div>
              )}
            </div>

            {/* Thumbnail Strip if multiple photos */}
            {rawImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {rawImages.map((img, idx) => {
                  const thumb = `/api/image/crop?url=${encodeURIComponent(img)}&percent=10`;
                  return (
                    <button
                      key={img + idx}
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        activePhotoIndex === idx
                          ? 'border-emerald-500 scale-102 ring-2 ring-emerald-500/30'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={thumb}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Editable Identity Highlights: Name & City (for WhatsApp templates) */}
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                Variables de Personalización WhatsApp (Nombre y Ciudad)
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Puedes cambiar el nombre o ciudad si hubo algún error
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Editable Name */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                  Nombre de la chica &#123;nombre&#125;
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={detectedName}
                    onChange={e => setDetectedName(e.target.value)}
                    placeholder="Ej: Laura, Valeria..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Editable City with Selectable Dropdown */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                  Ciudad &#123;ciudad&#125;
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  <select
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    className="w-full pl-9 pr-7 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden appearance-none"
                  >
                    <optgroup label="Ciudades de España">
                      {TOP_SPANISH_CITIES.map((c: string) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Personalizado">
                      <option value="__custom__">Escribir otra ciudad / localidad...</option>
                    </optgroup>
                  </select>
                </div>

                {selectedCity === '__custom__' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      value={customCity}
                      onChange={e => setCustomCity(e.target.value)}
                      placeholder="Escribe el nombre de la localidad..."
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Title & Metadata */}
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white leading-snug">
              {ad.title}
            </h3>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Registrado el {new Date(ad.scrapedAt).toLocaleDateString()}
              </span>
              {ad.sourceUrl && (
                <>
                  <span aria-hidden="true">·</span>
                  <a
                    href={ad.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-emerald-600 flex items-center gap-1 transition-colors"
                  >
                    <span>Ver anuncio original</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Phone & Contact Highlight Box */}
          <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-4 sm:p-5 border border-neutral-200 dark:border-neutral-700 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold text-neutral-500 block mb-0.5">
                  NÚMERO DE TELÉFONO O WHATSAPP
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xl font-bold tracking-tight text-neutral-900 dark:text-white tabular-nums">
                    {ad.phone}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-xs flex items-center gap-1"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {ad.whatsappUrl && (
                  <a
                    href={ad.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4 fill-white/20" />
                    <span>Abrir WhatsApp</span>
                  </a>
                )}

                {ad.phone && ad.phone !== 'No especificado' && (
                  <a
                    href={`tel:${ad.phone.replace(/\s+/g, '')}`}
                    className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Llamar</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Full Ad Description if available */}
          {ad.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Descripción completa del anuncio</span>
              </div>
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                {ad.description}
              </div>
            </div>
          )}

          {/* Status & Custom Notes */}
          <div className="space-y-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Estado de contacto
              </label>
              <div className="flex flex-wrap gap-2">
                {(['nuevo', 'contactado', 'favorito', 'descartado'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all ${
                      status === st
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white font-bold shadow-xs'
                        : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Notas y comentarios privados
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Escribe notas sobre disponibilidad, precios, respuesta por WhatsApp..."
                className="w-full p-3 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 flex items-center justify-between">
          <button
            onClick={handleDelete}
            className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar del directorio</span>
          </button>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" />
                ¡Guardado!
              </span>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700 rounded-lg text-xs font-medium transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
