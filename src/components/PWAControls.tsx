import React, { useEffect, useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        aria-label="Install 0xDEV App"
        className={`inline-flex items-center gap-1.5 rounded-xl border border-[#1A1464]/20 dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] font-semibold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464] dark:hover:border-white/30 hover:bg-[#1A1464] dark:hover:bg-[#2E368F] hover:text-white whitespace-nowrap shrink-0 print:hidden ${
          compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-xs sm:text-sm'
        }`}
      >
        <Download className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="Install 0xDEV on iOS"
          className={`inline-flex items-center gap-1.5 rounded-xl border border-[#1A1464]/20 dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] font-semibold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464] dark:hover:border-white/30 hover:bg-white dark:hover:bg-[#1C234B] whitespace-nowrap shrink-0 print:hidden ${
            compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-xs sm:text-sm'
          }`}
        >
          <Smartphone className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1464]/60 dark:bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowIOSGuide(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 id="ios-install-title" className="font-display text-lg font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                  Install 0xDEV on iOS
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install instructions"
                  className="rounded-lg p-1 text-[#6B7188] dark:text-[#8E97B8] hover:text-[#1A1464] dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-[#4A4F63] dark:text-[#C2C9E0] list-decimal list-inside">
                <li>
                  Tap the <strong className="text-[#1A1464] dark:text-[#F4F6FC]">Share</strong> icon in Safari.
                </li>
                <li>
                  Scroll down and tap <strong className="text-[#1A1464] dark:text-[#F4F6FC]">Add to Home Screen</strong>.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#1A1464] dark:bg-[#2E368F] py-2.5 text-xs font-bold text-white hover:bg-[#120D4A] dark:hover:bg-[#3B44A8]"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-[#EE1119]/30 bg-[#1A1464] dark:bg-[#141A38] px-3.5 py-2 text-xs font-semibold text-white shadow-lg whitespace-nowrap print:hidden"
    >
      <WifiOff className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
      <span>Offline Mode · Cached pages available</span>
    </div>
  );
};
