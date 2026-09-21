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
    '<h1>Free 3D Printing Price Calculator for FDM &amp; Resin</h1>',
    `<p>PolymagicPrice is a free, open-source <strong>3D printing price calculator</strong> and print-farm command center by <a href="${PARENT}">RP Hobbyist</a>. Upload a G-code, 3MF or CXDLPV4 file and get an instant, itemised cost breakdown &mdash; material, electricity, machine depreciation, labor and markup &mdash; then export a professional PDF quote. It also manages production with a visual Kanban board, monitors your printer fleet, and gives AI-powered pricing insights via local Ollama. 100% private, offline-capable, and open source.</p>

<h2>Free 3D printing cost calculator</h2>
<p>Price FDM filament jobs by weight and Resin (SLA/DLP) jobs by volume with a professional 6-factor formula: <strong>Price = (Material + Electricity + Machine depreciation + Labor + Consumables + Overhead) &times; (1 + Markup%)</strong>. See <a href="/guides/how-to-calculate-3d-printing-cost">how to calculate 3D printing cost</a>, compare <a href="/guides/fdm-vs-resin-printing-cost">FDM vs resin costs</a>, or open the <a href="/cost-calculator">cost calculator</a>.</p>

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
    `<p>Calculate accurate 3D printing costs for FDM filament and Resin (SLA/DLP) printing. PolymagicPrice uses a professional 6-factor cost-stacking formula that accounts for material, electricity, machine depreciation, labor, overhead, and markup &mdash; the same method used to price parts in a commercial 3D printing service.</p>

<h2>The 3D printing cost formula</h2>
<p><strong>Unit cost = Material + Electricity + Machine depreciation + Labor + Consumables</strong><br>
<strong>Price = (Unit cost + Overhead) &times; (1 + Markup%)</strong></p>
<ul>
  <li><strong>Material</strong> &mdash; grams &times; filament price per gram (FDM), or millilitres &times; resin price per ml (resin). Add a waste/purge allowance of 2&ndash;5%.</li>
  <li><strong>Electricity</strong> &mdash; (Printer watts &divide; 1000) &times; print hours &times; your kWh rate.</li>
  <li><strong>Machine depreciation</strong> &mdash; (printer price + expected maintenance) &divide; expected lifetime hours, &times; print hours.</li>
  <li><strong>Labor</strong> &mdash; setup, slicing, removal and post-processing time &times; your hourly rate.</li>
  <li><strong>Consumables</strong> &mdash; nozzles and glue for FDM; FEP film, IPA wash and gloves for resin.</li>
  <li><strong>Overhead &amp; markup</strong> &mdash; add 10&ndash;20% overhead for failed prints and admin, then 20&ndash;50% markup for profit.</li>
</ul>

<h2>Worked example &mdash; FDM PLA part</h2>
<p>22 g PLA at $22/kg = <strong>$0.48</strong> material. 3.5 h on a 120 W printer at $0.15/kWh = <strong>$0.06</strong> electricity. Printer depreciation at $0.04/h = <strong>$0.14</strong>. 10 minutes labor at $18/h = <strong>$3.00</strong>. Unit cost &asymp; <strong>$3.68</strong>; with 15% overhead and 40% markup the price is about <strong>$5.93</strong>.</p>

<h2>Worked example &mdash; Resin miniature</h2>
<p>18 ml resin at $45/L = <strong>$0.81</strong> material. 4 h on a 60 W printer at $0.15/kWh = <strong>$0.04</strong> electricity. FEP + IPA + gloves amortised = <strong>$0.35</strong>. 15 minutes labor (wash, cure, support removal) at $18/h = <strong>$4.50</strong>. Unit cost &asymp; <strong>$5.70</strong>; with overhead and markup, about <strong>$9.20</strong>.</p>

<h2>FDM vs Resin cost at a glance</h2>
<table>
  <thead><tr><th>Factor</th><th>FDM (filament)</th><th>Resin (SLA/DLP)</th></tr></thead>
  <tbody>
    <tr><td>Material price</td><td>$15&ndash;$50 / kg</td><td>$35&ndash;$150+ / litre</td></tr>
    <tr><td>Typical part material cost</td><td>$0.20&ndash;$2</td><td>$0.50&ndash;$4</td></tr>
    <tr><td>Consumables</td><td>Nozzles, glue, bed sheets</td><td>FEP film, IPA, gloves, filters</td></tr>
    <tr><td>Post-processing labor</td><td>Low (support removal)</td><td>High (wash + cure + supports)</td></tr>
    <tr><td>Failure allowance</td><td>5&ndash;10%</td><td>10&ndash;20%</td></tr>
  </tbody>
