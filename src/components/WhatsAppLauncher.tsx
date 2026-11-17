import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MessageCircle, PhoneCall, X } from 'lucide-react';
import { COMPANY_CONTACT } from '../data/siteData';
import { EASE_OUT_EXPO } from './MotionPrimitives';

export const WhatsAppLauncher: React.FC = () => {
  const [open, setOpen] = useState(false);

  const whatsappUrl = `https://wa.me/${COMPANY_CONTACT.phoneRaw.replace(/\+/g, '')}?text=${encodeURIComponent(
    'Hello Arigye Wisdom / 0xDEV team, I would like to discuss a software or cloud project.'
  )}`;

  return (
    <div className="fixed bottom-5 left-5 z-40 flex flex-col items-start gap-3 print:hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
            className="w-72 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-4 shadow-[0_20px_50px_rgba(26,20,100,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-start justify-between gap-2 border-b border-[#E5E7F0] dark:border-[#242C54] pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                  Direct Studio Line
                </p>
                <p className="font-display text-sm font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                  {COMPANY_CONTACT.leadName}
                </p>
                <p className="text-[11px] text-[#6B7188] dark:text-[#8E97B8]">
                  {COMPANY_CONTACT.location} · UTC+3
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close quick contact menu"
                className="rounded-lg p-1 text-[#6B7188] dark:text-[#8E97B8] hover:bg-[#F6F7FB] dark:hover:bg-[#1C234B] hover:text-[#1A1464] dark:hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
              Need a quick estimate or freelance developer support? Reach us directly on WhatsApp
              or phone.
            </p>

            <div className="mt-4 space-y-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#15803D]"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>Chat on WhatsApp</span>
              </a>
              <a
                href={`tel:${COMPANY_CONTACT.phoneRaw}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-4 py-2 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464] dark:hover:border-white/30"
              >
                <PhoneCall className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                <span className="tabular-nums">{COMPANY_CONTACT.phoneDisplay}</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Open direct WhatsApp & phone launcher"
        className="inline-flex items-center gap-2 rounded-full bg-[#1A1464] dark:bg-[#1B224B] px-4 py-3 text-xs font-bold text-white shadow-[0_12px_28px_rgba(26,20,100,0.28)] dark:shadow-[0_12px_28px_rgba(0,0,0,0.55)] ring-2 ring-white dark:ring-[#2A3366] transition-colors hover:bg-[#120D4A] dark:hover:bg-[#242D62]"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#16A34A] text-white">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="hidden sm:inline">WhatsApp Studio</span>
      </motion.button>
    </div>
  );
};
