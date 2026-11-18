import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Database,
  Layers,
  Lock,
  RefreshCw,
  Server,
  ShieldCheck,
  Smartphone,
  Terminal,
  Webhook,
} from 'lucide-react';
import {
  EASE_OUT_EXPO,
  InteractiveCard,
  Reveal,
  SPRING_SNAPPY,
  StaggerGrid,
  StaggerItem,
} from './MotionPrimitives';

interface EngineeringMotionCardsProps {
  onSelectService: (serviceTitle: string) => void;
  onNavigateServices?: () => void;
}

type SurfaceMode = 'web' | 'mobile' | 'system';

const SURFACE_MODES: {
  id: SurfaceMode;
  label: string;
  caption: string;
  spec: string;
}[] = [
  {
    id: 'web',
    label: 'Web Portal',
    caption: 'Fast React and Next.js interfaces with instant optimistic state and zero layout jump.',
    spec: 'SSR & Code Splitting · WCAG AA Contrast',
  },
  {
    id: 'mobile',
    label: 'Mobile App',
    caption: 'Offline-capable Flutter and React Native builds tested on real mid-range phones.',
    spec: 'Local Queue Sync · Smooth 60fps Gestures',
  },
  {
    id: 'system',
    label: 'Design Kit',
    caption: 'Shared Figma tokens and accessible UI primitives shipped straight to engineering.',
    spec: 'Light & Dark Tokens · Reusable Components',
  },
];

type ApiNodeId = 'request' | 'ledger' | 'webhook';

const API_NODES: {
  id: ApiNodeId;
  step: string;
  title: string;
  summary: string;
  guarantee: string;
}[] = [
  {
    id: 'request',
    step: '01',
    title: 'Client Request',
    summary: 'Schema-validated checkout or tenant request enters the gateway with an idempotency key.',
    guarantee: 'Zero duplicate charges on retry',
  },
  {
    id: 'ledger',
    step: '02',
    title: 'MoMo & Card Ledger',
    summary: 'MTN MoMo, Airtel Money, and card settlements write atomically inside a single transaction.',
    guarantee: 'Balanced double-entry records',
  },
  {
    id: 'webhook',
    step: '03',
    title: 'Signed Callback',
    summary: 'HMAC-verified webhooks update your order status and notify downstream apps cleanly.',
    guarantee: 'Exponential retry with audit trail',
  },
];

const PIPELINE_STAGES = [
  {
    id: 'build',
    label: 'Typecheck & Bundle',
    duration: '18s',
    detail: 'Strict TypeScript verification and reproducible container build.',
  },
  {
    id: 'test',
    label: 'Automated Tests',
    duration: '31s',
    detail: 'API contract checks and critical checkout path assertions.',
  },
  {
    id: 'stage',
    label: 'Staging Smoke Check',
    duration: '22s',
    detail: 'Health probes verify database migrations before traffic shifts.',
  },
  {
    id: 'live',
    label: 'Zero-Downtime Swap',
    duration: '14s',
    detail: 'Traffic switches cleanly with instant single-click rollback ready.',
  },
];

type SecurityMode = 'iam' | 'backups' | 'billing';

const SECURITY_MODES: {
  id: SecurityMode;
  label: string;
  headline: string;
  points: string[];
  metricLabel: string;
  metricValue: string;
}[] = [
  {
    id: 'iam',
    label: 'Access & IAM',
    headline: 'Least-privilege roles across every server, database, and admin route.',
    points: [
      'Scoped API tokens and short-lived session cookies',
      'Server-enforced permissions on tenant documents',
      'Automated dependency scans on every pull request',
    ],
    metricLabel: 'Auth Guard',
    metricValue: 'Role Scoped',
  },
  {
    id: 'backups',
    label: 'Encrypted Backups',
    headline: 'Daily automated snapshots verified with scheduled restore drills.',
    points: [
      'Encrypted point-in-time database recovery',
      'Cross-zone storage replication with retention rules',
      'Clear disaster recovery runbooks handed to your team',
    ],
    metricLabel: 'Snapshot Cadence',
    metricValue: 'Daily Verified',
  },
  {
    id: 'billing',
    label: 'Cost Guardrails',
    headline: 'Right-sized cloud instances and hard spend alerts before bills spike.',
    points: [
      'Budget threshold alerts wired to email and WhatsApp',
      'Auto-scaling caps to block runaway traffic loops',
      'Monthly resource review by the team running your stack',
    ],
    metricLabel: 'Spend Control',
    metricValue: 'Hard Caps',
  },
];