</table>

<h2>Supported file formats</h2>
<ul>
  <li><strong>.gcode</strong> &mdash; Cura, PrusaSlicer, OrcaSlicer, BambuStudio</li>
  <li><strong>.3mf</strong> &mdash; 3D Manufacturing Format with embedded metadata</li>
  <li><strong>.cxdlpv4</strong> &mdash; ChiTuBox resin slicer format</li>
</ul>

<h2>Frequently asked questions</h2>
<h3>How do I calculate the cost of a 3D print?</h3>
<p>Add material, electricity, machine depreciation, labor and consumables for the unit cost, then add overhead and multiply by (1 + markup%). Upload a sliced file and PolymagicPrice fills in print time and weight for you.</p>
<h3>How much does it cost to 3D print something?</h3>
<p>Most hobby FDM parts cost $0.50&ndash;$5 in material and machine time; the final quoted price is usually $5&ndash;$30 once labor, overhead and markup are included. Resin parts cost more to finish because of wash and cure work.</p>
<h3>Is this 3D printing price calculator free?</h3>
<p>Yes. PolymagicPrice is free and open-source (AGPLv3), runs entirely in your browser, and never uploads your files.</p>

<p>Learn more: <a href="/guides/how-to-calculate-3d-printing-cost">How to calculate 3D printing cost</a> &middot;
   <a href="/guides/fdm-vs-resin-printing-cost">FDM vs resin cost comparison</a> &middot;
   <a href="/guides/filament-cost-per-gram">Filament cost per gram</a> &middot;
   <a href="/tool-guide">Full documentation</a> &middot;
   <a href="${PARENT}/blogs/how-much-should-i-charge-for-3d-prints-the-ultimate-pricing-calculator/">Pricing strategy guide</a></p>`
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
  ),

  '/guides/how-to-calculate-3d-printing-cost': wrap(
    '<h1>How to Calculate 3D Printing Cost: Formula, Examples &amp; Free Calculator</h1>',
    `<p>The cost of a 3D print is the sum of six things: the material it uses, the electricity it draws, the wear it puts on the printer, your labor, shop overhead, and the profit margin you add on top. This guide shows the formula, walks through worked FDM and resin examples, and links to a free calculator that does the maths for you.</p>

<h2>The 3D printing cost formula</h2>
<p><strong>Unit cost = Material + Electricity + Machine depreciation + Labor + Consumables</strong><br>
<strong>Final price = (Unit cost + Overhead) &times; (1 + Markup%)</strong></p>

<h3>1. Material cost</h3>
<p>FDM: grams of filament &times; (spool price &divide; spool weight in grams). A $22, 1&nbsp;kg spool costs $0.022/g, so a 22&nbsp;g part uses about $0.48 of plastic. Resin: millilitres &times; (bottle price &divide; bottle volume in ml). Add 2&ndash;5% for purge, skirts and supports.</p>

<h3>2. Electricity cost</h3>
<p>(Printer wattage &divide; 1000) &times; print hours &times; electricity rate per kWh. A 120&nbsp;W printer running 3.5&nbsp;h at $0.15/kWh costs about $0.06. Electricity is almost always the smallest line item.</p>

<h3>3. Machine depreciation</h3>
<p>(Printer price + lifetime maintenance) &divide; expected lifetime hours. A $400 printer expected to last 6,000 productive hours wears at about $0.07/h, so a 3.5&nbsp;h print carries roughly $0.25 of machine cost. This is the number most hobbyists forget.</p>

<h3>4. Labor</h3>
<p>Time spent slicing, starting the print, removing it and post-processing &times; your hourly rate. Even 10 minutes at $18/h adds $3.00 &mdash; usually the largest single cost for small parts.</p>

<h3>5. Consumables</h3>
<p>FDM: nozzles, bed adhesive, build sheets. Resin: FEP film, IPA wash, gloves, paper filters. Amortise these across the prints they serve &mdash; typically $0.10&ndash;$0.50 per print.</p>

