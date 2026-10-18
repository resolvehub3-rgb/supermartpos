import React, { useState } from 'react';
import { Download, Monitor, CheckCircle, X, ExternalLink, Laptop } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'hero';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running inside standalone desktop app window, render quiet indicator or null
  if (isInstalled) {
    if (variant === 'hero') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>Running as Desktop App</span>
        </div>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  const buttonStyle =
    variant === 'hero'
      ? 'px-5 py-3 border border-neutral-300 hover:border-[#E87512] hover:bg-[#FDF3E7]/40 text-neutral-800 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 shadow-xs'
      : 'px-3 py-1.5 border border-neutral-300 hover:border-[#E87512] hover:text-[#E87512] text-neutral-700 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Install Afrimart POS as a standalone desktop application"
        className={`${buttonStyle} ${className}`}
      >
        <Laptop className="w-3.5 h-3.5 text-[#E87512]" />
        <span>Install on Desktop</span>
      </button>

      {/* Desktop Installation Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-neutral-200">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FDF3E7] flex items-center justify-center text-[#E87512]">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900">Install Desktop Application</h3>
                  <p className="text-[11px] text-neutral-500">Fast, offline-ready desktop supermarket POS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="text-neutral-400 hover:text-neutral-700 text-xs font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-neutral-600">
              {isInstallable ? (
                <div className="text-center space-y-3">
                  <p>Your browser is ready to install the standalone desktop application.</p>
                  <button
                    type="button"
                    onClick={async () => {
                      await install();
                      setShowGuideModal(false);
                    }}
                    className="w-full py-2.5 bg-[#E87512] hover:bg-[#C96009] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Launch Desktop Installation</span>
                  </button>
                </div>
              ) : isIOS ? (
                <div className="space-y-2">
                  <p className="font-semibold text-neutral-900">Install on iPhone / iPad:</p>
                  <ol className="list-decimal pl-5 space-y-1.5">
                    <li>Tap the <strong>Share</strong> button in the Safari bottom toolbar.</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                    <li>Tap <strong>Add</strong> in the top-right corner.</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1.5">
                    <p className="font-semibold text-neutral-900">Google Chrome / Microsoft Edge Desktop:</p>
                    <p className="leading-relaxed">
                      Click the <strong>Install App icon (computer with down arrow)</strong> on the right side of the browser URL address bar, then click <strong>Install</strong>.
                    </p>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1.5">
                    <p className="font-semibold text-neutral-900">Safari on macOS (Sonoma+):</p>
                    <p className="leading-relaxed">
                      Click <strong>File</strong> in the top menu bar → <strong>Add to Dock...</strong> → click <strong>Add</strong> to launch as a standalone desktop app.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-1.5 border border-neutral-300 text-neutral-700 text-xs font-semibold rounded hover:bg-neutral-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
