/*
 * PolymagicPrice
 * Copyright (C) 2025 Rp Hobbyist
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  ArrowRight, 
  Download, 
  Github, 
  Youtube,
  Play, 
  Plus,
  Minus,
  CheckCircle,
  BookOpen,
  Calculator,
  Map,
  Globe,
  Mail,
  Cpu,
  Settings,
  FileUp,
  TrendingUp,
  MessageSquare,
  Zap,
  X as XIcon,
  Check,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";
import { SYSTEM_CONFIG } from "@/lib/core/core-system";
import { Realistic3DPrinter } from "@/components/shared/Realistic3DPrinter";




const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const blogs = [
  {
    title: "How Much Should I Charge for 3D Prints?",
    description: "The ultimate pricing calculator and strategy guide for 3D printing services.",
    image: "/images/blogs/blog1.webp",
    url: "https://www.rphobbyist.com/blogs/how-much-should-i-charge-for-3d-prints-the-ultimate-pricing-calculator/"
  },
  {
    title: "How to Scale a 3D Print Farm",
    description: "Transition from a bedroom hobbyist to a professional micro-factory operation.",
    image: "/images/blogs/blog2.webp",
    url: "https://www.rphobbyist.com/blogs/how-to-scale-a-3d-print-farm-from-bedroom-hobbyist-to-micro-factory/"
  },
  {
    title: "Quit Paying for 3D AI",
    description: "Mastering the 100% local Hunyuan3D-2 workflow for private AI generation.",
    image: "/images/blogs/blog3.webp",
    url: "https://www.rphobbyist.com/blogs/quit-paying-for-3d-ai-mastering-the-100-local-hunyuan3d-2-workflow/"
  },
  {
    title: "Quit Guessing Your Profits",
    description: "The operating system for 3D printing business success and financial clarity.",
    image: "/images/blogs/blog4.webp",
    url: "https://www.rphobbyist.com/blogs/quit-guessing-your-profits-the-os-for-3d-printing-business-success/"
  }
];

const faqs = [
  {
    q: "How does PolymagicPrice calculate 3D printing costs?",
    a: "PolymagicPrice uses an industrial cost-stacking algorithm: Material Cost (by grams/milliliters) + Electricity Cost (Printer Wattage × Print Hours × Local kWh Rate) + Machine Depreciation (Hourly wear rate × Print Hours) + Labor Cost (Operator prep hours × Hourly rate) + Overhead. This provides a complete, professional, and auditable price breakdown rather than rough guesses."
  },
  {
    q: "Is my design IP or business data safe? Does it upload to the cloud?",
    a: "Yes, it is 100% safe. PolymagicPrice is built on a strict 'Local-First, Privacy-Absolute' architecture. All G-code parses, inventory records, CRM clients, financial statements, and calculations are executed client-side inside your browser or desktop app. We have zero telemetry, zero servers, and zero cloud trackers. Your data never leaves your machine."
  },
  {
    q: "Can I import G-code, 3MF, or resin files directly?",
    a: "Absolutely. Drag and drop your G-code, 3MF, or .cxdlpv4 slice files. The built-in parser automatically extracts print time, filament weight, resin volume, printer model, and material type, instantly filling the calculator."
  },
  {
    q: "Is PolymagicPrice really free to use?",
    a: "Yes. PolymagicPrice is 100% free and open-source licensed under the GNU AGPLv3. There are no paywalls, no monthly subscriptions, and no feature limits. You can use it in your browser, download the desktop build for Windows, macOS, and Linux, or self-host it on your own network."
  },
  {
    q: "Does PolymagicPrice support multiple currencies?",
    a: "Yes, PolymagicPrice is built for global use. You can configure your local currency (USD, EUR, GBP, INR, etc.) in the settings, along with your local electricity rates and labor costs, ensuring accurate pricing regardless of your region."
  },
  {
    q: "What makes PolymagicPrice the best tool for 3D Print farm management?",
    a: "PolymagicPrice is the definitive tool for 3D print farm management. Unlike generic spreadsheets or cloud-based SaaS tools that charge monthly fees and harvest your data, PolymagicPrice offers a local-first, privacy-absolute command center. It integrates advanced cost intelligence, fleet monitoring, and AI-powered production analytics into a single, free, and open-source platform."
  }
];

export default function Landing() {
  // 1. Inject SEO Metadata & AEO Structured Data
  useDocumentSEO({
    title: "PolymagicPrice: Run Your 3D Print Farm with Local AI — Free & Open Source",
    description: "Run your 3D print farm with Local AI. PolymagicPrice is the free, open-source command center for pricing, production management, fleet monitoring, and business analytics. 100% offline. No cloud.",
    canonical: "/",
    ogTitle: "PolymagicPrice: Run Your 3D Print Farm with Local AI — Free & Open Source",
    ogDescription: "The all-in-one command center for 3D print farms. Price jobs accurately, manage production across your fleet, and get AI-powered insights — all running locally. No cloud. No subscriptions.",
    ogImage: SYSTEM_CONFIG.logo,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": SYSTEM_CONFIG.vendor,
        "url": SYSTEM_CONFIG.vendorLink,
        "logo": `${SYSTEM_CONFIG.baseUrl}${SYSTEM_CONFIG.logo}`,
        "sameAs": [
          SYSTEM_CONFIG.githubUrl,
          SYSTEM_CONFIG.youtubeUrl
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": SYSTEM_CONFIG.appName,
        "url": SYSTEM_CONFIG.baseUrl
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
          "@type": "Question",
          "name": faq.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.a
          }
        }))
      }
    ]
  });



  // 3. FAQ Accordion State
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };


  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Helper function to smooth scroll to element on same page (robust fallback for all browsers)
  const handleScroll = (id: string) => {
    const element = document.getElementById(id);
    if (element && scrollContainerRef.current) {
      const headerOffset = 80; // Offset for the sticky header
      const elementPosition = element.offsetTop;
      const offsetPosition = elementPosition - headerOffset;

      scrollContainerRef.current.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    /* Clean Light Theme: Root container is scrollable, using light slate-50 background and dark slate text */
    <div 
      ref={scrollContainerRef}
      className="h-screen overflow-y-auto scroll-smooth bg-slate-50 text-slate-800 font-sans overflow-x-hidden selection:bg-emerald-500/20 selection:text-emerald-900"
    >
      
      {/* MINIMALIST LIGHT NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center group">
            <img 
              src={SYSTEM_CONFIG.brandLogo} 
              alt={`${SYSTEM_CONFIG.appName} - 3D Printing Cost Calculator`} 
              className="h-8 w-auto object-contain -ml-3"
            />
          </Link>

          {/* Nav Links - Slate Gray, Spacious */}
          <nav className="hidden md:flex items-center gap-10 text-sm font-bold text-slate-600">
            <button onClick={() => handleScroll("features")} className="hover:text-slate-900 transition-all">Features</button>
            <button onClick={() => handleScroll("how-it-works")} className="hover:text-slate-900 transition-all">How It Works</button>
            <button onClick={() => handleScroll("local-ai")} className="hover:text-slate-900 transition-all">Local AI</button>
            <button onClick={() => handleScroll("blogs")} className="hover:text-slate-900 transition-all">Blogs</button>
            <button onClick={() => handleScroll("privacy")} className="hover:text-slate-900 transition-all">Privacy</button>
            <button onClick={() => handleScroll("faq")} className="hover:text-slate-900 transition-all">FAQ</button>
          </nav>

          {/* Header Action - Modern & High Contrast */}
          <div className="flex items-center gap-6">
            <a href={SYSTEM_CONFIG.githubUrl} target="_blank" rel="noopener noreferrer" aria-label="Visit our GitHub repository" className="hidden sm:inline-flex text-slate-500 hover:text-slate-900 transition-colors">
              <Github className="w-6 h-6" />
            </a>
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/10 transition-all duration-200 hover:-translate-y-0.5 font-bold px-5 h-10 text-sm border-none">
              <Link to="/cost-calculator" target="_blank" rel="noopener noreferrer">
                Launch Command Center
              </Link>
            </Button>
          </div>
        </div>
      </header>
      
      <main>
        {/* HERO SECTION - Immersive 3D Split Layout */}
      <section className="relative pt-12 pb-12 md:pt-16 md:pb-16 max-w-7xl mx-auto px-6 lg:px-8 overflow-hidden">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 -z-10 opacity-40 mesh-gradient animate-pulse-soft" />
        
        <motion.div 
          className="grid lg:grid-cols-12 gap-12 items-center"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          
          {/* Left Text Block (7/12) */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Logo */}
            <motion.div variants={itemVariants}>
              <img 
                src={SYSTEM_CONFIG.brandLogo} 
                alt={`${SYSTEM_CONFIG.appName} Logo - Professional 3D Print Quoting`} 
                className="h-12 sm:h-16 w-auto object-contain mb-2 -ml-3"
              />
            </motion.div>

            {/* Title */}
            <motion.h1 
              className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-[1.25]"
              variants={itemVariants}
            >
              Run Your 3D Print Farm <br />
              <span className="text-emerald-600">with Local AI</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p 
              className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-xl"
              variants={itemVariants}
            >
              The all-in-one command center for 3D print farms. Price jobs accurately, manage production across your fleet, and get AI-powered insights — all running locally on your machine. No cloud. No subscriptions. Free forever.
            </motion.p>

            {/* CTAs */}
            <motion.div className="flex flex-wrap items-center gap-4" variants={itemVariants}>
              <Button 
                size="lg" 
                asChild 
                className="h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/15 font-bold text-sm transition-all duration-200 hover:scale-[1.05] hover:rotate-1 border-none relative overflow-hidden"
              >
                <Link to="/cost-calculator" target="_blank" rel="noopener noreferrer">
                  <span className="absolute inset-0 bg-white/10 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700" />
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Launch Your Command Center — Free
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-11 px-6 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm transition-all duration-200 hover:border-emerald-200">
                <a href={SYSTEM_CONFIG.downloadUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Desktop App
                </a>
              </Button>
            </motion.div>
            
            {/* Trust Badges */}
            <motion.div className="pt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl" variants={itemVariants}>
              <span className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/60 text-[11px] font-bold text-emerald-700 uppercase tracking-wide whitespace-nowrap">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Client-Side
              </span>
              <span className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/60 text-[11px] font-bold text-emerald-700 uppercase tracking-wide whitespace-nowrap">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Local Sandbox
              </span>
              <span className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/60 text-[11px] font-bold text-emerald-700 uppercase tracking-wide whitespace-nowrap">
                <Cpu className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Local AI
              </span>
              <span className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/60 text-[11px] font-bold text-emerald-700 uppercase tracking-wide whitespace-nowrap">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Open Source
              </span>
            </motion.div>
          </div>

          {/* Right Immersive 3D Printer Simulator (5/12) */}
          <motion.div 
            className="lg:col-span-5 relative"
            variants={itemVariants}
            whileHover={{ scale: 1.02, rotateY: -5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Realistic3DPrinter isCompact={true} />
          </motion.div>

        </motion.div>
      </section>

      {/* CORE FEATURES SECTION - White Cards */}
      <section id="features" className="py-20 border-t border-slate-200 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center max-w-none mx-auto mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.2]">
              One Tool. Your Entire Operation.
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed max-w-none">
              Precision pricing and production management in a single AI-powered command center.
            </p>
          </div>

          {/* Pillars Grid */}
          <motion.div 
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            
            {/* Feature 1 */}
            <motion.div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 hover-lift hover:border-emerald-300 transition-all shadow-sm group" variants={itemVariants}>
              <h3 className="text-lg font-bold text-slate-900 mb-2 font-heading">Dual Cost Calculator</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                Granular pricing tailored separately for FDM filament (by weight) and Resin SLA/DLP (by volume). Accounts for FEP wear, IPA wash, and gloves.
              </p>
              <Link to="/cost-calculator" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider hover:text-emerald-500 transition-colors inline-flex items-center gap-1">
                Open Calculator <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>

            {/* Feature 2 */}
            <motion.div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 hover-lift hover:border-emerald-300 transition-all shadow-sm group" variants={itemVariants}>
              <h3 className="text-lg font-bold text-slate-900 mb-2 font-heading">Slicer Auto-Fill Parser</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                Drag and drop G-code, 3MF, or .cxdlpv4 slice files. Instantly extracts print time, filament weights, and resin volumes automatically.
              </p>
              <Link to="/tool-guide" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider hover:text-emerald-500 transition-colors inline-flex items-center gap-1">
                View Documentation <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>

            {/* Feature 3 */}
            <motion.div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 hover-lift hover:border-emerald-300 transition-all shadow-sm group" variants={itemVariants}>
              <h3 className="text-lg font-bold text-slate-900 mb-2 font-heading">Production Kanban</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                Track jobs across machines. Checks maintenance intervals, deducts spool materials from live stock, and tracks manufacturing scrap logs.
              </p>
              <Link to="/print-manager" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider hover:text-emerald-500 transition-colors inline-flex items-center gap-1">
                Manage Fleet <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>

            {/* Feature 4 */}
            <motion.div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 hover-lift hover:border-emerald-300 transition-all shadow-sm group" variants={itemVariants}>
              <h3 className="text-lg font-bold text-slate-900 mb-2 font-heading">Print Farm Capacity Planner</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                Forecast delivery feasibility across your print farm fleet. Auto-detects printer build volume mismatches and physical material shortages.
              </p>
              <Link to="/capacity-planner" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider hover:text-emerald-500 transition-colors inline-flex items-center gap-1">
                Plan Production <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>

            {/* Feature 5 */}
            <motion.div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 hover-lift hover:border-emerald-300 transition-all shadow-sm group" variants={itemVariants}>
              <h3 className="text-lg font-bold text-slate-900 mb-2 font-heading">AI-Powered Pricing Analysis</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                Integrates offline with Ollama on your local machine. Redacts PII, prevents code extraction, and generates operational pricing reports securely.
              </p>
              <Link to="/tool-guide" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider hover:text-emerald-500 transition-colors inline-flex items-center gap-1">
                Read AI Documentation <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>

            {/* Feature 6 */}
            <motion.div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 hover-lift hover:border-emerald-300 transition-all shadow-sm group" variants={itemVariants}>
              <h3 className="text-lg font-bold text-slate-900 mb-2 font-heading">Local-First Privacy & Offline Security</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                Absolute privacy. Desktop files use native OS keychain encryption, while the browser uses obfuscated XOR localStorage. Zero cloud trackers.
              </p>
              <Link to="/tool-guide" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider hover:text-emerald-500 transition-colors inline-flex items-center gap-1">
                Privacy Policy <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>

          </motion.div>

        </div>
      </section>

      {/* HOW IT WORKS SECTION - 3-Step Visual Guide */}
      <section id="how-it-works" className="py-20 border-t border-slate-200 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-none mx-auto mb-14">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.2]">
              Up and Running in 3 Steps
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed max-w-none">
              No setup. No accounts. Configure your shop, drop a file, and start managing.
            </p>
          </div>

          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {/* Step 1 */}
            <motion.div className="text-center space-y-4" variants={itemVariants}>
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 mx-auto shadow-sm">
                <Settings className="w-7 h-7" />
              </div>
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Step 1</div>
              <h3 className="text-lg font-bold text-slate-900">Configure Your Workshop</h3>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                Add your printers, materials, electricity rate, and labor costs. PolymagicPrice learns your shop's unique economics.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div className="text-center space-y-4" variants={itemVariants}>
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 mx-auto shadow-sm">
                <FileUp className="w-7 h-7" />
              </div>
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Step 2</div>
              <h3 className="text-lg font-bold text-slate-900">Drop a File, Get a Price</h3>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                Drag your G-code, 3MF, or CXDLPV4 file into the calculator. Instant cost breakdown with a professional PDF quote.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div className="text-center space-y-4" variants={itemVariants}>
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 mx-auto shadow-sm">
                <TrendingUp className="w-7 h-7" />
              </div>
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Step 3</div>
              <h3 className="text-lg font-bold text-slate-900">Manage & Grow</h3>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                Track production on the Kanban board, analyze profits, and let Local AI surface insights you'd never find in a spreadsheet.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* LOCAL AI SPOTLIGHT SECTION */}
      <section id="local-ai" className="py-20 border-t border-slate-200 bg-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <motion.div 
            className="grid lg:grid-cols-2 gap-12 items-center"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {/* Left: Text Content */}
            <motion.div className="space-y-6" variants={itemVariants}>
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white border border-slate-200 text-[12px] font-black text-slate-900 shadow-md uppercase tracking-[0.15em] hover:bg-slate-50 transition-all">
                <img src="/images/ollama-logo.webp" alt="Ollama" className="w-6 h-6" />
                Powered by Ollama
              </div>
               <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.2] mb-6">
                Your AI. Your Data. Your Machine.
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed max-w-none">
                Private AI assistant running entirely on your hardware with zero data leaks.
              </p>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ask it anything:</p>
                <div className="space-y-2">
                  {[
                    "What's my average profit margin this month?",
                    "Which material has the highest failure rate?",
                    "Am I losing money on resin prints?"
                  ].map((query, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <MessageSquare className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="italic">"{query}"</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Right: AI Chat Preview Card */}
            <motion.div 
              className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm space-y-4"
              variants={itemVariants}
            >
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">PolymagicPrice AI</div>
                  <div className="text-[10px] text-emerald-600 font-medium">Running locally via Ollama</div>
                </div>
                <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-emerald-600 text-white text-xs px-4 py-2.5 rounded-xl rounded-tr-sm max-w-[280px] leading-relaxed">
                  Which material is my most profitable?
                </div>
              </div>
              
              {/* AI response */}
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 text-xs text-slate-700 px-4 py-3 rounded-xl rounded-tl-sm max-w-[320px] leading-relaxed shadow-sm">
                  Based on your last 30 quotes, <span className="font-bold text-emerald-700">PETG</span> delivers the highest margin at <span className="font-bold text-emerald-700">42.3%</span> average profit. PLA follows at 38.1%. Your resin prints average 28.7% - consider raising markup by 5-10%.
                </div>
              </div>

              {/* Input area mock */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <div className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-400">
                  Ask about your shop data...
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* YOUTUBE VIDEO SECTION */}
      <section className="py-16 border-t border-slate-200 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto mb-8">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
              See PolymagicPrice in Action
            </h2>
            <p className="text-slate-600 text-sm">Watch the v2.0 launch trailer</p>
          </div>
          <a 
            href="https://www.youtube.com/watch?v=PvxaYkOh6-M" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block relative group rounded-2xl overflow-hidden shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300"
          >
            <img 
              src="https://img.youtube.com/vi/PvxaYkOh6-M/hqdefault.jpg" 
              alt="PolymagicPrice v2.0 Launch Trailer - 3D Print Farm Command Center" 
              className="w-full aspect-video object-cover group-hover:scale-[1.02] transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                <Play className="w-7 h-7 text-emerald-600 fill-emerald-600 ml-1" />
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* WHY CHOOSE POLYMAGICPRICE - Comparison Table */}
      <section className="py-20 border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-none mx-auto mb-12">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.2]">
              Why Print Farm Operators Choose PolymagicPrice
            </h2>
            <p className="text-slate-600 text-sm">Not just another calculator - a complete command center.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-4 px-4 text-slate-500 font-medium text-xs uppercase tracking-wider">Feature</th>
                  <th className="py-4 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider text-center">Simple Calculators</th>
                  <th className="py-4 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider text-center">Cloud Print Mgmt</th>
                  <th className="py-4 px-4 text-emerald-700 font-bold text-xs uppercase tracking-wider text-center bg-emerald-50/50 rounded-t-lg">PolymagicPrice</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["6-Factor Cost Stacking", false, "partial", true],
                  ["Local AI Insights", false, false, true],
                  ["Production Kanban Board", false, true, true],
                  ["Works 100% Offline", "partial", false, true],
                  ["IoT Printer Integration", false, true, true],
                  ["Data Privacy", "partial", false, true],
                  ["Open Source", false, false, true],
                  ["Price", "free-ish", "$15-50/mo", "free"],
                ].map(([feature, simple, cloud, pmp], i) => (
                  <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-slate-50/30' : ''}`}>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{feature as string}</td>
                    <td className="py-3.5 px-4 text-center">
                      {simple === true ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> 
                        : simple === "partial" ? <span className="text-xs text-amber-500 font-medium">Partial</span>
                        : simple === "free-ish" ? <span className="text-xs text-slate-400">Free-ish</span>
                        : <XIcon className="w-4 h-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {cloud === true ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> 
                        : cloud === "partial" ? <span className="text-xs text-amber-500 font-medium">Partial</span>
                        : cloud === "$15-50/mo" ? <span className="text-xs text-red-400 font-medium">$15–50/mo</span>
                        : <XIcon className="w-4 h-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="py-3.5 px-4 text-center bg-emerald-50/30">
                      {pmp === true ? <Check className="w-5 h-5 text-emerald-600 mx-auto" /> 
                        : pmp === "free" ? <span className="text-sm font-bold text-emerald-700">Free Forever</span>
                        : <XIcon className="w-4 h-4 text-slate-300 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* BLOGS SECTION - Visual Grid */}
      <section id="blogs" className="py-20 border-t border-slate-200 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center max-w-none mx-auto mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.2]">
              Blogs
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed max-w-none">
              Expert guides on pricing, scaling, and building a profitable 3D printing business.
            </p>
          </div>

          {/* Blogs Grid */}
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {blogs.map((blog, i) => (
              <a 
                key={i}
                href={blog.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <motion.div 
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full"
                  variants={itemVariants}
                  whileHover={{ y: -5 }}
                >
                  {/* Blog Image */}
                  <div className="relative aspect-square overflow-hidden">
                    <img 
                      src={blog.image} 
                      alt={blog.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  {/* Content */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight group-hover:text-emerald-600 transition-colors">
                      {blog.title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-4 line-clamp-2">
                      {blog.description}
                    </p>
                    <div className="mt-auto">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider group-hover:gap-2 transition-all">
                        Read Full Article <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              </a>
            ))}
          </motion.div>

          <div className="mt-12 text-center">
            <Button variant="outline" asChild className="rounded-xl border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 text-slate-600 font-bold px-8">
              <a href="https://www.rphobbyist.com/blogs/" target="_blank" rel="noopener noreferrer">
                Explore All Articles
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* PRIVACY TRUST SECTION - Clean White Card */}
      <section id="privacy" className="py-24 border-t border-slate-200 bg-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="rounded-[2.5rem] border border-slate-200 bg-slate-50 p-12 sm:p-20 text-center shadow-sm">
            
            <div className="max-w-none mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-8 shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </div>
              
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.2]">
                Local-First & Privacy-Absolute
              </h2>
              
              <p className="text-slate-600 text-lg leading-relaxed mb-10 font-normal max-w-none">
                100% private. No cloud, no trackers. All your data stays secure on your local hardware.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-10 border-t border-slate-200 pt-10 font-mono text-xs sm:text-sm text-emerald-700 font-bold uppercase tracking-widest">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> No Cookies
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Encrypted
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> AGPLv3 Open
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ SECTION - Clean Slate Accordion */}
      <section id="faq" className="py-20 border-t border-slate-200 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          
          {/* Header */}
          <div className="text-center max-w-none mx-auto mb-12">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.2]">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed max-w-none mx-auto">
              Questions about formulas, slicing imports, or licenses? We have got you covered.
            </p>
          </div>

          {/* Accordion list */}
          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <motion.div 
                  key={index} 
                  className={`border border-slate-200 bg-white rounded-xl overflow-hidden transition-all duration-300 shadow-sm ${isOpen ? 'ring-1 ring-emerald-500/20' : ''}`}
                  initial={false}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors group"
                  >
                    <span className={`text-sm font-bold tracking-tight transition-colors ${isOpen ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {faq.q}
                    </span>
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-emerald-100 text-emerald-600 rotate-180' : 'bg-slate-100 text-slate-400'}`}>
                      {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <div className="px-6 pb-6 text-xs text-slate-500 leading-relaxed border-t border-slate-50 pt-4">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>


        </div>
      </section>

      </main>

      {/* OPTIMIZED SLIM FOOTER */}
      <footer className="bg-slate-100 border-t border-slate-200/80 pt-12 pb-8 font-sans text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-12">
            
            {/* Column 1: Brand & Description (5/12) - Balanced SEO copy */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center">
                <img 
                  src={SYSTEM_CONFIG.brandLogo} 
                  alt={`${SYSTEM_CONFIG.appName} Logo`} 
                  className="h-8 w-auto object-contain -ml-3"
                />
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-sm font-normal">
                The AI-powered command center for 3D print farms. PolymagicPrice handles pricing, production, fleet management, and business analytics - all running locally on your machine. 100% private and open source.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600/80 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Local-First Workspace</span>
              </div>
            </div>

            {/* Column 2: Resources (3/12) - Internal Linking Strategy */}
            <div className="md:col-span-3 space-y-4">
              <h3 className="text-slate-900 font-bold text-sm uppercase tracking-tight">Resources</h3>
              <ul className="space-y-2 text-slate-500 font-medium">
                <li>
                  <Link to="/tool-guide" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 transition-colors inline-flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-slate-400" /> Documentation
                  </Link>
                </li>
                <li>
                  <Link to="/cost-calculator" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 transition-colors inline-flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-slate-400" /> Cost Calculator
                  </Link>
                </li>
                <li>
                  <button 
                    onClick={() => handleScroll("blogs")}
                    className="hover:text-emerald-600 transition-colors inline-flex items-center gap-1.5"
                  >
                    <FileText className="w-4 h-4 text-slate-400" /> Latest Blogs
                  </button>
                </li>
                <li>
                  <a href="/sitemap.xml" target="_blank" rel="noopener" className="hover:text-emerald-600 transition-colors inline-flex items-center gap-1.5">
                    <Map className="w-4 h-4 text-slate-400" /> Sitemap
                  </a>
                </li>
                <li>
                  <a href={SYSTEM_CONFIG.githubUrl} target="_blank" rel="noopener" className="hover:text-emerald-600 transition-colors inline-flex items-center gap-1.5">
                    <Github className="w-4 h-4 text-slate-400" /> GitHub Repository
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Community & Support (4/12) */}
            <div className="md:col-span-4 space-y-4">
              <h3 className="text-slate-900 font-bold text-sm uppercase tracking-tight">Community & Support</h3>
              <ul className="space-y-2 text-slate-500 font-medium">
                <li>
                  <a href={SYSTEM_CONFIG.youtubeUrl} target="_blank" rel="noopener" className="hover:text-emerald-600 transition-colors inline-flex items-center gap-1.5">
                    <Youtube className="w-4 h-4 text-slate-400" /> Video Tutorials
                  </a>
                </li>
                <li>
                  <a href={SYSTEM_CONFIG.vendorLink} target="_blank" rel="noopener" className="hover:text-emerald-600 transition-colors inline-flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-slate-400" /> Official Website
                  </a>
                </li>
                <li>
                  <a href={`mailto:${SYSTEM_CONFIG.vendorEmail}`} className="hover:text-emerald-600 transition-colors inline-flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-slate-400" /> Technical Support
                  </a>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom Copyright Bar - Cleaned up and modernized */}
          <div className="pt-8 border-t border-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <span>&copy; {new Date().getFullYear()} PolymagicPrice by <a href={SYSTEM_CONFIG.vendorLink} target="_blank" rel="noopener" className="text-slate-500 hover:text-emerald-600 transition-colors font-bold">{SYSTEM_CONFIG.vendor}</a></span>
              <span className="hidden sm:inline text-slate-200">•</span>
              <span className="hidden sm:inline">AGPLv3 Licensed</span>
            </div>
            
            <div className="flex gap-6 items-center">
              <button onClick={() => handleScroll("privacy")} className="hover:text-slate-600 transition-colors">Privacy First</button>
              <button onClick={() => handleScroll("faq")} className="hover:text-slate-600 transition-colors">FAQ</button>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