<h3>6. Overhead and markup</h3>
<p>Add 10&ndash;20% overhead for failed prints, packaging and admin, then multiply by 1.2&ndash;1.5 for markup. Simple parts sit near 20&ndash;30%; custom or design work 40&ndash;50%+.</p>

<h2>Worked example: FDM PLA part</h2>
<table>
  <thead><tr><th>Cost line</th><th>Calculation</th><th>Amount</th></tr></thead>
  <tbody>
    <tr><td>Material</td><td>22 g &times; $0.022/g</td><td>$0.48</td></tr>
    <tr><td>Electricity</td><td>0.12 kW &times; 3.5 h &times; $0.15</td><td>$0.06</td></tr>
    <tr><td>Machine depreciation</td><td>3.5 h &times; $0.07/h</td><td>$0.25</td></tr>
    <tr><td>Labor</td><td>10 min &times; $18/h</td><td>$3.00</td></tr>
    <tr><td>Consumables</td><td>amortised</td><td>$0.15</td></tr>
    <tr><td><strong>Unit cost</strong></td><td></td><td><strong>$3.94</strong></td></tr>
    <tr><td>+ 15% overhead, &times; 1.40 markup</td><td>($3.94 &times; 1.15) &times; 1.40</td><td><strong>$6.34</strong></td></tr>
  </tbody>
</table>

<h2>Worked example: resin miniature</h2>
<table>
  <thead><tr><th>Cost line</th><th>Calculation</th><th>Amount</th></tr></thead>
  <tbody>
    <tr><td>Material</td><td>18 ml &times; $0.045/ml</td><td>$0.81</td></tr>
    <tr><td>Electricity</td><td>0.06 kW &times; 4 h &times; $0.15</td><td>$0.04</td></tr>
    <tr><td>Machine depreciation</td><td>4 h &times; $0.05/h</td><td>$0.20</td></tr>
    <tr><td>Labor (wash, cure, supports)</td><td>15 min &times; $18/h</td><td>$4.50</td></tr>
    <tr><td>Consumables (FEP, IPA, gloves)</td><td>amortised</td><td>$0.35</td></tr>
    <tr><td><strong>Unit cost</strong></td><td></td><td><strong>$5.90</strong></td></tr>
    <tr><td>+ 15% overhead, &times; 1.40 markup</td><td>($5.90 &times; 1.15) &times; 1.40</td><td><strong>$9.50</strong></td></tr>
  </tbody>
</table>

<h2>Common mistakes</h2>
<ul>
  <li>Pricing only the plastic and ignoring labor &mdash; labor is usually the biggest cost.</li>
  <li>Forgetting machine depreciation, so the printer never pays for its own replacement.</li>
  <li>No failure allowance &mdash; one failed 10&nbsp;h print wipes out the margin on several good ones.</li>
  <li>Using the spool's stated weight instead of net filament weight (a 1&nbsp;kg spool of plastic plus the reel weighs more).</li>
</ul>

<h2>Frequently asked questions</h2>
<h3>What is the formula to calculate 3D printing cost?</h3>
<p>(Material + Electricity + Machine depreciation + Labor + Consumables + Overhead) &times; (1 + Markup%).</p>
<h3>How much does it cost to 3D print something?</h3>
<p>Hobby FDM parts typically cost $0.50&ndash;$5 in material and machine time and are quoted at $5&ndash;$30 after labor and markup. Resin parts cost more to finish.</p>
<h3>How much should I charge for 3D printing?</h3>
<p>Cost plus 20&ndash;50% markup. Use the lower end for simple repeat parts and the higher end for custom or design-heavy work.</p>

<p>Use the free <a href="/cost-calculator">3D printing cost calculator</a>, compare <a href="/guides/fdm-vs-resin-printing-cost">FDM vs resin costs</a>, or learn <a href="/guides/filament-cost-per-gram">filament cost per gram</a>.</p>`
  ),

  '/guides/fdm-vs-resin-printing-cost': wrap(
    '<h1>FDM vs Resin 3D Printing Cost: Full Price Comparison</h1>',
    `<p>FDM and resin printing are priced differently. FDM material is sold by weight and needs little finishing; resin is sold by volume, costs more per part, and adds significant wash-and-cure labor and consumables. This guide compares every cost line and works through real cost-per-part numbers.</p>

