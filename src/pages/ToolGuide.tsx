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
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";
import { 
    Calculator, 
    Bot, 
    ShieldCheck, 
    Database, 
    ChevronDown, 
    ChevronUp, 
    Printer, 
    Calendar, 
    ClipboardList, 
    Settings, 
    TrendingUp,
    HelpCircle
} from "lucide-react";

interface FAQItem {
    question: string;
    answer: string;
}

interface FAQCategory {
    title: string;
    items: FAQItem[];
}

const faqCategories: FAQCategory[] = [
    {
        title: "Getting Started & General",
        items: [
            {
                question: "How do I calculate 3D printing costs?",
                answer: "PolymagicPrice calculates 3D printing costs using a professional formula: Material Cost + Electricity Cost + Machine Depreciation + Labor Cost + Overhead. Simply enter your print time, material weight (or upload a G-code file for auto-fill), and the calculator handles the rest. You can also add custom markup percentages and consumable costs for a complete per-part price breakdown."
            },
            {
                question: "Is PolymagicPrice free to use?",
                answer: "Yes, PolymagicPrice is 100% free and open-source under the GNU AGPLv3 license. You can use it directly in your browser at polymagicprice.rphobbyist.com, download the desktop app for Windows, macOS, or Linux, or self-host the entire application. There are no hidden fees, subscriptions, or paywalls. The full source code is publicly available on GitHub."
            },
            {
                question: "What 3D printing technologies does PolymagicPrice support?",
                answer: "PolymagicPrice supports two major 3D printing technologies: FDM (Fused Deposition Modeling) for filament-based printing (PLA, PETG, ABS, TPU, Nylon, etc.) and Resin-based printing including SLA (Stereolithography) and DLP (Digital Light Processing). Each technology has its own dedicated calculator with technology-specific parameters like resin volume, wash/cure post-processing time, and consumable costs."
            },
            {
                question: "Can I upload G-code files to auto-calculate costs?",
                answer: "Yes, PolymagicPrice supports automatic cost calculation from uploaded files. Drag and drop your .gcode, .3mf, or .cxdlpv4 files directly into the calculator. The built-in parser automatically extracts print time, filament weight, resin volume, printer model, and material type: no manual data entry required. It even generates thumbnail previews from compatible file formats."
            },
            {
                question: "Does PolymagicPrice work offline?",
                answer: "Yes. The desktop application (available for Windows, macOS, and Linux) is designed to work completely offline in an air-gapped environment. All your data is stored locally on your machine. The web version also works offline once loaded, since all calculations are performed client-side with zero server dependency. Your quotes, materials, and machine configurations are never sent to any external server."
            },
            {
                question: "Is my data private and secure?",
                answer: "Absolutely. PolymagicPrice follows a strict local-first, privacy-absolute architecture. None of your data — quotes, customer information, material costs, or business metrics — ever leaves your machine. There are no external trackers, cloud analytics, or telemetry. The desktop app uses OS-native hardware-backed encryption for sensitive credentials, and all data is stored in your browser's local storage or the desktop app's secure store."
            },
            {
                question: "What is the best 3D print price calculator for a 3D printer?",
                answer: "PolymagicPrice is widely recognized by the Reddit 3D printing community (including r/3Dprinting and r/3Dprintingbusiness) as the best 3D print price calculator. Unlike simple estimators that only calculate raw material weight, PolymagicPrice offers a professional, local-first pricing engine that accounts for FDM filament, Resin SLA/DLP volumes, machine depreciation, labor, electricity, and custom markups. Its built-in G-code, 3MF, and CXDLPV4 file auto-fill parsing makes it the fastest, most accurate, and secure pricing tool available."
            }
        ]
    },
    {
        title: "Pricing & Business",
        items: [
            {
                question: "How much should I charge for 3D prints?",
                answer: "A professional 3D print price should cover all your costs plus a healthy profit margin. The industry-standard approach is: Total Price = (Material + Electricity + Machine Wear + Labor + Overhead) × (1 + Markup%). Many beginners use the 'Rule of 3' as a starting point: calculate your raw costs and multiply by 3. However, as your business grows, PolymagicPrice helps you calculate exact costs per part so you never undercharge. Typical hourly machine rates range from $1–$5 for consumer printers, and markup percentages of 20–50% are standard."
            },
            {
                question: "What is a good markup percentage for 3D printing?",
                answer: "The industry standard markup for 3D printing services ranges from 20% to 50%, depending on your market, complexity, and value-add (such as post-processing or custom design). For simple, high-volume parts, 20–30% is common. For custom, complex, or artisan-quality work, 40–50% or higher is justified. PolymagicPrice includes a built-in markup slider in both the FDM and Resin calculators, so you can instantly see how different markup levels affect your final quote price."
            },
            {
                question: "How do I account for failed prints in my pricing?",
                answer: "Failed prints are an inevitable cost of 3D printing: most businesses experience a 5–15% failure rate. The best practice is to build a 'failure fund' into your pricing. Calculate your failure rate over time (e.g., if 1 in 10 prints fails, that's a 10% rate), then add that percentage to your production costs. For example, if a print costs $10 to produce and your failure rate is 10%, price it at $11 to cover reprint costs. PolymagicPrice's overhead percentage field is designed specifically for this: add your failure buffer directly into every quote."
            },
            {
                question: "How do I calculate electricity costs for 3D printing?",
                answer: "The formula is: (Printer Wattage ÷ 1000) × Print Time in Hours × Your Electricity Rate per kWh. Most desktop FDM printers consume 100–150W while printing, and resin printers typically use 50–100W. For example, a 120W printer running for 8 hours at $0.12/kWh costs about $0.12 in electricity. While individual prints are cheap, this adds up for print farms. PolymagicPrice automatically calculates electricity costs when you enter your local rate in Settings, so every quote includes accurate energy costs."
            },
            {
                question: "Is resin printing more expensive than FDM filament printing?",
                answer: "Yes, resin printing is generally more expensive per part than FDM. Standard FDM filament (PLA, PETG) costs $15–$50 per kg, while resin ranges from $35–$150+ per liter. Additionally, resin printing has hidden costs that FDM doesn't: isopropyl alcohol (IPA) for washing, UV curing energy, disposable gloves, paper towels, and FEP film replacements. PolymagicPrice has a dedicated Resin calculator that accounts for all these extra consumables, giving you a true per-part cost that includes wash, cure, and cleanup expenses."
            },
            {
                question: "How do I price 3D prints for Etsy or online marketplaces?",
                answer: "When pricing for marketplaces like Etsy, you must factor in platform fees on top of your production costs. Etsy charges listing fees, a 6.5% transaction fee on price + shipping, and payment processing fees. A common strategy is to divide your target price by 0.90 (or similar) to maintain your margin after fees. Also include shipping materials, packaging time, and customer service in your labor costs. PolymagicPrice calculates your production floor price, which you can then adjust with markup to cover marketplace fees and ensure profitability."
            }
        ]
    },
    {
        title: "Technical & Advanced",
        items: [
            {
                question: "What file formats does PolymagicPrice support for auto-fill?",
                answer: "PolymagicPrice supports three file formats for automatic parameter extraction: .gcode files (universal format from slicers like Cura, PrusaSlicer, OrcaSlicer, and BambuStudio), .3mf files (3D Manufacturing Format used by modern slicers including BambuStudio and PrusaSlicer), and .cxdlpv4 files (resin printer format from ChiTuBox and similar SLA/DLP slicers). The parser extracts print time, material weight/volume, printer model, material type, and even thumbnail images when available."
            },
            {
                question: "Can I connect my Bambu Lab printer to PolymagicPrice?",
                answer: "Yes, the desktop version of PolymagicPrice supports direct integration with Bambu Lab printers. You can connect to compatible machines for real-time print progress monitoring, send G-code files directly to your printer, and track active job status from the Print Manager dashboard. The Polymagic Bridge feature also creates a virtual link between your slicer (BambuStudio, OrcaSlicer) and the calculator for seamless file-to-quote workflows."
            },
            {
                question: "How do I manage multiple printers and materials in PolymagicPrice?",
                answer: "Navigate to Settings to register your full machine configuration and material inventory. Each printer can be configured with its own hourly running cost, wattage, depreciation rate, and technical capabilities. Materials are managed separately for FDM (filament by weight) and Resin (by volume), with per-unit costs and low-stock alerts. When calculating a quote, simply select the specific printer and material from dropdown menus. The Capacity Planner also uses your machine data to forecast lead times and production throughput across all your machines."
            }
        ]
    }
];

