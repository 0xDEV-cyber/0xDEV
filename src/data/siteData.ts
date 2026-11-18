export type PageRoute =
  | 'home'
  | 'services'
  | 'why-0xdev'
  | 'process'
  | 'work'
  | 'blog'
  | 'movies'
  | 'about'
  | 'contact'
  | 'dashboard';

export interface NavItem {
  id: PageRoute;
  path: string;
  label: string;
}

export interface ServiceItem {
  id: string;
  number: string;
  title: string;
  summary: string;
  deepDive: string;
  idealFor: string;
  deliverables: string;
  iconName:
    | 'Compass'
    | 'Smartphone'
    | 'Code2'
    | 'Cloud'
    | 'GitBranch'
    | 'ShieldCheck'
    | 'Cpu'
    | 'Activity'
    | 'Layers';
}

export interface StackLayer {
  id: string;
  step: string;
  name: string;
  tagline: string;
  details: string;
  deliverables: string[];
}

export interface ProcessStep {
  id: string;
  step: string;
  title: string;
  duration: string;
  description: string;
  clientTouchpoint: string;
  qualityGate: string;
  artifacts: string[];
}

export interface TechItem {
  name: string;
  category: 'Frontend & Mobile' | 'Backend & APIs' | 'Cloud & DevOps' | 'Data & Security';
  role: string;
}

export type ProjectPreviewKind =
  | 'fintech'
  | 'telehealth'
  | 'logistics'
  | 'agritech'
  | 'ecommerce'
  | 'edtech'
  | 'cleantech'
  | 'saas'
  | 'pharma'
  | 'hospitality'
  | 'security'
  | 'govtech';

export interface CaseStudy {
  id: string;
  sector: string;
  region: string;
  timeline: string;
  title: string;
  clientType: string;
  deliverableType: string;
  previewUrl: string;
  previewKind: ProjectPreviewKind;
  problem: string;
  solution: string;
  architectureNotes: string;
  metrics: { value: string; label: string }[];
  stackSummary: string;
}

export interface StatItem {
  id: string;
  target: number;
  suffix: string;
  decimals?: number;
  label: string;
  context: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  company: string;
  outcome: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  location: string;
  specialty: string;
  initials: string;
  bio: string;
}