<h2>Cost comparison table</h2>
<table>
  <thead><tr><th>Cost factor</th><th>FDM (filament)</th><th>Resin (SLA/DLP/LCD)</th></tr></thead>
  <tbody>
    <tr><td>Material price</td><td>$15&ndash;$50 per kg</td><td>$35&ndash;$150+ per litre</td></tr>
    <tr><td>Material per typical part</td><td>$0.20&ndash;$2.00</td><td>$0.50&ndash;$4.00</td></tr>
    <tr><td>Printer price</td><td>$200&ndash;$1,200</td><td>$150&ndash;$600 (plus wash/cure station)</td></tr>
    <tr><td>Power draw</td><td>100&ndash;150 W</td><td>40&ndash;80 W</td></tr>
    <tr><td>Consumables</td><td>Nozzles, glue, build sheets ($0.05&ndash;$0.20/print)</td><td>FEP film, IPA, gloves, filters ($0.20&ndash;$0.60/print)</td></tr>
    <tr><td>Post-processing labor</td><td>Low &mdash; remove supports</td><td>High &mdash; wash, cure, remove dense supports</td></tr>
    <tr><td>Failure allowance</td><td>5&ndash;10%</td><td>10&ndash;20%</td></tr>
  </tbody>
</table>

<h2>Where the money actually goes</h2>
<p><strong>Material:</strong> per gram, PLA is around $0.02 and a standard resin around $0.04&ndash;$0.05 per ml. Resin parts are usually smaller, so material cost is often comparable &mdash; the gap is in everything else.</p>
<p><strong>Electricity:</strong> negligible for both (a few cents per print). Resin printers draw less power.</p>
<p><strong>Consumables:</strong> resin's biggest hidden cost. FEP film ($5&ndash;$15) lasts ~20&ndash;40 prints, plus IPA (about 1&nbsp;L per few litres of resin), nitrile gloves and filters every print.</p>
<p><strong>Labor:</strong> the decisive factor. An FDM part needs a minute of support removal; a resin part needs draining, an IPA bath, drying, UV curing and removal of dense supports &mdash; 10&ndash;20 minutes that dominate the unit cost.</p>

<h2>Cost-per-part example</h2>
<p>A palm-sized bracket in PLA: ~$0.60 material, ~$0.30 machine + power, ~$3.00 labor &rarr; <strong>~$3.90 unit cost</strong>.</p>
<p>The same object in resin: ~$1.10 material, ~$0.25 machine + power, ~$0.40 consumables, ~$4.50 labor &rarr; <strong>~$6.25 unit cost</strong>.</p>
<p>Resin runs roughly 40&ndash;70% more per part at hobby scale, almost entirely because of finishing labor and consumables.</p>

<h2>When each is cheaper</h2>
<ul>
  <li><strong>FDM is cheaper</strong> for functional parts, larger objects, prototypes, and anything where surface finish is not critical.</li>
  <li><strong>Resin is worth the premium</strong> for miniatures, jewellery, dental/medical models and highly detailed display pieces &mdash; FDM simply cannot hit the same detail.</li>
</ul>

<h2>Frequently asked questions</h2>
<h3>Is resin printing more expensive than FDM?</h3>
<p>Yes. Material is only slightly more per part, but consumables and wash/cure labor push the finished cost 40&ndash;70% higher at hobby scale.</p>
<h3>How much does resin cost per print?</h3>
<p>Most small resin prints use $0.50&ndash;$4 of resin plus $0.20&ndash;$0.60 of consumables; finished cost after labor and markup is typically $8&ndash;$25.</p>
<h3>Is PLA the cheapest filament?</h3>
<p>PLA and basic PETG are the cheapest common filaments at $15&ndash;$25/kg. Engineering filaments (nylon, PC, CF blends) run $40&ndash;$80/kg.</p>

