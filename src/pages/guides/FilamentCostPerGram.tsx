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

import { Link } from "react-router-dom";
import { GuideLayout } from "./GuideLayout";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";
import { SYSTEM_CONFIG } from "@/lib/core/core-system";

const PATH = "/guides/filament-cost-per-gram";
const PARENT = "https://www.rphobbyist.com";

const FAQS: [string, string][] = [
  [
    "How do I calculate filament cost per gram?",
    "Divide the spool price by the net filament weight in grams. $25 / 1,000 g = $0.025 per gram.",
  ],
  [
    "How much filament does a print use?",
    "Your slicer reports it after slicing (grams and metres). Small parts use 5-30 g; a large functional part can use 200-500 g.",
  ],
  [
    "What is the cheapest 3D printer filament?",
    "PLA is the cheapest and easiest to print, usually $18-$25 per kg. Basic PETG is a little more but more durable.",
  ],
];

export default function FilamentCostPerGram() {
  useDocumentSEO({
    title: "Filament Cost Per Gram — Price PLA, PETG & ABS 3D Prints",
    description:
      "How to work out filament cost per gram from spool price and weight, a reference table for common PLA, PETG, ABS and TPU spools, and how to turn grams of filament into an accurate per-print material cost.",
    canonical: PATH,
    ogImage: SYSTEM_CONFIG.logo,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Filament Cost Per Gram: How to Price PLA, PETG & ABS 3D Prints",
        author: { "@type": "Person", name: "RP Hobbyist", url: PARENT },
        publisher: { "@type": "Person", name: "RP Hobbyist", url: PARENT },
        mainEntityOfPage: `${SYSTEM_CONFIG.baseUrl}${PATH}`,
        datePublished: "2026-09-06",
        dateModified: "2026-09-06",
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map(([q, a]) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "PolymagicPrice", item: `${SYSTEM_CONFIG.baseUrl}/` },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${SYSTEM_CONFIG.baseUrl}${PATH}` },
          { "@type": "ListItem", position: 3, name: "Filament cost per gram", item: `${SYSTEM_CONFIG.baseUrl}${PATH}` },
        ],
      },
    ],
  });

  return (
    <GuideLayout breadcrumb="Filament cost per gram">
      <h1>Filament Cost Per Gram: How to Price PLA, PETG &amp; ABS 3D Prints</h1>
      <p className="lead">
        Filament cost per gram is the foundation of every FDM price estimate. It is
        simply the spool price divided by the spool&rsquo;s net filament weight in grams.
        Multiply that by the grams a print uses (from your slicer) and you have the
        material cost.
      </p>

      <h2>The formula</h2>
      <p>
        <strong>Cost per gram = Spool price &divide; Spool weight (g)</strong>
        <br />
        <strong>Print material cost = Cost per gram &times; Grams used &times; (1 + waste allowance)</strong>
      </p>
      <p>
        A $24 spool holding 1,000&nbsp;g of filament costs $0.024/g. A print that the
        slicer says uses 45&nbsp;g costs 45 &times; $0.024 = $1.08, or about $1.13 with a
        5% waste allowance for purge and supports.
      </p>

      <h2>Reference table (typical retail prices)</h2>
      <table>
        <thead>
          <tr><th>Material</th><th>Spool price (1 kg)</th><th>Cost per gram</th><th>30 g print</th></tr>
        </thead>
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
        <li>
          <strong>Use net filament weight, not spool weight.</strong> A &ldquo;1 kg&rdquo;
          spool weighs ~1.2&ndash;1.35&nbsp;kg with the reel. Divide by 1,000&nbsp;g.
        </li>
        <li>
          <strong>Take grams from the slicer,</strong> which reports filament used for
          the model plus supports, skirt/brim and purge.
        </li>
        <li>
          <strong>Add a waste allowance</strong> of 2&ndash;5% for multi-colour purging,
          failed first layers and priming.
        </li>
        <li>
          <strong>Account for partial spools</strong> &mdash; if you paid $24 but only
          900&nbsp;g is usable, your real cost per gram is $0.0267.
        </li>
      </ul>

      <h2>From cost per gram to a full price</h2>
      <p>
        Material is one of six cost lines. Once you have it, add electricity, machine
        depreciation, labor, consumables and overhead, then apply markup. See{" "}
        <Link to="/guides/how-to-calculate-3d-printing-cost">how to calculate 3D printing cost</Link>{" "}
        for the full method.
      </p>

      <h2>Frequently asked questions</h2>
      {FAQS.map(([q, a]) => (
        <details key={q}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}

      <h2>Turn grams into a quote</h2>
      <p>
        Use the free <Link to="/cost-calculator">3D printing cost calculator</Link>, or
        compare <Link to="/guides/fdm-vs-resin-printing-cost">FDM vs resin costs</Link>.
      </p>
    </GuideLayout>
  );
}
