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
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: 'art-idempotent-ledgers',
    slug: 'idempotent-mobile-money-ledgers',
    title: 'Engineering Idempotent Mobile Money Ledgers Under High-Latency Network Retries',
    excerpt:
      'How we architect double-entry PostgreSQL ledgers, deterministic idempotency keys, and out-of-order webhook reconcilers so duplicate retries never double-credit or drift balances.',
    category: 'Fintech Systems',
    authorName: 'Arigye Wisdom',
    authorRole: 'Principal Systems Architect · 0xDEV',
    publishedDate: 'March 12, 2026',
    readTimeMinutes: 8,
    featured: true,
    coverImage: '/src/assets/images/blog_fintech_ledger_1794909287930.jpg',
    stackTags: ['Go', 'PostgreSQL', 'Redis', 'Double-Entry Ledger'],
    keyTakeaways: [
      'Never mutate a mutable account balance column directly; append immutable debit and credit journal entries inside a serializable transaction.',
      'Bind every client request and mobile-money gateway callback to a composite idempotency key with payload hash verification.',
      'Separate synchronous authorization state from asynchronous provider settlement webhooks using an explicit state machine.',
    ],
    calloutQuote:
      'In payment infrastructure, network timeouts are not edge cases—they are the normal operating condition. Correctness must hold even when a client retries the exact transfer request four times across thirty seconds.',
    sections: [
      {
        id: 'failure-mode',
        heading: 'Why Naive Balance Updates Fail in Production',
        paragraphs: [
          'Early-stage payment APIs often store a numeric balance column on a user row and execute an update statement after receiving a response from a telecom or mobile-money aggregator. When a gateway times out at 28 seconds while still committing the upstream transfer, the client retries and triggers a second debit or credit.',
          'At 0xDEV, every financial workflow begins with an append-only journal model. Account balances are derived projections materialized from verified ledger lines where the sum of debits and credits across a transaction batch must strictly equal zero.',
        ],
      },
      {
        id: 'idempotency-gate',
        heading: 'Deterministic Idempotency Keys & Payload Fingerprinting',
        paragraphs: [
          'Before touching any ledger rows, incoming transfer endpoints acquire a Redis lock keyed by merchantId + idempotencyKey and validate a SHA-256 fingerprint of the canonical request body. If the same key arrives with a mutated amount or destination account, the API immediately rejects it with HTTP 422 rather than silently replaying stale state.',
          'If the original request is still in-flight, subsequent retries block briefly or return HTTP 409 with a status polling cursor. Once committed, the exact serialized response payload is persisted alongside the ledger transaction ID so future retries replay byte-for-byte identical receipts.',
        ],
      },
      {
        id: 'reconciliation-loop',
        heading: 'Asynchronous Webhook Verification & Automated Settlement Sweeps',
        paragraphs: [
          'Mobile-money callbacks frequently arrive out of order or twice within the same millisecond. Our webhook ingestion handlers verify HMAC-SHA256 provider signatures first, enqueue the raw event into a durable dead-letter-capable worker queue, and transition transfer records strictly along valid state edges (pending → settled or pending → reversed).',
          'A scheduled nightly reconciliation job cross-checks settled provider CSV/API statements against internal journal entries, surfacing any single-cent variance in seconds rather than waiting for month-end finance audits.',
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
    title: 'Designing Offline-First Flutter & SQLite Sync for Unreliable Field Connectivity',
    excerpt:
      'Field agents and rural clinics cannot wait for 4G bars to save critical records. Here is our blueprint for encrypted local SQLite outboxes, deterministic conflict merges, and bandwidth-lean delta sync.',
    category: 'Mobile & Offline',
    authorName: 'Arigye Wisdom',
    authorRole: 'Principal Systems Architect · 0xDEV',
    publishedDate: 'March 04, 2026',
    readTimeMinutes: 7,
    featured: false,
    coverImage: '/src/assets/images/blog_offline_sync_1794909287812.jpg',
    stackTags: ['Flutter', 'SQLite (SQLCipher)', 'Node.js', 'Delta Sync'],
    keyTakeaways: [
      'Treat the local encrypted SQLite database as the primary UI source of truth so interactions stay sub-16ms offline.',
      'Persist every local mutation as an ordered outbox command with client-generated UUIDv7 identifiers instead of relying on auto-increment IDs.',
      'Resolve concurrent edits deterministically at the field level using server-assigned monotonic sync cursors.',
    ],
    calloutQuote:
      'Offline-first is not a toggle you bolt on at the end of a mobile sprint. It determines how you generate primary keys, structure API payloads, and authenticate expired tokens without wiping unsynced user work.',
    sections: [
      {
        id: 'local-source-of-truth',
        heading: 'Making Local Storage the Primary Read/Write Boundary',
        paragraphs: [
          'Across agricultural cooperatives in Western Uganda and regional logistics fleets, field staff routinely work in dead zones for six to eight hours per shift. Any architecture that awaits a REST round-trip before confirming a weigh-in or patient intake will freeze in the field.',
          'Our mobile clients write immediately to an AES-256 encrypted SQLite store (SQLCipher) and render UI streams reactively from local queries. Every create, update, or status transition simultaneously appends an immutable mutation record into a local outbox table.',
        ],
      },
      {
        id: 'outbox-protocol',
        heading: 'Chunked Outbox Flushing & Cursor-Based Delta Pulls',
        paragraphs: [
          'When connectivity returns—even briefly over 2G/3G—a background isolate drains the outbox in small 25-record compressed batches. Each mutation carries a client-generated UUIDv7 and a base revision version.',
          'Rather than re-downloading entire catalogs, the client sends its last verified server watermark (last_sync_seq) and pulls only mutated rows changed since that sequence number, reducing daily cellular data consumption by over 82%.',
        ],
      },
      {
        id: 'auth-resilience',
        heading: 'Preventing Token Expiry Data Loss',
        paragraphs: [
          'One subtle failure mode in offline apps occurs when a JWT refresh token expires while unsynced mutations remain queued locally. Our apps never clear the local database on a 401 response; instead, they lock sync transport, prompt silent re-authentication, and resume draining the intact outbox once a fresh session is issued.',
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
    title: 'Cutting Multi-AZ Cloud Spend by 38% Without Compromising High Availability',
    excerpt:
      'Unchecked NAT gateway cross-AZ data transfer, idle staging clusters, and oversized RDS instances silently inflate cloud invoices. Here is the exact Terraform and FinOps playbook we run for clients.',
    category: 'Cloud & DevOps',
    authorName: 'Arigye Wisdom',
    authorRole: 'Principal Systems Architect · 0xDEV',
    publishedDate: 'February 21, 2026',
    readTimeMinutes: 6,
    featured: false,
    coverImage: '/src/assets/images/blog_cloud_infra_1794909289647.jpg',
    stackTags: ['Terraform', 'AWS ECS', 'FinOps', 'CloudWatch'],
    keyTakeaways: [
      'Audit cross-AZ traffic and S3/ECR NAT Gateway egress first—they frequently account for 25% of unexpected VPC charges.',
      'Automate off-hours scale-to-zero schedules for staging and QA environments directly inside Terraform modules.',
      'Right-size compute using p95 CPU/memory telemetry over 30-day rolling windows rather than provisioning for hypothetical peak guesses.',
    ],
    calloutQuote:
      'High availability requires redundancy across fault domains, not paying 24/7 enterprise compute rates for an idle staging environment every weekend.',
    sections: [
      {
        id: 'hidden-network-tax',
        heading: 'Eliminating Silent Cross-AZ & NAT Gateway Leakage',
        paragraphs: [
          'During infrastructure audits for growing SaaS teams, the largest single waste driver is rarely EC2 compute—it is private container tasks pulling gigabytes of Docker images and pushing S3 backups through a central NAT Gateway.',
          'By deploying Gateway VPC Endpoints for S3 and Interface Endpoints for ECR within Terraform, internal storage and registry traffic stays off paid NAT paths entirely. Combined with AZ-aware service discovery routing, inter-zone data transfer drops overnight.',
        ],
      },
      {
        id: 'ephemeral-staging',
        heading: 'Schedule-Driven Staging & Spot Fargate Capacity',
        paragraphs: [
          'We partition production workloads onto reserved baseline capacity paired with Spot/preemptible worker pools for asynchronous jobs such as PDF invoicing, video transcoding, and nightly exports. Meanwhile, non-production ECS services automatically scale desired_count to zero between 20:00 and 06:30 local engineering hours.',
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
    title: 'Zero-Trust ABAC Rules: Closing Shadow Updates and PII Leaks in Serverless Backends',
    excerpt:
      'Client-side route guards never protect a database. Learn how we structure strict schema allowlists, split PII collections, and enforce server-timestamp immutability at the rules layer.',
    category: 'Security',
    authorName: 'Arigye Wisdom',
    authorRole: 'Principal Systems Architect · 0xDEV',
    publishedDate: 'February 10, 2026',
    readTimeMinutes: 9,
    featured: false,
    coverImage: '/src/assets/images/blog_fintech_ledger_1794909287930.jpg',
    stackTags: ['Zero-Trust', 'ABAC', 'Firestore Rules', 'IAM'],
    keyTakeaways: [
      'Separate public display metadata from sensitive PII documents (emails, phone numbers, tax IDs) into owner-only subcollections.',
      'Validate incoming keys exhaustively with hasAll() and hasOnly() on every write to defeat shadow-field injection attacks.',
      'Always lock immutable audit columns (createdAt, authorId) and verify request.auth.token.email_verified == true.',
    ],
    calloutQuote:
      'If a security rule relies on the frontend promising to pass a clean where() filter or omit an admin flag, the database is already compromised.',
    sections: [
      {
        id: 'split-collections',
        heading: 'Enforcing PII Isolation Through Split Collections',
        paragraphs: [
          'Storing public usernames alongside private phone numbers, emails, and billing preferences in one flat user document forces teams into risky compromises whenever another screen needs a creator name.',
          'At 0xDEV, we physically isolate public identity records (/users/{uid}) from sensitive personal data (/users/{uid}/private/info). Even if an engineer accidentally queries the outer directory, zero personally identifiable fields can ever cross the wire.',
        ],
      },
      {
        id: 'anti-update-gap',
        heading: 'Closing the Update-Gap With Dual Validation Blueprints',
        paragraphs: [
          'A frequent vulnerability in serverless rulesets happens when teams validate document schemas during create but skip full field checks on update—allowing attackers to overwrite status flags or inject 1MB payloads into notes fields.',
          'Every collection we ship calls a shared isValid[Entity]() blueprint on both create and update, paired with affectedKeys().hasOnly([...]) so clients can only transition explicitly permitted columns while timestamps remain pinned to server request.time.',
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
    title: 'Sub-10ms Atomic Inventory & Booking Locks Without Distributed Deadlocks',
    excerpt:
      'How we prevent double-bookings and oversold flash inventory using single-round-trip Redis Lua scripts, monotonic fencing tokens, and PostgreSQL safety constraints.',
    category: 'Architecture',
    authorName: 'Arigye Wisdom',
    authorRole: 'Principal Systems Architect · 0xDEV',
    publishedDate: 'January 28, 2026',
    readTimeMinutes: 7,
    featured: false,
    coverImage: '/src/assets/images/blog_cloud_infra_1794909289647.jpg',
    stackTags: ['Redis Lua', 'PostgreSQL', 'Concurrency', 'TypeScript'],
    keyTakeaways: [
      'Execute check-and-decrement logic atomically inside a single Redis Lua script so no race window exists between GET and DECR.',
      'Pair fast in-memory reservations with short TTL leases and a PostgreSQL CHECK (stock >= 0) backstop.',
      'Attach monotonic fencing tokens to locks so paused workers can never overwrite newer leases after a GC pause.',
    ],
    sections: [
      {
        id: 'race-windows',
        heading: 'Why Application-Layer Mutexes Break Under Horizontal Scaling',
        paragraphs: [
          'Reading remaining stock in Node.js or Go, validating availability in memory, and writing back the decremented count works under single-user QA—and immediately oversells under 200 concurrent checkout requests across four container replicas.',
          'Moving the critical section into an atomic Redis Lua script eliminates network round-trip gaps while keeping p99 reservation latency under 4 milliseconds.',
        ],
      },
      {
        id: 'graceful-expiry',
        heading: 'Self-Healing Reservations With Lease TTLs',
        paragraphs: [
          'When a user abandons checkout mid-payment, held inventory or consultation slots must return cleanly to the pool without brittle cron cleanup scripts. Storing reservation holds with deterministic TTL expiration alongside idempotent order-finalization commits ensures stock automatically self-heals.',
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
    title: 'Why Multi-Vendor Software Projects Stall—and How Single-Pipeline Ownership Fixes It',
    excerpt:
      'When UX designers, backend contractors, DevOps freelancers, and support desks operate under separate contracts, every bug triggers a handoff tax. Here is our unified delivery model.',
    category: 'Architecture',
    authorName: 'Arigye Wisdom',
    authorRole: 'Principal Systems Architect · 0xDEV',
    publishedDate: 'January 14, 2026',
    readTimeMinutes: 5,
    featured: false,
    coverImage: '/src/assets/images/blog_offline_sync_1794909287812.jpg',
    stackTags: ['System Design', 'CI/CD', 'OpenAPI', 'Delivery Ops'],
    keyTakeaways: [
      'Share a single typed contract (OpenAPI / Zod / TypeScript) across frontend, mobile, and backend teams to kill integration drift.',
      'Own infrastructure-as-code alongside application sprints so staging environments match production from Week 1.',
      'Consolidate accountability under one engineering lead so incidents resolve in minutes rather than vendor email threads.',
    ],
    sections: [
      {
        id: 'handoff-tax',
        heading: 'The Hidden Cost of Disconnected Agency Handoffs',
        paragraphs: [
          'Most stalled software initiatives fail in the seams between teams: a Figma mockup ignores pagination edge cases, an API returns inconsistent snake_case errors, and an external DevOps contractor provisions IAM roles without understanding runtime queue memory limits.',
          'Organizations end up acting as unpaid technical project managers translating tickets between five unaligned vendors.',
        ],
      },
      {
        id: 'unified-sprint',
        heading: 'The 0xDEV 4-Layer Unified Delivery Architecture',
        paragraphs: [
          'We organize design, full-stack engineering, cloud provisioning, and 24/7 observability into one shared repository and deployment pipeline. Before a feature leaves sprint review, its database indexes, Terraform IAM permissions, error states, and monitoring alerts ship together as one verified increment.',
        ],
      },
    ],
  },
];
