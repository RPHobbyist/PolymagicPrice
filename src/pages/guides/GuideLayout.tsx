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

import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SYSTEM_CONFIG } from "@/lib/core/core-system";

interface GuideLayoutProps {
  /** Short breadcrumb leaf label for this guide */
  breadcrumb: string;
  children: ReactNode;
}

/**
 * Standalone content shell for the /guides/* SEO articles. Deliberately light —
 * no app chrome — so the pages read as documentation, not tool screens. The
 * arbitrary-variant classes on <article> style the plain semantic HTML each
 * guide passes as children (no typography plugin required).
 */
export function GuideLayout({ breadcrumb, children }: GuideLayoutProps) {
  return (
    <div className="h-[100dvh] overflow-y-auto overflow-x-hidden scroll-smooth bg-slate-50 font-sans text-slate-800">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2" aria-label="PolymagicPrice home">
            <img
              src={SYSTEM_CONFIG.brandLogo}
              alt={`${SYSTEM_CONFIG.appName} logo`}
              className="h-7 w-auto object-contain"
            />
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link to="/cost-calculator" className="hover:text-emerald-600">Calculator</Link>
            <Link to="/tool-guide" className="hover:text-emerald-600">Docs</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li><Link to="/" className="hover:text-emerald-600">PolymagicPrice</Link></li>
              <li aria-hidden="true">/</li>
              <li>Guides</li>
              <li aria-hidden="true">/</li>
              <li className="text-slate-700">{breadcrumb}</li>
            </ol>
          </nav>
          <Link to="/cost-calculator" className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 hover:underline whitespace-nowrap">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>

        <article
          className="text-[15px] leading-relaxed text-slate-600
            [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-black [&_h1]:tracking-tight [&_h1]:text-slate-900
            [&_h2]:mb-2 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900
            [&_h3]:mb-1 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-900
            [&_p]:my-3
            [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul>li]:mt-1
            [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol>li]:mt-1
            [&_a]:font-medium [&_a]:text-emerald-600 [&_a:hover]:underline
            [&_strong]:text-slate-800
            [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left
            [&_th]:border-b [&_th]:border-slate-300 [&_th]:py-2 [&_th]:pr-4 [&_th]:font-semibold [&_th]:text-slate-800
            [&_td]:border-b [&_td]:border-slate-100 [&_td]:py-2 [&_td]:pr-4
            [&_details]:my-2 [&_details]:rounded-lg [&_details]:border [&_details]:border-slate-200 [&_details]:bg-white [&_details]:p-3
            [&_summary]:cursor-pointer [&_summary]:font-medium [&_summary]:text-slate-800
            [&_.lead]:text-base [&_.lead]:text-slate-700"
        >
          {children}
        </article>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <span>
            &copy; {new Date().getFullYear()} PolymagicPrice by{" "}
            <a href={SYSTEM_CONFIG.vendorLink} className="hover:text-emerald-600">{SYSTEM_CONFIG.vendor}</a>
          </span>
          <span className="flex gap-4">
            <Link to="/cost-calculator" className="hover:text-emerald-600">Cost Calculator</Link>
            <Link to="/tool-guide" className="hover:text-emerald-600">Documentation</Link>
            <a href="/sitemap.xml" className="hover:text-emerald-600">Sitemap</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
