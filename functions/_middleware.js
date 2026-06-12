// ---------------------------------------------------------------------------
// PolymagicPrice — Cloudflare Pages Middleware
// Handles: security blocking, dynamic SEO metadata, and bot-aware rendering.
// ---------------------------------------------------------------------------

// ── Bot Detection ──────────────────────────────────────────────────────────
const BOT_UA_PATTERNS = [
  'googlebot', 'bingbot', 'yandexbot', 'duckduckbot', 'slurp',
  'baiduspider', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
  'applebot', 'petalbot', 'semrushbot', 'ahrefsbot', 'mj12bot',
  'dotbot', 'rogerbot', 'embedly', 'quora link preview', 'showyoubot',
  'outbrain', 'pinterest', 'developers.google.com', 'google-inspectiontool',
  'chrome-lighthouse'
];

function isSearchBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_UA_PATTERNS.some(bot => ua.includes(bot));
}

// ── Shared Navigation (used across all static pages) ──────────────────────
const SITE = 'https://polymagicprice.rphobbyist.com';
const PARENT = 'https://www.rphobbyist.com';

const sharedNav = `
<nav aria-label="PolymagicPrice Navigation" style="margin:24px 0;text-align:center">
  <a href="/">Home</a> &middot;
  <a href="/cost-calculator">Cost Calculator</a> &middot;
  <a href="/print-manager">Print Manager</a> &middot;
  <a href="/order-manager">Order Manager</a> &middot;
  <a href="/capacity-planner">Capacity Planner</a> &middot;
  <a href="/billing-analysis">Billing &amp; Analysis</a> &middot;
  <a href="/tool-guide">Tool Guide</a> &middot;
  <a href="/database-manager">Database Manager</a> &middot;
  <a href="/settings">Settings</a>
</nav>`;

const sharedFooter = `
<footer style="margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;font-size:13px;color:#64748b">
  <p>PolymagicPrice is built by <a href="${PARENT}">RP Hobbyist</a> &mdash; open-source 3D printing tools.</p>
  <p><a href="https://github.com/RPHobbyist/PolymagicPrice">GitHub</a> &middot;
     <a href="${PARENT}/blogs/">Blog</a> &middot;
     <a href="https://www.printables.com/@RPHobbyist">Printables</a></p>
</footer>`;

function wrap(title, body) {
  return `<div style="max-width:800px;margin:0 auto;padding:20px 24px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;line-height:1.6">${sharedNav}<main>${title}${body}</main>${sharedFooter}</div>`;
}