export interface EngagementModel {
  id: string;
  name: string;
  subtitle: string;
  cadence: string;
  description: string;
  bestFor: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
  budgetHint: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const COMPANY_CONTACT = {
  leadName: 'Arigye Wisdom',
  phoneDisplay: '+256 766 922 566',
  phoneRaw: '+256766922566',
  email: 'arigyewisdom7@gmail.com',
  studioEmail: 'hello@0xdev.io',
  location: 'Kabale, Western Uganda',
  availability: 'Kabale Studio · Available for Remote & Freelance Projects',
  timezone: 'East Africa Time (EAT / UTC+3) · Good overlap with UK, EU, Middle East & US East Coast',
};

export const NAV_LINKS: NavItem[] = [
  { id: 'services', path: '/services', label: 'Services' },
  { id: 'why-0xdev', path: '/why-0xdev', label: 'Why 0xDEV' },
  { id: 'process', path: '/process', label: 'Process' },
  { id: 'work', path: '/work', label: 'Work' },
  { id: 'blog', path: '/blog', label: 'Blog' },
  { id: 'movies', path: '/movies', label: 'Movies' },
  { id: 'about', path: '/about', label: 'About' },
  { id: 'contact', path: '/contact', label: 'Contact' },
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard' },
];

export const TRUST_PARTNERS = [
  { name: 'KoraPay Systems', sector: 'Fintech' },
  { name: 'ZuriHealth', sector: 'Telehealth' },
  { name: 'AtlasFreight', sector: 'Logistics' },
  { name: 'Kigezi AgriCoop', sector: 'AgriTech' },
  { name: 'PayGrid Africa', sector: 'Payments' },
  { name: 'NileLedger', sector: 'Enterprise SaaS' },
];

export const HERO_STACK_LAYERS: StackLayer[] = [
  {
    id: 'design',
    step: '01',
    name: 'Design',
    tagline: 'User flows, Figma component kits & clickable prototypes',
    details:
      'We sketch out screens, data states, and edge cases before anyone writes code, so developers know exactly what to ship.',
    deliverables: ['User Flows & Wireframes', 'Figma Component Kit', 'Clickable Prototype'],
  },
  {
    id: 'build',
    step: '02',
    name: 'Build',
    tagline: 'Web apps, mobile clients & backend APIs',
    details:
      'Clean TypeScript, Python, Go, and Flutter codebases with automated tests and clear API contracts between frontend and backend.',
    deliverables: ['Web & Mobile Apps', 'Backend APIs', 'Database & Payment Rails'],
  },
  {
    id: 'infrastructure',
    step: '03',
    name: 'Infrastructure',
    tagline: 'Cloud setup, CI/CD deploys & access security',
    details:
      'Reproducible Terraform templates, container builds, and locked-down IAM permissions on AWS, Azure, or Google Cloud.',
    deliverables: ['Terraform Setup', 'CI/CD Pipelines', 'IAM & Firewall Hardening'],
  },
  {
    id: 'maintain',
    step: '04',
    name: 'Maintain',
    tagline: 'Uptime monitoring, fast bug fixes & monthly improvements',
    details:
      'Live alerts, dependency updates, cloud bill checks, and steady feature releases with the same engineers who built your app.',
    deliverables: ['24/7 Alerting', 'Cost & Speed Audits', 'Ongoing Feature Sprints'],
  },
];

export const SERVICES: ServiceItem[] = [
  {
    id: 'product-design',
    number: '01',
    title: 'Product & UX/UI Design',
    summary:
      'Clear, practical interfaces and Figma component libraries that your team can hand straight to engineering.',
    deepDive:
      'Fixing a broken flow on a Figma screen takes five minutes; fixing it after launch takes five days. We map out real user paths first and build reusable UI tokens.',
    idealFor: 'New digital products, cluttered admin dashboards, or teams needing a clean component library.',
    deliverables: 'Workshops · Wireframes · Design systems · Clickable prototypes',
    iconName: 'Compass',
  },
  {
    id: 'web-mobile',
    number: '02',
    title: 'Web & Mobile App Development',
    summary:
      'Fast web apps and cross-platform iOS/Android builds that keep working even on patchy mobile data.',
    deepDive:
      'From React and Next.js web portals to offline-ready Flutter apps, we keep bundles light, cache local state properly, and test on real mid-range phones.',
    idealFor: 'Customer portals, field-agent apps, booking sites, and B2B software products.',
    deliverables: 'React & Next.js · Flutter & React Native · Progressive Web Apps',
    iconName: 'Smartphone',
  },
  {
    id: 'custom-software',
    number: '03',
    title: 'Custom Software & APIs',
    summary:
      'Internal operations tools, mobile money integrations, and clean REST or GraphQL APIs built around how you actually work.',
    deepDive:
      'We hook up MTN MoMo, Airtel Money, card gateways, ERPs, and legacy databases using idempotent webhooks and straightforward OpenAPI specs.',
    idealFor: 'Teams outgrowing spreadsheets or trying to connect several disconnected tools.',
    deliverables: 'Node.js, Python & Go · Background workers · Mobile money & card APIs',
    iconName: 'Code2',
  },
  {
    id: 'cloud-infra',
    number: '04',
    title: 'Cloud & Infrastructure',
    summary:
      'Reliable cloud setups across AWS, Azure, and Google Cloud that stay fast without surprise monthly bills.',
    deepDive:
      'We write reproducible Terraform configurations, isolate private networks, set up encrypted daily backups, and add hard billing alerts so nothing spikes unnoticed.',
    idealFor: 'Growing apps moving off a single VPS or teams trying to cut bloated cloud invoices.',
    deliverables: 'AWS, Azure & GCP · Terraform IaC · Automated backups & networking',
    iconName: 'Cloud',
  },
  {
    id: 'devops-cicd',
    number: '05',
    title: 'DevOps & CI/CD Automation',
    summary:
      'Zero-downtime releases, automated test checks, and container pipelines so shipping code stops feeling risky.',
    deepDive:
      'Manual SSH deployments break at the worst time. We set up automated builds, test runs, staged rollouts, and one-click rollbacks for every merge.',
    idealFor: 'Teams stuck with slow manual releases or worried about Friday-afternoon deploys.',
    deliverables: 'Docker & Kubernetes · GitHub Actions · Staged rollouts & rollbacks',
    iconName: 'GitBranch',
  },
  {
    id: 'cybersecurity',
    number: '06',
    title: 'Cybersecurity & Compliance',
    summary:
      'Practical security hardening, access controls, encryption, and audit logs baked into every sprint.',
    deepDive:
      'We tighten login and token flows, trim over-permissioned IAM roles, run dependency checks in CI, and keep clean logs for partner or ISO 27001 reviews.',
    idealFor: 'Fintech, healthcare, and business apps handling money or private customer data.',
    deliverables: 'OWASP & ISO 27001 prep · IAM tightening · Vulnerability fixes',
    iconName: 'ShieldCheck',
  },
  {
    id: 'data-ai',
    number: '07',
    title: 'Data, AI & Automation',
    summary:
      'Clean reporting pipelines, operational dashboards, and targeted workflow automation that cut manual spreadsheet work.',
    deepDive:
      'Before adding fancy automation, we clean up the underlying data: reliable ETL jobs, live KPI screens, and practical OCR or document extraction where it saves real hours.',
    idealFor: 'Ops teams spending half their week copy-pasting numbers between tools.',
    deliverables: 'ETL jobs · Reporting dashboards · Document & workflow automation',
    iconName: 'Cpu',
  },
  {
    id: 'maintenance-support',
    number: '08',
    title: 'Maintenance, Monitoring & 24/7 Support',
    summary:
      'Continuous uptime checks, quick incident fixes, dependency patches, and clear SLA response times.',
    deepDive:
      'Shipping version 1 is only half the work. We wire up error tracking, uptime probes, and clear on-call runbooks so problems get fixed before customers complain.',
    idealFor: 'Companies without an in-house SRE team that still need dependable uptime.',
    deliverables: '24/7 uptime alerts · Speed tuning · Direct engineer support',
    iconName: 'Activity',
  },
  {
    id: 'it-consulting',
    number: '09',
    title: 'IT Consulting & Digital Strategy',
    summary:
      'Honest architecture reviews, legacy rebuild plans, and vendor second opinions before you commit budget.',
    deepDive:
      'If you are scoping a freelance build, reviewing another agency quote, or trying to rescue a stuck codebase, we give you a plainspoken technical plan with real numbers.',
    idealFor: 'Founders, NGOs, and managers planning a big build or dealing with stalled code.',
    deliverables: 'Codebase audits · Build-vs-buy advice · Technical roadmaps',
    iconName: 'Layers',
  },
];

export const PROCESS_STEPS: ProcessStep[] = [
  {
    id: 'discover',
    step: '01',
    title: 'Discover',
    duration: 'Week 1–2',
    description:
      'We review what you already have, talk to the people who will use the software, and lock down scope, budget, and timeline.',
    clientTouchpoint: 'Kickoff call + written Scope & Risk Notes',
    qualityGate: 'Signed architecture sketch, ordered task list, and target dates.',
    artifacts: ['System Review', 'Architecture Plan', 'Milestone Schedule'],
  },
  {
    id: 'design',
    step: '02',
    title: 'Design',
    duration: 'Week 2–4',
    description:
      'Designers and engineers work side by side on screens, clickable prototypes, and database tables at the same time.',
    clientTouchpoint: 'Live Figma walkthrough with direct feedback',
    qualityGate: 'Screen approval, API schema check, and color-contrast check.',
    artifacts: ['Clickable Figma Prototype', 'UI Component Kit', 'API & Schema Specs'],
  },
  {
    id: 'build',
    step: '03',
    title: 'Build',
    duration: 'Week 4–10',
    description:
      'We ship working updates to a staging link every week across frontend, backend, and Terraform cloud config.',
    clientTouchpoint: 'Friday staging previews where you click through real features',
    qualityGate: 'Passing automated tests, peer code review, and dependency scans.',
    artifacts: ['Weekly Staging Links', 'Automated Tests', 'Terraform Cloud Config'],
  },
  {
    id: 'launch',
    step: '04',
    title: 'Launch',
    duration: 'Week 10–12',
    description:
      'We run load tests, verify backups, migrate data cleanly, and walk your staff through daily operations before going live.',
    clientTouchpoint: 'Launch checklist + live staff walkthrough',
    qualityGate: 'No open critical bugs, tested backup restore, and live error alerts.',
    artifacts: ['Security & Load Check', 'Live Data Migration', 'Operator Handover Docs'],
  },
  {
    id: 'maintain',
    step: '05',
    title: 'Maintain & Scale',
    duration: 'Ongoing',
    description:
      'After launch, the same engineers watch uptime around the clock, trim wasted cloud spend, and ship new updates.',
    clientTouchpoint: 'Monthly uptime, speed, and cloud-bill check-in',
    qualityGate: '99.9%+ availability target, regular patches, and fast incident response.',
    artifacts: ['24/7 Error Alerts', 'Monthly Cloud-Bill Audits', 'Ongoing Releases'],
  },
];

export const TECH_STACK: TechItem[] = [
  { name: 'React', category: 'Frontend & Mobile', role: 'Web Interfaces' },
  { name: 'TypeScript', category: 'Frontend & Mobile', role: 'Type-Safe Code' },
  { name: 'Next.js', category: 'Frontend & Mobile', role: 'SSR & Edge Apps' },
  { name: 'Flutter', category: 'Frontend & Mobile', role: 'iOS & Android' },
  { name: 'Node.js', category: 'Backend & APIs', role: 'API Services' },
  { name: 'Python', category: 'Backend & APIs', role: 'Data & Services' },
  { name: 'Go', category: 'Backend & APIs', role: 'High-Throughput' },
  { name: 'PostgreSQL', category: 'Data & Security', role: 'Primary Database' },
  { name: 'Redis', category: 'Backend & APIs', role: 'Caching & Queues' },
  { name: 'Docker', category: 'Cloud & DevOps', role: 'Containers' },
  { name: 'Kubernetes', category: 'Cloud & DevOps', role: 'Orchestration' },
  { name: 'AWS', category: 'Cloud & DevOps', role: 'Cloud Platform' },
  { name: 'Azure', category: 'Cloud & DevOps', role: 'Enterprise Cloud' },
  { name: 'Google Cloud', category: 'Cloud & DevOps', role: 'Cloud & Data' },
  { name: 'Terraform', category: 'Cloud & DevOps', role: 'Infra as Code' },
  { name: 'Datadog & Prometheus', category: 'Data & Security', role: 'Monitoring' },
];

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'nilepay-core',
    sector: 'Fintech',
    region: 'East & West Africa',
    timeline: '14 Weeks · Full-Stack Consolidation',
    title: 'NilePay Merchant Settlement Platform',
    clientType: 'Payment Infrastructure Provider',
    deliverableType: 'Web Platform & Settlement API',
    previewUrl: 'app.nilepay.co/settlements',
    previewKind: 'fintech',
    problem:
      'Three separate contractors managed the merchant portal, settlement API, and servers. Whenever payouts lagged by four hours, nobody owned the fix.',
    solution:
      '0xDEV unified the stack: cleaned up the merchant portal, rewrote settlement workers in Go and PostgreSQL, and moved hosting to multi-AZ AWS via Terraform.',
    architectureNotes:
      'Added idempotent ledger rows, dead-letter webhook queues, and automated failover alerts.',
    metrics: [
      { value: '99.98%', label: 'Measured Uptime (12 Mo)' },
      { value: '-64%', label: 'Settlement Latency' },
      { value: '420k+', label: 'Daily API Transactions' },
    ],
    stackSummary: 'React · Go · PostgreSQL · AWS EKS · Terraform',
  },
  {
    id: 'carebridge-telehealth',
    sector: 'Healthcare',
    region: 'Uganda, Kenya & UK',
    timeline: '11 Weeks · Design, Mobile & Cloud',
    title: 'CareBridge Patient & Clinician Portal',
    clientType: 'Multi-Branch Clinic Network',
    deliverableType: 'Mobile App & Clinician Web Suite',
    previewUrl: 'clinic.carebridgehealth.org',
    previewKind: 'telehealth',
    problem:
      'A growing clinic group needed encrypted patient intake, video consults, and automated lab syncing ready inside a strict 12-week window.',
    solution:
      'One 0xDEV team handled UX flows, Flutter mobile apps, encrypted Node.js services, and automated CI/CD checks from week one through launch.',
    architectureNotes:
      'Added offline-safe clinic sync in Flutter so regional branches keep registering patients when Wi-Fi drops.',
    metrics: [
      { value: '3.2x', label: 'Faster Patient Intake' },
      { value: '11 wks', label: 'Kickoff to Launch' },
      { value: 'Zero', label: 'Critical Audit Findings' },
    ],
    stackSummary: 'Flutter · Next.js · Node.js · Azure · GitHub Actions',
  },
  {
    id: 'atlasfreight-telemetry',
    sector: 'Logistics',
    region: 'Pan-African Corridor',
    timeline: '10 Weeks · Cloud Modernization',
    title: 'AtlasFreight Live Fleet & Cloud Rebuild',
    clientType: 'Cross-Border Freight Operator',
    deliverableType: 'Dispatch Dashboard & Cloud Infra',
    previewUrl: 'dispatch.atlasfreight.africa',
    previewKind: 'logistics',
    problem:
      'Old monolithic servers kept stalling during peak dispatch hours while oversized cloud databases quietly inflated the monthly hosting bill.',
    solution:
      '0xDEV moved legacy services into containers, added Redis job queues with a live dispatch screen, and took over 24/7 monitoring.',
    architectureNotes:
      'Right-sized database replicas and tied container autoscaling directly to live dispatch queue depth.',
    metrics: [
      { value: '-38%', label: 'Monthly Cloud Spend' },
      { value: '14 min', label: 'Release Cycle' },
      { value: '24/7', label: 'On-Call Coverage' },
    ],
    stackSummary: 'TypeScript · Python · Redis · Docker · GCP',
  },
  {
    id: 'kigezi-agricoop',
    sector: 'AgriTech',
    region: 'Kabale & Western Uganda',
    timeline: '8 Weeks · Mobile & Mobile Money APIs',
    title: 'Kigezi AgriCoop Harvest & Farmer Payout Hub',
    clientType: 'Regional Agricultural Cooperative',
    deliverableType: 'Offline Field App & Web Exchange',
    previewUrl: 'coop.kigeziagri.ug/harvest',
    previewKind: 'agritech',
    problem:
      'Collection centers around Kabale wrote harvest weights in paper books, delaying farmer mobile money payouts by up to nine days.',
    solution:
      'Built an offline-first Flutter collection app for field clerks synced to a buyer portal and automated MTN/Airtel Mobile Money bulk payouts.',
    architectureNotes:
      'Local SQLite queueing with signed batch verification so duplicate payouts cannot happen on reconnect.',
    metrics: [
      { value: '18 min', label: 'Average Farmer Payout' },
      { value: '6,400+', label: 'Registered Farmers' },
      { value: '100%', label: 'Digital Weight Records' },
    ],
    stackSummary: 'Flutter · TypeScript · Node.js · PostgreSQL · MoMo API',
  },
  {
    id: 'bantumart-commerce',
    sector: 'E-Commerce',
    region: 'Kampala · Kigali · Nairobi',
    timeline: '12 Weeks · Headless Storefront & Ops',
    title: 'BantuMart Multi-Vendor Marketplace',
    clientType: 'Retail & Wholesale Marketplace',
    deliverableType: 'Web Storefront & Vendor Portal',
    previewUrl: 'shop.bantumart.com/vendors',
    previewKind: 'ecommerce',
    problem:
      'A heavy template store broke under flash-sale traffic and had no automated way to split commissions across 300+ suppliers.',
    solution:
      'Built a fast Next.js storefront with edge caching, real-time stock holds, and automatic payout splits over card and mobile money.',
    architectureNotes:
      'Atomic Redis inventory locks prevent two buyers from checking out the last unit at once.',
    metrics: [
      { value: '0.8s', label: 'Median Page Load' },
      { value: '+142%', label: 'Checkout Conversion Lift' },
      { value: '320+', label: 'Active Vendors' },
    ],
    stackSummary: 'Next.js · TypeScript · Redis · PostgreSQL · AWS CloudFront',
  },
  {
    id: 'scholarpulse-erp',
    sector: 'EdTech',
    region: 'Uganda & East Africa',
    timeline: '9 Weeks · Full-Stack SaaS',
    title: 'ScholarPulse Campus ERP & Tuition Ledger',
    clientType: 'Multi-Campus School Group',
    deliverableType: 'Admin Portal, Parent Web & SMS Alerts',
    previewUrl: 'portal.scholarpulse.edu/fees',
    previewKind: 'edtech',
    problem:
      'School bursars spent weeks matching bank slips and mobile money fees by hand every term while parents waited days for receipts.',
    solution:
      'Shipped a school ERP with automatic bank and MoMo fee matching, instant PDF receipts, report card exports, and SMS attendance notices.',
    architectureNotes:
      'Strict per-campus data isolation with immutable audit rows for every fee edit.',
    metrics: [
      { value: '14,500', label: 'Students Tracked Daily' },
      { value: '-85%', label: 'Reconciliation Time' },
      { value: '99.9%', label: 'Receipt Delivery Rate' },
    ],
    stackSummary: 'React · TypeScript · Python · PostgreSQL · Docker',
  },
  {
    id: 'solargrid-paygo',
    sector: 'CleanTech',
    region: 'Rural East Africa',
    timeline: '11 Weeks · IoT Telemetry & Billing',
    title: 'SolarGrid Microgrid Telemetry & PayGo Cloud',
    clientType: 'Off-Grid Energy Operator',
    deliverableType: 'Operations Console & Billing API',
    previewUrl: 'ops.solargrid.energy/nodes',
    previewKind: 'cleantech',
    problem:
      'Field technicians had no remote view of rural battery inverters, forcing expensive truck dispatches just to inspect minor voltage drops.',
    solution:
      'Built an MQTT sensor ingestion pipeline, live inverter status screen, and automatic Pay-As-You-Go token delivery tied to customer payments.',
    architectureNotes:
      'Time-series aggregation with threshold alerts sent straight to the nearest regional technician.',
    metrics: [
      { value: '-47%', label: 'Avoided Field Trips' },
      { value: '1,850', label: 'Live Solar Nodes' },
      { value: '<3s', label: 'Token Activation' },
    ],
    stackSummary: 'Go · React · TimescaleDB · MQTT · Google Cloud',
  },
  {
    id: 'nileledger-saas',
    sector: 'SaaS',
    region: 'Global Remote & Africa',
    timeline: '10 Weeks · FinOps Web Platform',
    title: 'NileLedger SME Accounting & Tax Tool',
    clientType: 'B2B Financial SaaS',
    deliverableType: 'Multi-Tenant Web App',
    previewUrl: 'app.nileledger.io/cashflow',
    previewKind: 'saas',
    problem:
      'Small businesses struggled to track multi-branch expenses, tax receipts, and 90-day cashflow without messy spreadsheet chains.',
    solution:
      'Designed and built a fast multi-tenant accounting app with receipt OCR, bank feed matching, and rolling cashflow forecasts.',
    architectureNotes:
      'Row-level PostgreSQL tenant isolation with background queues for heavy tax exports.',
    metrics: [
      { value: '940+', label: 'Active Workspaces' },
      { value: '12 hrs', label: 'Saved Weekly per Team' },
      { value: '99.95%', label: 'API Availability' },
    ],
    stackSummary: 'React · TypeScript · Node.js · PostgreSQL · AWS',
  },
  {
    id: 'swiftmed-pharma',
    sector: 'Healthcare',
    region: 'East Africa',
    timeline: '9 Weeks · Supply & Cold-Chain App',
    title: 'SwiftMed Pharmacy Cold-Chain & Stock Portal',
    clientType: 'Medical Wholesale Distributor',
    deliverableType: 'B2B Ordering & Temperature Monitor',
    previewUrl: 'supply.swiftmed.co/coldchain',
    previewKind: 'pharma',
    problem:
      'Pharmacies lacked live batch expiry visibility and cold-room temperature alerts for sensitive vaccines and insulin.',
    solution:
      'Delivered a B2B restocking portal paired with continuous cold-chain sensor checks, batch tracing, and automatic expiry warnings.',
    architectureNotes:
      'Threshold rules fire instant SMS and dashboard alerts whenever cold storage drifts out of range.',
    metrics: [
      { value: '-72%', label: 'Expired Stock Waste' },
      { value: '410+', label: 'Connected Pharmacies' },
      { value: '24/7', label: 'Cold-Chain Checks' },
    ],
    stackSummary: 'Next.js · Flutter · Python · PostgreSQL · Terraform',
  },
  {
    id: 'rifttour-booking',
    sector: 'Hospitality',
    region: 'Western Uganda & International Guests',
    timeline: '7 Weeks · Custom Design & Booking',
    title: 'RiftTour Eco-Lodge & Trekking Booking Site',
    clientType: 'Regional Hospitality Group',
    deliverableType: 'Booking Website & Admin Desk',
    previewUrl: 'book.rifttour.ug/itineraries',
    previewKind: 'hospitality',
    problem:
      'Travelers booking lodges near Bwindi and Kabale dropped off after waiting days for manual PDF quote emails.',
    solution:
      'Built a clean booking site with live room and permit availability, USD/EUR/UGX card deposits, and instant itinerary PDFs.',
    architectureNotes:
      'Synced room inventory across direct web bookings and partner tour desks to stop double bookings.',
    metrics: [
      { value: '+118%', label: 'Direct Web Bookings' },
      { value: '4 min', label: 'Average Checkout Time' },
      { value: '38', label: 'Countries Served' },
    ],
    stackSummary: 'React · TypeScript · Node.js · Stripe · Cloud Run',
  },
  {
    id: 'vaultguard-security',
    sector: 'Cybersecurity',
    region: 'UK, EU & East Africa',
    timeline: '8 Weeks · Zero-Trust Security Suite',
    title: 'VaultGuard IAM & Audit Console',
    clientType: 'Regulated FinTech & SaaS Teams',
    deliverableType: 'Security Posture & Audit Portal',
    previewUrl: 'console.vaultguard.sec/posture',
    previewKind: 'security',
    problem:
      'Engineering leads lost weeks collecting IAM logs, TLS expiry records, and patch reports before partner security reviews.',
    solution:
      'Built an automated security console watching cloud IAM drift, key rotation dates, certificate health, and exportable audit logs.',
    architectureNotes:
      'Read-only cross-account cloud roles generating signed immutable compliance reports.',
    metrics: [
      { value: '82%', label: 'Faster Audit Prep' },
      { value: '100%', label: 'Automated CVE Triage' },
      { value: '<5 min', label: 'Drift Alert Time' },
    ],
    stackSummary: 'Go · React · PostgreSQL · AWS IAM · Kubernetes',
  },
  {
    id: 'civicserve-utility',
    sector: 'GovTech',
    region: 'Western Uganda Municipalities',
    timeline: '10 Weeks · Citizen Utility Portal',
    title: 'CivicServe Municipal Water & Utility Billing',
    clientType: 'Public Water Utility',
    deliverableType: 'Citizen Portal & Meter Reader App',
    previewUrl: 'pay.civicserve.go.ug/meters',
    previewKind: 'govtech',
    problem:
      'Residents queued in person to check water bills while field readers copied meter numbers onto paper clipboards.',
    solution:
      'Built a GPS-tagged Android/Flutter meter app paired with a lightweight citizen web portal for quick bill checks and mobile money payment.',
    architectureNotes:
      'Kept the citizen web bundle under 120 KB so pages open reliably on rural 3G connections.',
    metrics: [
      { value: '3.8x', label: 'On-Time Bill Payments' },
      { value: '28,000+', label: 'Households Connected' },
      { value: '98.4%', label: 'Verified Meter Accuracy' },
    ],
    stackSummary: 'Flutter · TypeScript · Node.js · PostgreSQL · Nginx',
  },
];

