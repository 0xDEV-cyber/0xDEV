import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Moon, Palette, Shuffle, Sun, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { ThemePolarity } from '../data/themes';
import { EASE_OUT_EXPO } from './MotionPrimitives';

type FilterMode = 'all' | ThemePolarity;

interface ThemePickerProps {
  variant?: 'compact' | 'drawer';
  onOpenChange?: (open: boolean) => void;
}

export const ThemePicker: React.FC<ThemePickerProps> = ({
  variant = 'compact',
  onOpenChange,
}) => {
  const { theme, themeDefinition, themes, isDark, setTheme, toggleTheme, pickRandomTheme } =
    useTheme();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('all');

  const setModalOpen = (next: boolean) => {
    setOpen(next);
    if (onOpenChange) onOpenChange(next);
  };

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const lightCount = useMemo(
    () => themes.filter((t) => t.mode === 'light').length,
    [themes]
  );
  const darkCount = useMemo(
    () => themes.filter((t) => t.mode === 'dark').length,
    [themes]
  );

  const visibleThemes = useMemo(() => {
    if (filter === 'all') return themes;
    return themes.filter((t) => t.mode === filter);
  }, [themes, filter]);

  return (
    <>
      {variant === 'drawer' ? (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] px-4 py-3 text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464]/40 dark:hover:border-white/30"
        >
          <span className="flex items-center gap-2.5">
            <Palette className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
            <span>Theme</span>
            <span className="text-xs font-medium text-[#6B7188] dark:text-[#8E97B8]">
              ({themeDefinition.name})
            </span>
          </span>
          <span
            data-preview-theme={themeDefinition.id}
            aria-hidden="true"
            className="flex items-center gap-1"
          >
            <span className="h-3.5 w-3.5 rounded-full border border-[#E5E7F0] dark:border-[#242C54] bg-[var(--p-bg)]" />
            <span className="h-3.5 w-3.5 rounded-full bg-[var(--p-heading)]" />
            <span className="h-3.5 w-3.5 rounded-full bg-[var(--p-accent)]" />
          </span>
        </button>
      ) : (
        <motion.button
          type="button"
          onClick={() => setModalOpen(true)}
          whileTap={{ scale: 0.95 }}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Choose theme (Current: ${themeDefinition.name})`}
          title={`Theme: ${themeDefinition.name} — Click to pick from ${themes.length} themes`}
          className="inline-flex h-10 min-w-[40px] items-center justify-center gap-2 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] px-2.5 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464]/40 dark:hover:border-white/30 hover:bg-white dark:hover:bg-[#1C234B] shrink-0"
        >
          <span
            data-preview-theme={themeDefinition.id}
            aria-hidden="true"
            className="flex items-center -space-x-1"
          >
            <span className="h-3.5 w-3.5 rounded-full border border-white dark:border-[#090D1F] bg-[var(--p-heading)]" />
            <span className="h-3.5 w-3.5 rounded-full border border-white dark:border-[#090D1F] bg-[var(--p-accent)]" />
          </span>
          <span className="hidden xl:inline max-w-[96px] truncate whitespace-nowrap">
            {themeDefinition.name}
          </span>
          <Palette className="h-3.5 w-3.5 text-[#EE1119] xl:hidden" aria-hidden="true" />
        </motion.button>
      )}

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div
                className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5"
                role="dialog"
                aria-modal="true"
                aria-labelledby="theme-picker-title"
              >
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setModalOpen(false)}
                  className="fixed inset-0 bg-[#090D1F]/70 backdrop-blur-sm"
                />

                {/* Modal Panel */}
                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                  className="relative z-10 flex max-h-[88dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] shadow-2xl"
                >
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-5 py-4 sm:px-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
                        <h2
                          id="theme-picker-title"
                          className="font-display text-lg sm:text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]"
                        >
                          Choose Your Theme
                        </h2>
                      </div>
                      <p className="mt-0.5 text-xs sm:text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
                        Active:{' '}
                        <strong className="text-[#1A1464] dark:text-[#F4F6FC]">
                          {themeDefinition.name}
                        </strong>{' '}
                        · {themes.length} curated light &amp; dark palettes saved automatically
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      aria-label="Close theme selector"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#EE1119]/40 hover:text-[#EE1119]"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Controls Bar: Polarity Filter + Quick Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#E5E7F0] dark:border-[#242C54] px-5 py-3 sm:px-6">
                    <div
                      className="flex flex-wrap items-center gap-1.5"
                      role="group"
                      aria-label="Filter themes by brightness"
                    >
                      {(
                        [
                          { id: 'all', label: `All (${themes.length})` },
                          { id: 'light', label: `Light (${lightCount})` },
                          { id: 'dark', label: `Dark (${darkCount})` },
                        ] as const
                      ).map((tab) => {
                        const active = filter === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setFilter(tab.id)}
                            aria-pressed={active}
                            className={`min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                              active
                                ? 'bg-[#1A1464] dark:bg-[#2E368F] text-white'
                                : 'border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] text-[#4A4F63] dark:text-[#C2C9E0] hover:text-[#1A1464] dark:hover:text-white'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-3 py-1.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464]/40 dark:hover:border-white/30"
                      >
                        {isDark ? (
                          <>
                            <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                            <span>Quick Light</span>
                          </>
                        ) : (
                          <>
                            <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Quick Dark</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={pickRandomTheme}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#EE1119] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#D00D14]"
                      >
                        <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Surprise Me</span>
                      </button>
                    </div>
                  </div>

                  {/* 16-Theme Grid */}
                  <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                      {visibleThemes.map((item) => {
                        const isSelected = theme === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setTheme(item.id)}
                            aria-pressed={isSelected}
                            className={`group flex flex-col rounded-2xl border p-3 text-left transition-all ${
                              isSelected
                                ? 'border-[#EE1119] bg-[#EE1119]/5 dark:bg-[#EE1119]/10 ring-2 ring-[#EE1119]/30'
                                : 'border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/60 dark:bg-[#101530] hover:border-[#1A1464]/45 dark:hover:border-[#7C8CFF]'
                            }`}
                          >
                            {/* Miniature Live UI Preview */}
                            <div
                              data-preview-theme={item.id}
                              aria-hidden="true"
                              className="flex h-22 w-full flex-col justify-between rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] p-2.5 transition-transform duration-150 group-hover:scale-[1.01]"
                            >
                              {/* Mini Header Bar */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--p-accent)]" />
                                  <span className="h-1.5 w-10 rounded-full bg-[var(--p-heading)] opacity-85" />
                                </div>
                                <span className="h-2.5 w-7 rounded-md bg-[var(--p-accent)]" />
                              </div>

                              {/* Mini Card Surface */}
                              <div className="rounded-lg border border-[var(--p-border)] bg-[var(--p-card)] p-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="h-1.5 w-14 rounded-full bg-[var(--p-heading)]" />
                                  <span className="h-1.5 w-5 rounded-full bg-[var(--p-accent)]" />
                                </div>
                                <div className="mt-1.5 h-1.5 w-20 rounded-full bg-[var(--p-muted)] opacity-70" />
                              </div>
                            </div>

                            {/* Metadata & Active State */}
                            <div className="mt-2.5 flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate font-display text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                                  {item.name}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#6B7188] dark:text-[#8E97B8]">
                                  {item.tagline}
                                </p>
                              </div>
                              {isSelected && (
                                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#EE1119] text-white">
                                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                </span>
                              )}
                            </div>

                            <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                              <span>{item.mode === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                              {isSelected && (
                                <span className="text-[#EE1119]">Active</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-5 py-3.5 sm:px-6">
                    <p className="text-xs text-[#6B7188] dark:text-[#8E97B8]">
                      Your preference applies instantly across login, movies, and studio pages.
                    </p>
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="min-h-[40px] rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#120D4A] dark:hover:bg-[#3A43A8]"
                    >
                      Done
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};
