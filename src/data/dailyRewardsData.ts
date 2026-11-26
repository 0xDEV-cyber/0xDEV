export interface ExclusiveTechResource {
  id: string;
  title: string;
  category: string;
  formatLabel: string;
  summary: string;
  requiredStreakDays: number;
  unlockCostCredits: number;
  steps: string[];
  codeFilename: string;
  codeLanguage: string;
  codeSnippet: string;
}

export interface DailyLadderStep {
  day: number;
  credits: number;
  milestoneLabel?: string;
}

export const DAILY_STREAK_LADDER: DailyLadderStep[] = [
  { day: 1, credits: 25, milestoneLabel: 'Welcome Check-In' },
  { day: 2, credits: 35 },
  { day: 3, credits: 50, milestoneLabel: 'SQL Migration Kit' },
  { day: 4, credits: 65 },
  { day: 5, credits: 85, milestoneLabel: 'Outbox Sync Pack' },
  { day: 6, credits: 100 },
  { day: 7, credits: 150, milestoneLabel: 'Security Audit Kit' },
];

export function getUtcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getPreviousUtcDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map((n) => Number(n));
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export function computeNextStreak(
  lastClaimDay: string | null,
  currentStreak: number,
  todayKey: string
): number {
  if (!lastClaimDay) return 1;
  if (lastClaimDay === getPreviousUtcDateKey(todayKey)) {
    return Math.max(1, currentStreak + 1);
  }
  return 1;
}

/**
 * Returns DevCredits awarded for a given streak day.
 * Strictly capped <= 200 to align with Firestore security rules anti-inflation guard.
 */
export function getRewardCreditsForStreakDay(streakDay: number): number {
  if (streakDay <= 1) return 25;
  if (streakDay === 2) return 35;
  if (streakDay === 3) return 50;
  if (streakDay === 4) return 65;
  if (streakDay === 5) return 85;
  if (streakDay === 6) return 100;
  if (streakDay % 7 === 0) return streakDay >= 14 ? 200 : 150;
  return 90;
}