export const STATS: StatItem[] = [
  {
    id: 'projects',
    target: 50,
    suffix: '+',
    label: 'Projects Shipped',
    context: 'Across fintech, logistics, health & SaaS',
  },
  {
    id: 'uptime',
    target: 99.9,
    suffix: '%',
    decimals: 1,
    label: 'Measured Uptime',
    context: 'Automated health checks and multi-zone failover',
  },
  {
    id: 'support',
    target: 24,
    suffix: '/7',
    label: 'Direct Support',
    context: 'Straight to the engineers who wrote the code',
  },
  {
    id: 'unified',
    target: 5,
    suffix: '-in-1',
    label: 'Unified Stack',
    context: 'Design, code, cloud, security & ops together',
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    quote:
      'Before working with 0xDEV, every outage turned into a three-way call between our UI contractor, backend shop, and cloud consultant. Having one team own the whole stack cut our release cycle from three weeks down to two days.',
    name: 'Chief Technology Officer',
    role: 'Payments Infrastructure Partner',
    company: 'East & West Africa Corridor',
    outcome: '4 vendors consolidated into 1 · 58% faster releases',
  },
  {
    id: 't2',
    quote:
      'Arigye Wisdom and the studio stepped in eight weeks before launch, fixed our cloud bottlenecks, simplified patient onboarding, and stayed on for 24/7 monitoring. Peak clinic hours stopped feeling stressful.',
    name: 'VP of Product & Operations',
    role: 'Multi-Branch Clinic Network',
    company: 'Uganda, Kenya & UK',
    outcome: 'Zero downtime during 4x traffic spike · Ongoing SLA',
  },
  {
    id: 't3',
    quote:
      'What made the biggest difference was accountability. Their designers sit right alongside the engineers setting up infrastructure, so nothing gets lost in handoff and our monthly AWS bill dropped by nearly 40%.',
    name: 'Head of Engineering',
    role: 'Cross-Border Freight Operator',
    company: 'Pan-African Logistics',
    outcome: '38% lower monthly cloud spend · Unified web & mobile ops',
  },
];

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'm1',
    name: 'Arigye Wisdom',
    role: 'Founder & Principal Full-Stack Architect',
    location: 'Kabale, Uganda',
    specialty: 'Architecture, Full-Stack Code & Direct Client Lead',
    initials: 'AW',
    bio: 'Leads technical discovery, system architecture, and hands-on engineering from Kabale. Your direct point of contact for both full product builds and focused freelance contracts.',
  },
  {
    id: 'm2',
    name: 'Product & UI/UX Practice',
    role: 'Interface Architecture & Design Systems',
    location: 'Kabale Studio & Remote',
    specialty: 'User Flows, Figma Tokens & Interactive Prototypes',
    initials: 'UX',
    bio: 'Maps workflows, validates usability on real screens, and hands clean component specs straight into engineering sprints without design-to-code guesswork.',
  },
  {
    id: 'm3',
    name: 'Cloud, DevOps & Security',
    role: 'Infrastructure, CI/CD & Hardening',
    location: 'AWS · Azure · Google Cloud',
    specialty: 'Terraform IaC, Containers, IAM & Cost Control',
    initials: 'OPS',
    bio: 'Handles automated deployments, least-privilege permissions, encrypted backups, and cloud budget tuning so production stays fast and predictable.',
  },
  {
    id: 'm4',
    name: 'QA & 24/7 Reliability',
    role: 'Testing, Telemetry & Ongoing Support',
    location: 'EAT (UTC+3) · Round-the-Clock Alerts',
    specialty: 'Automated Test Suites, Monitoring & SLA Response',
    initials: 'SLA',
    bio: 'Owns automated test coverage, weekly staging verification, uptime probes, and rapid post-launch fixes so software keeps running smoothly long after launch day.',
  },
];