// ── Static Content Map for Bot Rendering ──────────────────────────────────
const staticContentMap = {
  '/': wrap(
    '<h1>PolymagicPrice &mdash; Run Your 3D Print Farm with Local AI</h1>',
    `<p>PolymagicPrice is the free, open-source command center for 3D print farms by <a href="${PARENT}">RP Hobbyist</a>. Price jobs accurately with FDM &amp; Resin cost calculators, manage production with a visual Kanban board, monitor your printer fleet, and get AI-powered insights &mdash; all running locally on your machine. Upload G-code, 3MF, or CXDLPV4 files for instant cost breakdowns. 100% private, offline-capable, and open source.</p>

<h2>Core Features</h2>
<ul>
  <li><strong>Dual Cost Calculator</strong> &mdash; Granular pricing for FDM filament (by weight) and Resin SLA/DLP (by volume), including FEP wear, IPA wash, and consumables.</li>
  <li><strong>Slicer Auto-Fill Parser</strong> &mdash; Drag and drop G-code, 3MF, or .cxdlpv4 files to instantly extract print time, filament weight, and resin volume.</li>
  <li><strong>Production Kanban Board</strong> &mdash; Track jobs across machines, check maintenance intervals, deduct spool materials from live stock.</li>
  <li><strong>Print Farm Capacity Planner</strong> &mdash; Forecast delivery feasibility, detect build-volume mismatches and material shortages.</li>
  <li><strong>AI-Powered Pricing Analysis</strong> &mdash; Private AI via local Ollama, with PII redaction and operational pricing reports.</li>
  <li><strong>Local-First Privacy</strong> &mdash; Zero cloud trackers. Desktop uses OS keychain encryption. 100% offline-capable.</li>
  <li><strong>Professional PDF Quotes</strong> &mdash; Generate branded quotations with full cost breakdowns for customers.</li>
  <li><strong>Multi-Currency Support</strong> &mdash; USD, EUR, GBP, INR, and more with local electricity and labor rates.</li>
</ul>

<h2>How It Works</h2>
<ol>
  <li><strong>Configure Your Workshop</strong> &mdash; Add your printers, materials, electricity rate, and labor costs.</li>
  <li><strong>Drop a File, Get a Price</strong> &mdash; Drag your G-code, 3MF, or CXDLPV4 file into the calculator for instant cost breakdown.</li>
  <li><strong>Manage &amp; Grow</strong> &mdash; Track production on the Kanban board, analyze profits, and let AI surface insights.</li>
</ol>

<h2>Blog Articles</h2>
<ul>
  <li><a href="${PARENT}/blogs/how-much-should-i-charge-for-3d-prints-the-ultimate-pricing-calculator/">How Much Should I Charge for 3D Prints?</a></li>
  <li><a href="${PARENT}/blogs/how-to-scale-a-3d-print-farm-from-bedroom-hobbyist-to-micro-factory/">How to Scale a 3D Print Farm</a></li>
  <li><a href="${PARENT}/blogs/quit-paying-for-3d-ai-mastering-the-100-local-hunyuan3d-2-workflow/">Quit Paying for 3D AI</a></li>
  <li><a href="${PARENT}/blogs/quit-guessing-your-profits-the-os-for-3d-printing-business-success/">Quit Guessing Your Profits</a></li>
</ul>

<h2>Frequently Asked Questions</h2>
<h3>How does PolymagicPrice calculate 3D printing costs?</h3>
<p>Material Cost + Electricity Cost + Machine Depreciation + Labor Cost + Overhead. Upload a G-code file for auto-fill or enter values manually.</p>
<h3>Is PolymagicPrice free to use?</h3>
<p>Yes, 100% free and open-source under AGPLv3. Use in your browser, download the desktop app, or self-host. No fees, subscriptions, or paywalls.</p>
<h3>Is my data private and secure?</h3>
<p>None of your data ever leaves your machine. No external trackers, cloud analytics, or telemetry. The desktop app uses hardware-backed encryption.</p>
<h3>Can I upload G-code files to auto-calculate costs?</h3>
<p>Yes. Drag and drop .gcode, .3mf, or .cxdlpv4 files. The parser extracts print time, filament weight, resin volume, printer model, and material type automatically.</p>
<h3>How much should I charge for 3D prints?</h3>
<p>Total Price = (Material + Electricity + Machine Wear + Labor + Overhead) &times; (1 + Markup%). Typical markup is 20&ndash;50%.</p>
<h3>Does PolymagicPrice support multiple currencies?</h3>
<p>Yes. Configure your local currency (USD, EUR, GBP, INR, etc.) in settings along with local electricity rates and labor costs.</p>`
  ),

  '/cost-calculator': wrap(
    '<h1>3D Printing Cost Calculator &mdash; Free FDM &amp; Resin Price Estimator</h1>',
    `<p>Calculate accurate 3D printing costs for FDM filament and Resin (SLA/DLP) printing. PolymagicPrice uses a professional 6-factor cost-stacking algorithm that accounts for material, electricity, machine depreciation, labor, overhead, and markup.</p>

<h2>How the Calculator Works</h2>
<ol>
  <li><strong>Upload Your File</strong> &mdash; Drag and drop G-code, 3MF, or CXDLPV4 files. The parser auto-extracts print time, material weight, resin volume, printer model, and material type.</li>
  <li><strong>Review Cost Breakdown</strong> &mdash; See granular costs for material, electricity (Printer Wattage &divide; 1000 &times; Hours &times; kWh Rate), machine depreciation, labor, and consumables.</li>
  <li><strong>Set Markup &amp; Generate Quote</strong> &mdash; Adjust profit margin (20&ndash;50% industry standard) and export a professional PDF quotation.</li>
</ol>

<h2>Supported File Formats</h2>
<ul>
  <li><strong>.gcode</strong> &mdash; Cura, PrusaSlicer, OrcaSlicer, BambuStudio</li>
  <li><strong>.3mf</strong> &mdash; 3D Manufacturing Format with embedded metadata</li>
  <li><strong>.cxdlpv4</strong> &mdash; ChiTuBox resin slicer format</li>
</ul>

<h2>FDM vs Resin Cost Comparison</h2>
<p>FDM filament costs $15&ndash;$50/kg. Resin costs $35&ndash;$150+/liter plus consumables like IPA, gloves, and FEP film. PolymagicPrice handles both with dedicated calculators.</p>

<p><a href="/tool-guide">Read the full documentation</a> or <a href="${PARENT}/blogs/how-much-should-i-charge-for-3d-prints-the-ultimate-pricing-calculator/">learn pricing strategy</a>.</p>`
  ),

  '/print-manager': wrap(
    '<h1>3D Print Manager &mdash; Fleet Dashboard &amp; Production Kanban Board</h1>',
    `<p>Monitor and manage your 3D print farm with a visual Kanban dashboard. Assign jobs to FDM and Resin machines, track real-time progress, and streamline your production queue.</p>

<h2>Key Capabilities</h2>
<ul>
  <li><strong>Visual Kanban Board</strong> &mdash; Drag-and-drop job cards across Queued, Printing, Post-Processing, and Complete columns.</li>
  <li><strong>Fleet Monitoring</strong> &mdash; See the status of every printer at a glance, including active job, material loaded, and maintenance schedule.</li>
  <li><strong>Bambu Lab IoT Integration</strong> &mdash; Connect Bambu Lab printers for real-time monitoring, file sending, and slicer bridge.</li>
  <li><strong>Material Deduction</strong> &mdash; Automatically deducts filament/resin from inventory when jobs complete.</li>
  <li><strong>Scrap Logging</strong> &mdash; Track failed prints and manufacturing waste for accurate overhead calculations.</li>
</ul>

<p><a href="/cost-calculator">Calculate job costs</a> before adding them to your production queue.</p>`
  ),

  '/order-manager': wrap(
    '<h1>3D Print Order Manager &mdash; Customer CRM &amp; Order Tracking</h1>',
    `<p>Track 3D printing orders from quote to delivery. Manage customer relationships, log special requirements, and maintain a complete order history.</p>

<h2>Order Management Features</h2>
<ul>
  <li><strong>Order Lifecycle Tracking</strong> &mdash; Follow orders through Quote, Confirmed, In Production, Quality Check, Shipped, and Delivered stages.</li>
  <li><strong>Customer CRM</strong> &mdash; Store customer contacts, preferences, order history, and communication notes.</li>
  <li><strong>Quote-to-Order Conversion</strong> &mdash; Approved quotes automatically generate trackable orders.</li>
  <li><strong>Deadline Management</strong> &mdash; Set due dates and receive visual alerts for approaching deadlines.</li>
</ul>

<p>Works seamlessly with the <a href="/cost-calculator">Cost Calculator</a> and <a href="/capacity-planner">Capacity Planner</a>.</p>`
  ),

  '/capacity-planner': wrap(
    '<h1>3D Print Farm Capacity Planner &mdash; Production Forecasting</h1>',
    `<p>Forecast production timelines and lead times for your 3D print farm. Analyze machine utilization, check order feasibility against deadlines, and optimize throughput.</p>

<h2>Planning Features</h2>
<ul>
  <li><strong>Delivery Feasibility Analysis</strong> &mdash; Check whether pending orders can be completed by their deadlines given your current fleet capacity.</li>
  <li><strong>Build Volume Matching</strong> &mdash; Auto-detect when parts exceed a printer&rsquo;s physical build dimensions.</li>
  <li><strong>Material Shortage Alerts</strong> &mdash; Flag orders that require more material than currently in stock.</li>
  <li><strong>Machine Utilization Metrics</strong> &mdash; Visualize how efficiently each printer in your fleet is being used.</li>
</ul>

<p>Plan production before committing &mdash; then <a href="/print-manager">manage execution on the Kanban board</a>.</p>`
  ),

  '/billing-analysis': wrap(
    '<h1>3D Printing Billing &amp; Revenue Analytics</h1>',
    `<p>Analyze your 3D printing business finances with revenue dashboards, customer insights, and quote history tracking. Understand your margins and grow profitably.</p>

<h2>Analytics Features</h2>
<ul>
  <li><strong>Revenue Dashboards</strong> &mdash; Track monthly revenue, average order value, and revenue growth trends.</li>
  <li><strong>Quote History</strong> &mdash; Browse, search, and analyze all past quotations with filtering and sorting.</li>
  <li><strong>Customer Insights</strong> &mdash; Identify your most profitable customers and top-performing material types.</li>
  <li><strong>Profit Margin Analysis</strong> &mdash; Compare quoted prices against actual material and labor costs.</li>
</ul>

<p>All data stays local. <a href="/database-manager">Export your data</a> anytime for external analysis.</p>`
  ),

  '/tool-guide': wrap(
    '<h1>PolymagicPrice Documentation &mdash; Tool Guide &amp; FAQ</h1>',
    `<p>Comprehensive documentation for PolymagicPrice. Learn about the 6-factor pricing formula, fleet management workflows, Bambu Lab IoT integration, and offline Local AI setup with Ollama.</p>

<h2>Documentation Topics</h2>
<ul>
  <li><strong>Pricing Formula</strong> &mdash; Detailed explanation of Material + Electricity + Machine Depreciation + Labor + Overhead + Markup.</li>
  <li><strong>File Parser Guide</strong> &mdash; Supported slicer formats, auto-detected parameters, and troubleshooting.</li>
  <li><strong>AI Setup (Ollama)</strong> &mdash; Install and configure local AI for private pricing analysis and business insights.</li>
  <li><strong>Bambu Lab Integration</strong> &mdash; Connect your printer fleet for real-time monitoring and file transfer.</li>
  <li><strong>Data Security</strong> &mdash; How PolymagicPrice protects your business data with local-first architecture.</li>
</ul>

<p>Visit <a href="${PARENT}/blogs/">our blog</a> for in-depth tutorials and pricing strategy guides.</p>`
  ),

  '/database-manager': wrap(
    '<h1>3D Printing Data Manager &mdash; Backup, Export &amp; Restore</h1>',
    `<p>Export, import, and manage your 3D printing business data. Create full backups of quotes, materials, machines, and customer records. Your data, your control.</p>

<h2>Data Management Features</h2>
<ul>
  <li><strong>Full Data Export</strong> &mdash; Download all quotes, materials, machines, customers, and settings as a portable backup.</li>
  <li><strong>Data Import</strong> &mdash; Restore from a previous backup or migrate between devices.</li>
  <li><strong>Data Sovereignty</strong> &mdash; All data stays on your machine. No cloud sync, no third-party access.</li>
</ul>`
  ),

  '/settings': wrap(
    '<h1>3D Printing Workshop Settings &mdash; Printer &amp; Material Configuration</h1>',
    `<p>Configure your 3D printing workshop in PolymagicPrice. Set up your printer fleet, material inventory, cost parameters, and company branding for professional quotes.</p>

<h2>Configuration Options</h2>
<ul>
  <li><strong>Material Inventory</strong> &mdash; Add FDM filaments (PLA, PETG, ABS, TPU, etc.) and resins with per-unit costs and stock levels.</li>
  <li><strong>Printer Profiles</strong> &mdash; Register each printer with wattage, depreciation rate, build volume, and maintenance schedule.</li>
  <li><strong>Labor &amp; Electricity Rates</strong> &mdash; Set your local electricity cost per kWh and hourly labor rate.</li>
  <li><strong>Currency &amp; Locale</strong> &mdash; Choose your local currency (USD, EUR, GBP, INR, etc.) for all calculations and quotes.</li>
  <li><strong>Company Branding</strong> &mdash; Add your logo and business details for branded PDF quotations.</li>
</ul>

<p><a href="/cost-calculator">Start calculating</a> once your workshop is configured.</p>`
  )
};