export const EXCLUSIVE_TECH_RESOURCES: ExclusiveTechResource[] = [
  {
    id: 'res-pg-zero-downtime',
    title: 'Zero-Downtime PostgreSQL Expand & Contract Kit',
    category: 'Database Engineering',
    formatLabel: 'SQL + Runbook',
    summary:
      'Safely rename columns, split hot tables, and backfill millions of rows in production without locking reads or dropping active client requests.',
    requiredStreakDays: 3,
    unlockCostCredits: 60,
    steps: [
      'Expand phase: add the nullable target column and deploy dual-write application handlers.',
      'Backfill in bounded chunks of 2,000 rows using SKIP LOCKED and a 25ms pause between batches.',
      'Attach NOT VALID check constraints first, then run VALIDATE CONSTRAINT with zero exclusive table locks.',
      'Verify read parity across 24 hours before dropping legacy triggers or columns in the contract phase.',
    ],
    codeFilename: 'migrations/expand_contract_safe.sql',
    codeLanguage: 'sql',
    codeSnippet: `-- 1. Prevent runaway lock queues during live traffic
SET lock_timeout = '1500ms';
SET statement_timeout = '8000ms';

-- 2. Expand without rewriting existing rows
ALTER TABLE client_ledgers
  ADD COLUMN IF NOT EXISTS settlement_currency CHAR(3);

-- 3. Add constraint without blocking concurrent writes
ALTER TABLE client_ledgers
  ADD CONSTRAINT chk_settlement_currency_iso
  CHECK (settlement_currency ~ '^[A-Z]{3}$') NOT VALID;

-- 4. Validate using ShareUpdateExclusiveLock (allows reads & writes)
ALTER TABLE client_ledgers
  VALIDATE CONSTRAINT chk_settlement_currency_iso;`,
  },
  {
    id: 'res-offline-outbox-sync',
    title: 'Offline-First Outbox & Conflict Resolution Blueprint',
    category: 'Mobile & Edge Sync',
    formatLabel: 'TypeScript Pattern',
    summary:
      'Client mutation outbox queue with UUIDv7 idempotency keys, jittered backoff, and clean rebase behavior when field devices reconnect on patchy 3G.',
    requiredStreakDays: 5,
    unlockCostCredits: 120,
    steps: [
      'Persist every mutation locally before firing network calls so slow connections never block field clerks.',
      'Tag each queued write with a deterministic client mutationId to guarantee server-side idempotency.',
      'Flush outbox items sequentially in batches of 15 and halt gracefully on HTTP 401 without wiping queued records.',
      'Log conflict diffs cleanly for supervisor review rather than silently dropping offline edits.',
    ],
    codeFilename: 'sync/idempotent_outbox.ts',
    codeLanguage: 'typescript',
    codeSnippet: `export interface QueuedMutation<T = unknown> {
  mutationId: string;
  entity: string;
  baseVersion: number;
  payload: T;
  attempts: number;
}

export async function flushOutboxQueue(
  queue: QueuedMutation[],
  sendBatch: (items: QueuedMutation[]) => Promise<string[]>
): Promise<string[]> {
  const batch = queue.slice(0, 15);
  if (batch.length === 0) return [];

  const confirmedIds = await sendBatch(batch);
  return confirmedIds;
}`,
  },
  {
    id: 'res-firestore-rules-audit',
    title: 'Hardened Multi-Tenant Firestore Rules & Audit Pack',
    category: 'Cloud Security',
    formatLabel: 'Rules + Checklist',
    summary:
      'Production-hardened ABAC Firestore patterns covering PII isolation subcollections, key-allowlist validation, atomic counters, and anti-inflation checks.',
    requiredStreakDays: 7,
    unlockCostCredits: 200,
    steps: [
      'Separate public profile documents (/users/{uid}) from sensitive email/phone PII (/users/{uid}/private/info).',
      'Enforce identical schema checks on both create and update operations using hasAll() + hasOnly().',
      'Guard client-writable ledgers against arbitrary balance edits using exact delta invariants in security rules.',
      'Lint every rule change with @firebase/eslint-plugin-security-rules before deployment.',
    ],
    codeFilename: 'security/anti_inflation_guard.rules',
    codeLanguage: 'javascript',
    codeSnippet: `allow update: if isVerifiedUser()
  && isOwner(userId)
  && request.resource.data.createdAt == resource.data.createdAt
  && request.resource.data.updatedAt == request.time
  && request.resource.data.lifetimeCredits > resource.data.lifetimeCredits
  && request.resource.data.lifetimeCredits <= resource.data.lifetimeCredits + 200
  && (request.resource.data.devCredits - resource.data.devCredits)
     == (request.resource.data.lifetimeCredits - resource.data.lifetimeCredits);`,
  },
  {
    id: 'res-perf-vitals-checklist',
    title: 'Sub-Second React & AWS FinOps Production Checklist',
    category: 'Performance & Infra',
    formatLabel: 'Architecture Pack',
    summary:
      'End-to-end checklist for keeping mobile JS bundles lean, eliminating NAT Gateway egress waste in Terraform, and auditing p95 LCP & INP metrics.',
    requiredStreakDays: 14,
    unlockCostCredits: 320,
    steps: [
      'Route S3 and ECR container pulls through zero-cost VPC Gateway/Interface Endpoints instead of paid NAT Gateways.',
      'Code-split secondary portal views and preload critical hero typography without blocking first contentful paint.',
      'Compress user-uploaded media client-side into WebP before persisting or transmitting over cellular networks.',
      'Schedule non-production ECS staging clusters to scale down outside active engineering sprint hours.',
    ],
    codeFilename: 'infra/finops_gateway_endpoint.tf',
    codeLanguage: 'hcl',
    codeSnippet: `resource "aws_vpc_endpoint" "s3_direct" {
  vpc_id            = aws_vpc.production.id
  service_name      = "com.amazonaws.\${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private_subnets[*].id

  tags = {
    Owner   = "0xDEV"
    Purpose = "Zero-NAT S3 egress"
  }
}`,
  },
];
