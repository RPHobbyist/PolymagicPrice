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

  // Pass through to destination
  let response = await context.next();

  // 4. Intercept and transform HTML responses for SEO dynamic hydration
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    // Map of valid application paths to SEO configurations
    const seoMap = {
      '/': {
        title: "PolymagicPrice: Run Your 3D Print Farm with Local AI — Free & Open Source",
        description: "Run your 3D print farm with Local AI. PolymagicPrice is the free, open-source command center for pricing, production management, fleet monitoring, and business analytics. 100% offline. No cloud."
      },
      '/cost-calculator': {
        title: "Cost Calculator — Free 3D Printing Price Calculator & Quotation Engine",
        description: "Calculate accurate 3D printing costs for FDM filament and Resin (SLA/DLP). Upload G-code files, auto-calculate material costs, electricity, labor, and generate professional quotes."
      },
      '/print-manager': {
        title: "Print Manager — 3D Machine Dashboard & Job Tracking",
        description: "Monitor and manage your 3D print farm with a visual Kanban dashboard. Assign jobs to FDM/Resin machines, track real-time progress via Bambu Lab integration, and streamline your production queue."
      },
      '/order-manager': {
        title: "Order Manager — 3D Print Order Tracking & Customer CRM",
        description: "Track 3D printing orders from quote to delivery with a visual Kanban board. Manage customer relationships, log requirements, and streamline your 3D printing business workflow."
      },
      '/capacity-planner': {
        title: "Capacity Planner — 3D Print Farm Production Forecasting",
        description: "Forecast production timelines and lead times for your 3D print farm. Analyze machine utilization, check order feasibility against deadlines, and optimize your 3D printing business throughput."
      },
      '/billing-analysis': {
        title: "Billing & Analysis — 3D Printing Revenue & Quote Analytics",
        description: "Analyze your 3D printing business finances with revenue dashboards, customer insights, and quote history tracking. Monitor profit margins, identify top clients, and track revenue growth."
      },
      '/database-manager': {
        title: "Database Manager — 3D Printing Data Backup & Restore",
        description: "Export, import, and manage your 3D printing business data. Create full backups of quotes, materials, machines, and customer records. Ensure data sovereignty with local-first backups."
      },
      '/settings': {
        title: "Workshop Settings — 3D Printer & Material Configuration",
        description: "Configure your 3D printing workshop in PolymagicPrice. Manage material inventory (FDM/Resin), printer profiles, personnel, and company branding for professional quotes."
      },
      '/tool-guide': {
        title: "Tool Guide & Documentation — 3D Print Command Center",
        description: "Comprehensive documentation for PolymagicPrice. Learn about the 6-factor pricing formula, 3D print fleet management, Bambu Lab IoT integration, and offline Local AI setup."
      }
    };

    // Clean path for routing lookup (standardize inputs to lower case and remove trailing slashes)
    let lookupPath = url.pathname.toLowerCase();
    if (lookupPath !== '/' && lookupPath.endsWith('/')) {
      lookupPath = lookupPath.slice(0, -1);
    }
    
    const config = seoMap[lookupPath];
    // Enforce strict dynamic canonical mapping for the specific requested resource
    const canonicalUrl = `https://polymagicprice.rphobbyist.com${lookupPath === '/' ? '/' : lookupPath}`;

    if (config) {
      // Deploy HTMLRewriter to hydrate the response body at the Edge
      response = new HTMLRewriter()
        .on('title', {
          element(e) {
            e.setInnerContent(config.title);
          }
        })
        .on('meta[name="description"]', {
          element(e) {
            e.setAttribute('content', config.description);
          }
        })
        .on('link[rel="canonical"]', {
          element(e) {
            e.setAttribute('href', canonicalUrl);
          }
        })
        // Align Open Graph and Twitter Cards metadata to ensure visual parity
        .on('meta[property="og:title"]', {
          element(e) {
            e.setAttribute('content', config.title);
          }
        })
        .on('meta[property="og:description"]', {
          element(e) {
            e.setAttribute('content', config.description);
          }
        })
        .on('meta[property="og:url"]', {
          element(e) {
            e.setAttribute('content', canonicalUrl);
          }
        })
        .on('meta[name="twitter:title"]', {
          element(e) {
            e.setAttribute('content', config.title);
          }
        })
        .on('meta[name="twitter:description"]', {
          element(e) {
            e.setAttribute('content', config.description);
          }
        })
        .transform(response);
    } else {
      // Generic Route Protection: Inject requested absolute path into canonical tag even if not explicitly mapped
      response = new HTMLRewriter()
        .on('link[rel="canonical"]', {
          element(e) {
            e.setAttribute('href', canonicalUrl);
          }
        })
        .on('meta[property="og:url"]', {
          element(e) {
            e.setAttribute('content', canonicalUrl);
          }
        })
        .transform(response);
    }
  }

  return response;
}
