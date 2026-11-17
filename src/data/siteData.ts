export type PageRoute =
  | 'home'
  | 'services'
  | 'why-0xdev'
  | 'process'
  | 'work'
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

export interface CaseStudy {
  id: string;
  sector: string;
  region: string;
  timeline: string;
  title: string;
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
  availability: 'Physical Studio in Kabale · Open for Global Remote & Freelance Engagements',
  timezone: 'East Africa Time (EAT / UTC+3) · Overlaps UK, EU, Middle East & US East Coast',
};

export const NAV_LINKS: NavItem[] = [
  { id: 'services', path: '/services', label: 'Services' },
  { id: 'why-0xdev', path: '/why-0xdev', label: 'Why 0xDEV' },
  { id: 'process', path: '/process', label: 'Process' },
  { id: 'work', path: '/work', label: 'Work' },
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
    tagline: 'Research-backed UX, design systems & clickable prototypes',
    details:
      'We map user journeys, information architecture, and accessible UI component systems before writing production code.',
    deliverables: ['User Flows & Wireframes', 'Figma Component System', 'Interactive Prototype'],
  },
  {
    id: 'build',
    step: '02',
    name: 'Build',
    tagline: 'Full-stack web, mobile apps & resilient API architecture',
    details:
      'Clean, modular TypeScript, Python, Go, and Flutter codebases engineered with automated test coverage and strict type safety.',
    deliverables: ['Web & Mobile Clients', 'Microservices & APIs', 'Database & Integrations'],
  },
  {
    id: 'infrastructure',
    step: '03',
    name: 'Infrastructure',
    tagline: 'Cloud provisioning, CI/CD pipelines & zero-trust security',
    details:
      'Repeatable Terraform modules, containerized workloads, and automated security scanning across AWS, Azure, or Google Cloud.',
    deliverables: ['Infrastructure as Code', 'CI/CD Release Pipelines', 'WAF & IAM Hardening'],
  },
  {
    id: 'maintain',
    step: '04',
    name: 'Maintain',
    tagline: '24/7 observability, SLA incident response & continuous upgrades',
    details:
      'Real-time alerting, dependency patching, cloud cost optimization, and iterative feature releases without vendor handoffs.',
    deliverables: ['24/7 On-Call Engineering', 'Telemetry & Cost Audits', 'Monthly Feature Releases'],
  },
];