<p>Price either technology with the free <a href="/cost-calculator">3D printing cost calculator</a>, or read <a href="/guides/how-to-calculate-3d-printing-cost">how to calculate 3D printing cost</a>.</p>`
  ),

  '/guides/filament-cost-per-gram': wrap(
    '<h1>Filament Cost Per Gram: How to Price PLA, PETG &amp; ABS 3D Prints</h1>',
    `<p>Filament cost per gram is the foundation of every FDM price estimate. It is simply the spool price divided by the spool's net filament weight in grams. Multiply that by the grams a print uses (from your slicer) and you have the material cost.</p>

<h2>The formula</h2>
<p><strong>Cost per gram = Spool price &divide; Spool weight (g)</strong><br>
<strong>Print material cost = Cost per gram &times; Grams used &times; (1 + waste allowance)</strong></p>
<p>A $24 spool holding 1,000&nbsp;g of filament costs $0.024/g. A print that the slicer says uses 45&nbsp;g costs 45 &times; $0.024 = $1.08, or about $1.13 with a 5% waste allowance for purge and supports.</p>

<h2>Reference table (typical retail prices)</h2>
<table>
  <thead><tr><th>Material</th><th>Spool price (1 kg)</th><th>Cost per gram</th><th>Cost of a 30 g print</th></tr></thead>
  <tbody>
    <tr><td>PLA</td><td>$18&ndash;$25</td><td>$0.018&ndash;$0.025</td><td>$0.54&ndash;$0.75</td></tr>
    <tr><td>PETG</td><td>$20&ndash;$28</td><td>$0.020&ndash;$0.028</td><td>$0.60&ndash;$0.84</td></tr>
    <tr><td>ABS / ASA</td><td>$20&ndash;$30</td><td>$0.020&ndash;$0.030</td><td>$0.60&ndash;$0.90</td></tr>
    <tr><td>TPU (flexible)</td><td>$30&ndash;$45</td><td>$0.030&ndash;$0.045</td><td>$0.90&ndash;$1.35</td></tr>
    <tr><td>Nylon (PA)</td><td>$40&ndash;$70</td><td>$0.040&ndash;$0.070</td><td>$1.20&ndash;$2.10</td></tr>
    <tr><td>CF-filled</td><td>$50&ndash;$90</td><td>$0.050&ndash;$0.090</td><td>$1.50&ndash;$2.70</td></tr>
  </tbody>
</table>

<h2>Getting the weight right</h2>
<ul>
  <li><strong>Use net filament weight, not spool weight.</strong> A "1 kg" spool weighs ~1.2&ndash;1.35&nbsp;kg with the reel. Divide by 1,000&nbsp;g, not the number on the scale.</li>
  <li><strong>Take grams from the slicer,</strong> which reports filament used for the model plus supports, skirt/brim and purge.</li>
  <li><strong>Add a waste allowance</strong> of 2&ndash;5% for multi-colour purging, failed first layers and priming.</li>
  <li><strong>Account for partial spools</strong> &mdash; if you paid $24 but only 900&nbsp;g is usable, your real cost per gram is $0.0267.</li>
</ul>

<h2>From cost per gram to a full price</h2>
<p>Material is one of six cost lines. Once you have it, add electricity, machine depreciation, labor, consumables and overhead, then apply markup. See <a href="/guides/how-to-calculate-3d-printing-cost">how to calculate 3D printing cost</a> for the full method.</p>

<h2>Frequently asked questions</h2>
<h3>How do I calculate filament cost per gram?</h3>
<p>Divide the spool price by the net filament weight in grams. $25 &divide; 1,000&nbsp;g = $0.025 per gram.</p>
<h3>How much filament does a print use?</h3>
<p>Your slicer reports it after slicing (grams and metres). Small parts use 5&ndash;30&nbsp;g; a large functional part can use 200&ndash;500&nbsp;g.</p>
<h3>What is the cheapest 3D printer filament?</h3>
<p>PLA is the cheapest and easiest to print, usually $18&ndash;$25 per kg. Basic PETG is a little more but more durable.</p>

