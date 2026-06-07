import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('public/board/assets');
const statusColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'];

const themes = [
  {
    file: 'compact-saas.png',
    product: 'Northstar CRM',
    eyebrow: 'Feature requests',
    title: 'Customer feedback',
    subtitle: 'Prioritize the requests your accounts keep asking for.',
    tabs: ['Top', 'New', 'Planned', 'Shipped'],
    active: 'Top',
    cta: 'New idea',
    colors: [
      '#eef3f8',
      '#ffffff',
      '#f7f9fc',
      '#172033',
      '#62718a',
      '#d8e0ea',
      '#2563eb',
      '#16a34a',
    ],
    font: 'Inter, Arial, sans-serif',
    radius: 12,
    layout: 'list',
    density: 'compact',
    ideas: [
      [
        '118',
        'Account-level request rollups',
        'Show votes grouped by company and plan tier.',
        'Planned',
        'Revenue',
        'Maya',
        '2d',
      ],
      [
        '92',
        'Saved filters for support teams',
        'Let CSMs save views for churn-risk accounts.',
        'Under review',
        'Workflow',
        'Jon',
        '4d',
      ],
      [
        '73',
        'Bulk merge duplicate ideas',
        'Combine repeated posts without losing voters.',
        'Open',
        'Admin',
        'Priya',
        '1w',
      ],
      [
        '45',
        'CSV export for board data',
        'Download posts, votes, and status history.',
        'In progress',
        'Data',
        'Owen',
        '2w',
      ],
    ],
  },
  {
    file: 'creator-community.png',
    product: 'Canvas Club',
    eyebrow: 'Community wishlist',
    title: 'What should we build next?',
    subtitle: 'Members vote on workshop tools, templates, and community features.',
    tabs: ['Trending', 'Fresh', 'In progress', 'Launched'],
    active: 'Trending',
    cta: 'Suggest',
    colors: [
      '#fff7ed',
      '#fffdf8',
      '#fff4de',
      '#302013',
      '#825f43',
      '#f0d5b3',
      '#d94686',
      '#f59e0b',
    ],
    font: 'Avenir, Inter, Arial, sans-serif',
    radius: 22,
    layout: 'list',
    density: 'airy',
    ideas: [
      [
        '342',
        'Shared moodboard rooms',
        'Let members co-curate references before live sessions.',
        'Trending',
        'Collab',
        'Nia',
        'today',
      ],
      [
        '214',
        'Downloadable brush packs',
        'Bundle instructor presets with each workshop.',
        'Planned',
        'Assets',
        'Theo',
        '1d',
      ],
      [
        '169',
        'Creator profile spotlights',
        'Feature member work after each challenge.',
        'Open',
        'Community',
        'Ari',
        '3d',
      ],
      [
        '88',
        'Replay bookmarks',
        'Save timestamps while watching class replays.',
        'In progress',
        'Learning',
        'Lena',
        '6d',
      ],
    ],
  },
  {
    file: 'developer-portal.png',
    product: 'Atlas API',
    eyebrow: 'Developer portal',
    title: 'API feedback board',
    subtitle: 'Vote on SDKs, docs, webhooks, and workflow improvements.',
    tabs: ['Top', 'Docs', 'SDKs', 'Webhooks'],
    active: 'Top',
    cta: 'Request',
    colors: [
      '#07111f',
      '#0f1b2e',
      '#111f35',
      '#e6edf8',
      '#91a3bd',
      '#233655',
      '#38bdf8',
      '#a78bfa',
    ],
    font: 'Menlo, Consolas, monospace',
    radius: 10,
    layout: 'split',
    density: 'compact',
    ideas: [
      [
        '251',
        'Official TypeScript SDK',
        'Typed client with retries, pagination, and examples.',
        'Planned',
        'SDK',
        'dkaplan',
        '1d',
      ],
      [
        '188',
        'Webhook replay endpoint',
        'Retry a failed webhook from the dashboard or API.',
        'In progress',
        'Webhooks',
        'mliu',
        '2d',
      ],
      [
        '143',
        'OpenAPI schema downloads',
        'Expose versioned specs for code generation.',
        'Open',
        'Docs',
        'rsmith',
        '5d',
      ],
      [
        '81',
        'CLI auth device flow',
        'Login from headless terminals without browser copy/paste.',
        'Review',
        'CLI',
        'sora',
        '1w',
      ],
    ],
  },
  {
    file: 'finance-console.png',
    product: 'LedgerWorks',
    eyebrow: 'Product council',
    title: 'Request prioritization',
    subtitle: 'A quiet board for finance teams weighing risk, audit, and workflow needs.',
    tabs: ['Under review', 'Compliance', 'Reporting', 'Done'],
    active: 'Under review',
    cta: 'Add request',
    colors: [
      '#f4f6f5',
      '#ffffff',
      '#f8faf9',
      '#17201b',
      '#5c6c63',
      '#d7dfdb',
      '#047857',
      '#1d4ed8',
    ],
    font: 'Inter, Arial, sans-serif',
    radius: 6,
    layout: 'table',
    density: 'compact',
    ideas: [
      [
        '96',
        'Approval chain audit export',
        'Include approver, timestamp, and policy metadata.',
        'In progress',
        'Audit',
        'Erin',
        '3d',
      ],
      [
        '74',
        'Variance alerts by department',
        'Notify finance owners when budget deltas cross thresholds.',
        'Review',
        'Reporting',
        'Sam',
        '1w',
      ],
      [
        '63',
        'Read-only auditor role',
        'Grant external auditors scoped evidence access.',
        'Planned',
        'Roles',
        'Iris',
        '2w',
      ],
      [
        '39',
        'Quarter close checklist',
        'Track task owners and exceptions in one shared view.',
        'Open',
        'Close',
        'Noah',
        '3w',
      ],
    ],
  },
  {
    file: 'health-portal.png',
    product: 'CarePath',
    eyebrow: 'Patient portal ideas',
    title: 'Improve the care experience',
    subtitle:
      'Patients and clinic staff vote on accessibility, scheduling, and communication needs.',
    tabs: ['Top needs', 'Scheduling', 'Messages', 'Released'],
    active: 'Top needs',
    cta: 'Share idea',
    colors: [
      '#eef8f6',
      '#ffffff',
      '#f3fbfa',
      '#14302f',
      '#57726f',
      '#cbe4df',
      '#0891b2',
      '#10b981',
    ],
    font: 'Inter, Arial, sans-serif',
    radius: 18,
    layout: 'list',
    density: 'airy',
    ideas: [
      [
        '129',
        'Appointment waitlist alerts',
        'Text patients when an earlier appointment opens.',
        'Planned',
        'Scheduling',
        'Marta',
        '1d',
      ],
      [
        '103',
        'Larger medication instructions',
        'Improve readability for dosage notes and warnings.',
        'In progress',
        'Accessibility',
        'Eli',
        '4d',
      ],
      [
        '77',
        'Caregiver access controls',
        'Let patients invite and manage trusted caregivers.',
        'Review',
        'Accounts',
        'June',
        '1w',
      ],
      [
        '51',
        'Pre-visit questionnaire save',
        'Resume long intake forms without starting over.',
        'Open',
        'Forms',
        'Amal',
        '2w',
      ],
    ],
  },
  {
    file: 'high-contrast.png',
    product: 'Signal Desk',
    eyebrow: 'Accessible feedback',
    title: 'Feature board',
    subtitle: 'High contrast, clear focus states, and large voting targets.',
    tabs: ['Most votes', 'Open', 'Building', 'Complete'],
    active: 'Most votes',
    cta: 'Add idea',
    colors: [
      '#050505',
      '#111111',
      '#1c1c1c',
      '#ffffff',
      '#d4d4d4',
      '#f5f5f5',
      '#facc15',
      '#22d3ee',
    ],
    font: 'Arial, sans-serif',
    radius: 4,
    layout: 'list',
    density: 'compact',
    ideas: [
      [
        '212',
        'Keyboard-only voting',
        'Vote, filter, and submit without pointer input.',
        'Building',
        'A11y',
        'Dana',
        'today',
      ],
      [
        '167',
        'Screen reader status text',
        'Announce vote state and board updates clearly.',
        'Review',
        'A11y',
        'Morgan',
        '2d',
      ],
      [
        '99',
        'Reduced-motion setting',
        'Disable transitions for sensitive users.',
        'Open',
        'Motion',
        'Lee',
        '5d',
      ],
      [
        '58',
        'Large text density mode',
        'Keep rows readable at 200% browser zoom.',
        'Planned',
        'Display',
        'Kai',
        '1w',
      ],
    ],
  },
  {
    file: 'launch-dark.png',
    product: 'Orbit Launch',
    eyebrow: 'Roadmap votes',
    title: 'Launch planning board',
    subtitle: 'Track what beta users want before the next release window.',
    tabs: ['Now', 'Next', 'Later', 'Shipped'],
    active: 'Now',
    cta: 'Pitch idea',
    colors: [
      '#080b18',
      '#11172a',
      '#171f36',
      '#f8fbff',
      '#9aa8c7',
      '#2b3656',
      '#8b5cf6',
      '#22c55e',
    ],
    font: 'Inter, Arial, sans-serif',
    radius: 16,
    layout: 'kanban',
    density: 'airy',
    ideas: [
      [
        '304',
        'Beta invite cohorts',
        'Segment testers by persona and rollout stage.',
        'Now',
        'Growth',
        'Rae',
        'today',
      ],
      [
        '221',
        'Launch checklist templates',
        'Reusable tasks for docs, QA, and comms.',
        'Now',
        'Ops',
        'Max',
        '2d',
      ],
      [
        '186',
        'Release health dashboard',
        'Track adoption, errors, and feedback after launch.',
        'Next',
        'Analytics',
        'Bea',
        '4d',
      ],
      [
        '77',
        'Embargoed changelog draft',
        'Prepare announcements before the release is public.',
        'Later',
        'Comms',
        'Vic',
        '1w',
      ],
      [
        '54',
        'Post-launch survey embed',
        'Ask every cohort what blocked activation.',
        'Later',
        'Research',
        'Ivy',
        '2w',
      ],
    ],
  },
  {
    file: 'learning-platform.png',
    product: 'LearnLoop',
    eyebrow: 'Course requests',
    title: 'Student idea board',
    subtitle: 'Learners vote on lessons, exercises, and classroom quality-of-life improvements.',
    tabs: ['Popular', 'Content', 'Practice', 'Released'],
    active: 'Popular',
    cta: 'Ask for topic',
    colors: [
      '#f2f6ff',
      '#ffffff',
      '#f7f9ff',
      '#1c2435',
      '#63708a',
      '#d8e0f2',
      '#4f46e5',
      '#06b6d4',
    ],
    font: 'Inter, Arial, sans-serif',
    radius: 20,
    layout: 'cards',
    density: 'airy',
    ideas: [
      [
        '156',
        'Interactive SQL playground',
        'Practice queries without leaving the lesson.',
        'In progress',
        'Practice',
        'Mina',
        '1d',
      ],
      [
        '121',
        'Downloadable study plans',
        'Auto-generate weekly plans from course goals.',
        'Planned',
        'Planning',
        'Tao',
        '3d',
      ],
      [
        '89',
        'Peer review rubrics',
        'Clearer scoring for project submissions.',
        'Open',
        'Projects',
        'Liv',
        '1w',
      ],
      [
        '44',
        'Transcript search',
        'Find concepts across video lessons quickly.',
        'Review',
        'Video',
        'Ren',
        '2w',
      ],
    ],
  },
  {
    file: 'marketplace.png',
    product: 'SellerSquare',
    eyebrow: 'Seller feedback',
    title: 'Marketplace requests',
    subtitle: 'Sellers surface workflow blockers, buyer tools, and reporting gaps.',
    tabs: ['Demand', 'Orders', 'Listings', 'Analytics'],
    active: 'Demand',
    cta: 'Post idea',
    colors: [
      '#f8fafc',
      '#ffffff',
      '#f1f5f9',
      '#172033',
      '#64748b',
      '#d6dee9',
      '#ea580c',
      '#0f766e',
    ],
    font: 'Inter, Arial, sans-serif',
    radius: 14,
    layout: 'split',
    density: 'compact',
    ideas: [
      [
        '277',
        'Bulk listing quality checks',
        'Flag missing photos, dimensions, and shipping details.',
        'Planned',
        'Listings',
        'Sasha',
        'today',
      ],
      [
        '198',
        'Buyer message templates',
        'Reusable replies for returns and sizing questions.',
        'In progress',
        'Orders',
        'Omar',
        '2d',
      ],
      [
        '142',
        'Profit view per product',
        'Include fees, discounts, and ad spend.',
        'Open',
        'Analytics',
        'Pia',
        '6d',
      ],
      [
        '64',
        'Low-stock campaign trigger',
        'Pause promotions when inventory drops too low.',
        'Review',
        'Inventory',
        'Cam',
        '2w',
      ],
    ],
  },
  {
    file: 'studio-editorial.png',
    product: 'Draft Room',
    eyebrow: 'Editorial backlog',
    title: 'Studio board',
    subtitle: 'A restrained feedback surface for creative teams and client collaborators.',
    tabs: ['Curated', 'Open', 'In edit', 'Published'],
    active: 'Curated',
    cta: 'Add note',
    colors: [
      '#f7f5f2',
      '#fffefd',
      '#f1ede7',
      '#27231f',
      '#776d63',
      '#ded6cb',
      '#111827',
      '#b45309',
    ],
    font: 'Georgia, Times New Roman, serif',
    radius: 8,
    layout: 'cards',
    density: 'airy',
    ideas: [
      [
        '84',
        'Client annotation history',
        'Show resolved and open notes by scene.',
        'In edit',
        'Review',
        'Elle',
        '1d',
      ],
      [
        '72',
        'Campaign moodboard export',
        'Package references and copy into a PDF.',
        'Planned',
        'Export',
        'Jules',
        '3d',
      ],
      [
        '56',
        'Editorial calendar overlay',
        'View launch dates alongside draft status.',
        'Open',
        'Calendar',
        'Remy',
        '1w',
      ],
      [
        '31',
        'Brand voice snippets',
        'Reusable language blocks for recurring clients.',
        'Curated',
        'Copy',
        'Noor',
        '2w',
      ],
    ],
  },
];

