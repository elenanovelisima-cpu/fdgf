import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  FileCode,
  Zap,
} from 'lucide-react';

interface SupabaseModalProps {
  onClose: () => void;
  totalLocalAds: number;
  onSyncComplete?: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  onClose,
  totalLocalAds,
  onSyncComplete,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [status, setStatus] = useState<{
    connected: boolean;
    tableExists: boolean;
    count: number;
    url: string;
    error?: string;
  } | null>(null);
  const [schemaSql, setSchemaSql] = useState<string>('');
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<{
    total: number;
    uploaded: number;
    message?: string;
  } | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/supabase/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        if (data.schemaSql) {
          setSchemaSql(data.schemaSql);
        }
      }
    } catch (err: any) {
      setStatus({
        connected: false,
        tableExists: false,
        count: 0,
        url: 'https://ypzuigwxnxzuzufkkemb.supabase.co',
        error: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCopySql = () => {
    if (!schemaSql) return;
    navigator.clipboard.writeText(schemaSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/supabase/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncResult({
          total: data.total,
          uploaded: data.uploaded,
          message: `¡${data.uploaded} de ${data.total} anuncios sincronizados con éxito en Supabase!`,
        });
        if (data.status) {
          setStatus(data.status);
        }
        if (onSyncComplete) onSyncComplete();
      } else {
        setSyncResult({
          total: totalLocalAds,
          uploaded: 0,
          message: data.error || 'Error al sincronizar con Supabase',
        });
      }
    } catch (err: any) {
      setSyncResult({
        total: totalLocalAds,
        uploaded: 0,
        message: err.message || 'Error de conexión',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-3xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-50/50 dark:bg-neutral-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Conexión Supabase PostgreSQL (Cloud Database)
                </h3>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                  {status?.tableExists ? '🟢 Activo y Sincronizado' : '⚡ Conectado'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Guarda y sincroniza todo el directorio en la nube en tiempo real para no perder ningún dato.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Status Overview Card */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-emerald-600" />
                Estado del Proyecto en Supabase
              </span>
              <button
                type="button"
                onClick={fetchStatus}
                disabled={loading}
                className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 self-start sm:self-auto"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Actualizar estado</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-0.5">
                <span className="text-[10px] text-neutral-400 uppercase font-bold block">Proyecto Supabase</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white text-xs truncate block" title={status?.url}>
                  ypzuigwxnxzuzufkkemb
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-0.5">
                <span className="text-[10px] text-neutral-400 uppercase font-bold block">Tabla 'directory'</span>
                {status?.tableExists ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Tabla Activa en BD
                  </span>
                ) : (
                  <span className="text-amber-600 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Pendiente de crear
                  </span>
                )}
              </div>

              <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-0.5">
                <span className="text-[10px] text-neutral-400 uppercase font-bold block">Anuncios en la Nube</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">
                  {status?.count ?? 0} / {totalLocalAds} sincronizados
                </span>
              </div>
            </div>

            {/* Sync Result notification */}
            {syncResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  syncResult.uploaded > 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                }`}
              >
                {syncResult.uploaded > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>{syncResult.message}</span>
              </div>
            )}

            {/* Sync Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={syncing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
              >
                <Zap className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Sincronizando...' : 'Sincronizar Directorio a Supabase Ahora'}</span>
              </button>

              <a
                href="https://supabase.com/dashboard/project/ypzuigwxnxzuzufkkemb"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Dashboard Supabase</span>
              </a>
            </div>
          </div>

          {/* Quick Setup Instructions if table does not exist */}
          {!status?.tableExists && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200">
                  Paso Único: Crear la tabla 'directory' en Supabase en 10 segundos
                </h4>
              </div>
              <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                Supabase ya está conectado, pero en su base de datos PostgreSQL aún no existe la tabla <code>directory</code>. Para dejarla lista:
              </p>
              <ol className="text-xs text-amber-900 dark:text-amber-300 space-y-1.5 list-decimal list-inside font-medium">
                <li>
                  Abre tu proyecto en{' '}
                  <a
                    href="https://supabase.com/dashboard/project/ypzuigwxnxzuzufkkemb/sql"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-bold text-amber-950 dark:text-amber-100 inline-flex items-center gap-0.5"
                  >
                    Supabase SQL Editor <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </li>
                <li>
                  Haz clic en el botón de abajo <strong>"Copiar Script SQL"</strong> y pégalo en el editor.
                </li>
                <li>
                  Pulsa el botón <strong>Run</strong> en Supabase. ¡Listo! Vuelve aquí y pulsa "Sincronizar Directorio".
                </li>
              </ol>

              <button
                type="button"
                onClick={handleCopySql}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
              >
                {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? '¡Script SQL Copiado al Portapapeles!' : 'Copiar Script SQL para Supabase'}</span>
              </button>
            </div>
          )}

          {/* SQL Script Viewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-emerald-600" />
                Script SQL de Creación y Seguridad (RLS)
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? '¡Copiado!' : 'Copiar SQL'}</span>
              </button>
            </div>

            <div className="relative">
              <pre className="p-3.5 rounded-xl bg-neutral-950 text-neutral-300 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-56 border border-neutral-800">
                {schemaSql}
              </pre>
            </div>
          </div>

          {/* Data Safety Note */}
          <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-950 dark:text-emerald-200 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[11px] leading-relaxed">
              <p className="font-bold">Doble Seguridad (Nube + Local):</p>
              <p className="text-emerald-800 dark:text-emerald-300">
                Todos los anuncios que extraigas con el Scraper o añadas a mano se guardan tanto en tu PostgreSQL de Supabase como en la copia local. Aunque se reinicie el servidor o se borre la caché, tus anuncios y números contactados quedan preservados en la nube.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex items-center justify-between shrink-0">
          <div className="text-xs text-neutral-500">
            Conectado a <code>ypzuigwxnxzuzufkkemb.supabase.co</code>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