export const EngineeringMotionCards: React.FC<EngineeringMotionCardsProps> = ({
  onSelectService,
  onNavigateServices,
}) => {
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>('web');
  const [activeApiNode, setActiveApiNode] = useState<ApiNodeId>('ledger');
  const [flowPulseKey, setFlowPulseKey] = useState(0);
  const [pipelineStep, setPipelineStep] = useState(2);
  const [securityMode, setSecurityMode] = useState<SecurityMode>('iam');

  const activeSurface = SURFACE_MODES.find((m) => m.id === surfaceMode) || SURFACE_MODES[0];
  const activeApiInfo = API_NODES.find((n) => n.id === activeApiNode) || API_NODES[1];
  const activeSecurity = SECURITY_MODES.find((s) => s.id === securityMode) || SECURITY_MODES[0];

  const handleApiNodeSelect = (nodeId: ApiNodeId) => {
    setActiveApiNode(nodeId);
    setFlowPulseKey((prev) => prev + 1);
  };

  return (
    <section
      aria-label="Interactive Engineering Capabilities"
      className="bg-[#F6F7FB] dark:bg-[#101530] py-20 sm:py-24 border-y border-[#E5E7F0] dark:border-[#242C54]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#EE1119]">
                Interactive Architecture
              </p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1464] dark:text-[#F4F6FC] text-balance">
                Inspect how every layer behaves in production.
              </h2>
              <p className="mt-3 text-base text-[#4A4F63] dark:text-[#C2C9E0]">
                Switch modes, replay payment flows, and step through release checks inside each
                card to see the engineering standards behind our builds.
              </p>
            </div>

            {onNavigateServices && (
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING_SNAPPY}
                onClick={onNavigateServices}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-[#1A1464] dark:border-[#3A437A] bg-white dark:bg-[#141A38] px-5 py-3 text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:bg-[#1A1464] hover:text-white dark:hover:bg-[#2E368F] whitespace-nowrap shrink-0"
              >
                <span>Explore Full Service Catalog</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </motion.button>
            )}
          </div>
        </Reveal>

        <StaggerGrid
          staggerDelay={0.07}
          className="mt-10 grid grid-cols-1 gap-7 lg:grid-cols-12 items-stretch"
        >
          {/* Card 01 (Wide Bento): Responsive Product Interfaces */}
          <StaggerItem className="lg:col-span-7 h-full">
            <InteractiveCard
              hoverY={-5}
              className="group flex h-full flex-col justify-between rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 sm:p-8 shadow-sm transition-colors duration-200 hover:border-[#1A1464]/35 dark:hover:border-[#4F59B8]/60 hover:shadow-[0_20px_44px_rgba(26,20,100,0.08)] dark:hover:shadow-[0_20px_44px_rgba(0,0,0,0.45)]"
            >
              <div
                aria-hidden="true"
                className="absolute top-0 left-0 right-0 h-1 bg-[#EE1119] scale-x-0 origin-left transition-transform duration-300 group-hover/card:scale-x-100"
              />

              <div className="relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#6B7188] dark:text-[#8E97B8]">
                    <span className="font-display text-[#EE1119] tabular-nums">01</span>
                    <span aria-hidden="true">·</span>
                    <span>Frontend &amp; Mobile Craft</span>
                  </div>

                  {/* Interactive Mode Tabs */}
                  <div
                    role="tablist"
                    aria-label="Interface architecture modes"
                    className="inline-flex items-center gap-1 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-1"
                  >
                    {SURFACE_MODES.map((mode) => {
                      const active = surfaceMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setSurfaceMode(mode.id)}
                          className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                            active
                              ? 'text-white'
                              : 'text-[#4A4F63] dark:text-[#B8C0DA] hover:text-[#1A1464] dark:hover:text-white'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="motion-card-surface-tab"
                              aria-hidden="true"
                              transition={SPRING_SNAPPY}
                              className="absolute inset-0 rounded-lg bg-[#1A1464] dark:bg-[#2E368F] shadow-sm"
                            />
                          )}
                          <span className="relative z-10">{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <h3 className="mt-4 font-display text-xl sm:text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                  Interfaces engineered for speed &amp; clarity.
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0] max-w-2xl">
                  {activeSurface.caption}
                </p>

                {/* Animated UI Wireframe Canvas */}
                <div className="mt-6 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#0D1229] p-4 sm:p-5 min-h-[198px] flex items-center justify-center overflow-hidden">
                  <AnimatePresence mode="wait">
                    {surfaceMode === 'web' && (
                      <motion.div
                        key="canvas-web"
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
                        className="w-full grid grid-cols-12 gap-3 items-stretch"
                      >
                        <div className="col-span-4 rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-3 flex flex-col justify-between transition-transform duration-300 group-hover/card:-translate-y-1">
                          <div className="flex items-center gap-2">
                            <Layers className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                            <span className="text-[11px] font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                              Navigation
                            </span>
                          </div>
                          <div className="mt-3 space-y-2">
                            {[0.88, 0.72, 0.94, 0.64].map((w, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: w }}
                                transition={{
                                  duration: 0.45,
                                  delay: 0.06 * idx,
                                  ease: EASE_OUT_EXPO,
                                }}
                                className={`h-2 origin-left rounded-full ${
                                  idx === 0
                                    ? 'bg-[#EE1119]'
                                    : 'bg-[#1A1464]/15 dark:bg-white/15'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="col-span-8 rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-3.5 transition-transform duration-300 group-hover/card:translate-y-[-6px]">
                          <div className="flex items-center justify-between border-b border-[#E5E7F0] dark:border-[#242C54] pb-2">
                            <span className="text-[11px] font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                              Workspace State
                            </span>
                            <span className="font-mono text-[10px] font-semibold text-[#10B981] tabular-nums">
                              60fps · Ready
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {['Latency', 'Hydration', 'Cache'].map((metric, idx) => (
                              <motion.div
                                key={metric}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  duration: 0.32,
                                  delay: 0.08 + idx * 0.06,
                                  ease: EASE_OUT_EXPO,
                                }}
                                className="rounded-md bg-[#F6F7FB] dark:bg-[#101530] p-2"
                              >
                                <p className="text-[10px] text-[#6B7188] dark:text-[#8E97B8]">
                                  {metric}
                                </p>
                                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7F0] dark:bg-[#242C54]">
                                  <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 0.72 + idx * 0.1 }}
                                    transition={{
                                      duration: 0.55,
                                      delay: 0.14 + idx * 0.08,
                                      ease: EASE_OUT_EXPO,
                                    }}
                                    className="h-full origin-left rounded-full bg-[#1A1464] dark:bg-[#7C8CFF]"
                                  />
                                </div>
                              </motion.div>
                            ))}
                          </div>
                          <div className="mt-3 h-7 rounded-md bg-[#F6F7FB] dark:bg-[#101530] px-2.5 flex items-center justify-between">
                            <span className="text-[10px] font-medium text-[#6B7188] dark:text-[#8E97B8]">
                              Bundle Integrity
                            </span>
                            <span className="h-1.5 w-16 rounded-full bg-[#10B981]" />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {surfaceMode === 'mobile' && (
                      <motion.div
                        key="canvas-mobile"
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
                        className="w-full flex flex-col sm:flex-row items-center justify-center gap-5"
                      >
                        <div className="w-40 rounded-2xl border-2 border-[#1A1464]/20 dark:border-[#3A459E]/60 bg-white dark:bg-[#141A38] p-3 shadow-sm transition-transform duration-300 group-hover/card:-translate-y-1.5">
                          <div className="mx-auto mb-2.5 h-1 w-8 rounded-full bg-[#E5E7F0] dark:bg-[#242C54]" />
                          <div className="flex items-center justify-between">
                            <Smartphone className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                            <span className="font-mono text-[10px] font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                              Offline Queue
                            </span>
                          </div>
                          <div className="mt-2.5 space-y-2">
                            {[1, 0.85, 0.65].map((scale, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.08, ease: EASE_OUT_EXPO }}
                                className="flex items-center gap-2 rounded-md bg-[#F6F7FB] dark:bg-[#101530] p-1.5"
                              >
                                <span className="h-2 w-2 rounded-xs bg-[#10B981] shrink-0" />
                                <motion.span
                                  initial={{ scaleX: 0 }}
                                  animate={{ scaleX: scale }}
                                  transition={{ duration: 0.4, delay: 0.1 + idx * 0.06 }}
                                  className="h-1.5 w-full origin-left rounded-full bg-[#1A1464]/25 dark:bg-white/25"
                                />
                              </motion.div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2.5 max-w-xs text-left">
                          <p className="text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                            Resilient on patchy 3G networks
                          </p>
                          <p className="text-xs leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                            Field teams keep capturing records offline. Pending writes reconcile
                            automatically once connectivity returns.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {surfaceMode === 'system' && (
                      <motion.div
                        key="canvas-system"
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
                        className="w-full grid grid-cols-3 gap-3"
                      >
                        {[
                          { name: 'Typography', sample: 'Sora / Jakarta', tone: 'bg-[#1A1464]' },
                          { name: 'Accent Token', sample: '#EE1119', tone: 'bg-[#EE1119]' },
                          { name: 'Surface Grid', sample: '8px Rhythm', tone: 'bg-[#10B981]' },
                        ].map((token, idx) => (
                          <motion.div
                            key={token.name}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.07, ease: EASE_OUT_EXPO }}
                            className="rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-3 transition-transform duration-300 group-hover/card:-translate-y-1"
                          >
                            <span className={`block h-6 w-6 rounded-md ${token.tone}`} />
                            <p className="mt-2.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                              {token.name}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] text-[#6B7188] dark:text-[#8E97B8]">
                              {token.sample}
                            </p>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="relative z-10 mt-6 pt-4 border-t border-[#E5E7F0] dark:border-[#242C54] flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-medium text-[#6B7188] dark:text-[#8E97B8]">
                  {activeSurface.spec}
                </p>
                <button
                  type="button"
                  onClick={() => onSelectService('Web & Mobile App Development')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Discuss Web &amp; Mobile</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </InteractiveCard>
          </StaggerItem>

          {/* Card 02: Payment Rails & API Orchestration */}
          <StaggerItem className="lg:col-span-5 h-full">
            <InteractiveCard
              hoverY={-5}
              className="group flex h-full flex-col justify-between rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 sm:p-8 shadow-sm transition-colors duration-200 hover:border-[#1A1464]/35 dark:hover:border-[#4F59B8]/60 hover:shadow-[0_20px_44px_rgba(26,20,100,0.08)] dark:hover:shadow-[0_20px_44px_rgba(0,0,0,0.45)]"
            >
              <div
                aria-hidden="true"
                className="absolute top-0 left-0 right-0 h-1 bg-[#EE1119] scale-x-0 origin-left transition-transform duration-300 group-hover/card:scale-x-100"
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#6B7188] dark:text-[#8E97B8]">
                    <span className="font-display text-[#EE1119] tabular-nums">02</span>
                    <span aria-hidden="true">·</span>
                    <span>APIs &amp; Payment Rails</span>
                  </div>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setFlowPulseKey((prev) => prev + 1)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-2.5 py-1 text-[11px] font-semibold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119] hover:text-[#EE1119] transition-colors whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                    <span>Replay Flow</span>
                  </motion.button>
                </div>

                <h3 className="mt-4 font-display text-xl sm:text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                  Idempotent payments &amp; clean API contracts.
                </h3>

                {/* Animated Node Flow Diagram */}
                <div className="mt-5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#0D1229] p-4">
                  <div className="relative grid grid-cols-3 gap-2 items-center">
                    {/* Connecting Animated SVG Line behind nodes */}
                    <svg
                      viewBox="0 0 300 24"
                      className="pointer-events-none absolute left-[16%] right-[16%] top-6 h-6 w-[68%]"
                      fill="none"
                      aria-hidden="true"
                    >
                      <line
                        x1="0"
                        y1="12"
                        x2="300"
                        y2="12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        className="text-[#D3D7E6] dark:text-[#2E3766]"
                      />
                      <motion.line
                        key={`api-line-${flowPulseKey}`}
                        x1="0"
                        y1="12"
                        x2="300"
                        y2="12"
                        stroke="#EE1119"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0.9 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.85, ease: EASE_OUT_EXPO }}
                      />
                    </svg>

                    {API_NODES.map((node, idx) => {
                      const isSelected = activeApiNode === node.id;
                      const NodeIcon = idx === 0 ? Terminal : idx === 1 ? Database : Webhook;
                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => handleApiNodeSelect(node.id)}
                          className="relative z-10 flex flex-col items-center text-center group/node focus:outline-none"
                        >
                          <motion.span
                            animate={{
                              scale: isSelected ? 1.06 : 1,
                            }}
                            transition={SPRING_SNAPPY}
                            className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
                              isSelected
                                ? 'border-[#EE1119] bg-[#1A1464] dark:bg-[#2E368F] text-white shadow-sm'
                                : 'border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] group-hover/node:border-[#EE1119]'
                            }`}
                          >
                            <NodeIcon className="h-4 w-4" aria-hidden="true" />
                          </motion.span>
                          <span
                            className={`mt-2 text-[11px] font-bold ${
                              isSelected
                                ? 'text-[#EE1119]'
                                : 'text-[#4A4F63] dark:text-[#B8C0DA]'
                            }`}
                          >
                            {node.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${activeApiInfo.id}-${flowPulseKey}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                      className="mt-4 rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-3.5"
                    >
                      <p className="text-xs leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                        {activeApiInfo.summary}
                      </p>
                      <p className="mt-2 font-mono text-[11px] font-semibold text-[#1A1464] dark:text-[#9FA8FF]">
                        Guarantee: {activeApiInfo.guarantee}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="relative z-10 mt-6 pt-4 border-t border-[#E5E7F0] dark:border-[#242C54] flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-[#6B7188] dark:text-[#8E97B8]">
                  MTN MoMo · Airtel Money · Cards
                </span>
                <button
                  type="button"
                  onClick={() => onSelectService('Custom Software & APIs')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Discuss Custom APIs</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </InteractiveCard>
          </StaggerItem>

          {/* Card 03: Zero-Downtime Release Pipeline */}
          <StaggerItem className="lg:col-span-5 h-full">
            <InteractiveCard
              hoverY={-5}
              className="group flex h-full flex-col justify-between rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 sm:p-8 shadow-sm transition-colors duration-200 hover:border-[#1A1464]/35 dark:hover:border-[#4F59B8]/60 hover:shadow-[0_20px_44px_rgba(26,20,100,0.08)] dark:hover:shadow-[0_20px_44px_rgba(0,0,0,0.45)]"
            >
              <div
                aria-hidden="true"
                className="absolute top-0 left-0 right-0 h-1 bg-[#EE1119] scale-x-0 origin-left transition-transform duration-300 group-hover/card:scale-x-100"
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#6B7188] dark:text-[#8E97B8]">
                    <span className="font-display text-[#EE1119] tabular-nums">03</span>
                    <span aria-hidden="true">·</span>
                    <span>Cloud &amp; CI/CD</span>
                  </div>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setPipelineStep((prev) => (prev + 1) % PIPELINE_STAGES.length)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-2.5 py-1 text-[11px] font-semibold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#EE1119] hover:text-[#EE1119] transition-colors whitespace-nowrap shrink-0"
                  >
                    <Server className="h-3 w-3" aria-hidden="true" />
                    <span>Next Stage</span>
                  </motion.button>
                </div>

                <h3 className="mt-4 font-display text-xl sm:text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                  Predictable, zero-downtime cloud releases.
                </h3>

                {/* Animated Pipeline Stepper */}
                <div className="mt-5 space-y-2.5">
                  {PIPELINE_STAGES.map((stage, idx) => {
                    const isCompleted = idx <= pipelineStep;
                    const isCurrent = idx === pipelineStep;
                    return (
                      <motion.button
                        key={stage.id}
                        type="button"
                        onClick={() => setPipelineStep(idx)}
                        whileTap={{ scale: 0.99 }}
                        className={`w-full rounded-xl border p-3 text-left transition-colors ${
                          isCurrent
                            ? 'border-[#1A1464] dark:border-[#4F59B8] bg-[#F6F7FB] dark:bg-[#101530]'
                            : 'border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] hover:border-[#1A1464]/35 dark:hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold transition-colors ${
                                isCompleted
                                  ? 'bg-[#10B981] text-white'
                                  : 'bg-[#F6F7FB] dark:bg-[#101530] text-[#6B7188] dark:text-[#8E97B8]'
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <span className="tabular-nums">{idx + 1}</span>
                              )}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC] truncate">
                              {stage.label}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] font-semibold text-[#6B7188] dark:text-[#8E97B8] tabular-nums shrink-0">
                            {stage.duration}
                          </span>
                        </div>

                        <AnimatePresence initial={false}>
                          {isCurrent && (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                              className="overflow-hidden pl-8.5 pt-1.5 text-xs leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]"
                            >
                              {stage.detail}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="relative z-10 mt-6 pt-4 border-t border-[#E5E7F0] dark:border-[#242C54] flex items-center justify-between gap-3">
                <span className="font-mono text-xs font-medium text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                  AWS · Azure · GCP · Terraform
                </span>
                <button
                  type="button"
                  onClick={() => onSelectService('DevOps & CI/CD Automation')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Discuss Cloud &amp; CI/CD</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </InteractiveCard>
          </StaggerItem>

          {/* Card 04 (Wide Bento): Security Hardening & Long-Term Care */}
          <StaggerItem className="lg:col-span-7 h-full">
            <InteractiveCard
              hoverY={-5}
              spotlightTone="dark"
              className="group flex h-full flex-col justify-between rounded-2xl bg-[#1A1464] dark:bg-[#141A3B] dark:border dark:border-[#2B3466] p-6 sm:p-8 text-white shadow-[0_20px_48px_rgba(26,20,100,0.18)] dark:shadow-[0_20px_48px_rgba(0,0,0,0.45)]"
            >
              <div
                aria-hidden="true"
                className="absolute top-0 right-10 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
              />

              <div className="relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/70">
                    <span className="font-display text-[#EE1119] tabular-nums">04</span>
                    <span aria-hidden="true">·</span>
                    <span>Security &amp; Long-Term Care</span>
                  </div>

                  {/* Security Mode Tabs */}
                  <div
                    role="tablist"
                    aria-label="Security and operational safeguards"
                    className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 p-1"
                  >
                    {SECURITY_MODES.map((item) => {
                      const active = securityMode === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setSecurityMode(item.id)}
                          className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                            active ? 'text-[#1A1464]' : 'text-white/80 hover:text-white'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="motion-card-security-tab"
                              aria-hidden="true"
                              transition={SPRING_SNAPPY}
                              className="absolute inset-0 rounded-lg bg-white shadow-sm"
                            />
                          )}
                          <span className="relative z-10">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-12 md:items-center">
                  {/* Animated Geometric Perimeter SVG */}
                  <div className="md:col-span-4 flex items-center justify-center">
                    <div className="relative flex h-40 w-40 items-center justify-center rounded-2xl border border-white/15 bg-white/5">
                      <svg
                        viewBox="0 0 120 120"
                        className="h-32 w-32"
                        fill="none"
                        aria-hidden="true"
                      >
                        <circle
                          cx="60"
                          cy="60"
                          r="48"
                          stroke="rgba(255,255,255,0.14)"
                          strokeWidth="1.5"
                          strokeDasharray="4 4"
                        />
                        <motion.circle
                          key={`ring-${securityMode}`}
                          cx="60"
                          cy="60"
                          r="48"
                          stroke="#EE1119"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          initial={{ pathLength: 0.15, rotate: -90 }}
                          animate={{ pathLength: 0.78, rotate: 0 }}
                          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
                          style={{ transformOrigin: '60px 60px' }}
                        />
                        <motion.circle
                          key={`inner-${securityMode}`}
                          cx="60"
                          cy="60"
                          r="34"
                          stroke="rgba(255,255,255,0.35)"
                          strokeWidth="1.5"
                          initial={{ scale: 0.9, opacity: 0.4 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={SPRING_SNAPPY}
                          style={{ transformOrigin: '60px 60px' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        {securityMode === 'iam' ? (
                          <Lock className="h-6 w-6 text-white" aria-hidden="true" />
                        ) : (
                          <ShieldCheck className="h-6 w-6 text-white" aria-hidden="true" />
                        )}
                        <span className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-white/75">
                          {activeSecurity.metricValue}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Animated Safeguard Details */}
                  <div className="md:col-span-8">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeSecurity.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
                      >
                        <h3 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                          {activeSecurity.headline}
                        </h3>
                        <ul className="mt-4 space-y-2.5">
                          {activeSecurity.points.map((point, idx) => (
                            <motion.li
                              key={point}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.06, ease: EASE_OUT_EXPO }}
                              className="flex items-start gap-2.5 text-sm text-white/85"
                            >
                              <Check
                                className="mt-0.5 h-4 w-4 text-[#EE1119] shrink-0"
                                aria-hidden="true"
                              />
                              <span>{point}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-6 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-medium text-white/70">
                  OWASP Controls · Automated Recovery · Monthly Reviews
                </span>
                <button
                  type="button"
                  onClick={() => onSelectService('Cybersecurity & Compliance')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:text-[#EE1119] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Discuss Security &amp; Support</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </InteractiveCard>
          </StaggerItem>
        </StaggerGrid>
      </div>
    </section>
  );
};