function esc(value) {
  return String(value).replace(/[&<>"']/g, char => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
  });
}

function css(theme) {
  const [bg, panel, panel2, text, muted, border, accent, accent2] = theme.colors;

  return `
    * { box-sizing: border-box; }
    body { margin: 0; width: 1280px; height: 720px; overflow: hidden; background: ${bg}; font-family: ${theme.font}; color: ${text}; }
    .wrap { height: 720px; padding: 42px; background: radial-gradient(circle at 10% 0%, color-mix(in srgb, ${accent} 18%, transparent), transparent 36%), linear-gradient(135deg, ${bg}, color-mix(in srgb, ${panel2} 72%, ${bg})); }
    .board { height: 636px; border: 1px solid ${border}; border-radius: ${theme.radius + 10}px; background: ${panel}; box-shadow: 0 28px 80px rgba(15, 23, 42, .16); overflow: hidden; display: grid; grid-template-rows: auto auto 1fr; }
    .topbar { display: flex; align-items: center; justify-content: space-between; padding: 24px 28px; border-bottom: 1px solid ${border}; background: linear-gradient(180deg, color-mix(in srgb, ${panel} 94%, white), ${panel}); }
    .brand { display: flex; align-items: center; gap: 14px; }
    .mark { width: 42px; height: 42px; border-radius: ${theme.radius}px; background: ${accent}; color: ${panel}; display: grid; place-items: center; font-weight: 900; }
    .brand span { display: block; color: ${muted}; font-size: 13px; letter-spacing: .02em; }
    .brand strong { font-size: 19px; }
    .actions { display: flex; gap: 10px; align-items: center; }
    .search { width: 270px; border: 1px solid ${border}; border-radius: ${theme.radius}px; padding: 11px 14px; color: ${muted}; background: ${panel2}; font-size: 14px; }
    .cta { border: 0; border-radius: ${theme.radius}px; background: ${accent}; color: ${panel}; font-weight: 800; padding: 12px 16px; font-size: 14px; }
    .intro { display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: end; padding: 24px 28px 18px; }
    .eyebrow { font-size: 13px; font-weight: 800; color: ${accent}; text-transform: uppercase; letter-spacing: .08em; }
    .intro h1 { margin: 5px 0 7px; font-size: 34px; letter-spacing: 0; line-height: 1; }
    .intro p { margin: 0; color: ${muted}; font-size: 15px; max-width: 640px; line-height: 1.45; }
    .tabs { display: flex; gap: 8px; align-items: center; justify-content: flex-end; flex-wrap: wrap; }
    .tab { border: 1px solid ${border}; border-radius: ${Math.max(theme.radius - 2, 4)}px; background: ${panel2}; color: ${muted}; padding: 9px 12px; font-weight: 750; }
    .tab.active { background: color-mix(in srgb, ${accent} 14%, ${panel}); border-color: ${accent}; color: ${text}; }
    .content { padding: 0 28px 28px; min-height: 0; overflow: hidden; }
    .feed, .table-board { display: grid; gap: ${theme.density === 'compact' ? 10 : 14}px; }
    .idea-card { display: grid; grid-template-columns: 72px 1fr; gap: 16px; align-items: start; border: 1px solid ${border}; border-radius: ${theme.radius}px; background: ${panel2}; padding: ${theme.density === 'compact' ? 14 : 18}px; }
    .vote { height: 74px; border: 1px solid ${border}; border-radius: ${Math.max(theme.radius - 2, 4)}px; background: ${panel}; color: ${text}; display: grid; place-items: center; font: inherit; }
    .vote span { color: ${accent}; font-size: 16px; }
    .vote strong { font-size: 24px; }
    .idea-top { display: flex; gap: 8px; align-items: center; margin-bottom: 7px; }
    .status, .tag { border-radius: 999px; padding: 5px 9px; font-size: 12px; font-weight: 800; }
    .status { background: color-mix(in srgb, var(--status) 18%, transparent); color: color-mix(in srgb, var(--status) 82%, ${text}); }
    .tag { background: ${panel}; color: ${muted}; border: 1px solid ${border}; }
    h3 { margin: 0 0 6px; font-size: ${theme.density === 'compact' ? 18 : 21}px; line-height: 1.2; }
    p { margin: 0; }
    .idea-main p { color: ${muted}; font-size: 14px; line-height: 1.35; }
    .meta { display: flex; gap: 12px; margin-top: 12px; color: ${muted}; font-size: 12px; font-weight: 700; }
    .split-board { display: grid; grid-template-columns: 1fr 330px; gap: 18px; }
    aside { border: 1px solid ${border}; border-radius: ${theme.radius}px; background: ${panel2}; padding: 18px; display: grid; align-content: start; gap: 12px; }
    .meter { height: 10px; border-radius: 999px; background: ${panel}; overflow: hidden; }
    .meter span { display: block; width: 72%; height: 100%; background: linear-gradient(90deg, ${accent}, ${accent2}); }
    .mini-card { border: 1px solid ${border}; border-radius: ${Math.max(theme.radius - 2, 4)}px; background: ${panel}; padding: 12px; display: flex; justify-content: space-between; gap: 12px; }
    .mini-card strong { font-size: 13px; }
    .mini-card span { display: block; color: ${muted}; font-size: 11px; margin-top: 5px; }
    .mini-card b { color: ${accent}; }
    .legend { display: flex; justify-content: space-between; color: ${muted}; font-size: 12px; }
    .lanes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .lane { border: 1px solid ${border}; border-radius: ${theme.radius}px; background: ${panel2}; padding: 14px; display: grid; align-content: start; gap: 12px; }
    .lane header { display: flex; align-items: center; justify-content: space-between; color: ${muted}; font-size: 13px; padding: 0 2px; }
    .lane header span { border: 1px solid ${border}; border-radius: 999px; padding: 2px 8px; background: ${panel}; }
    .idea-card.column, .idea-card.tile, .idea-card.table-row { grid-template-columns: 58px 1fr; }
    .idea-card.column { padding: 13px; }
    .idea-card.column .vote, .idea-card.table-row .vote { height: 58px; }
    .card-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .idea-card.tile { min-height: 170px; }
    .idea-card.table-row { border-radius: ${Math.max(theme.radius, 6)}px; }
    .idea-card.table-row h3 { font-size: 17px; }
    .idea-card.table-row .idea-main p { font-size: 13px; }
  `;
}