// ── SEO Configuration Map ─────────────────────────────────────────────────
const seoMap = {
  '/': {
    title: "PolymagicPrice: Run Your 3D Print Farm with Local AI \u2014 Free & Open Source",
    description: "Run your 3D print farm with Local AI. PolymagicPrice is the free, open-source command center for pricing, production management, fleet monitoring, and business analytics. 100% offline. No cloud."
  },
  '/cost-calculator': {
    title: "Cost Calculator \u2014 Free 3D Printing Price Calculator & Quotation Engine",
    description: "Calculate accurate 3D printing costs for FDM filament and Resin (SLA/DLP). Upload G-code files, auto-calculate material costs, electricity, labor, and generate professional quotes."
  },
  '/print-manager': {
    title: "Print Manager \u2014 3D Machine Dashboard & Job Tracking",
    description: "Monitor and manage your 3D print farm with a visual Kanban dashboard. Assign jobs to FDM/Resin machines, track real-time progress via Bambu Lab integration, and streamline your production queue."
  },
  '/order-manager': {
    title: "Order Manager \u2014 3D Print Order Tracking & Customer CRM",
    description: "Track 3D printing orders from quote to delivery with a visual Kanban board. Manage customer relationships, log requirements, and streamline your 3D printing business workflow."
  },
  '/capacity-planner': {
    title: "Capacity Planner \u2014 3D Print Farm Production Forecasting",
    description: "Forecast production timelines and lead times for your 3D print farm. Analyze machine utilization, check order feasibility against deadlines, and optimize your 3D printing business throughput."
  },
  '/billing-analysis': {
    title: "Billing & Analysis \u2014 3D Printing Revenue & Quote Analytics",
    description: "Analyze your 3D printing business finances with revenue dashboards, customer insights, and quote history tracking. Monitor profit margins, identify top clients, and track revenue growth."
  },
  '/database-manager': {
    title: "Database Manager \u2014 3D Printing Data Backup & Restore",
    description: "Export, import, and manage your 3D printing business data. Create full backups of quotes, materials, machines, and customer records. Ensure data sovereignty with local-first backups."
  },
  '/settings': {
    title: "Workshop Settings \u2014 3D Printer & Material Configuration",
    description: "Configure your 3D printing workshop in PolymagicPrice. Manage material inventory (FDM/Resin), printer profiles, personnel, and company branding for professional quotes."
  },
  '/tool-guide': {
    title: "Tool Guide & Documentation \u2014 3D Print Command Center",
    description: "Comprehensive documentation for PolymagicPrice. Learn about the 6-factor pricing formula, 3D print fleet management, Bambu Lab IoT integration, and offline Local AI setup."
  }
};