export const SERVICES: ServiceItem[] = [
  {
    id: 'product-design',
    number: '01',
    title: 'Product & UX/UI Design',
    summary:
      'Turn complex workflows into clear, conversion-focused interfaces built on scalable Figma design systems.',
    deepDive:
      'Every engineering mistake is cheapest to fix on the canvas. We run stakeholder workshops, map edge cases, and build reusable component tokens that engineers implement directly without guesswork.',
    idealFor: 'New digital products, confusing legacy dashboards, or teams needing a unified component library.',
    deliverables: 'Discovery workshops · Wireframes · Design systems · Usability testing',
    iconName: 'Compass',
  },
  {
    id: 'web-mobile',
    number: '02',
    title: 'Web & Mobile App Development',
    summary:
      'Fast, accessible web platforms and cross-platform iOS/Android applications engineered for real-world network conditions.',
    deepDive:
      'From responsive SaaS portals in React and Next.js to offline-capable Flutter mobile applications, we optimize bundle sizes, caching, and low-bandwidth resilience.',
    idealFor: 'Customer-facing portals, field-agent mobile tools, booking platforms, and B2B SaaS products.',
    deliverables: 'React & Next.js · Flutter & React Native · Progressive Web Apps',
    iconName: 'Smartphone',
  },
  {
    id: 'custom-software',
    number: '03',
    title: 'Custom Software & APIs',
    summary:
      'Bespoke internal platforms, payment integrations, and high-throughput REST/GraphQL APIs tailored to your operations.',
    deepDive:
      'We integrate mobile money gateways, banking rails, ERP tools, and custom business logic using clean domain boundaries, idempotent webhooks, and thorough OpenAPI documentation.',
    idealFor: 'Organizations replacing brittle spreadsheets or connecting multiple third-party systems.',
    deliverables: 'Node.js, Python & Go · Event-driven backends · Mobile money & card APIs',
    iconName: 'Code2',
  },
  {
    id: 'cloud-infra',
    number: '04',
    title: 'Cloud & Infrastructure',
    summary:
      'Fault-tolerant multi-region architectures across AWS, Azure, and Google Cloud—designed to scale without runaway bills.',
    deepDive:
      'We provision reproducible cloud environments with Terraform, configure private VPC networking, automated encrypted backups, and strict budget alerts so infrastructure stays predictable.',
    idealFor: 'Growing platforms moving off single VPS servers or cutting bloated monthly cloud spend.',
    deliverables: 'AWS, Azure & GCP · Terraform IaC · High-availability networking',
    iconName: 'Cloud',
  },
  {
    id: 'devops-cicd',
    number: '05',
    title: 'DevOps & CI/CD Automation',
    summary:
      'Zero-downtime deployments, automated testing gates, and container orchestration that turn weeks of release prep into minutes.',
    deepDive:
      'Manual SSH deployments cause outages. We automate linting, unit/integration testing, container builds, and staged rollouts with instant rollback protection.',
    idealFor: 'Engineering teams shipping slowly or experiencing Friday-evening deployment failures.',
    deliverables: 'Docker & Kubernetes · GitHub Actions · Blue/green deployments',
    iconName: 'GitBranch',
  },
  {
    id: 'cybersecurity',
    number: '06',
    title: 'Cybersecurity & Compliance',
    summary:
      'Proactive threat modeling, penetration remediation, encryption standards, and audit readiness built into every sprint.',
    deepDive:
      'We harden authentication flows, enforce least-privilege IAM roles, automate dependency CVE checks, and structure audit logs to align with ISO 27001 and regional data protection frameworks.',
    idealFor: 'Fintech, healthcare, and enterprise platforms handling sensitive customer or financial records.',
    deliverables: 'OWASP & ISO 27001 readiness · IAM hardening · Vulnerability audits',
    iconName: 'ShieldCheck',
  },
  {
    id: 'data-ai',
    number: '07',
    title: 'Data, AI & Automation',
    summary:
      'Clean data pipelines, executive analytics warehouses, and practical workflow automation that eliminate manual bottlenecks.',
    deepDive:
      'Before chasing hype, we get your operational data clean and reliable—building automated ETL pipelines, real-time KPI reporting, and targeted AI document processing where ROI is clear.',
    idealFor: 'Operations teams spending hours reconciling reports manually across disconnected tools.',
    deliverables: 'ETL pipelines · BI dashboards · Document & workflow automation',
    iconName: 'Cpu',
  },
  {
    id: 'maintenance-support',
    number: '08',
    title: 'Maintenance, Monitoring & 24/7 Support',
    summary:
      'Round-the-clock uptime monitoring, rapid incident resolution, security patching, and SLA-backed operational continuity.',
    deepDive:
      'Software is never "done" on launch day. We attach structured logging, uptime probes, and clear escalation runbooks so issues are caught and fixed before your customers notice.',
    idealFor: 'Businesses without a full-time SRE team that need guaranteed stability and fast fixes.',
    deliverables: '24/7 alerting · Performance tuning · SLA response guarantees',
    iconName: 'Activity',
  },
  {
    id: 'it-consulting',
    number: '09',
    title: 'IT Consulting & Digital Strategy',
    summary:
      'Architecture reviews, legacy modernization roadmaps, and technical due diligence so leadership makes confident investments.',
    deepDive:
      'Whether you are scoping a freelance build, evaluating vendor proposals, or rescuing a stalled codebase, we deliver candid written technical assessments grounded in real implementation costs.',
    idealFor: 'Founders, NGOs, and enterprise leaders planning major software investments or audits.',
    deliverables: 'System audits · Build-vs-buy advisory · Fractional CTO support',
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
      'We audit existing systems, interview stakeholders, define measurable business KPIs, and lock down technical scope, budget, and security constraints.',
    clientTouchpoint: 'Kickoff workshop + written Technical Scope & Risk Register',
    qualityGate: 'Signed architecture diagram, prioritized backlog, and clear milestone dates.',
    artifacts: ['Technical Audit', 'System Architecture Blueprint', 'Milestone Roadmap'],
  },
  {
    id: 'design',
    step: '02',
    title: 'Design',
    duration: 'Week 2–4',
    description:
      'Our product designers and principal architects co-design user flows, interactive UI prototypes, and relational database schemas in parallel.',
    clientTouchpoint: 'Interactive Figma walkthrough with live stakeholder feedback',
    qualityGate: 'UX sign-off, API contract validation, and accessibility contrast review.',
    artifacts: ['Interactive Figma Prototype', 'Component Library', 'API & Data Contracts'],
  },
  {
    id: 'build',
    step: '03',
    title: 'Build',
    duration: 'Week 4–10',
    description:
      'Engineers ship weekly working builds across frontend, backend, and Terraform infrastructure with automated CI/CD checks on every pull request.',
    clientTouchpoint: 'Friday staging demos where you test real working software weekly',
    qualityGate: 'Automated test suite passing, code review sign-off, and vulnerability scans.',
    artifacts: ['Weekly Staging Releases', 'Automated Test Suites', 'Infrastructure as Code'],
  },
  {
    id: 'launch',
    step: '04',
    title: 'Launch',
    duration: 'Week 10–12',
    description:
      'We execute load testing, security hardening checks, zero-downtime data migration, and structured team training before production cutover.',
    clientTouchpoint: 'Go-live readiness checklist + live operator training session',
    qualityGate: 'Zero critical findings, verified backup restore drill, and active alerts.',
    artifacts: ['Load & Security Sign-Off', 'Zero-Downtime Cutover', 'Runbooks & Handover'],
  },
  {
    id: 'maintain',
    step: '05',
    title: 'Maintain & Scale',
    duration: 'Ongoing',
    description:
      'Post-launch, the same team monitors uptime 24/7, optimizes cloud spend, ships iterative features, and scales capacity ahead of demand.',
    clientTouchpoint: 'Monthly uptime, performance, and cloud-spend review briefing',
    qualityGate: '99.9%+ availability tracking, dependency patching, and SLA adherence.',
    artifacts: ['24/7 Telemetry & Alerts', 'Monthly Cost & SLA Reviews', 'Continuous Upgrades'],
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
  { name: 'PostgreSQL', category: 'Data & Security', role: 'Primary RDBMS' },
  { name: 'Redis', category: 'Backend & APIs', role: 'Caching & Queues' },
  { name: 'Docker', category: 'Cloud & DevOps', role: 'Containers' },
  { name: 'Kubernetes', category: 'Cloud & DevOps', role: 'Orchestration' },
  { name: 'AWS', category: 'Cloud & DevOps', role: 'Cloud Platform' },
  { name: 'Azure', category: 'Cloud & DevOps', role: 'Enterprise Cloud' },
  { name: 'Google Cloud', category: 'Cloud & DevOps', role: 'Cloud & Data' },
  { name: 'Terraform', category: 'Cloud & DevOps', role: 'Infra as Code' },
  { name: 'Datadog & Prometheus', category: 'Data & Security', role: 'Observability' },
];

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'nilepay-core',
    sector: 'Fintech',
    region: 'East & West Africa',
    timeline: '14 Weeks · Full-Stack Consolidation',
    title: 'NilePay Merchant Settlement Platform',
    problem:
      'Three disconnected contractors maintained the merchant portal, settlement API, and cloud servers—causing 4-hour reconciliation delays and weekly outage finger-pointing.',
    solution:
      '0xDEV consolidated the entire stack: redesigned the merchant dashboard, rebuilt settlement pipelines in Go and PostgreSQL, and migrated to multi-AZ AWS Kubernetes via Terraform.',
    architectureNotes:
      'Introduced idempotent ledger entries, dead-letter webhook queues, and automated failover monitoring.',
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
    problem:
      'A growing clinic network needed encrypted patient onboarding, mobile video consultations, and automated lab syncing under a strict 12-week launch window.',
    solution:
      'One 0xDEV product squad handled UX research, Flutter mobile apps, encrypted Node.js microservices, and automated CI/CD compliance checks from kickoff to production.',
    architectureNotes:
      'Built offline-tolerant clinic sync in Flutter so regional branches stay operational during spotty connectivity.',
    metrics: [
      { value: '3.2x', label: 'Faster Patient Onboarding' },
      { value: '11 wks', label: 'Kickoff to Production' },
      { value: 'Zero', label: 'Critical Audit Findings' },
    ],
    stackSummary: 'Flutter · Next.js · Node.js · Azure · GitHub Actions',
  },
  {
    id: 'atlasfreight-telemetry',
    sector: 'Logistics',
    region: 'Pan-African Corridor',
    timeline: '10 Weeks · Cloud Modernization',
    title: 'AtlasFreight Live Fleet & Cloud Modernization',
    problem:
      'Legacy monolithic servers crashed during peak dispatch hours while unoptimized cloud databases drove monthly hosting spend upward without visibility.',
    solution:
      '0xDEV containerized legacy services, introduced Redis event queues and real-time dispatch dashboards, and placed the platform under 24/7 managed SRE support.',
    architectureNotes:
      'Rightsized database read replicas and automated container autoscaling tied to real dispatch queue depth.',
    metrics: [
      { value: '-38%', label: 'Monthly Cloud Spend' },
      { value: '14 min', label: 'Automated Release Cycle' },
      { value: '24/7', label: 'SLA Incident Coverage' },
    ],
    stackSummary: 'TypeScript · Python · Redis · Docker · GCP',
  },
];

