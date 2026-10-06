import React, { useState } from 'react';
import { X, User, MapPin, Save, Check } from 'lucide-react';
import type { AdItem } from '../types.ts';
import { TOP_SPANISH_CITIES } from '../constants/cities.ts';

interface QuickEditAdModalProps {
  ad: AdItem;
  onClose: () => void;
  onSave: (id: string, updates: Partial<AdItem>) => Promise<void>;
}

export const QuickEditAdModal: React.FC<QuickEditAdModalProps> = ({
  ad,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(ad.detectedName || '');
  const [location, setLocation] = useState(ad.location || '');
  const [isCustomCity, setIsCustomCity] = useState(
    Boolean(ad.location && !TOP_SPANISH_CITIES.includes(ad.location))
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleCitySelect = (val: string) => {
    if (val === '__custom__') {
      setIsCustomCity(true);
      setLocation('');
    } else {
      setIsCustomCity(false);
      setLocation(val);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(ad.id, {
        detectedName: name.trim() || undefined,
        location: location.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Error saving ad quick edits:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Editar Nombre y Ciudad
              </h2>
              <p className="text-xs text-neutral-500">
                Personaliza los datos para las plantillas de WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              Nombre de contacto / anunciante
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Sofia, Carmen, Laura..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              autoFocus
            />
            <span className="text-[11px] text-neutral-400 mt-1 block">
              Sustituye la variable &#123;nombre&#125; en los mensajes automáticos.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              Ciudad o Localidad
            </label>
            <div className="space-y-2">
              <select
                value={isCustomCity ? '__custom__' : location}
                onChange={e => handleCitySelect(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="">-- Seleccionar Ciudad --</option>
                <optgroup label="Ciudades de España">
                  {TOP_SPANISH_CITIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
                <option value="__custom__">Escribir otra ciudad / localidad...</option>
              </select>

              {isCustomCity && (
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Escribe la ciudad o zona..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden animate-in fade-in"
                />
              )}
            </div>
            <span className="text-[11px] text-neutral-400 mt-1 block">
              Sustituye la variable &#123;ciudad&#125; en el mensaje de WhatsApp.
            </span>
          </div>

          {/* Ad summary */}
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs space-y-1">
            <div className="text-neutral-500">Teléfono: <span className="font-mono font-bold text-neutral-900 dark:text-white">{ad.phone}</span></div>
            <div className="text-neutral-500 truncate">Título: <span className="text-neutral-700 dark:text-neutral-300">{ad.title}</span></div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {isSaving ? (
                <>Guardando...</>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
