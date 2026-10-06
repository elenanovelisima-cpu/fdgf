import React, { useState, useEffect } from 'react';
import {
  Globe,
  Radio,
  ExternalLink,
  Plus,
  Trash2,
  RotateCcw,
  Search,
  Award,
  TrendingUp,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import type { PortalItem } from '../types.ts';

interface PortalsViewProps {
  onSelectPortalForScraping: (portalUrl: string) => void;
}

export const PortalsView: React.FC<PortalsViewProps> = ({
  onSelectPortalForScraping,
}) => {
  const [portals, setPortals] = useState<PortalItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Portal form
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchPortals = async () => {
    try {
      const res = await fetch('/api/portals');
      const data = await res.json();
      if (data.success && Array.isArray(data.portals)) {
        setPortals(data.portals);
      }
    } catch (err) {
      console.error('Failed to load portals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortals();
  }, []);

  const handleAddPortal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) return;

    setIsSaving(true);
    try {
      let domain = newUrl.replace(/https?:\/\//, '').split('/')[0];
      const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

      const res = await fetch('/api/portals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          url: newUrl.trim(),
          domain,
          logoUrl,
          description: newDescription.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setNewName('');
        setNewUrl('');
        setNewDescription('');
        fetchPortals();
      }
    } catch (err) {
      console.error('Error adding portal:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePortal = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este portal de la lista?')) return;
    try {
      const res = await fetch(`/api/portals/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPortals(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error('Error deleting portal:', err);
    }
  };

  const handleResetPortals = async () => {
    if (!confirm('¿Restablecer la lista oficial con los portales top posicionados en Google España?')) return;
    try {
      const res = await fetch('/api/portals/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchPortals();
      }
    } catch (err) {
      console.error('Error resetting portals:', err);
    }
  };

  const filteredPortals = portals.filter(p => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.domain.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-900/40 via-neutral-900 to-neutral-900 border border-sky-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold mb-2">
              <Award className="w-3.5 h-3.5" />
              Directorio de Fuentes Clasificadas Top SEO
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Portales con Mayor Tráfico Orgánico en Google
            </h1>
            <p className="text-sm text-neutral-300">
              Selecciona cualquier portal para precargar su URL en el extractor y recopilar anuncios
              con números de teléfono únicos para tu negocio.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 text-white transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Añadir Portal
            </button>
            <button
              onClick={handleResetPortals}
              title="Restablecer fuentes iniciales"
              className="p-2 text-xs font-semibold rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, dominio o palabra clave..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
          />
        </div>
        <span className="text-xs text-neutral-500">
          {filteredPortals.length} de {portals.length} fuentes
        </span>
      </div>

      {/* Portals Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-sm text-neutral-400">Cargando portales...</div>
      ) : filteredPortals.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center">
          <Globe className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            No se encontraron portales
          </p>
          <button
            onClick={handleResetPortals}
            className="mt-3 text-xs text-sky-600 hover:underline font-medium"
          >
            Restablecer la lista por defecto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPortals.map(portal => (
            <div
              key={portal.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs hover:border-sky-500/50 dark:hover:border-sky-500/40 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Card Top */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden p-1.5 shrink-0">
                      {portal.logoUrl ? (
                        <img
                          src={portal.logoUrl}
                          alt={portal.name}
                          className="w-full h-full object-contain"
                          onError={e => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Globe className="w-6 h-6 text-neutral-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                          {portal.name}
                        </h3>
                        {portal.seoRank && (
                          <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                            #{portal.seoRank} SEO
                          </span>
                        )}
                      </div>
                      <a
                        href={portal.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        {portal.domain}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeletePortal(portal.id)}
                    title="Eliminar de la lista"
                    className="p-1.5 text-neutral-400 hover:text-rose-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Description */}
                {portal.description && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 mb-3">
                    {portal.description}
                  </p>
                )}

                {/* Metrics */}
                {portal.monthlyVisitsEstimated && (
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 mb-4">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{portal.monthlyVisitsEstimated}</span>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => onSelectPortalForScraping(portal.url)}
                  className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Radio className="w-3.5 h-3.5 text-sky-600" />
                  Rastrear con Scraper
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add New Portal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Añadir Portal Clasificado
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPortal} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Nombre del portal
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ej: Pasión Contactos"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  URL principal
                </label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://pasioncontactos.com/"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Notas / Descripción (opcional)
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Portal líder en zona norte..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Portal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