<p>Turn grams into a full quote with the free <a href="/cost-calculator">3D printing cost calculator</a>, or compare <a href="/guides/fdm-vs-resin-printing-cost">FDM vs resin costs</a>.</p>`
  )
};

// ── SEO Configuration Map ─────────────────────────────────────────────────
const seoMap = {
  '/': {
    title: "3D Printing Price Calculator \u2014 Free FDM & Resin Cost & Quote Tool",
    description: "Free 3D printing price calculator for FDM filament and Resin (SLA/DLP). Upload G-code, 3MF or CXDLPV4 files to calculate material, electricity, labor and machine costs, then generate professional PDF quotes. Open-source, offline, no cloud."
  },
  '/cost-calculator': {
    title: "3D Printing Cost Calculator \u2014 Free FDM & Resin Price Estimator",
    description: "Calculate accurate 3D printing costs for FDM filament and Resin (SLA/DLP). Upload a G-code file to auto-fill print time and weight, see a full material + electricity + labor + machine breakdown, and export a professional quote. Free and 100% offline."
  },
  '/guides/how-to-calculate-3d-printing-cost': {
    title: "How to Calculate 3D Printing Cost \u2014 Formula, Examples & Calculator",
    description: "Learn the exact formula to calculate 3D printing cost: material + electricity + machine depreciation + labor + overhead + markup. Includes worked FDM and resin examples, a cost table, and a free calculator."
  },
  '/guides/fdm-vs-resin-printing-cost': {
    title: "FDM vs Resin 3D Printing Cost \u2014 Full Price Comparison",
    description: "A detailed cost comparison of FDM and resin (SLA/DLP) 3D printing: material price per kg vs per litre, consumables, electricity, failure rates and real cost-per-part examples. See which is cheaper for your parts."
  },
  '/guides/filament-cost-per-gram': {
    title: "Filament Cost Per Gram \u2014 Price PLA, PETG & ABS 3D Prints",
    description: "How to work out filament cost per gram from spool price and weight, a reference table for common PLA, PETG, ABS and TPU spools, and how to turn grams of filament into an accurate per-print material cost."
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

// ── Per-page Structured Data (bot-injected into <head>) ───────────────────
// Keyed by clean path. Each entry is an array of JSON-LD objects that match the
// visible content of that route, so Google can build rich results (FAQ, article).
const faq = (q, a) => ({ "@type": "Question", "name": q, "acceptedAnswer": { "@type": "Answer", "text": a } });

const pageSchemaMap = {
  '/cost-calculator': [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "PolymagicPrice 3D Printing Cost Calculator",
      "url": `${SITE}/cost-calculator`,
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "description": "Free 3D printing cost calculator for FDM and resin. Upload a G-code, 3MF or CXDLPV4 file to auto-calculate material, electricity, machine and labor costs and generate a professional quote."
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        faq("How do I calculate the cost of a 3D print?", "Add material, electricity, machine depreciation, labor and consumables for the unit cost, then add overhead and multiply by (1 + markup%). Upload a sliced file and PolymagicPrice fills in print time and weight for you."),
        faq("How much does it cost to 3D print something?", "Most hobby FDM parts cost $0.50-$5 in material and machine time; the final quoted price is usually $5-$30 once labor, overhead and markup are included. Resin parts cost more to finish because of wash and cure work."),
        faq("Is this 3D printing price calculator free?", "Yes. PolymagicPrice is free and open-source (AGPLv3), runs entirely in your browser, and never uploads your files.")
      ]
    }
  ],
  '/guides/how-to-calculate-3d-printing-cost': [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Calculate 3D Printing Cost: Formula, Examples & Free Calculator",
      "author": { "@type": "Person", "name": "RP Hobbyist", "url": PARENT },
      "publisher": { "@type": "Person", "name": "RP Hobbyist", "url": PARENT },
      "mainEntityOfPage": `${SITE}/guides/how-to-calculate-3d-printing-cost`,
      "datePublished": "2026-09-06",
      "dateModified": "2026-09-06"
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        faq("What is the formula to calculate 3D printing cost?", "(Material + Electricity + Machine depreciation + Labor + Consumables + Overhead) x (1 + Markup%)."),
        faq("How much does it cost to 3D print something?", "Hobby FDM parts typically cost $0.50-$5 in material and machine time and are quoted at $5-$30 after labor and markup. Resin parts cost more to finish."),
        faq("How much should I charge for 3D printing?", "Cost plus 20-50% markup. Use the lower end for simple repeat parts and the higher end for custom or design-heavy work.")
      ]
    }
  ],
  '/guides/fdm-vs-resin-printing-cost': [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "FDM vs Resin 3D Printing Cost: Full Price Comparison",
      "author": { "@type": "Person", "name": "RP Hobbyist", "url": PARENT },
      "publisher": { "@type": "Person", "name": "RP Hobbyist", "url": PARENT },
      "mainEntityOfPage": `${SITE}/guides/fdm-vs-resin-printing-cost`,
      "datePublished": "2026-09-06",
      "dateModified": "2026-09-06"
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        faq("Is resin printing more expensive than FDM?", "Yes. Material is only slightly more per part, but consumables and wash/cure labor push the finished cost 40-70% higher at hobby scale."),
        faq("How much does resin cost per print?", "Most small resin prints use $0.50-$4 of resin plus $0.20-$0.60 of consumables; finished cost after labor and markup is typically $8-$25."),
        faq("Is PLA the cheapest filament?", "PLA and basic PETG are the cheapest common filaments at $15-$25/kg. Engineering filaments (nylon, PC, CF blends) run $40-$80/kg.")
      ]
    }
  ],
  '/guides/filament-cost-per-gram': [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Filament Cost Per Gram: How to Price PLA, PETG & ABS 3D Prints",
      "author": { "@type": "Person", "name": "RP Hobbyist", "url": PARENT },
      "publisher": { "@type": "Person", "name": "RP Hobbyist", "url": PARENT },
      "mainEntityOfPage": `${SITE}/guides/filament-cost-per-gram`,
      "datePublished": "2026-09-06",
      "dateModified": "2026-09-06"
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        faq("How do I calculate filament cost per gram?", "Divide the spool price by the net filament weight in grams. $25 / 1,000 g = $0.025 per gram."),
        faq("How much filament does a print use?", "Your slicer reports it after slicing (grams and metres). Small parts use 5-30 g; a large functional part can use 200-500 g."),
        faq("What is the cheapest 3D printer filament?", "PLA is the cheapest and easiest to print, usually $18-$25 per kg. Basic PETG is a little more but more durable.")
      ]
    }
  ]
};

// ── Known client-side routes ─────────────────────────────────────────────
// Any HTML request whose path is not one of these (and is not a static file)
// is served the SPA shell with a real 404 status, so Google does not log it as
// a "soft 404". The React NotFound view still renders for the user.
const KNOWN_ROUTES = new Set([
  '/',
  '/index.html',
  '/cost-calculator',
  '/settings',
  '/billing-analysis',
  '/order-manager',
  '/print-manager',
  '/capacity-planner',
  '/database-manager',
  '/notification',
  '/tool-guide',
  '/guides/how-to-calculate-3d-printing-cost',
  '/guides/fdm-vs-resin-printing-cost',
  '/guides/filament-cost-per-gram',
  // Legacy aliases kept as client-side redirects in App.tsx
  '/calculator',
  '/manage-orders',
  '/system-database',
  '/notifications',
  '/saved-quotes',
  '/order-management',
  '/machine-manager',
  '/database'
]);

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
    newHeaders.set('Link', '</sitemap.xml>; rel="sitemap", </markdown/tool-guide.md>; rel="service-doc"');
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
    const isKnownRoute = KNOWN_ROUTES.has(lookupPath);

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

    // ── Unknown route: mark noindex so a stray crawl never indexes the shell ──
    if (!isKnownRoute) {
      rewriter.on('meta[name="robots"]', {
        element(e) { e.setAttribute('content', 'noindex, follow'); }
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

    // ── Bot-aware per-page structured data (FAQ / Article / WebApplication) ──
    // Appends route-specific JSON-LD so calculator and guide pages are eligible
    // for rich results instead of relying only on the app-wide schema in index.html.
    if (isBotRequest && pageSchemaMap[lookupPath]) {
      const blocks = pageSchemaMap[lookupPath]
        .map(obj => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`)
        .join('');
      rewriter.on('head', {
        element(e) { e.append(blocks, { html: true }); }
      });
    }

    response = rewriter.transform(response);

    // ── Real 404 for unknown routes (kills Search Console "soft 404") ──
    // The body is still the SPA shell, so React Router renders the NotFound view;
    // only the HTTP status changes.
    if (!isKnownRoute && response.status === 200) {
      response = new Response(response.body, {
        status: 404,
        statusText: 'Not Found',
        headers: response.headers
      });
    }
  }

  return response;
}