export const ENGAGEMENT_MODELS: EngagementModel[] = [
  {
    id: 'project-based',
    name: 'Project-Based & Freelance',
    subtitle: 'Fixed Scope & Milestones',
    cadence: '2–16 week deliveries',
    description:
      'Clear deliverables, a fixed schedule, and milestone payments. Built for focused freelance tasks or complete V1 product launches.',
    bestFor: 'Startups, SMEs, and freelance builds needing clear scope and clean handover.',
    features: [
      'Written architecture & UX plan upfront',
      'Weekly staging links you can test yourself',
      'Automated tests & CI/CD setup included',
      '100% source code & IP ownership',
    ],
    ctaLabel: 'Scope a Fixed Project',
    budgetHint: '$5k – $40k',
  },
  {
    id: 'dedicated-team',
    name: 'Dedicated Team',
    subtitle: 'Most Popular · Full-Stack Pod',
    cadence: 'Monthly flexible commitment',
    description:
      'Your own 0xDEV engineering pod covering design, full-stack development, and DevOps, shipping directly inside your roadmap.',
    bestFor: 'Growing products that need steady weekly releases without vendor friction.',
    features: [
      'Integrated design, dev & cloud pod',
      'Direct Slack/WhatsApp access with Arigye Wisdom',
      'Weekly sprint demos & clear velocity notes',
      'Adjust capacity month to month as priorities change',
    ],
    highlighted: true,
    ctaLabel: 'Build Your Dedicated Pod',
    budgetHint: '$40k – $100k',
  },
  {
    id: 'managed-retainer',
    name: 'Managed Retainer',
    subtitle: '24/7 Ops & Ongoing Updates',
    cadence: 'Quarterly or annual SLA',
    description:
      'Round-the-clock monitoring, security patching, cloud bill reviews, and a reserved monthly bank of engineering hours.',
    bestFor: 'Live production platforms that cannot afford unexpected downtime.',
    features: [
      '24/7 uptime alerts & 15-min SLA response',
      'Quarterly security & dependency checks',
      'Monthly AWS/Azure/GCP spend review',
      'Reserved hours for new features & bug fixes',
    ],
    ctaLabel: 'Secure Managed Support',
    budgetHint: '$1.5k – $15k/mo',
  },
];

