import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCw,
  Globe,
  MapPin,
  Target,
  Sliders,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileCode,
  Sparkles,
  Layers,
  Info,
} from 'lucide-react';
import type { ScrapeJobResult, ScrapeProgressLog } from '../types.ts';
import { TOP_SPANISH_CITIES } from '../constants/cities.ts';

interface ScraperPanelProps {
  initialUrl?: string;
  onScrapeComplete: (result: ScrapeJobResult) => void;
  onNavigateToDirectory: () => void;
  onNavigateToDuplicates: () => void;
}

const POPULAR_PORTALS = [
  { name: 'Mundosexanuncio', url: 'https://www.mundosexanuncio.com/' },
  { name: 'NuevoLoquo', url: 'https://www.nuevoloquo.es/' },
  { name: 'Skokka España', url: 'https://es.skokka.com/' },
  { name: 'Erosguía', url: 'https://www.erosguia.com/' },
  { name: 'Slumi', url: 'https://www.slumi.com/' },
  { name: 'Mileroticos', url: 'https://mileroticos.com/' },
];

export const ScraperPanel: React.FC<ScraperPanelProps> = ({
  initialUrl = '',
  onScrapeComplete,
  onNavigateToDirectory,
  onNavigateToDuplicates,
}) => {
  const [url, setUrl] = useState(initialUrl || 'https://www.mundosexanuncio.com/');
  const [cityFilter, setCityFilter] = useState('');
  const [targetCount, setTargetCount] = useState(50);
  const [maxPages, setMaxPages] = useState(10);
  const [followDetailLinks, setFollowDetailLinks] = useState(false);
  const [fullAdMode, setFullAdMode] = useState(false);
  const [cropWatermark, setCropWatermark] = useState(true);
  const [rawHtml, setRawHtml] = useState('');
  const [showRawHtmlInput, setShowRawHtmlInput] = useState(false);

  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<ScrapeProgressLog[]>([]);
  const [lastResult, setLastResult] = useState<ScrapeJobResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
    }
  }, [initialUrl]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleStartScrape = async () => {
    if (!url.trim() && !rawHtml.trim()) return;

    setIsRunning(true);
    setErrorMsg(null);
    setLastResult(null);
    setLogs([
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Iniciando tarea de extracción sobre ${url || 'HTML manual'}...`,
      },
    ]);

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          cityFilter: cityFilter.trim() || undefined,
          targetAdCount: targetCount,
          maxPages,
          followDetailLinks,
          fullAdMode,
          cropWatermark,
          rawHtml: rawHtml.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Fallo durante la extracción');
      }

      setLastResult(data);
      if (data.logs && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }

      onScrapeComplete(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado');
      setLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `Error: ${err.message || 'Fallo de red'}`,
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900/40 via-neutral-900 to-neutral-900 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Extractor Automático Multi-Portal
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Rastreo inteligente con deduplicación en tiempo real
          </h1>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Introduce la URL del portal o categoría a rastrear. El motor extraerá fotos, títulos,
            teléfonos normalizados y filtrará al instante cualquier número que ya tengas guardado.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              Configuración de la Extracción
            </h2>

            {/* Target URL */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                URL Objetivo (Portal, categoría o búsqueda)
              </label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://www.mundosexanuncio.com/madrid/..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />

              {/* Quick portal selector buttons */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-neutral-400 mr-1">Rápidos:</span>
                {POPULAR_PORTALS.map(portal => (
                  <button
                    key={portal.name}
                    type="button"
                    onClick={() => setUrl(portal.url)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                      url === portal.url
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    {portal.name}
                  </button>
                ))}
              </div>
            </div>

            {/* City Filter & Goal Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Filtrar por Ciudad / Localidad
                </label>
                <select
                  value={cityFilter}
                  onChange={e => setCityFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="">Todas las ciudades (sin filtro)</option>
                  <optgroup label="Ciudades de España">
                    {TOP_SPANISH_CITIES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-600" />
                  Objetivo de Anuncios a Extraer
                </label>
                <select
                  value={targetCount}
                  onChange={e => setTargetCount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value={20}>20 anuncios nuevos</option>
                  <option value={50}>50 anuncios nuevos</option>
                  <option value={100}>100 anuncios nuevos</option>
                  <option value={200}>200 anuncios nuevos</option>
                </select>
              </div>
            </div>

            {/* Extra Options */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
                    Modo Ficha Completa
                  </span>
                  <span className="text-[11px] text-neutral-400 block">
                    Navega dentro de cada anuncio para obtener fotos completas y texto íntegro
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={fullAdMode}
                  onChange={e => setFullAdMode(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
                    Recorte inteligente de marcas de agua
                  </span>
                  <span className="text-[11px] text-neutral-400 block">
                    Optimiza la imagen del anuncio retirando logos molestos de los portales
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={cropWatermark}
                  onChange={e => setCropWatermark(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300"
                />
              </div>

              {/* Raw HTML Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowRawHtmlInput(!showRawHtmlInput)}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  {showRawHtmlInput ? 'Ocultar entrada de HTML directo' : '¿El portal bloquea bots? Pegar código HTML directo'}
                </button>

                {showRawHtmlInput && (
                  <div className="mt-2 animate-in fade-in">
                    <textarea
                      value={rawHtml}
                      onChange={e => setRawHtml(e.target.value)}
                      placeholder="Pega aquí el código fuente HTML de la página para analizarla sin bloqueos..."
                      rows={4}
                      className="w-full font-mono text-xs px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-3">
              <button
                type="button"
                onClick={handleStartScrape}
                disabled={isRunning}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md transition-all ${
                  isRunning
                    ? 'bg-neutral-700 cursor-not-allowed opacity-80'
                    : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg active:scale-[0.99]'
                }`}
              >
                {isRunning ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Extrayendo y deduplicando en vivo...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    Iniciar Extracción ({targetCount} anuncios)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <p className="text-xs text-sky-800 dark:text-sky-300 leading-relaxed">
              <strong>Protección Antiduplicados Activa:</strong> Cualquier teléfono detectado que ya
              exista en tu directorio será descartado inmediatamente y anotado en el historial de
              duplicados prevenidos para no saturar tus campañas de WhatsApp.
            </p>
          </div>
        </div>

        {/* Console / Output Column (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Result Card if Finished */}
          {lastResult && (
            <div className="bg-white dark:bg-neutral-900 border border-emerald-500/40 dark:border-emerald-500/30 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Extracción Finalizada
                </span>
                <span className="text-[11px] font-mono text-neutral-400">
                  {(lastResult.durationMs / 1000).toFixed(1)}s
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                  <span className="text-xs text-emerald-800 dark:text-emerald-300 block">Nuevos Únicos</span>
                  <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                    +{lastResult.newUniqueAdded}
                  </span>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-200 dark:border-amber-800/60">
                  <span className="text-xs text-amber-800 dark:text-amber-300 block">Repetidos Omitidos</span>
                  <span className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-300">
                    {lastResult.duplicatesSkipped}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onNavigateToDirectory}
                  className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                >
                  Ver en Directorio
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                {lastResult.duplicatesSkipped > 0 && (
                  <button
                    type="button"
                    onClick={onNavigateToDuplicates}
                    className="py-2 px-3 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Ver Filtro
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Live Terminal / Console */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg flex flex-col h-[420px]">
            <div className="px-4 py-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-semibold text-neutral-200">Consola de Ejecución</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500">
                {isRunning ? '● En ejecución' : '○ En espera'}
              </span>
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-mono text-xs space-y-2 text-neutral-300">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-neutral-600 text-center">
                  <p>Sin actividad reciente.<br />Pulsa &quot;Iniciar Extracción&quot; para comenzar el rastreo.</p>
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-neutral-500 text-[10px] shrink-0 select-none">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-1 rounded ${
                        log.level === 'success'
                          ? 'bg-emerald-950 text-emerald-400'
                          : log.level === 'warn'
                          ? 'bg-amber-950 text-amber-400'
                          : log.level === 'error'
                          ? 'bg-rose-950 text-rose-400'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {log.level.toUpperCase()}
                    </span>
                    <span
                      className={`break-all ${
                        log.level === 'error'
                          ? 'text-rose-300'
                          : log.level === 'warn'
                          ? 'text-amber-200'
                          : log.level === 'success'
                          ? 'text-emerald-300'
                          : 'text-neutral-300'
                      }`}
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