export const STATS: StatItem[] = [
  {
    id: 'projects',
    target: 50,
    suffix: '+',
    label: 'Projects Delivered',
    context: 'Across fintech, logistics, health & SaaS',
  },
  {
    id: 'uptime',
    target: 99.9,
    suffix: '%',
    decimals: 1,
    label: 'Production Uptime',
    context: 'Backed by automated multi-region failover',
  },
  {
    id: 'support',
    target: 24,
    suffix: '/7',
    label: 'Active Support',
    context: 'Direct access to engineers who built it',
  },
  {
    id: 'unified',
    target: 5,
    suffix: '-in-1',
    label: 'Unified Capabilities',
    context: 'Design, dev, cloud, security & ops combined',
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    quote:
      'Before 0xDEV, every outage turned into a three-way call between our UI freelancer, backend shop, and cloud consultant. Having one team own our product end-to-end cut our release cycle from three weeks to two days.',
    name: 'Tunde Adeyemi',
    role: 'Chief Technology Officer',
    company: 'PayGrid Financial Services',
    outcome: 'Consolidated 4 vendors into 1 · -58% release cycle time',
  },
  {
    id: 't2',
    quote:
      'Arigye Wisdom and the 0xDEV team stepped in eight weeks before our enterprise launch, audited our infrastructure, redesigned our onboarding flow, and stayed on as our managed SRE partner. We now sleep through peak traffic nights.',
    name: 'Amara Okafor',
    role: 'VP of Product & Operations',
    company: 'ZuriHealth Connect',
    outcome: 'Zero downtime during 4x traffic surge · 24/7 SLA coverage',
  },
  {
    id: 't3',
    quote:
      'What sets 0xDEV apart is real accountability. Their designers work side-by-side with their DevOps engineers from day one, so nothing gets lost in translation and our monthly cloud bill dropped by nearly forty percent.',
    name: 'David Mensah',
    role: 'Head of Engineering',
    company: 'AtlasFreight Logistics',
    outcome: '38% cloud cost reduction · Unified web & mobile platform',
  },
];

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'm1',
    name: 'Arigye Wisdom',
    role: 'Founder & Principal Full-Stack Architect',
    location: 'Kabale, Uganda',
    specialty: 'Full-Stack Engineering, Cloud & Delivery',
    initials: 'AW',
    bio: 'Leads software architecture, client advisory, and end-to-end project delivery from Kabale, Uganda—available for both dedicated enterprise builds and focused freelance engagements.',
  },
  {
    id: 'm2',
    name: 'Zainab Bello',
    role: 'Head of Product Design',
    location: 'Remote · East & West Africa',
    specialty: 'UX Strategy & Design Systems',
    initials: 'ZB',
    bio: 'Leads human-centered product discovery and multi-platform Figma component architectures built for speed and clarity.',
  },
  {
    id: 'm3',
    name: 'Kofi Boateng',
    role: 'Lead DevOps & Security Engineer',
    location: 'Remote · Accra / London',
    specialty: 'Kubernetes, Terraform & Compliance',
    initials: 'KB',
    bio: 'Specializes in zero-downtime CI/CD automation, cloud cost optimization, IAM hardening, and 24/7 SRE observability.',
  },
  {
    id: 'm4',
    name: 'Nadia Hassan',
    role: 'Client Delivery & QA Lead',
    location: 'Nairobi · EAT (UTC+3)',
    specialty: 'Automated Testing & Agile Ops',
    initials: 'NH',
    bio: 'Aligns cross-functional sprints with business milestones so every client works with one clear point of contact.',
  },
];