export const FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'Where is 0xDEV based, and do you take remote or freelance work?',
    answer:
      'Our studio is in Kabale, Western Uganda (EAT / UTC+3), and we work both locally and with remote clients worldwide. Our hours overlap cleanly with East Africa, Europe, the UK, and the Middle East, plus morning hours with North America.',
  },
  {
    id: 'faq-2',
    question: 'How does using one team instead of five vendors actually save time and money?',
    answer:
      'When separate contractors handle design, frontend, backend, hosting, and support, you pay extra coordination overhead and lose weeks whenever a bug crosses teams. With 0xDEV, one team shares the same codebase, sprint board, and deployment pipeline.',
  },
  {
    id: 'faq-3',
    question: 'Do we keep 100% ownership of our source code, designs, and cloud accounts?',
    answer:
      'Yes, always. Figma files, Git repositories, Terraform scripts, and cloud accounts sit under your organization from day one. You are never locked into us.',
  },
  {
    id: 'faq-4',
    question: 'Can you handle smaller freelance tasks or fix an existing app?',
    answer:
      'Definitely. Alongside full builds, we take focused freelance jobs like building a mobile money integration, fixing a slow React or Flutter app, auditing cloud bills, or setting up automated deploys.',
  },
  {
    id: 'faq-5',
    question: 'How quickly can we get started after sending a brief?',
    answer:
      'We reply within one business day. Discovery calls and ballpark estimates happen in days 1 to 3, and sprints usually begin within 5 business days of sign-off.',
  },
  {
    id: 'faq-6',
    question: 'How do you handle security and support after launch?',
    answer:
      'Security starts on sprint one with tight IAM permissions, encrypted transport and storage, automated CVE checks in CI, and audit logs. After launch, our Managed Retainer plans keep 24/7 eyes on uptime with direct escalation to the engineers who built the system.',
  },
];