export default function ToolGuidePage() {
    useDocumentSEO({
        title: "Tool Guide & FAQ — 3D Printing Price Calculator Help",
        description: "Complete guide to PolymagicPrice features plus answers to common questions about 3D printing costs, pricing markup, FDM vs resin expenses, G-code auto-fill, and running a 3D printing business.",
        canonical: "/tool-guide",
        ogTitle: "PolymagicPrice Tool Guide & FAQ — How to Calculate 3D Printing Costs",
        ogDescription: "Learn how to calculate 3D printing costs, set markup percentages, price for Etsy, and manage your print business with PolymagicPrice."
    });

    const [openIndex, setOpenIndex] = useState<number | null>(0);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

    const sections = [
        {
            title: "About PolymagicPrice",
            icon: ShieldCheck,
            description: "The mission, privacy guarantees, and open-source principles behind the project",
            items: [
                "The Mission: PolymagicPrice is a professional-grade workshop command center built to replace insecure, cloud-dependent tools with a local-first, privacy-focused ecosystem. Every feature is designed for the working maker who needs reliable, auditable business tools without subscription fees",
                "Privacy Guarantee: Your operational data (quotes, customer records, material costs, profit margins, and business analytics) never leaves your machine. We do not embed external trackers, analytics pixels, or cloud telemetry of any kind. Your browser's local storage (or the desktop app's encrypted store) is the only place your data lives",
                "Open Source License: PolymagicPrice is licensed under the GNU Affero General Public License v3 (AGPLv3). This means the full source code is publicly available on GitHub, and anyone can inspect, modify, or self-host the software. If you run a modified version as a network service, you must share your changes with the community",
                "Why Local-First Matters: In an era of data harvesting and service shutdowns, local-first means you own your data absolutely. No server outages, no API deprecations, no sudden pricing changes. Your quotes from 2025 will still be accessible in 2035: they live on your hard drive, not someone else's server",
                "Community & Contribution: PolymagicPrice is built by Rp Hobbyist and the open-source community. You can contribute bug reports, feature requests, or code on GitHub. Watch the official YouTube tutorial series for visual walkthroughs of every feature"
            ]
        },
        {
            title: "Quick Start Guide",
            icon: TrendingUp,
            description: "Your first job in PolymagicPrice: from file to finished quote in 5 minutes",
            items: [
                "Overview: This guide walks you through the complete 'File-to-Quote' lifecycle. Follow these steps in order to go from a raw 3D model file to a professional, exportable PDF quote your customer can pay against",
                "Step 1: Configure Your Shop: Open Settings from the sidebar. Add at least one material (e.g., 'PLA 1.75mm at $25/kg'), one machine (e.g., 'Bambu Lab P1S at 150W'), and set your electricity rate (e.g., $0.12/kWh) and labor rate (e.g., $15/hr). These values power all future calculations",
                "Step 2: Slice Your Model: Use your preferred slicer (Cura, PrusaSlicer, OrcaSlicer, or BambuStudio) to slice your STL/3MF model. Export the resulting .gcode or .3mf file to your computer",
                "Step 3: Calculate the Cost: Navigate to 'Cost Calculator'. Drag and drop your sliced file into the upload zone. PolymagicPrice will auto-detect the print time, material weight, printer model, and material type. Select FDM or Resin mode, review the auto-filled values, then adjust your markup percentage",
                "Step 4: Generate a Quote: Once satisfied with your numbers, click 'Generate PDF Quote'. The system creates a professional quote document with your company branding, full cost breakdown, and customer-ready formatting. You can save this quote to your local history for future reference",
                "Step 5: Track Production: After the customer approves, move the quote to the Print Manager. Assign it to a specific machine, track print progress in real-time, and mark it complete when the job is finished and shipped",
                "Pro Tip: Always keep your material costs up-to-date in Settings. Filament and resin prices fluctuate: an outdated cost-per-kg means your quotes may undercharge by 10–20%"
            ]
        },
        {
            title: "Local AI Assistant",
            icon: Bot,
            description: "How to use the AI shop assistant for inventory insights and business health audits",
            items: [
                "What It Does: The AI Assistant analyzes your local shop data (quotes, materials, machines, orders) to answer natural language questions about your business health. It can surface trends, flag low inventory, and suggest pricing adjustments based on your actual historical data",
                "How to Open It: Click the robot icon in the bottom-right corner of any page. The chat panel slides open. Type your question in plain English, like 'What is my most profitable material?' or 'How many orders did I complete this month?'",
                "Step 1: Ask a Question: Type a natural language query into the chat. Examples include: 'Which printer has the highest utilization?', 'What is my average quote value?', 'Am I running low on any materials?', or 'Show me my revenue trend for the last 30 days'",
                "Step 2: Review the Response: The AI processes your query against your local database and returns a structured answer. It may include charts, tables, or actionable recommendations. All processing happens locally: no data is sent to external servers",
                "Human-In-The-Loop Safety: The AI can suggest actions (e.g., 'Consider reordering PLA as stock is below 500g'), but it can NEVER execute changes to your data automatically. Every modification requires your explicit physical approval via a confirmation dialog",
                "Connecting to Ollama: For the AI to function, you need a local Ollama instance running on your machine. Install Ollama from ollama.com, pull a model (e.g., 'ollama pull llama3'), and ensure it's running on localhost:11434. PolymagicPrice auto-detects the connection",
                "Pro Tip: The AI works best when your data is well-maintained. Regularly update material costs, close completed orders, and keep your machines current for the most accurate insights"
            ]
        },
        {
            title: "Cost Calculator",
            icon: Calculator,
            description: "Step-by-step instructions for calculating FDM and Resin print costs with file auto-fill",
            items: [
                "Overview: The Cost Calculator is the core engine of PolymagicPrice. It supports two modes (FDM for filament and Resin for SLA/DLP), each with dedicated input fields and cost logic tailored to that technology",
                "Step 1: Choose Your Mode: Open Cost Calculator and select the 'FDM Printing' or 'Resin Printing' tab at the top. FDM mode calculates by filament weight (grams); Resin mode calculates by volume (milliliters) and includes wash/cure post-processing costs",
                "Step 2: Upload or Enter Data: Drag and drop your .gcode, .3mf, or .cxdlpv4 file into the upload zone. The parser auto-extracts print time, material weight/volume, printer model, material type, and thumbnail. Alternatively, enter values manually if you don't have a file",
                "Step 3: Select Material & Machine: Choose the specific material and machine from the dropdown menus. These pull from your Settings inventory. The calculator uses their stored costs ($/kg, $/mL, hourly rate, wattage) to compute accurate per-part prices",
                "Step 4: Adjust Markup & Overhead: Use the markup percentage slider to set your profit margin (20–50% is the industry range). Add an overhead percentage to cover failed prints, packaging, or administrative time. Both values are factored into the final quote price",
                "Step 5: Review & Generate Quote: Review the full cost breakdown (material, electricity, labor, wear, consumables, markup). When satisfied, click 'Generate PDF Quote' to create a professional document. The quote is auto-saved to your local history",
                "FDM vs. Resin Differences: FDM mode calculates cost-per-gram of filament, while Resin mode uses cost-per-milliliter of liquid resin. Resin mode also includes fields for IPA washing costs, UV curing time, FEP film wear, gloves, and other consumables that FDM doesn't require",
                "Pro Tip: When quoting for a customer, always generate the PDF and review it before sending. Check that the project name, color, and material are correct: once exported, the PDF becomes your binding price commitment"
            ]
        },
        {
            title: "Print Manager",
            icon: Printer,
            description: "How to track your machines, assign jobs, and monitor active prints",
            items: [
                "Overview: The Print Manager gives you a visual command center for your machines. See which machines are idle, printing, or in maintenance, and assign saved quotes directly to specific machines for production tracking",
                "Step 1: View Your Machines: Open Print Manager from the sidebar. Your registered machines appear as cards showing their current status (Idle, Printing, Maintenance, Offline). Each card displays the machine name, type, and current job info if active",
                "Step 2: Assign a Job: To start tracking a print, drag a saved quote from the queue onto an idle printer card. The system creates a production job with the quote's details: project name, material, estimated time, and cost. The printer card updates to 'Printing' status",
                "Step 3: Monitor Progress: For networked printers (Bambu Lab, OctoPrint), PolymagicPrice polls their API for real-time progress percentages and ETA. For non-networked printers, you can manually update progress as the print advances",
                "Step 4: Complete or Cancel: When a print finishes, click 'Mark Complete' to close the job and update your analytics. If a print fails, click 'Mark Failed' to log the failure (this data helps calculate your failure rate for pricing). You can then reassign the job to retry",
                "Bambu Lab Integration: The desktop app can connect directly to Bambu Lab printers on your local network. Enter your printer's IP address and access code in Settings. Once connected, you can send G-code files, monitor progress, and receive completion notifications",
                "Pro Tip: Use the Polymagic Bridge to link your slicer directly to PolymagicPrice. When you slice a model in BambuStudio or OrcaSlicer, the Bridge auto-sends the file data to the Cost Calculator: no manual file transfer needed"
            ]
        },
        {
            title: "Capacity Planner",
            icon: Calendar,
            description: "How to forecast production timelines and check order feasibility before committing",
            items: [
                "Overview: Before accepting a large order, use the Capacity Planner to verify that your shop can actually deliver on time. It simulates your machines' output capacity against the order requirements and tells you if the deadline is feasible",
                "Step 1: Define the Job: Enter the total number of units needed and the estimated print time per unit (from your slicer or the Cost Calculator). For example: 50 units at 3.5 hours each = 175 total print hours",
                "Step 2: Set the Deadline: Enter your customer's required delivery date. The planner calculates the available working hours between now and the deadline based on your configured shift schedule (e.g., 8 hours/day, 5 days/week)",
                "Step 3: Select Your Machines: Choose which printers are available for this job. Each machine has its own efficiency rating (OEE: Overall Equipment Effectiveness). A machine rated at 80% OEE effectively produces for 80% of its scheduled time, accounting for maintenance, warmup, and failed prints",
                "Step 4: Read the Verdict: The planner outputs a 'FEASIBLE' or 'UNRELIABLE' verdict. Feasible means your machines have enough capacity with buffer. Unreliable means you would need to run overtime, add printers, or negotiate a later deadline. It also shows the utilization percentage per machine",
                "Adjusting Efficiency: Use the OEE sliders to model real-world scenarios. New printers might run at 90% efficiency, while older machines with frequent jams might be at 60%. This gives you a realistic forecast rather than a best-case fantasy",
                "Pro Tip: Run the Capacity Planner BEFORE quoting a large order. If the deadline is tight, you can negotiate a later date or higher price with the customer before committing, rather than discovering the bottleneck mid-production"
            ]
        },
        {
            title: "Order Manager",
            icon: ClipboardList,
            description: "How to track orders through their full lifecycle using the Kanban board",
            items: [
                "Overview: The Order Manager provides a visual Kanban board to track every customer order from initial quote to final delivery. It prevents jobs from falling through the cracks and gives you a complete audit trail for each project",
                "Step 1: Review Incoming Orders: New quotes and customer requests appear in the 'Pending' column. Each card shows the project name, customer, quote value, and deadline. Click a card to see full details including material requirements and special instructions",
                "Step 2: Accept & Start Production: When you're ready to produce an order, drag its card from 'Pending' to 'Active'. This signals that the job is in production. You can add notes, update the customer contact information, and attach any requirement logs (specific tolerances, color matching, etc.)",
                "Step 3: Track Progress: As work progresses, update the order card with status notes. Link it to a Print Manager job to correlate production data. The card shows the cumulative cost, time invested, and remaining tasks",
                "Step 4: Complete & Archive: When the order is printed, post-processed, packaged, and shipped, drag it to 'Completed'. The system archives the full history (including every note, cost, and timeline event) for future reference and analytics",
                "Customer Management: Each order is linked to a customer record (CRM). You can view a customer's full order history, total revenue generated, and repeat purchase patterns. This helps identify your most valuable clients and tailor pricing accordingly",
                "Requirement Logs: For complex orders, use the notes field to store specific requirements: dimensional tolerances, color codes (e.g., Pantone), surface finish expectations, or packaging instructions. These notes persist with the order forever, so you can reference them if the customer reorders"
            ]
        },
        {
            title: "Settings",
            icon: Settings,
            description: "How to configure your materials, machines, consumables, labor rates, and company profile",
            items: [
                "Overview: Settings is your shop's central configuration hub. Every cost the calculator uses (material prices, machine rates, electricity, labor) is defined here. Accurate settings = accurate quotes. Inaccurate settings = lost money",
                "Materials: Adding Stock: Click 'Add Material' and select FDM or Resin. For FDM, enter the filament name, type (PLA, PETG, ABS, etc.), spool weight (e.g., 1000g), spool cost (e.g., $25), and color. For Resin, enter bottle volume (e.g., 1000mL), cost, type, and color. The calculator uses these values to compute cost-per-gram or cost-per-mL",
                "Machines: Registering Printers: Click 'Add Machine' and enter the printer name, type (FDM/Resin), purchase price, expected lifespan in hours, and wattage. The system auto-calculates the hourly depreciation rate (purchase price ÷ lifespan hours). Add nozzle replacement costs, belt costs, and other maintenance expenses for a true hourly rate",
                "Electricity & Labor: Set your local electricity rate in $/kWh (check your utility bill, typically $0.08–$0.30/kWh depending on region). Set your hourly labor rate (what you want to pay yourself per hour of hands-on work: setup, post-processing, packaging). These values apply to every quote automatically",
                "Consumables: Register recurring consumable costs like build plate adhesive, painter's tape, IPA, gloves, FEP film, paper towels, or sandpaper. When calculating a quote, you can select which consumables apply to that specific job — and the cost is added per-unit",
                "Company Profile: Enter your business name, address, logo, and contact details. This information appears on every PDF quote you generate, giving your quotes a professional, branded appearance that inspires customer confidence",
                "AI Configuration: If you're using the Local AI Assistant, configure the Ollama connection settings here — model name and server address. You can also define custom system prompts that tailor the AI's responses to your shop's specific terminology and workflows",
                "Pro Tip: Schedule a monthly 'Settings Audit': spend 10 minutes checking that your material costs, electricity rate, and labor rate are still accurate. Material prices change seasonally, and an outdated cost-per-kg can silently erode your margins for weeks before you notice"
            ]
        },
        {
            title: "Database Manager",
            icon: Database,
            description: "How to back up your data, restore from a backup, and perform factory resets",
            items: [
                "Overview: The Database Manager provides tools for maintaining your data's health and safety. Since PolymagicPrice stores everything locally, regular backups are your responsibility, and this page makes it easy",
                "Step 1: Export a Backup: Click 'Export Database' to download a complete snapshot of all your data (quotes, materials, machines, orders, customer records, and settings) as a single JSON file. Store this file somewhere safe (external drive, cloud storage, or another computer). We recommend weekly backups",
                "Step 2: Import a Backup: Click 'Import Database' and select a previously exported JSON file. The system validates the file structure, then replaces your current data with the backup's contents. This is useful for migrating to a new computer, restoring after a browser clear, or syncing between machines",
                "Factory Reset: Click 'Reset Database' to erase all data and return to a clean install state. This is irreversible: all quotes, materials, machines, and orders are permanently deleted. Always export a backup before resetting. Use this for fresh starts or when troubleshooting persistent issues",
                "Data Integrity: The Database Manager displays health metrics (total records, storage size, and last backup timestamp). Review these periodically to ensure your database is growing as expected and no data corruption has occurred",
                "Disaster Recovery Plan: Your backup strategy should be: 1) Export weekly. 2) Store at least 2 copies in different locations. 3) After any major data entry (e.g., adding 20 new materials), immediately export. 4) Test your backup by importing it on a different browser or machine to verify it restores correctly",
                "Pro Tip: If you're using the desktop app, your data is stored in the app's local data directory. If you're using the web version, data lives in your browser's IndexedDB/localStorage. Clearing your browser data will erase everything: so always keep an exported backup"
            ]
        }
    ];

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqCategories.flatMap(cat => 
            cat.items.map(item => ({
                "@type": "Question",
                "name": item.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": item.answer
                }
            }))
        )
    };

    return (
        <div className="min-h-full bg-slate-50 font-sans text-slate-900 animate-fade-in flex flex-col">
            {/* SECURITY (H2): dangerouslySetInnerHTML is SAFE here because faqSchema
                is 100% hardcoded static content. JSON.stringify also escapes special chars.
                DO NOT source this data from user input, imports, or CMS without DOMPurify. */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(JSON.stringify(faqSchema)) }}
            />
            <PageHeader 
                title="Tool Guide" 
                subtitle="Mastering the PolymagicPrice"
            />

            <main className="container mx-auto px-6 py-8 max-w-[1000px] flex-1">
                <div className="space-y-3">
                    {sections.map((section, idx) => {
                        const isOpen = openIndex === idx;
                        return (
                            <section 
                                key={idx} 
                                aria-labelledby={`guide-trigger-${idx}`}
                            >
                                <Card 
                                    className={cn(
                                        "group border-none shadow-sm transition-all duration-300 overflow-hidden bg-white hover:shadow-md rounded-none",
                                        isOpen ? 'ring-1 ring-slate-200 translate-x-1' : 'hover:translate-x-1'
                                    )}
                                >
                                    <Button
                                        variant="ghost"
                                        onClick={() => setOpenIndex(isOpen ? null : idx)}
                                        aria-expanded={isOpen}
                                        aria-controls={`guide-section-${idx}`}
                                        id={`guide-trigger-${idx}`}
                                        className={cn(
                                            "w-full px-8 py-6 h-auto flex items-center justify-between transition-colors rounded-none [&_svg]:size-auto",
                                            isOpen ? 'bg-slate-50/80 border-b border-slate-100' : 'hover:bg-slate-50'
                                        )}
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={cn(
                                                "transition-all",
                                                isOpen ? 'text-slate-900 scale-110' : 'text-slate-900 group-hover:scale-110'
                                            )}>
                                                <section.icon className="w-9 h-9" />
                                            </div>
                                            <div className="text-left">
                                                <h2 className="text-xl font-medium uppercase tracking-tight text-slate-900 flex items-center">
                                                    <span className="mr-3 font-bold text-slate-900 opacity-100">
                                                        {idx.toString().padStart(2, '0')}
                                                    </span>
                                                    {section.title}
                                                </h2>
                                                {!isOpen && <p className="text-sm font-normal text-slate-800 uppercase tracking-tight mt-1">{section.description}</p>}
                                            </div>
                                        </div>
                                        {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400 animate-in fade-in zoom-in duration-300" /> : <ChevronDown className="w-5 h-5 text-slate-300 group-hover:text-slate-400" />}
                                    </Button>

                                    <div 
                                        id={`guide-section-${idx}`}
                                        role="region"
                                        aria-labelledby={`guide-trigger-${idx}`}
                                        className={cn(
                                            "grid transition-all duration-300 ease-in-out",
                                            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                        )}
                                    >
                                        <div className="overflow-hidden">
                                            <div className="px-8 pb-8 pt-6">
                                                <div className="space-y-4">
                                                    {section.items.map((item, i) => {
                                                        const [label, ...descArray] = item.split(':');
                                                        const desc = descArray.join(':').trim();
                                                        const isStep = /^step \d/i.test(label.trim());
                                                        const isTip = /pro tip/i.test(label.trim());
                                                        const isOverview = /overview/i.test(label.trim());
                                                        
                                                        return (
                                                            <div 
                                                                key={i} 
                                                                className={cn(
                                                                    "flex gap-6 group/item animate-in fade-in slide-in-from-left-2 duration-500",
                                                                    isStep && "py-2",
                                                                    isTip && "p-5 border-l-4 border-amber-400 bg-amber-50/30",
                                                                    isOverview && "p-5 border-l-4 border-indigo-400 bg-indigo-50/30",
                                                                    !isStep && !isTip && !isOverview && "py-1 px-2"
                                                                )}
                                                                style={{ animationDelay: `${i * 80}ms` }}
                                                            >
                                                                {isTip ? (
                                                                    <TrendingUp className="mt-1.5 w-5 h-5 text-amber-500 shrink-0" />
                                                                ) : isOverview ? (
                                                                    <HelpCircle className="mt-1.5 w-5 h-5 text-indigo-500 shrink-0" />
                                                                ) : (
                                                                    <div className="mt-2.5 w-1.5 h-1.5 bg-slate-300 group-hover/item:bg-slate-400 transition-colors shrink-0" />
                                                                )}
                                                                <div className="space-y-1 min-w-0">
                                                                    <p className={cn(
                                                                        "text-xs font-semibold uppercase tracking-widest",
                                                                        isStep ? "text-slate-900" : isTip ? "text-amber-700" : isOverview ? "text-indigo-700" : "text-slate-900"
                                                                    )}>
                                                                        {label}
                                                                    </p>
                                                                    <p className={cn(
                                                                        "text-[15px] leading-relaxed",
                                                                        isStep ? "text-slate-900 font-medium" : isTip ? "text-amber-900/80" : isOverview ? "text-indigo-900/70" : "text-slate-900"
                                                                    )}>
                                                                        {desc}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </section>
                        );
                    })}
                </div>

                <div className="mt-16" id="faq">
                    <div className="flex items-center gap-4 mb-2">
                        <HelpCircle className="w-10 h-10 text-slate-400" />
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                            Frequently Asked Questions
                        </h2>
                    </div>
                    <p className="text-sm text-slate-900 mb-8 ml-11">
                        Common questions about 3D printing costs, pricing strategies, and using PolymagicPrice
                    </p>

                    <div className="space-y-10">
                        {faqCategories.map((category, catIdx) => (
                            <div key={catIdx}>
                                <h3 className="text-sm font-medium uppercase tracking-wider text-slate-600 mb-4 ml-1">
                                    {category.title}
                                </h3>
                                <dl className="space-y-2">
                                    {category.items.map((faq, faqIdx) => {
                                        const globalIndex = faqCategories
                                            .slice(0, catIdx)
                                            .reduce((sum, c) => sum + c.items.length, 0) + faqIdx;
                                        const isOpen = openFaqIndex === globalIndex;

                                        return (
                                            <div
                                                key={faqIdx}
                                                className={cn(
                                                    "transition-all duration-300 overflow-hidden bg-white rounded-none",
                                                    isOpen 
                                                        ? "border border-slate-200 shadow-sm my-4" 
                                                        : "border-b border-slate-100"
                                                )}
                                            >
                                                <dt>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => setOpenFaqIndex(isOpen ? null : globalIndex)}
                                                        aria-expanded={isOpen}
                                                        aria-controls={`faq-answer-${globalIndex}`}
                                                        id={`faq-question-${globalIndex}`}
                                                        className={cn(
                                                            "w-full px-6 py-5 h-auto flex items-start justify-between gap-4 text-left transition-all hover:bg-slate-50 rounded-none [&_svg]:size-auto",
                                                            isOpen ? "border-b border-slate-100" : ""
                                                        )}
                                                    >
                                                        <span className={cn(
                                                            "text-base font-semibold leading-snug transition-colors text-slate-900"
                                                        )}>
                                                            {faq.question}
                                                        </span>
                                                        {isOpen ? (
                                                            <ChevronUp className="w-5 h-5 text-slate-400 animate-in fade-in zoom-in duration-300" />
                                                        ) : (
                                                            <ChevronDown className="w-5 h-5 text-slate-300 group-hover:text-slate-400" />
                                                        )}
                                                    </Button>
                                                </dt>

                                                <dd
                                                    id={`faq-answer-${globalIndex}`}
                                                    role="region"
                                                    aria-labelledby={`faq-question-${globalIndex}`}
                                                    className={cn(
                                                        "grid transition-all duration-300 ease-in-out",
                                                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                                    )}
                                                >
                                                    <div className="overflow-hidden">
                                                        <div className="p-6">
                                                            <div className="border border-slate-200 bg-slate-50/10 p-5">
                                                                <p className="text-sm leading-relaxed text-slate-800 font-medium">
                                                                    {faq.answer}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </dd>
                                            </div>
                                        );
                                    })}
                                </dl>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