// ── Main Middleware ───────────────────────────────────────────────────────
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname.toLowerCase();

  // 1. Block sensitive files/extensions specifically enumerated in dashboard logs
  const blockedExactPatterns = [
    '/.env',
    '/env',
    '/.git',
    '/.github',
    '/.gitlab',
    '/.vscode',
    '/package.json',
    '/package-lock.json',
    '/tsconfig.json',
    '/vite.config.ts',
    '/components.json',
    '/postcss.config.js',
    '/tailwind.config.ts',
    '/docker-compose',
    '/profiler',
    '/actuator',
    '/heapdump',
    '/configprops'
  ];

  // Check if path matches any sensitive pattern (covers both direct file access and directory children)
  if (blockedExactPatterns.some(p => path.startsWith(p))) {
    return new Response('Not Found', { status: 404 });
  }

  // 2. Block system file extensions explicitly
  if (
    path.endsWith('.swp') ||
    path.endsWith('.bak') ||
    path.endsWith('.save') ||
    path.endsWith('~') ||
    path.endsWith('.docker') ||
    path.endsWith('.example') ||
    path.endsWith('.test')
  ) {
    return new Response('Not Found', { status: 404 });
  }

  // 3. Block direct folder browsing within critical assets
  const assetDirectories = ['/assets/', '/src/', '/public/'];
  if (path.endsWith('/') && assetDirectories.some(dir => path.startsWith(dir))) {
    return new Response('Not Found', { status: 404 });
  }

  // 3.5 Markdown Negotiation for AI Agents (RFC compliant)
  const acceptHeader = context.request.headers.get('Accept') || '';
  if (acceptHeader.includes('text/markdown')) {
    let mdPath = path;
    if (mdPath.endsWith('/')) mdPath = mdPath.slice(0, -1);
    if (mdPath === '') mdPath = '/index'; // Map root to index.md
    
    const rewriteUrl = new URL(context.request.url);
    rewriteUrl.pathname = `/markdown${mdPath}.md`;
    
    const mdResponse = await context.env.ASSETS.fetch(rewriteUrl);
    if (mdResponse.ok) {
        const mdHeaders = new Headers(mdResponse.headers);
        mdHeaders.set('Content-Type', 'text/markdown; charset=utf-8');
        mdHeaders.set('X-Content-Type-Options', 'nosniff');
        mdHeaders.set('X-Frame-Options', 'DENY');
        return new Response(mdResponse.body, {
            status: mdResponse.status,
            statusText: mdResponse.statusText,
            headers: mdHeaders
        });
    }
  }

  // Pass through to destination
  let response = await context.next();

  // 3.6 Inject Sitemap Link Header for AI Discoverability
  if (path === '/' || path === '') {
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Link', '</sitemap.xml>; rel="sitemap"');
    response = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }

  // 4. Intercept and transform HTML responses for SEO dynamic hydration
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {

    // Clean path for routing lookup (standardize to lower case, remove trailing slash)
    let lookupPath = url.pathname.toLowerCase();
    if (lookupPath !== '/' && lookupPath.endsWith('/')) {
      lookupPath = lookupPath.slice(0, -1);
    }

    const config = seoMap[lookupPath];
    const canonicalUrl = `${SITE}${lookupPath === '/' ? '/' : lookupPath}`;
    const userAgent = context.request.headers.get('user-agent') || '';
    const isBotRequest = isSearchBot(userAgent);

    // Build a single HTMLRewriter for all transformations in one pass
    const rewriter = new HTMLRewriter();

    if (config) {
      // ── Metadata rewriting for mapped routes ──
      rewriter
        .on('title', {
          element(e) { e.setInnerContent(config.title); }
        })
        .on('meta[name="description"]', {
          element(e) { e.setAttribute('content', config.description); }
        })
        .on('link[rel="canonical"]', {
          element(e) { e.setAttribute('href', canonicalUrl); }
        })
        .on('meta[property="og:title"]', {
          element(e) { e.setAttribute('content', config.title); }
        })
        .on('meta[property="og:description"]', {
          element(e) { e.setAttribute('content', config.description); }
        })
        .on('meta[property="og:url"]', {
          element(e) { e.setAttribute('content', canonicalUrl); }
        })
        .on('meta[name="twitter:title"]', {
          element(e) { e.setAttribute('content', config.title); }
        })
        .on('meta[name="twitter:description"]', {
          element(e) { e.setAttribute('content', config.description); }
        });
    } else {
      // ── Generic canonical protection for unmapped routes ──
      rewriter
        .on('link[rel="canonical"]', {
          element(e) { e.setAttribute('href', canonicalUrl); }
        })
        .on('meta[property="og:url"]', {
          element(e) { e.setAttribute('content', canonicalUrl); }
        });
    }

    // ── Bot-aware dynamic rendering ──
    // Injects static HTML into #root so search engines can index page content
    // without waiting for client-side React hydration. This is Google-approved
    // "dynamic rendering" — the static content matches the JS-rendered content.
    if (isBotRequest && staticContentMap[lookupPath]) {
      rewriter.on('div#root', {
        element(e) {
          e.setInnerContent(staticContentMap[lookupPath], { html: true });
        }
      });
    }

    // ── Bot-aware BreadcrumbList injection for sub-pages ──
    // Appends a BreadcrumbList JSON-LD script to <head> for every mapped sub-page
    // so Google understands the site hierarchy. Homepage breadcrumb is in index.html.
    if (isBotRequest && config && lookupPath !== '/') {
      // Derive a clean page name from the seoMap title (strip " — ..." suffix)
      const pageName = config.title.split('\u2014')[0].trim();
      const breadcrumbJsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "RP Hobbyist", "item": `${PARENT}` },
          { "@type": "ListItem", "position": 2, "name": "PolymagicPrice", "item": `${SITE}/` },
          { "@type": "ListItem", "position": 3, "name": pageName, "item": canonicalUrl }
        ]
      });

      rewriter.on('head', {
        element(e) {
          e.append(`<script type="application/ld+json">${breadcrumbJsonLd}</script>`, { html: true });
        }
      });
    }

    response = rewriter.transform(response);
  }

  return response;
}

