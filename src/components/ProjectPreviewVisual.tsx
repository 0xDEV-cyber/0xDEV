import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Droplets,
  Globe,
  Leaf,
  Lock,
  Maximize2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  Truck,
  X,
} from 'lucide-react';
import { CaseStudy } from '../data/siteData';
import { usePortfolioProjects } from '../hooks/usePortfolioProjects';
import { EASE_OUT_EXPO } from './MotionPrimitives';

interface ProjectPreviewScreenProps {
  study: CaseStudy;
  compact?: boolean;
  onInspect?: (study: CaseStudy) => void;
}

const ScreenBody: React.FC<{ study: CaseStudy; compact?: boolean }> = ({ study, compact }) => {
  switch (study.previewKind) {
    case 'fintech':
      return (
        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#6B7188]">
                Daily Settlement Volume
              </p>
              <p className="font-display text-base font-extrabold text-[#1A1464] tabular-nums">
                $1,482,910
              </p>
            </div>
            <span className="text-[10px] font-bold text-[#10B981] tabular-nums">
              +18.4% · 99.98% SLA
            </span>
          </div>
          <svg viewBox="0 0 220 44" className="w-full h-10" aria-hidden="true">
            {[22, 30, 26, 36, 32, 41, 38, 44, 39, 43, 40, 44].map((h, i) => (
              <rect
                key={i}
                x={i * 18 + 2}
                y={44 - h}
                width="11"
                rx="2"
                height={h}
                fill={i >= 9 ? '#EE1119' : i % 2 === 0 ? '#1A1464' : '#C7CBE0'}
              />
            ))}
          </svg>
          {!compact && (
            <div className="space-y-1.5 pt-1 border-t border-[#E5E7F0] text-[10px]">
              <div className="flex items-center justify-between text-[#1A1464] font-semibold">
                <span>KLA-8841 · MTN MoMo Batch</span>
                <span className="tabular-nums text-[#10B981]">Settled · 4.2s</span>
              </div>
              <div className="flex items-center justify-between text-[#4A4F63]">
                <span>NBO-3029 · Card Gateway</span>
                <span className="tabular-nums text-[#1A1464]">Verified · 1.8s</span>
              </div>
            </div>
          )}
        </div>
      );

    case 'telehealth':
      return (
        <div className="space-y-2.5">
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-lg bg-[#F6F7FB] p-1.5 border border-[#E5E7F0]">
              <p className="text-[9px] text-[#6B7188]">Active Consults</p>
              <p className="font-display text-xs font-extrabold text-[#1A1464] tabular-nums">38</p>
            </div>
            <div className="rounded-lg bg-[#F6F7FB] p-1.5 border border-[#E5E7F0]">
              <p className="text-[9px] text-[#6B7188]">Avg Wait</p>
              <p className="font-display text-xs font-extrabold text-[#EE1119] tabular-nums">3m 12s</p>
            </div>
            <div className="rounded-lg bg-[#F6F7FB] p-1.5 border border-[#E5E7F0]">
              <p className="text-[9px] text-[#6B7188]">Lab Sync</p>
              <p className="font-display text-xs font-extrabold text-[#10B981]">E2EE</p>
            </div>
          </div>
          <div className="rounded-lg bg-[#1A1464] p-2.5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="h-3.5 w-3.5 text-[#EE1119] shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold truncate">Dr. Namukasa · Video Triage</p>
                <p className="text-[9px] text-white/70 truncate">Kampala &amp; Nairobi Clinics</p>
              </div>
            </div>
            <span className="text-[9px] font-bold text-[#EE1119] shrink-0">HD Sync</span>
          </div>
          {!compact && (
            <div className="flex items-center justify-between text-[10px] text-[#4A4F63] pt-0.5">
              <span>Offline Queue Synced</span>
              <span className="font-bold text-[#1A1464] tabular-nums">12/12 Clinics</span>
            </div>
          )}
        </div>
      );

    case 'logistics':
      return (
        <div className="space-y-2.5">
          <div className="relative rounded-lg bg-[#1A1464] p-2.5 text-white overflow-hidden">
            <div className="flex items-center justify-between text-[9px] text-white/75 mb-1.5">
              <span className="font-bold text-white flex items-center gap-1">
                <Truck className="h-3 w-3 text-[#EE1119]" aria-hidden="true" />
                Corridor Telemetry
              </span>
              <span className="tabular-nums text-[#EE1119] font-bold">142 Trucks Live</span>
            </div>
            <svg viewBox="0 0 220 42" className="w-full h-9" aria-hidden="true">
              <path
                d="M14 30 Q 65 8, 115 24 T 206 14"
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.35"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
              <path
                d="M14 30 Q 65 8, 115 24"
                fill="none"
                stroke="#EE1119"
                strokeWidth="2.5"
              />
              <circle cx="14" cy="30" r="3.5" fill="#ffffff" />
              <circle cx="115" cy="24" r="4" fill="#EE1119" />
              <circle cx="206" cy="14" r="3.5" fill="#10B981" />
            </svg>
            <div className="flex justify-between text-[8px] text-white/70 uppercase tracking-wider mt-0.5">
              <span>Mombasa</span>
              <span>Nairobi</span>
              <span>Kampala</span>
            </div>
          </div>
          {!compact && (
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#4A4F63]">Dispatch Queue Latency</span>
              <span className="font-bold text-[#1A1464] tabular-nums">18 ms · -38% Spend</span>
            </div>
          )}
        </div>
      );

    case 'agritech':
      return (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Leaf className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />
              <span className="text-[10px] font-bold text-[#1A1464]">
                Kabale Center 04 · Harvest Batch
              </span>
            </div>
            <span className="text-[9px] font-bold text-[#EE1119] tabular-nums">6,400+ Farmers</span>
          </div>
          <div className="rounded-lg bg-[#F6F7FB] p-2 border border-[#E5E7F0] space-y-1.5 text-[10px]">
            <div className="flex justify-between font-semibold text-[#1A1464]">
              <span>Arabica Parchment · Lot #419</span>
              <span className="tabular-nums">2,480 kg</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#E5E7F0] overflow-hidden">
              <div className="h-full w-[88%] bg-[#10B981] rounded-full" />
            </div>
            <div className="flex justify-between text-[9px] text-[#6B7188]">
              <span>MoMo Bulk Disbursement</span>
              <span className="font-bold text-[#1A1464] tabular-nums">18 min Avg Payout</span>
            </div>
          </div>
        </div>
      );

    case 'ecommerce':
      return (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-[#1A1464] flex items-center gap-1">
              <ShoppingBag className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
              Vendor Settlement Grid
            </span>
            <span className="font-bold text-[#10B981] tabular-nums">0.8s Edge Load</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { name: 'KLA Hub', share: '42%', rev: '$18.4k' },
              { name: 'KGL Hub', share: '31%', rev: '$13.2k' },
              { name: 'NBO Hub', share: '27%', rev: '$11.6k' },
            ].map((hub) => (
              <div
                key={hub.name}
                className="rounded-lg bg-[#F6F7FB] border border-[#E5E7F0] p-1.5"
              >
                <p className="text-[9px] font-semibold text-[#6B7188]">{hub.name}</p>
                <p className="font-display text-xs font-extrabold text-[#1A1464] tabular-nums">
                  {hub.rev}
                </p>
                <p className="text-[9px] font-bold text-[#EE1119] tabular-nums">{hub.share}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case 'edtech':
      return (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#6B7188]">
                Term Tuition Reconciliation
              </p>
              <p className="font-display text-base font-extrabold text-[#1A1464] tabular-nums">
                94.2% Matched
              </p>
            </div>
            <span className="text-[10px] font-bold text-[#EE1119] tabular-nums">
              14,500 Students
            </span>
          </div>
          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between rounded-md bg-[#F6F7FB] px-2 py-1 border border-[#E5E7F0]">
              <span className="font-medium text-[#1A1464]">#RCP-9021 · Bank Slip Auto-Match</span>
              <span className="font-bold text-[#10B981]">PDF Sent</span>
            </div>
            {!compact && (
              <div className="flex items-center justify-between rounded-md bg-[#F6F7FB] px-2 py-1 border border-[#E5E7F0]">
                <span className="font-medium text-[#1A1464]">#RCP-9022 · MoMo Tuition Direct</span>
                <span className="font-bold text-[#10B981]">Cleared</span>
              </div>
            )}
          </div>
        </div>
      );

    case 'cleantech':
      return (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-[#1A1464] flex items-center gap-1">
              <Sun className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
              Microgrid Inverter Output
            </span>
            <span className="font-bold text-[#10B981] tabular-nums">1,850 Nodes Online</span>
          </div>
          <svg viewBox="0 0 220 44" className="w-full h-10" aria-hidden="true">
            <path
              d="M0 36 C 30 34, 55 18, 85 16 C 115 14, 145 8, 175 14 C 195 18, 208 26, 220 24"
              fill="none"
              stroke="#1A1464"
              strokeWidth="2.5"
            />
            <path
              d="M0 36 C 30 34, 55 18, 85 16 C 115 14, 145 8, 175 14 C 195 18, 208 26, 220 24 L 220 44 L 0 44 Z"
              fill="#1A1464"
              fillOpacity="0.08"
            />
            <circle cx="145" cy="11" r="3.5" fill="#EE1119" />
          </svg>
          {!compact && (
            <div className="flex items-center justify-between text-[10px] text-[#4A4F63]">
              <span>PayGo Token Activation</span>
              <span className="font-bold text-[#1A1464] tabular-nums">2.1s Avg · MQTT</span>
            </div>
          )}
        </div>
      );

    case 'saas':
      return (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#6B7188]">
                90-Day Cashflow Forecast
              </p>
              <p className="font-display text-base font-extrabold text-[#1A1464] tabular-nums">
                +$248,400 Net
              </p>
            </div>
            <span className="text-[10px] font-bold text-[#EE1119] tabular-nums">940+ SMEs</span>
          </div>
          <svg viewBox="0 0 220 40" className="w-full h-9" aria-hidden="true">
            <polyline
              points="4,34 38,28 72,30 106,20 140,22 174,12 214,6"
              fill="none"
              stroke="#EE1119"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="214" cy="6" r="3.5" fill="#1A1464" />
          </svg>
          {!compact && (
            <div className="flex items-center justify-between text-[10px] text-[#4A4F63]">
              <span>OCR Expense Receipts</span>
              <span className="font-bold text-[#10B981] tabular-nums">99.2% Auto-Tagged</span>
            </div>
          )}
        </div>
      );

    case 'pharma':
      return (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#1A1464]">
              Cold-Room Telemetry · Batch #C209
            </span>
            <span className="font-display text-sm font-extrabold text-[#10B981] tabular-nums">
              2.8°C Optimal
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[#F6F7FB] p-2 border border-[#E5E7F0]">
              <p className="text-[9px] text-[#6B7188]">Connected Pharmacies</p>
              <p className="font-display text-xs font-extrabold text-[#1A1464] tabular-nums">
                410+ Active
              </p>
            </div>
            <div className="rounded-lg bg-[#F6F7FB] p-2 border border-[#E5E7F0]">
              <p className="text-[9px] text-[#6B7188]">Expiry Reduction</p>
              <p className="font-display text-xs font-extrabold text-[#EE1119] tabular-nums">
                -72% Waste
              </p>
            </div>
          </div>
        </div>
      );

    case 'hospitality':
      return (
        <div className="space-y-2.5">
          <div className="rounded-lg bg-[#1A1464] p-2.5 text-white flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-white/70">
                Bwindi Forest Eco-Lodge
              </p>
              <p className="font-display text-xs font-bold mt-0.5">
                Gorilla Trek + 4 Nights Suite
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-xs font-extrabold text-[#EE1119] tabular-nums">
                $2,450
              </p>
              <p className="text-[8px] text-white/75">USD · EUR · UGX</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#4A4F63]">
            <span>Direct Permit Sync</span>
            <span className="font-bold text-[#10B981] tabular-nums">+118% Direct Bookings</span>
          </div>
        </div>
      );

    case 'security':
      return (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#1A1464] flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />
              ISO 27001 Posture Score
            </span>
            <span className="font-display text-sm font-extrabold text-[#1A1464] tabular-nums">
              99.4%
            </span>
          </div>
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between rounded-md bg-[#F6F7FB] px-2 py-1 border border-[#E5E7F0]">
              <span className="text-[#4A4F63]">IAM Policy Drift Check</span>
              <span className="font-bold text-[#10B981]">0 Violations</span>
            </div>
            {!compact && (
              <div className="flex justify-between rounded-md bg-[#F6F7FB] px-2 py-1 border border-[#E5E7F0]">
                <span className="text-[#4A4F63]">TLS &amp; Secret Rotation</span>
                <span className="font-bold text-[#1A1464]">Auto-Verified</span>
              </div>
            )}
          </div>
        </div>
      );

    case 'govtech':
      return (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#1A1464] flex items-center gap-1">
              <Droplets className="h-3.5 w-3.5 text-[#1A1464]" aria-hidden="true" />
              Municipal Water Meter Grid
            </span>
            <span className="text-[9px] font-bold text-[#EE1119] tabular-nums">
              28,000+ Homes
            </span>
          </div>
          <div className="rounded-lg bg-[#F6F7FB] p-2 border border-[#E5E7F0] flex items-center justify-between text-[10px]">
            <div>
              <p className="font-bold text-[#1A1464]">Meter #KBL-4820 · GPS Verified</p>
              <p className="text-[9px] text-[#6B7188]">Instant Citizen MoMo Receipt</p>
            </div>
            <span className="font-display text-xs font-extrabold text-[#10B981] tabular-nums">
              98.4%
            </span>
          </div>
        </div>
      );
  }
};

export const ProjectPreviewScreen: React.FC<ProjectPreviewScreenProps> = ({
  study,
  compact = false,
  onInspect,
}) => {
  const Wrapper = onInspect ? 'button' : 'div';

  return (
    <Wrapper
      {...(onInspect
        ? {
            type: 'button' as const,
            onClick: () => onInspect(study),
            'aria-label': `Open live preview for ${study.title}`,
          }
        : {})}
      className={`group/screen relative block w-full text-left overflow-hidden rounded-xl border border-[#E5E7F0] bg-[#F6F7FB] transition-all duration-200 ${
        onInspect
          ? 'cursor-pointer hover:border-[#1A1464]/45 hover:shadow-[0_12px_28px_rgba(26,20,100,0.1)]'
          : ''
      }`}
    >
      {/* Browser Window Top Chrome */}
      <div className="flex items-center justify-between gap-2 border-b border-[#E5E7F0] bg-white px-3 py-2">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-[#EE1119]" />
          <span className="h-2 w-2 rounded-full bg-[#1A1464]/30" />
          <span className="h-2 w-2 rounded-full bg-[#CBD5E1]" />
        </div>
        <div className="flex items-center gap-1 rounded-md bg-[#F6F7FB] px-2 py-0.5 text-[10px] font-medium text-[#6B7188] truncate max-w-[70%]">
          <Lock className="h-2.5 w-2.5 text-[#10B981] shrink-0" aria-hidden="true" />
          <span className="truncate">{study.previewUrl}</span>
        </div>
        {onInspect ? (
          <Maximize2
            className="h-3 w-3 text-[#6B7188] transition-colors group-hover/screen:text-[#EE1119] shrink-0"
            aria-hidden="true"
          />
        ) : (
          <Globe className="h-3 w-3 text-[#6B7188] shrink-0" aria-hidden="true" />
        )}
      </div>

      {/* Screen Content Canvas */}
      <div className={`bg-white/95 ${compact ? 'p-3' : 'p-4'}`}>
        <div className="mb-2.5 flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-wider text-[#6B7188]">
          <span className="text-[#EE1119] truncate">{study.deliverableType}</span>
          <span className="shrink-0 tabular-nums">{study.metrics[0]?.value}</span>
        </div>
        <ScreenBody study={study} compact={compact} />
      </div>
    </Wrapper>
  );
};

interface ProjectPreviewModalProps {
  study: CaseStudy | null;
  onClose: () => void;
  onAction?: (study: CaseStudy) => void;
  actionLabel?: string;
}

export const ProjectPreviewModal: React.FC<ProjectPreviewModalProps> = ({
  study,
  onClose,
  onAction,
  actionLabel = 'Plan a Similar Build',
}) => {
  useEffect(() => {
    if (!study) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [study, onClose]);

  return (
    <AnimatePresence>
      {study && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1464]/65 backdrop-blur-sm p-4 sm:p-6"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-preview-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#E5E7F0] bg-white shadow-[0_24px_60px_rgba(26,20,100,0.3)]"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#E5E7F0] bg-white/95 backdrop-blur-sm px-6 py-5 sm:px-8">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#6B7188]">
                  <span className="text-[#EE1119]">{study.sector}</span>
                  <span aria-hidden="true">·</span>
                  <span>{study.region}</span>
                  <span aria-hidden="true">·</span>
                  <span>{study.timeline}</span>
                </div>
                <h2
                  id="project-preview-modal-title"
                  className="mt-1.5 font-display text-xl sm:text-2xl font-extrabold text-[#1A1464]"
                >
                  {study.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close project preview"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E5E7F0] bg-[#F6F7FB] text-[#1A1464] transition-colors hover:bg-[#1A1464] hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
                <div className="lg:col-span-7">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B7188]">
                    Interactive Product Screen Preview
                  </p>
                  <ProjectPreviewScreen study={study} />
                </div>

                <div className="lg:col-span-5 rounded-xl bg-[#1A1464] p-5 text-white space-y-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                      Client Profile
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">{study.clientType}</p>
                    <p className="text-xs text-white/75">{study.deliverableType}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-white/15 pt-4">
                    {study.metrics.map((m) => (
                      <div key={m.label}>
                        <p className="font-display text-lg font-extrabold text-white tabular-nums">
                          {m.value}
                        </p>
                        <p className="text-[10px] leading-snug text-white/75">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-white/15 pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                      Production Stack
                    </p>
                    <p className="mt-1 text-xs font-medium text-white/90">{study.stackSummary}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="rounded-xl border border-[#E5E7F0] bg-[#F6F7FB] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#6B7188]">
                    The Challenge
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#4A4F63]">{study.problem}</p>
                </div>
                <div className="rounded-xl border border-[#E5E7F0] bg-[#F6F7FB] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464]">
                    The 0xDEV Solution
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#4A4F63]">{study.solution}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-xl border border-[#E5E7F0] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5">
                  <Cpu className="mt-0.5 h-4 w-4 text-[#EE1119] shrink-0" aria-hidden="true" />
                  <p className="text-xs sm:text-sm text-[#4A4F63]">
                    <strong className="text-[#1A1464]">Architecture:</strong>{' '}
                    {study.architectureNotes}
                  </p>
                </div>
                {onAction && (
                  <button
                    type="button"
                    onClick={() => onAction(study)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#D00D14] whitespace-nowrap"
                  >
                    <span>{actionLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface WorkShowcaseModalProps {
  open: boolean;
  onClose: () => void;
  onRequestAuth?: () => void;
}

export const WorkShowcaseModal: React.FC<WorkShowcaseModalProps> = ({
  open,
  onClose,
  onRequestAuth,
}) => {
  const { projects } = usePortfolioProjects();
  const [filter, setFilter] = useState<string>('All');
  const [inspected, setInspected] = useState<CaseStudy | null>(null);

  const dynamicFilters = ['All', ...Array.from(new Set(projects.map((p) => p.sector)))];

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !inspected) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, inspected, onClose]);

  const visibleProjects =
    filter === 'All' ? projects : projects.filter((s) => s.sector === filter);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-[#1A1464]/75 backdrop-blur-sm p-3 sm:p-6"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="work-showcase-modal-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#E5E7F0] bg-[#F6F7FB] shadow-[0_28px_70px_rgba(26,20,100,0.38)]"
            >
              {/* Modal Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E7F0] bg-white px-5 py-4 sm:px-7">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#EE1119] flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>See Some of Our Work · {projects.length} Shipped Systems</span>
                  </p>
                  <h2
                    id="work-showcase-modal-title"
                    className="mt-1 font-display text-lg sm:text-2xl font-extrabold text-[#1A1464]"
                  >
                    Live UI Screen Previews &amp; Architecture Portfolio
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  {onRequestAuth && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onRequestAuth();
                      }}
                      className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-[#EE1119] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#D00D14]"
                    >
                      <span>Create Account to Start Build</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close portfolio showcase"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7F0] bg-[#F6F7FB] text-[#1A1464] transition-colors hover:bg-[#1A1464] hover:text-white"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Filter Strip */}
              <div className="border-b border-[#E5E7F0] bg-white px-5 py-3 sm:px-7 overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-max" role="tablist" aria-label="Project categories">
                  {dynamicFilters.map((item) => {
                    const active = filter === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setFilter(item)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          active
                            ? 'bg-[#1A1464] text-white'
                            : 'bg-[#F6F7FB] text-[#4A4F63] hover:text-[#1A1464]'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grid of Live Screen Previews */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-7">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {visibleProjects.map((study) => (
                    <article
                      key={study.id}
                      className="flex flex-col justify-between rounded-2xl border border-[#E5E7F0] bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div>
                        <ProjectPreviewScreen study={study} onInspect={setInspected} />
                        <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-[#6B7188]">
                          <span className="text-[#EE1119]">{study.sector}</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{study.region}</span>
                        </div>
                        <h3 className="mt-1 font-display text-base font-bold text-[#1A1464]">
                          {study.title}
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-[#4A4F63] line-clamp-2">
                          {study.solution}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-[#E5E7F0] pt-3">
                        <span className="text-[11px] font-bold text-[#1A1464] tabular-nums">
                          {study.metrics[0]?.value} · {study.metrics[0]?.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => setInspected(study)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#EE1119] hover:text-[#1A1464] transition-colors"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              {/* Bottom Footer Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7F0] bg-white px-5 py-3.5 sm:px-7">
                <p className="text-xs text-[#4A4F63] flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0" aria-hidden="true" />
                  <span>
                    Showing <strong className="text-[#1A1464] tabular-nums">{visibleProjects.length}</strong> of{' '}
                    <strong className="text-[#1A1464] tabular-nums">{projects.length}</strong> production builds by 0xDEV.
                  </span>
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[#1A1464] px-4 py-1.5 text-xs font-bold text-[#1A1464] transition-colors hover:bg-[#1A1464] hover:text-white"
                >
                  Close Showcase
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProjectPreviewModal
        study={inspected}
        onClose={() => setInspected(null)}
        actionLabel="Create Free Account to Start Build"
        onAction={() => {
          setInspected(null);
          onClose();
          if (onRequestAuth) onRequestAuth();
        }}
      />
    </>
  );
};
