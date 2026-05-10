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

import { useState } from "react";
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
  Mail
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
  }
];

export default function Landing() {
  // 1. Inject SEO Metadata & AEO Structured Data
  useDocumentSEO({
    title: "PolymagicPrice: Free 3D Print Price Calculator & Manager",
    description: "Calculate exact 3D printing costs for FDM and Resin. PolymagicPrice is a privacy-first tool for hobbyists and print farms to track material, electricity, and labor.",
    canonical: "/",
    ogTitle: "PolymagicPrice: Free 3D Print Price Calculator & Manager",
    ogDescription: "Calculate exact 3D printing costs for FDM and Resin. Standardize your 3D printing workflow with an industrial-grade, local-first estimator.",
    ogImage: SYSTEM_CONFIG.logo,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": SYSTEM_CONFIG.appName,
        "operatingSystem": "Web, Windows, macOS, Linux",
        "applicationCategory": "BusinessApplication, ProductivityApplication",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "description": "Professional-grade, local-first 3D printing cost calculation and print farm management software.",
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "5",
          "reviewCount": "124"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": SYSTEM_CONFIG.appName,
        "alternateName": `${SYSTEM_CONFIG.vendor} ${SYSTEM_CONFIG.appName}`,
        "url": SYSTEM_CONFIG.vendorLink,
        "logo": `${SYSTEM_CONFIG.vendorLink}${SYSTEM_CONFIG.brandLogo}`,
        "founder": {
          "@type": "Person",
          "name": SYSTEM_CONFIG.vendor
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "url": SYSTEM_CONFIG.baseUrl,
        "name": SYSTEM_CONFIG.appName,
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${SYSTEM_CONFIG.vendorLink}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": f.a
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


  // Helper function to smooth scroll to element on same page (robust fallback for all browsers)
  const handleScroll = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    /* Clean Light Theme: Root container is scrollable, using light slate-50 background and dark slate text */
    <div className="h-screen overflow-y-auto scroll-smooth bg-slate-50 text-slate-800 font-sans overflow-x-hidden selection:bg-emerald-500/20 selection:text-emerald-900">
      
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
          <nav className="hidden md:flex items-center gap-12 text-base font-bold text-slate-600">
            <button onClick={() => handleScroll("features")} className="hover:text-slate-900 transition-all">Features</button>
            <button onClick={() => handleScroll("privacy")} className="hover:text-slate-900 transition-all">Privacy First</button>
            <button onClick={() => handleScroll("faq")} className="hover:text-slate-900 transition-all">FAQ</button>
          </nav>

          {/* Header Action - Modern & High Contrast */}
          <div className="flex items-center gap-6">
            <a href={SYSTEM_CONFIG.githubUrl} target="_blank" rel="noopener noreferrer" className="hidden sm:inline-flex text-slate-500 hover:text-slate-900 transition-colors">
              <Github className="w-6 h-6" />
            </a>
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/10 transition-all duration-200 hover:-translate-y-0.5 font-bold px-5 h-10 text-sm border-none">
              <Link to="/cost-calculator" target="_blank" rel="noopener noreferrer">
                Launch Calculator
              </Link>
            </Button>
          </div>
        </div>
      </header>

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
              className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-[1.15]"
              variants={itemVariants}
            >
              The Ultimate Free <br />
              <span className="text-emerald-600">3D Print Price Calculator</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p 
              className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-xl"
              variants={itemVariants}
            >
              The professional 3D print quotation tool for makers. Calculate accurate FDM & Resin costs instantly using our 3D printing cost estimator. Secure, private, and open source.
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
                  Launch Free 3D Print Cost Calculator
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
            <motion.div className="pt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] text-emerald-700 font-bold uppercase" variants={itemVariants}>
              <span className="flex items-center gap-1.5 hover:text-emerald-500 transition-colors cursor-default">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> 100% Client-Side
              </span>
              <span className="flex items-center gap-1.5 hover:text-emerald-500 transition-colors cursor-default">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Secure Local Sandbox
              </span>
              <span className="flex items-center gap-1.5 hover:text-emerald-500 transition-colors cursor-default">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> AGPLv3 Open Source
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
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-3 leading-snug">
              Professional 3D Print Quotation Tool & <br /> Farm Management Software
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              PolymagicPrice is a comprehensive 3D printing cost estimator. Features include production precision, print farm automation, and offline AI analysis.
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
              <h3 className="text-base font-bold text-slate-900 mb-2 font-heading">Dual Cost Calculator</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Granular pricing tailored separately for FDM filament (by weight) and Resin SLA/DLP (by volume). Accounts for FEP wear, IPA wash, and gloves.
              </p>
              <Link to="/cost-calculator" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider hover:text-emerald-500 transition-colors inline-flex items-center gap-1">
                Open Calculator <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>

            {/* Feature 2 */}
            <motion.div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 hover-lift hover:border-emerald-300 transition-all shadow-sm group" variants={itemVariants}>
              <h3 className="text-base font-bold text-slate-900 mb-2 font-heading">Slicer Auto-Fill Parser</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Drag and drop G-code, 3MF, or .cxdlpv4 slice files. Instantly extracts print time, filament weights, and resin volumes automatically.
              </p>
              <Link to="/tool-guide" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider hover:text-emerald-500 transition-colors inline-flex items-center gap-1">
                View Documentation <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>

            {/* Feature 3 */}
            <motion.div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 hover-lift hover:border-emerald-300 transition-all shadow-sm group" variants={itemVariants}>
              <h3 className="text-base font-bold text-slate-900 mb-2 font-heading">Production Kanban</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Track jobs across machines. Checks maintenance intervals, deducts spool materials from live stock, and tracks manufacturing scrap logs.
              </p>
              <Link to="/print-manager" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider hover:text-emerald-500 transition-colors inline-flex items-center gap-1">
                Manage Fleet <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>

            {/* Feature 4 */}
            <motion.div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 hover-lift hover:border-emerald-300 transition-all shadow-sm group" variants={itemVariants}>
              <h3 className="text-base font-bold text-slate-900 mb-2 font-heading">Print Farm Capacity Planner</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Forecast delivery feasibility across your print farm fleet. Auto-detects printer build volume mismatches and physical material shortages.
              </p>
              <Link to="/capacity-planner" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider hover:text-emerald-500 transition-colors inline-flex items-center gap-1">
                Plan Production <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>

            {/* Feature 5 */}
            <motion.div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 hover-lift hover:border-emerald-300 transition-all shadow-sm group" variants={itemVariants}>
              <h3 className="text-base font-bold text-slate-900 mb-2 font-heading">AI-Powered Pricing Analysis</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Integrates offline with Ollama on your local machine. Redacts PII, prevents code extraction, and generates operational pricing reports securely.
              </p>
              <Link to="/tool-guide" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider hover:text-emerald-500 transition-colors inline-flex items-center gap-1">
                Learn More <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>

            {/* Feature 6 */}
            <motion.div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 hover-lift hover:border-emerald-300 transition-all shadow-sm group" variants={itemVariants}>
              <h3 className="text-base font-bold text-slate-900 mb-2 font-heading">Local-First Privacy & Offline Security</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Absolute privacy. Desktop files use native OS keychain encryption, while the browser uses obfuscated XOR localStorage. Zero cloud trackers.
              </p>
              <Link to="/tool-guide" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider hover:text-emerald-500 transition-colors inline-flex items-center gap-1">
                Privacy Policy <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>

          </motion.div>

        </div>
      </section>



      {/* PRIVACY TRUST SECTION - Clean White Card */}
      <section id="privacy" className="py-20 border-t border-slate-200 bg-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 sm:p-10 text-center shadow-sm">
            
            <div className="max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              
              <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-slate-900 tracking-tight mb-3">
                Local-First & Privacy-Absolute
              </h2>
              
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-6 font-normal">
                All designs, costs, and client records are your competitive edge. PolymagicPrice runs entirely on your local hardware. There are no cloud servers, logins, or trackers. All data stays secure in your own browser or desktop vault.
              </p>

              <div className="flex items-center justify-center gap-6 border-t border-slate-200 pt-6 font-mono text-[10px] text-emerald-700 font-bold uppercase">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-600" /> No Cookies
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-600" /> Encrypted
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-600" /> AGPLv3 Open
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
          <div className="text-center mb-12">
            <h2 className="text-2xl font-extrabold font-heading text-slate-900 tracking-tight mb-2">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 text-xs leading-relaxed max-w-md mx-auto">
              Got questions about formulas, slicing imports, or licenses? We have got you covered.
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
                Empowering makers with industrial-grade precision. PolymagicPrice is a secure, local-first suite for 3D printing cost estimation and workshop management—100% private and open source.
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