export const ENGAGEMENT_MODELS: EngagementModel[] = [
  {
    id: 'project-based',
    name: 'Project-Based & Freelance',
    subtitle: 'Fixed Scope & Milestones',
    cadence: '2–16 week deliveries',
    description:
      'Clear deliverables, fixed timeline, and transparent milestone pricing—whether for a focused freelance feature build or a complete MVP launch.',
    bestFor: 'Startups, SMEs, and freelance builds needing predictable scope and clean handover.',
    features: [
      'Upfront architecture & UX blueprint',
      'Weekly staging demos & sprint reviews',
      'Automated test suite & CI/CD setup',
      '100% source code & IP ownership transfer',
    ],
    ctaLabel: 'Scope a Fixed Project',
    budgetHint: '$5k – $40k',
  },
  {
    id: 'dedicated-team',
    name: 'Dedicated Team',
    subtitle: 'Most Popular · Full-Stack Squad',
    cadence: 'Monthly flexible commitment',
    description:
      'Your own integrated 0xDEV pod—product designer, full-stack engineers, and DevOps lead—working directly inside your roadmap.',
    bestFor: 'Scaling products needing continuous shipping without multi-vendor friction.',
    features: [
      'Cross-functional designer, dev & DevOps pod',
      'Direct collaboration with Arigye Wisdom & leads',
      'Shared Slack/WhatsApp & weekly velocity tracking',
      'Scale capacity up or down as priorities shift',
    ],
    highlighted: true,
    ctaLabel: 'Build Your Dedicated Pod',
    budgetHint: '$40k – $100k',
  },
  {
    id: 'managed-retainer',
    name: 'Managed Retainer',
    subtitle: '24/7 Ops & Continuous Evolution',
    cadence: 'Quarterly or annual SLA',
    description:
      'Guaranteed uptime, proactive cloud optimization, security patching, and a reserved monthly bank of engineering hours.',
    bestFor: 'Mission-critical production platforms requiring round-the-clock reliability.',
    features: [
      '24/7 incident monitoring & 15-min SLA response',
      'Quarterly security & dependency audits',
      'Monthly AWS/Azure/GCP cost optimization',
      'Reserved hours for enhancements & bug fixes',
    ],
    ctaLabel: 'Secure Managed Support',
    budgetHint: '$1.5k – $15k/mo',
  },
];