function ideaCard(idea, index, theme, mode = 'row') {
  const [votes, title, body, status, tag, author, age] = idea.map(esc);
  const statusColor = statusColors[index % statusColors.length];

  if (mode === 'mini') {
    return `<article class="mini-card"><div><strong>${title}</strong><span>${tag} · ${author}</span></div><b>${votes}</b></article>`;
  }

  return `
    <article class="idea-card ${mode}">
      <button class="vote" aria-label="${votes} votes"><span>▲</span><strong>${votes}</strong></button>
      <div class="idea-main">
        <div class="idea-top">
          <span class="status" style="--status:${statusColor}">${status}</span>
          <span class="tag">${tag}</span>
        </div>
        <h3>${title}</h3>
        <p>${body}</p>
        <div class="meta">
          <span>${author}</span>
          <span>${age}</span>
          <span>${Number(votes) > 150 ? 'High demand' : 'Gathering signal'}</span>
        </div>
      </div>
    </article>
  `;
}

function boardContent(theme) {
  if (theme.layout === 'kanban') {
    const columns = [
      ['Now', theme.ideas.slice(0, 2)],
      ['Next', theme.ideas.slice(2, 4)],
      ['Later', theme.ideas.slice(4, 5)],
    ];

    return `
      <div class="lanes">
        ${columns
          .map(([label, ideas], columnIndex) => {
            return `<section class="lane"><header><strong>${label}</strong><span>${ideas.length}</span></header>${ideas
              .map((idea, index) => ideaCard(idea, index + columnIndex, theme, 'column'))
              .join('')}</section>`;
          })
          .join('')}
      </div>
    `;
  }

  if (theme.layout === 'table') {
    return `<div class="table-board">${theme.ideas
      .map((idea, index) => ideaCard(idea, index, theme, 'table-row'))
      .join('')}</div>`;
  }

  if (theme.layout === 'cards') {
    return `<div class="card-grid">${theme.ideas
      .map((idea, index) => ideaCard(idea, index, theme, 'tile'))
      .join('')}</div>`;
  }

  if (theme.layout === 'split') {
    return `
      <div class="split-board">
        <div class="feed">${theme.ideas.map((idea, index) => ideaCard(idea, index, theme)).join('')}</div>
        <aside>
          <strong>Roadmap pulse</strong>
          <div class="meter"><span></span></div>
          ${theme.ideas
            .slice(0, 3)
            .map((idea, index) => ideaCard(idea, index, theme, 'mini'))
            .join('')}
          <div class="legend"><span>Open</span><span>Planned</span><span>Building</span></div>
        </aside>
      </div>
    `;
  }

  return `<div class="feed">${theme.ideas.map((idea, index) => ideaCard(idea, index, theme)).join('')}</div>`;
}

