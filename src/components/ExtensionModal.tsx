import React, { useState } from 'react';
import {
  X,
  Download,
  Puzzle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ExternalLink,
  Laptop,
  Play,
  RotateCw,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  FileCode,
} from 'lucide-react';

interface ExtensionModalProps {
  onClose: () => void;
}

export const ExtensionModal: React.FC<ExtensionModalProps> = ({ onClose }) => {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSize, setDownloadSize] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch('/api/extension/download');
      if (!res.ok) throw new Error(`Error en servidor (${res.status})`);
      const blob = await res.blob();
      if (blob.size === 0) throw new Error('El archivo descargado tiene 0 bytes');

      const sizeKb = Math.round(blob.size / 1024);
      setDownloadSize(`${sizeKb} KB`);

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'autopubli24-whatsapp-extension.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
      setDownloadStarted(true);
      setTimeout(() => setDownloadStarted(false), 5000);
    } catch (err: any) {
      console.error(err);
      setDownloadError(err.message);
      // Fallback: direct window download
      window.open('/api/extension/download', '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-2xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-50/60 dark:bg-neutral-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Puzzle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Extensión de Chrome autopubli24
                </h3>
                <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Desatendido 100%
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Automatiza el envío dentro de WhatsApp Web sin tener que pulsar Enter a mano
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-neutral-800 dark:text-neutral-200">
          {/* Main Download Callout */}
          <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-950 dark:text-emerald-200">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Paquete Listo para Instalar</span>
                <span className="text-[10px] font-mono font-normal bg-emerald-200/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-900 dark:text-emerald-300">
                  {downloadSize || '~940 KB'}
                </span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                Descarga el archivo <strong>autopubli24-whatsapp-extension.zip</strong> completo con el manifest, scripts y plantillas listos para Chrome, Edge o Brave.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shrink-0"
              >
                {isDownloading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-white" />
                    <span>Preparando...</span>
                  </>
                ) : downloadStarted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>¡Descargando ({downloadSize})!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Descargar Extensión (.zip)</span>
                  </>
                )}
              </button>

              <a
                href="/api/extension/download"
                download="autopubli24-whatsapp-extension.zip"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-center text-xs font-semibold rounded-xl border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 transition-colors"
                title="Enlace directo en nueva pestaña por si el navegador bloquea la descarga en esta ventana"
              >
                Enlace Directo
              </a>
            </div>
          </div>

          {/* Server Connection URL Info */}
          <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-950 dark:text-purple-200">
                Dirección URL de este panel para la Extensión:
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin);
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 2500);
                }}
                className="px-2.5 py-1 text-[11px] font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-xs transition-colors"
              >
                {copiedUrl ? '✓ ¡URL Copiada!' : 'Copiar URL'}
              </button>
            </div>
            <code className="block p-2 rounded bg-white dark:bg-neutral-800 border border-purple-200 dark:border-purple-800 text-[11px] font-mono text-purple-800 dark:text-purple-300 break-all">
              {window.location.origin}
            </code>
            <p className="text-[10px] text-purple-700 dark:text-purple-400">
              Al abrir la extensión en Chrome, introduce esta URL si no está configurada o pulsa en <strong>"🔍 Detectar URL"</strong>.
            </p>
          </div>

          {/* Troubleshooting: Why does Chrome say the folder is empty? */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>¿Chrome te dice que "la extensión está vacía" o "falta el manifiesto"?</span>
            </div>
            <div className="space-y-1.5 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
              <p>
                El archivo <strong>no está vacío</strong> (pesa ~940 KB y contiene 10 archivos). En Windows o Mac este aviso ocurre por <strong>uno de estos dos descuidos</strong>:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1 font-medium">
                <li>
                  <strong>No intentes cargar el archivo .zip directamente</strong>: Chrome solo acepta carpetas normales ya extraídas. Debes hacer <em>clic derecho en el archivo .zip descargado ➔ <strong>"Extraer todo..."</strong></em>.
                </li>
                <li>
                  <strong>Selecciona la carpeta donde está <code>manifest.json</code></strong>: Al extraer en Windows, a veces se crea una carpeta doble. Al pulsar en Chrome <em>"Cargar descomprimida"</em>, entra y selecciona la carpeta que contiene directamente los archivos <code>manifest.json</code>, <code>content.js</code> y <code>popup.html</code>.
                </li>
              </ol>
            </div>
          </div>

          {/* Installation Steps */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-emerald-600" />
              <span>Cómo instalarla en tu navegador en 30 segundos:</span>
            </h4>

            <div className="grid grid-cols-1 gap-2.5 text-xs">
              {/* Step 1 */}
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-neutral-900 dark:text-white block font-semibold">
                    Descomprime el archivo descargado
                  </strong>
                  <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                    Extrae el archivo <code>autopubli24-whatsapp-extension.zip</code> en una carpeta de tu ordenador (por ejemplo, en Documentos o Escritorio).
                  </span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-neutral-900 dark:text-white block font-semibold">
                    Abre la página de Extensiones en Chrome
                  </strong>
                  <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                    En una nueva pestaña de Chrome, escribe en la barra superior:{' '}
                    <code className="bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded font-mono text-[11px]">
                      chrome://extensions/
                    </code>{' '}
                    y pulsa Enter.
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="text-neutral-900 dark:text-white block font-semibold">
                    Activa el "Modo de desarrollador" y Carga la carpeta
                  </strong>
                  <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                    En la esquina superior derecha, activa el interruptor <strong>"Modo de desarrollador"</strong>. Luego haz clic en el botón <strong>"Cargar descomprimida"</strong> (arriba a la izquierda) y selecciona la carpeta que descomprimiste.
                  </span>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <strong className="text-neutral-900 dark:text-white block font-semibold">
                    ¡Listo para enviar desatendido!
                  </strong>
                  <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                    Abre WhatsApp Web con tu número virtual. Haz clic en el icono de <strong>autopubli24</strong> en tus extensiones, pulsa <strong>"Sincronizar"</strong> y luego <strong>"Iniciar Automático"</strong>. La extensión enviará los mensajes poco a poco sin tocar nada.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Cero Clics
              </span>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Abre el chat, escribe la plantilla con nombre y ciudad, y pulsa Enter automáticamente.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Anti-Bloqueo
              </span>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Pausas humanas de 90s a 120s con variación aleatoria para simular ritmo real.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5" />
                Auto-Sincronizado
              </span>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Marca cada contacto como "contactado" en tu directorio conforme se envía.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex items-center justify-between shrink-0">
          <span className="text-xs text-neutral-500">
            Compatible con Google Chrome, Edge y Brave
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar .ZIP</span>
            </button>
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
