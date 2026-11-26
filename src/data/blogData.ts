export type BlogCategory =
  | 'Architecture'
  | 'Cloud & DevOps'
  | 'Mobile & Offline'
  | 'Security'
  | 'Fintech Systems';

export const BLOG_CATEGORIES: ('All' | BlogCategory)[] = [
  'All',
  'Architecture',
  'Fintech Systems',
  'Cloud & DevOps',
  'Mobile & Offline',
  'Security',
];

export interface BlogSection {
  id: string;
  heading: string;
  paragraphs: string[];
}

export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  authorName: string;
  authorRole: string;
  publishedDate: string;
  readTimeMinutes: number;
  featured: boolean;
  coverImage: string;
  stackTags: string[];
  keyTakeaways: string[];
  calloutQuote?: string;
  sections: BlogSection[];
  codeExample?: {
    filename: string;
    language: string;
    code: string;
  };
  isCustom?: boolean;
  publishStatus?: 'published' | 'upcoming';
  scheduledDate?: string;
}

export const UPCOMING_BLOG_DISPATCHES: BlogArticle[] = [
  {
    id: 'upcoming-edge-caching-uganda',
    slug: 'upcoming-edge-caching-low-bandwidth-africa',
    title: 'Sub-200ms Edge Caching & Stale-While-Revalidate for East African Mobile Networks',
    excerpt:
      'Upcoming engineering deep-dive: how we tune Cloudflare Workers KV, ETags, and delta payloads for 3G reliability without stale financial data.',
    category: 'Cloud & DevOps',
    authorName: 'Arigye Wisdom',
    authorRole: 'Principal Systems Architect · 0xDEV',
    publishedDate: 'Upcoming Dispatch',
    scheduledDate: 'Next Thursday · 09:00 EAT',
    readTimeMinutes: 7,
    featured: false,
    publishStatus: 'upcoming',
    coverImage: '/src/assets/images/blog_cloud_infra_1794909289647.jpg',
    stackTags: ['Cloudflare Workers', 'HTTP Caching', 'ETag', 'TypeScript'],
    keyTakeaways: [
      'Separate immutable static asset caching from short-TTL stale-while-revalidate API responses.',
      'Use deterministic cache-tag invalidation when admin catalogs or prices change.',
      'Compress JSON payloads with Brotli and keep initial mobile bundles under 180 KB gzipped.',
    ],
    calloutQuote:
      'Fast web apps in Kampala or Kabale are won in payload discipline and smart edge invalidation, not heavy client frameworks.',
    sections: [
      {
        id: 'upcoming-preview',
        heading: 'Upcoming Dispatch Preview: Network Reality First',
        paragraphs: [
          'This upcoming technical brief walks through the exact Cloudflare Worker middleware and Cache-Control headers 0xDEV uses across client portals so mobile visitors load core views in under 200 milliseconds even on congested 3G towers.',
          'Full benchmarks, Terraform worker bindings, and invalidation webhook code will be published alongside our next release sprint.',
        ],
      },
    ],
  },
  {
    id: 'upcoming-passkeys-webauthn',
    slug: 'upcoming-webauthn-passkeys-fintech-portals',
    title: 'Replacing SMS OTP Fatigue With WebAuthn Passkeys in Financial Portals',
    excerpt:
      'Upcoming security guide: binding hardware-backed biometrics to high-value transfers while maintaining graceful SMS fallback for legacy devices.',
    category: 'Security',
    authorName: 'Arigye Wisdom',
    authorRole: 'Principal Systems Architect · 0xDEV',
    publishedDate: 'Upcoming Dispatch',
    scheduledDate: 'Coming Next Week',
    readTimeMinutes: 8,
    featured: false,
    publishStatus: 'upcoming',
    coverImage: '/src/assets/images/blog_fintech_ledger_1794909287930.jpg',
    stackTags: ['WebAuthn', 'Passkeys', 'FIDO2', 'Security'],
    keyTakeaways: [
      'Eliminate SIM-swap and telecom OTP delays with platform authenticators.',
      'Verify challenge nonces server-side with strict origin and RP ID checks.',
      'Provide multi-device recovery keys before disabling legacy second factors.',
    ],
    calloutQuote:
      'Telecom SMS delays cost fintech checkouts conversion and expose users to SIM-swap risk. Passkeys solve both when rolled out progressively.',
    sections: [
      {
        id: 'upcoming-preview',
        heading: 'Upcoming Dispatch Preview: Progressive Passkey Rollout',
        paragraphs: [
          'In this upcoming release note, we break down our server challenge verification pipeline and UX enrollment prompts so returning clients sign in with Face ID or Touch ID in one tap.',
        ],
      },
    ],
  },
];

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: 'art-idempotent-ledgers',
    slug: 'idempotent-mobile-money-ledgers',
    title: 'How to Build Mobile Money Ledgers That Survive Retries and Slow Networks',
    excerpt:
      'A practical look at double-entry PostgreSQL ledgers, idempotency keys, and out-of-order webhook handlers so duplicate retries never double-credit an account.',
    category: 'Fintech Systems',
    authorName: 'Arigye Wisdom',
    authorRole: 'Principal Systems Architect · 0xDEV',
    publishedDate: 'March 12, 2026',
    readTimeMinutes: 8,
    featured: true,
    coverImage: '/src/assets/images/blog_fintech_ledger_1794909287930.jpg',
    stackTags: ['Go', 'PostgreSQL', 'Redis', 'Double-Entry Ledger'],
    keyTakeaways: [
      'Do not overwrite a single balance column directly; write append-only debit and credit rows inside a serializable transaction.',
      'Tie every client transfer and mobile money callback to a unique idempotency key plus a request body hash.',
      'Keep synchronous request handling separate from async provider settlement callbacks with a strict state machine.',
    ],
    calloutQuote:
      'In mobile money systems, slow timeouts are normal Tuesday afternoon traffic. Your ledger still has to stay balanced if a phone retries the same transfer four times in thirty seconds.',
    sections: [
      {
        id: 'failure-mode',
        heading: 'Why Simple Balance Updates Break Under Load',
        paragraphs: [
          'A common mistake in early payment APIs is storing a plain numeric balance column on a user row and running an UPDATE right after calling a telecom aggregator. When the gateway hangs for 28 seconds but still sends the money upstream, the app retries and credits or debits the user twice.',
          'On our builds at 0xDEV, money never moves by overwriting a single number. Every transfer writes balanced debit and credit lines into an append-only journal table, where the batch sum always equals zero.',
        ],
      },
      {
        id: 'idempotency-gate',
        heading: 'Using Idempotency Keys and Payload Fingerprints',
        paragraphs: [
          'Before touching any database row, the transfer endpoint grabs a short Redis lock keyed by merchantId + idempotencyKey and checks a SHA-256 hash of the canonical JSON payload. If someone reuses the same key with a different amount or recipient, the API stops right away with HTTP 422 instead of replaying bad data.',
          'If the first attempt is still running, duplicate requests get a clean HTTP 409 status cursor. Once committed, we store the serialized receipt next to the transaction ID so any future retry returns the exact same response byte for byte.',
        ],
      },
      {
        id: 'reconciliation-loop',
        heading: 'Handling Out-of-Order Webhooks and Nightly Sweeps',
        paragraphs: [
          'Mobile money webhooks show up late, out of order, or twice inside the same millisecond. Our callback route checks the HMAC-SHA256 signature first, drops the raw payload onto a durable queue, and only moves transfers along valid edges like pending to settled or pending to reversed.',
          'Each night, a scheduled job compares upstream provider statements against our internal journal rows. If even one shilling is off, we know that morning instead of finding out during month-end accounting.',
        ],
      },
    ],
    codeExample: {
      filename: 'ledger/idempotent_transfer.sql',
      language: 'sql',
      code: `-- Atomic double-entry transfer guarded by unique idempotency key
BEGIN ISOLATION LEVEL SERIALIZABLE;

INSERT INTO idempotency_keys (key_id, merchant_id, request_hash, state)
VALUES ($1, $2, $3, 'IN_PROGRESS')
ON CONFLICT (merchant_id, key_id) DO NOTHING;

-- Verify debit source has sufficient cleared funds without negative drift
UPDATE wallet_accounts
SET cleared_balance = cleared_balance - $4,
    version = version + 1
WHERE account_id = $5
  AND cleared_balance >= $4
RETURNING account_id;

INSERT INTO ledger_entries (tx_id, account_id, direction, amount_minor)
VALUES
  ($6, $5, 'DEBIT',  $4),
  ($6, $7, 'CREDIT', $4);

COMMIT;`,
    },
  },
  {
    id: 'art-offline-first-sync',
    slug: 'offline-first-sqlite-sync-architecture',
    title: 'Offline-First Flutter & SQLite Sync for Patchy Field Connections',
    excerpt:
      'Field clerks and rural clinics cannot stare at a spinner waiting for 4G. Here is how we build encrypted SQLite outboxes and lean delta sync.',
    category: 'Mobile & Offline',
    authorName: 'Arigye Wisdom',
    authorRole: 'Principal Systems Architect · 0xDEV',
    publishedDate: 'March 04, 2026',
    readTimeMinutes: 7,
    featured: false,
    coverImage: '/src/assets/images/blog_offline_sync_1794909287812.jpg',
    stackTags: ['Flutter', 'SQLite (SQLCipher)', 'Node.js', 'Delta Sync'],
    keyTakeaways: [
      'Read and write straight to local encrypted SQLite first so every screen stays instant offline.',
      'Queue every change in a local outbox with client-generated UUIDv7 IDs instead of server auto-increment integers.',
      'Sync changes in small batches using monotonic server watermarks to cut mobile data usage.',
    ],
    calloutQuote:
      'Offline support cannot be tacked on during the final week of QA. It shapes how you pick primary keys, structure sync payloads, and handle expired auth tokens without losing unsynced field records.',
    sections: [
      {
        id: 'local-source-of-truth',
        heading: 'Reading and Writing Local Storage First',
        paragraphs: [
          'For farm cooperatives in Western Uganda and long-haul dispatch teams, staff spend hours in areas with zero signal. Any mobile app that waits on an API response before saving a weigh-in or patient intake form becomes unusable in the field.',
          'Our Flutter builds write directly to an AES-256 encrypted SQLite database (SQLCipher) and feed UI screens straight from local queries. Every create or edit also drops a small mutation record into a local outbox table.',
        ],
      },
      {
        id: 'outbox-protocol',
        heading: 'Small Batch Flushing and Cursor Sync',
        paragraphs: [
          'As soon as the phone catches even brief 2G or 3G signal, a background worker flushes the outbox in compressed batches of 25 records. Every item carries its own UUIDv7 and the base version it edited.',
          'Instead of pulling full tables again, the app sends its last confirmed server sequence number (last_sync_seq) and downloads only rows that changed since then. That simple change usually cuts cellular data use by over 80%.',
        ],
      },
      {
        id: 'auth-resilience',
        heading: 'Never Wiping Local Data on Expired Tokens',
        paragraphs: [
          'One nasty bug happens when a user refresh token expires while unsynced records are still sitting in the outbox. Our apps never wipe SQLite on a 401 response. They pause the sync worker, ask the clerk to log back in quietly, and then push the waiting queue cleanly.',
        ],
      },
    ],
    codeExample: {
      filename: 'sync/outbox_worker.ts',
      language: 'typescript',
      code: `export interface OutboxMutation {
  mutationId: string; // Client-generated UUIDv7
  entityType: 'harvest_batch' | 'payout_receipt';
  entityId: string;
  baseVersion: number;
  patch: Record<string, unknown>;
}

export async function applyDeltaBatch(
  mutations: OutboxMutation[],
  appliedByUserId: string
) {
  const results = [];
  for (const m of mutations) {
    // Idempotent deduplication by mutationId
    const alreadyApplied = await db.syncLog.findUnique({ where: { id: m.mutationId } });
    if (alreadyApplied) {
      results.push({ mutationId: m.mutationId, status: 'ALREADY_APPLIED' });
      continue;
    }
    results.push(await mergeFieldRevision(m, appliedByUserId));
  }
  return results;
}`,
    },
  },
  {
    id: 'art-terraform-finops',
    slug: 'terraform-finops-multi-az-cost-reduction',
    title: 'How We Cut Multi-AZ AWS Cloud Bills by 38% Without Dropping Uptime',
    excerpt:
      'Cross-AZ NAT traffic, weekend staging clusters, and oversized databases quietly pad cloud invoices. Here are the Terraform fixes we run first.',
    category: 'Cloud & DevOps',
    authorName: 'Arigye Wisdom',
    authorRole: 'Principal Systems Architect · 0xDEV',
    publishedDate: 'February 21, 2026',
    readTimeMinutes: 6,
    featured: false,
    coverImage: '/src/assets/images/blog_cloud_infra_1794909289647.jpg',
    stackTags: ['Terraform', 'AWS ECS', 'FinOps', 'CloudWatch'],
    keyTakeaways: [
      'Check NAT Gateway and cross-AZ transfer fees first; they often make up a quarter of an inflated VPC bill.',
      'Scale staging and QA services down to zero overnight and on weekends inside Terraform.',
      'Size instances from real 30-day p95 CPU and memory charts instead of launch-day guesses.',
    ],
    calloutQuote:
      'High availability means surviving a zone failure in production, not paying full enterprise rates for an idle QA cluster at 2 a.m. on Sunday.',
    sections: [
      {
        id: 'hidden-network-tax',
        heading: 'Stopping Quiet NAT Gateway and Cross-AZ Leakage',
        paragraphs: [
          'When we audit AWS accounts for growing SaaS products, the biggest shock on the invoice is rarely EC2 compute. Usually, private containers are pulling gigabytes of Docker images and writing S3 backups straight through a paid NAT Gateway.',
          'Adding Gateway VPC Endpoints for S3 and Interface Endpoints for ECR in Terraform keeps that internal traffic off NAT billing completely. Pairing that with zone-aware routing drops inter-AZ transfer fees overnight.',
        ],
      },
      {
        id: 'ephemeral-staging',
        heading: 'Scheduled Staging Shutdowns and Spot Workers',
        paragraphs: [
          'We keep production baselines on reserved capacity and move async jobs like PDF exports, video processing, and nightly reports onto Spot workers. Outside working hours (20:00 to 06:30), non-production ECS tasks automatically drop to zero.',
        ],
      },
    ],
    codeExample: {
      filename: 'infra/vpc_endpoints.tf',
      language: 'hcl',
      code: `# Keep S3 traffic off paid NAT Gateways via zero-cost Gateway Endpoint
resource "aws_vpc_endpoint" "s3_gateway" {
  vpc_id            = aws_vpc.core.id
  service_name      = "com.amazonaws.\${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id

  tags = {
    ManagedBy   = "0xDEV-Terraform"
    FinOpsScope = "egress-optimization"
  }
}`,
    },
  },
  {
    id: 'art-zero-trust-abac',
    slug: 'zero-trust-abac-database-rules',
    title: 'Locking Down Serverless Database Rules Against Shadow Writes and PII Leaks',
    excerpt:
      'Hiding buttons in React never protects your database. Here is how we isolate personal fields, lock down write schemas, and pin server timestamps.',
    category: 'Security',
    authorName: 'Arigye Wisdom',
    authorRole: 'Principal Systems Architect · 0xDEV',
    publishedDate: 'February 10, 2026',
    readTimeMinutes: 9,
    featured: false,
    coverImage: '/src/assets/images/blog_fintech_ledger_1794909287930.jpg',
    stackTags: ['Zero-Trust', 'ABAC', 'Firestore Rules', 'IAM'],
    keyTakeaways: [
      'Split public display names and avatars away from private contact fields into owner-only subcollections.',
      'Check every allowed key with hasAll() and hasOnly() on writes so extra fields cannot be smuggled in.',
      'Lock immutable audit columns (createdAt, authorId) and verify email ownership on sensitive actions.',
    ],
    calloutQuote:
      'If your database security depends on the browser promising to send a clean query or leave out an admin flag, the database is already wide open.',
    sections: [
      {
        id: 'split-collections',
        heading: 'Splitting Public Identity From Private Contact Data',
        paragraphs: [
          'Putting public display names in the same flat document as phone numbers, private emails, and billing flags forces awkward security compromises as soon as any screen needs to show a name.',
          'We separate public profile docs (/users/{uid}) from private contact records (/users/{uid}/private/info). Even if someone fetches a public profile record, zero private contact data sits inside it.',
        ],
      },
      {
        id: 'anti-update-gap',
        heading: 'Validating Both Create and Update Rules',
        paragraphs: [
          'A classic gap in serverless rules happens when teams validate document fields during create but leave update loosely guarded. Anyone with a token can then slip in extra keys or flip a status field.',
          'Every collection we write runs the same schema validator on create and update, checks affectedKeys().hasOnly([...]), and pins updatedAt directly to request.time.',
        ],
      },
    ],
    codeExample: {
      filename: 'security/abac_guard.rules',
      language: 'javascript',
      code: `allow update: if isVerifiedUser()
  && isValidId(docId)
  && isValidProjectInquiry(request.resource.data, docId)
  && resource.data.authorId == request.auth.uid
  && request.resource.data.authorId == resource.data.authorId
  && request.resource.data.createdAt == resource.data.createdAt
  && request.resource.data.updatedAt == request.time
  && request.resource.data.diff(resource.data).affectedKeys()
       .hasOnly(['message', 'phone', 'company', 'updatedAt']);`,
    },
  },
  {
    id: 'art-redis-atomic-locking',
    slug: 'redis-atomic-inventory-locking',
    title: 'Sub-10ms Redis Inventory & Slot Locks Without Overselling',
    excerpt:
      'How we stop double-bookings and flash-sale overselling using single-trip Redis Lua scripts and PostgreSQL safety checks.',
    category: 'Architecture',
    authorName: 'Arigye Wisdom',
    authorRole: 'Principal Systems Architect · 0xDEV',
    publishedDate: 'January 28, 2026',
    readTimeMinutes: 7,
    featured: false,
    coverImage: '/src/assets/images/blog_cloud_infra_1794909289647.jpg',
    stackTags: ['Redis Lua', 'PostgreSQL', 'Concurrency', 'TypeScript'],
    keyTakeaways: [
      'Run the stock check and decrement together inside one Redis Lua script so concurrent requests cannot race.',
      'Back fast memory holds with short TTL leases and a PostgreSQL CHECK (stock >= 0) constraint.',
      'Attach monotonic fencing tokens so stalled workers cannot overwrite newer leases.',
    ],
    sections: [
      {
        id: 'race-windows',
        heading: 'Why App-Level Checks Break Under Concurrent Traffic',
        paragraphs: [
          'Reading available stock in Node.js or Go, checking it in an if statement, and then writing the new number back works fine with one tester in QA. Put 200 shoppers on four app containers during a flash sale, and you immediately sell items you do not have.',
          'Moving that check-and-subtract step into a single Redis Lua script removes the network gap and keeps p99 lock times below 4 milliseconds.',
        ],
      },
      {
        id: 'graceful-expiry',
        heading: 'Self-Cleaning Holds With Short TTL Leases',
        paragraphs: [
          'If someone closes the browser halfway through checkout, held rooms or units should go back on sale automatically without flaky cleanup cron jobs. Short TTL leases paired with idempotent commit checks let holds expire cleanly on their own.',
        ],
      },
    ],
    codeExample: {
      filename: 'locking/reserve_slot.lua',
      language: 'lua',
      code: `-- Atomic inventory reservation in one Redis round-trip
local stockKey = KEYS[1]
local holdKey  = KEYS[2]
local qty      = tonumber(ARGV[1])
local ttlSec   = tonumber(ARGV[2])

local available = tonumber(redis.call('GET', stockKey) or '0')
if available < qty then
  return -1 -- Insufficient units
end

redis.call('DECRBY', stockKey, qty)
redis.call('SET', holdKey, qty, 'EX', ttlSec)
return available - qty`,
    },
  },
  {
    id: 'art-single-pipeline-ownership',
    slug: 'consolidating-five-vendors-one-engineering-pipeline',
    title: 'Why Multi-Vendor Projects Stall and How One Team Fixes It',
    excerpt:
      'When UI freelancers, backend contractors, hosting consultants, and support desks sit on separate contracts, every bug starts an email chain. Here is a cleaner setup.',
    category: 'Architecture',
    authorName: 'Arigye Wisdom',
    authorRole: 'Principal Systems Architect · 0xDEV',
    publishedDate: 'January 14, 2026',
    readTimeMinutes: 5,
    featured: false,
    coverImage: '/src/assets/images/blog_offline_sync_1794909287812.jpg',
    stackTags: ['System Design', 'CI/CD', 'OpenAPI', 'Delivery Ops'],
    keyTakeaways: [
      'Share one typed API contract (OpenAPI / Zod / TypeScript) across web, mobile, and backend.',
      'Keep Terraform infrastructure in the same delivery cycle so staging mirrors production from week one.',
      'Put one engineering lead in charge of the full stack so bugs get fixed instead of bounced around.',
    ],
    sections: [
      {
        id: 'handoff-tax',
        heading: 'Where Separate Contracts Slow Everything Down',
        paragraphs: [
          'Most stalled software builds fail in the gaps between teams: a Figma mockup ignores pagination edge cases, an API returns mismatched error formats, and a separate DevOps contractor configures IAM roles without knowing how background queues use memory.',
          'Founders end up acting as unpaid project managers forwarding screenshots between five different contractors.',
        ],
      },
      {
        id: 'unified-sprint',
        heading: 'Running Design, Code, Cloud, and Support Together',
        paragraphs: [
          'At 0xDEV we keep UI design, app code, cloud provisioning, and uptime monitoring inside one shared repo and sprint rhythm. Before a feature clears weekly review, its database indexes, Terraform permissions, error states, and monitoring checks go out together.',
        ],
      },
    ],
  },
];
