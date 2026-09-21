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

const PATH = "/guides/how-to-calculate-3d-printing-cost";
const PARENT = "https://www.rphobbyist.com";

const FAQS: [string, string][] = [
  [
    "What is the formula to calculate 3D printing cost?",
    "(Material + Electricity + Machine depreciation + Labor + Consumables + Overhead) x (1 + Markup%).",
  ],
  [
    "How much does it cost to 3D print something?",
    "Hobby FDM parts typically cost $0.50-$5 in material and machine time and are quoted at $5-$30 after labor and markup. Resin parts cost more to finish.",
  ],
  [
    "How much should I charge for 3D printing?",
    "Cost plus 20-50% markup. Use the lower end for simple repeat parts and the higher end for custom or design-heavy work.",
  ],
];

export default function HowToCalculate3DPrintingCost() {
  useDocumentSEO({
    title: "How to Calculate 3D Printing Cost — Formula, Examples & Calculator",
    description:
      "Learn the exact formula to calculate 3D printing cost: material + electricity + machine depreciation + labor + overhead + markup. Includes worked FDM and resin examples, a cost table, and a free calculator.",
    canonical: PATH,
    ogImage: SYSTEM_CONFIG.logo,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "How to Calculate 3D Printing Cost: Formula, Examples & Free Calculator",
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
          { "@type": "ListItem", position: 2, name: "Guides", item: `${SYSTEM_CONFIG.baseUrl}/guides/how-to-calculate-3d-printing-cost` },
          { "@type": "ListItem", position: 3, name: "How to calculate 3D printing cost", item: `${SYSTEM_CONFIG.baseUrl}${PATH}` },
        ],
      },
    ],
  });

  return (
    <GuideLayout breadcrumb="How to calculate 3D printing cost">
      <h1>How to Calculate 3D Printing Cost: Formula, Examples &amp; Free Calculator</h1>
      <p className="lead">
        The cost of a 3D print is the sum of six things: the material it uses, the
        electricity it draws, the wear it puts on the printer, your labor, shop
        overhead, and the profit margin you add on top. This guide shows the formula,
        walks through worked FDM and resin examples, and links to a{" "}
        <Link to="/cost-calculator">free calculator</Link> that does the maths for you.
      </p>

      <h2>The 3D printing cost formula</h2>
      <p>
        <strong>Unit cost = Material + Electricity + Machine depreciation + Labor + Consumables</strong>
        <br />
        <strong>Final price = (Unit cost + Overhead) &times; (1 + Markup%)</strong>
      </p>

      <h3>1. Material cost</h3>
      <p>
        FDM: grams of filament &times; (spool price &divide; spool weight in grams). A
        $22, 1&nbsp;kg spool costs $0.022/g, so a 22&nbsp;g part uses about $0.48 of
        plastic. Resin: millilitres &times; (bottle price &divide; bottle volume in ml).
        Add 2&ndash;5% for purge, skirts and supports. See{" "}
        <Link to="/guides/filament-cost-per-gram">filament cost per gram</Link> for the detail.
      </p>

      <h3>2. Electricity cost</h3>
      <p>
        (Printer wattage &divide; 1000) &times; print hours &times; electricity rate per
        kWh. A 120&nbsp;W printer running 3.5&nbsp;h at $0.15/kWh costs about $0.06.
        Electricity is almost always the smallest line item.
      </p>

      <h3>3. Machine depreciation</h3>
      <p>
        (Printer price + lifetime maintenance) &divide; expected lifetime hours. A $400
        printer expected to last 6,000 productive hours wears at about $0.07/h, so a
        3.5&nbsp;h print carries roughly $0.25 of machine cost. This is the number most
        hobbyists forget.
      </p>

      <h3>4. Labor</h3>
      <p>
        Time spent slicing, starting the print, removing it and post-processing &times;
        your hourly rate. Even 10 minutes at $18/h adds $3.00 &mdash; usually the largest
        single cost for small parts.
      </p>

      <h3>5. Consumables</h3>
      <p>
        FDM: nozzles, bed adhesive, build sheets. Resin: FEP film, IPA wash, gloves,
        paper filters. Amortise these across the prints they serve &mdash; typically
        $0.10&ndash;$0.50 per print.
      </p>

      <h3>6. Overhead and markup</h3>
      <p>
        Add 10&ndash;20% overhead for failed prints, packaging and admin, then multiply
        by 1.2&ndash;1.5 for markup. Simple parts sit near 20&ndash;30%; custom or design
        work 40&ndash;50%+.
      </p>

      <h2>Worked example: FDM PLA part</h2>
      <table>
        <thead>
          <tr><th>Cost line</th><th>Calculation</th><th>Amount</th></tr>
        </thead>
        <tbody>
          <tr><td>Material</td><td>22 g &times; $0.022/g</td><td>$0.48</td></tr>
          <tr><td>Electricity</td><td>0.12 kW &times; 3.5 h &times; $0.15</td><td>$0.06</td></tr>
          <tr><td>Machine depreciation</td><td>3.5 h &times; $0.07/h</td><td>$0.25</td></tr>
          <tr><td>Labor</td><td>10 min &times; $18/h</td><td>$3.00</td></tr>
          <tr><td>Consumables</td><td>amortised</td><td>$0.15</td></tr>
          <tr><td><strong>Unit cost</strong></td><td /><td><strong>$3.94</strong></td></tr>
          <tr><td>+ 15% overhead, &times; 1.40 markup</td><td>($3.94 &times; 1.15) &times; 1.40</td><td><strong>$6.34</strong></td></tr>
        </tbody>
      </table>

      <h2>Worked example: resin miniature</h2>
      <table>
        <thead>
          <tr><th>Cost line</th><th>Calculation</th><th>Amount</th></tr>
        </thead>
        <tbody>
          <tr><td>Material</td><td>18 ml &times; $0.045/ml</td><td>$0.81</td></tr>
          <tr><td>Electricity</td><td>0.06 kW &times; 4 h &times; $0.15</td><td>$0.04</td></tr>
          <tr><td>Machine depreciation</td><td>4 h &times; $0.05/h</td><td>$0.20</td></tr>
          <tr><td>Labor (wash, cure, supports)</td><td>15 min &times; $18/h</td><td>$4.50</td></tr>
          <tr><td>Consumables (FEP, IPA, gloves)</td><td>amortised</td><td>$0.35</td></tr>
          <tr><td><strong>Unit cost</strong></td><td /><td><strong>$5.90</strong></td></tr>
          <tr><td>+ 15% overhead, &times; 1.40 markup</td><td>($5.90 &times; 1.15) &times; 1.40</td><td><strong>$9.50</strong></td></tr>
        </tbody>
      </table>

      <h2>Common mistakes</h2>
      <ul>
        <li>Pricing only the plastic and ignoring labor &mdash; labor is usually the biggest cost.</li>
        <li>Forgetting machine depreciation, so the printer never pays for its own replacement.</li>
        <li>No failure allowance &mdash; one failed 10&nbsp;h print wipes out the margin on several good ones.</li>
        <li>Using the spool&rsquo;s stated weight instead of net filament weight.</li>
      </ul>

      <h2>Frequently asked questions</h2>
      {FAQS.map(([q, a]) => (
        <details key={q}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}

      <h2>Price your next print</h2>
      <p>
        Use the free <Link to="/cost-calculator">3D printing cost calculator</Link>,
        compare <Link to="/guides/fdm-vs-resin-printing-cost">FDM vs resin costs</Link>,
        or read the full <Link to="/tool-guide">tool guide and FAQ</Link>.
      </p>
    </GuideLayout>
  );
}