export const FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'Where is 0xDEV located, and do you take remote or freelance jobs?',
    answer:
      'Our physical studio is based in Kabale, Western Uganda (EAT / UTC+3), and we actively work on both local engagements and international remote or freelance contracts. Our timezone overlaps cleanly with East Africa, Europe, the UK, and the Middle East, plus morning overlap with North America.',
  },
  {
    id: 'faq-2',
    question: 'How does replacing five vendors with 0xDEV save time and cost?',
    answer:
      'When separate vendors handle design, frontend, backend, cloud, and support, you pay overlapping management margins and lose weeks to misaligned handoffs. With 0xDEV, one integrated team shares the same sprint board, architecture standards, and deployment pipeline—eliminating translation errors and finger-pointing.',
  },
  {
    id: 'faq-3',
    question: 'Do we retain 100% ownership of our source code, designs, and cloud accounts?',
    answer:
      'Always. Everything we design and engineer—Figma files, Git repositories, Terraform infrastructure scripts, and documentation—is built directly inside accounts you own and control. You never face vendor lock-in.',
  },
  {
    id: 'faq-4',
    question: 'Can you take on smaller freelance builds or fix an existing codebase?',
    answer:
      'Yes. In addition to full-lifecycle builds, we regularly take on focused freelance engagements—such as building a specific API integration, rescuing a stalled React/Flutter app, auditing cloud costs, or setting up CI/CD pipelines.',
  },
  {
    id: 'faq-5',
    question: 'How quickly can we kick off after submitting a project brief?',
    answer:
      'We respond to every inquiry within one business day. Discovery calls and scope estimation happen in days 1–3, and development or design sprints typically kick off within 5 business days of agreement.',
  },
  {
    id: 'faq-6',
    question: 'How do you handle cybersecurity and post-launch support?',
    answer:
      'Security is built into every phase: least-privilege IAM policies, encrypted data at rest and in transit, automated dependency scanning in CI/CD, and structured logging. Post-launch, our Managed Retainer plans provide 24/7 uptime monitoring and direct escalation to the engineers who built your system.',
  },
];