function page(theme) {
  const tabs = theme.tabs
    .map(tab => `<button class="tab ${tab === theme.active ? 'active' : ''}">${esc(tab)}</button>`)
    .join('');

  return `
    <!doctype html>
    <html>
      <head><meta charset="utf-8"><style>${css(theme)}</style></head>
      <body>
        <main class="wrap">
          <section class="board">
            <header class="topbar">
              <div class="brand">
                <div class="mark">B</div>
                <div><span>${esc(theme.eyebrow)}</span><strong>${esc(theme.product)}</strong></div>
              </div>
              <div class="actions"><div class="search">Search feedback...</div><button class="cta">${esc(theme.cta)}</button></div>
            </header>
            <section class="intro">
              <div>
                <div class="eyebrow">${esc(theme.eyebrow)}</div>
                <h1>${esc(theme.title)}</h1>
                <p>${esc(theme.subtitle)}</p>
              </div>
              <div class="tabs">${tabs}</div>
            </section>
            <section class="content">${boardContent(theme)}</section>
          </section>
        </main>
      </body>
    </html>
  `;
}

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const pageInstance = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});

for (const theme of themes) {
  await pageInstance.setContent(page(theme), { waitUntil: 'load' });
  await pageInstance.screenshot({
    path: path.join(outDir, theme.file),
    type: 'png',
  });
}

await browser.close();

console.log(`Rendered ${themes.length} board gallery screenshots to ${outDir}`);
