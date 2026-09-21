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

const PATH = "/guides/fdm-vs-resin-printing-cost";
const PARENT = "https://www.rphobbyist.com";

const FAQS: [string, string][] = [
  [
    "Is resin printing more expensive than FDM?",
    "Yes. Material is only slightly more per part, but consumables and wash/cure labor push the finished cost 40-70% higher at hobby scale.",
  ],
  [
    "How much does resin cost per print?",
    "Most small resin prints use $0.50-$4 of resin plus $0.20-$0.60 of consumables; finished cost after labor and markup is typically $8-$25.",
  ],
  [
    "Is PLA the cheapest filament?",
    "PLA and basic PETG are the cheapest common filaments at $15-$25/kg. Engineering filaments (nylon, PC, CF blends) run $40-$80/kg.",
  ],
];

export default function FdmVsResinCost() {
  useDocumentSEO({
    title: "FDM vs Resin 3D Printing Cost — Full Price Comparison",
    description:
      "A detailed cost comparison of FDM and resin (SLA/DLP) 3D printing: material price per kg vs per litre, consumables, electricity, failure rates and real cost-per-part examples. See which is cheaper for your parts.",
    canonical: PATH,
    ogImage: SYSTEM_CONFIG.logo,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "FDM vs Resin 3D Printing Cost: Full Price Comparison",
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
          { "@type": "ListItem", position: 3, name: "FDM vs resin printing cost", item: `${SYSTEM_CONFIG.baseUrl}${PATH}` },
        ],
      },
    ],
  });

  return (
    <GuideLayout breadcrumb="FDM vs resin printing cost">
      <h1>FDM vs Resin 3D Printing Cost: Full Price Comparison</h1>
      <p className="lead">
        FDM and resin printing are priced differently. FDM material is sold by weight
        and needs little finishing; resin is sold by volume, costs more per part, and
        adds significant wash-and-cure labor and consumables. This guide compares every
        cost line and works through real cost-per-part numbers.
      </p>

      <h2>Cost comparison table</h2>
      <table>
        <thead>
          <tr><th>Cost factor</th><th>FDM (filament)</th><th>Resin (SLA/DLP/LCD)</th></tr>
        </thead>
        <tbody>
          <tr><td>Material price</td><td>$15&ndash;$50 per kg</td><td>$35&ndash;$150+ per litre</td></tr>
          <tr><td>Material per typical part</td><td>$0.20&ndash;$2.00</td><td>$0.50&ndash;$4.00</td></tr>
          <tr><td>Printer price</td><td>$200&ndash;$1,200</td><td>$150&ndash;$600 (plus wash/cure)</td></tr>
          <tr><td>Power draw</td><td>100&ndash;150 W</td><td>40&ndash;80 W</td></tr>
          <tr><td>Consumables</td><td>Nozzles, glue, sheets ($0.05&ndash;$0.20/print)</td><td>FEP film, IPA, gloves, filters ($0.20&ndash;$0.60/print)</td></tr>
          <tr><td>Post-processing labor</td><td>Low &mdash; remove supports</td><td>High &mdash; wash, cure, dense supports</td></tr>
          <tr><td>Failure allowance</td><td>5&ndash;10%</td><td>10&ndash;20%</td></tr>
        </tbody>
      </table>

      <h2>Where the money actually goes</h2>
      <p>
        <strong>Material:</strong> per gram, PLA is around $0.02 and a standard resin
        around $0.04&ndash;$0.05 per ml. Resin parts are usually smaller, so material
        cost is often comparable &mdash; the gap is in everything else.
      </p>
      <p>
        <strong>Electricity:</strong> negligible for both (a few cents per print). Resin
        printers draw less power.
      </p>
      <p>
        <strong>Consumables:</strong> resin&rsquo;s biggest hidden cost. FEP film
        ($5&ndash;$15) lasts ~20&ndash;40 prints, plus IPA (about 1&nbsp;L per few litres
        of resin), nitrile gloves and filters every print.
      </p>
      <p>
        <strong>Labor:</strong> the decisive factor. An FDM part needs a minute of
        support removal; a resin part needs draining, an IPA bath, drying, UV curing and
        removal of dense supports &mdash; 10&ndash;20 minutes that dominate the unit cost.
      </p>

      <h2>Cost-per-part example</h2>
      <p>
        A palm-sized bracket in PLA: ~$0.60 material, ~$0.30 machine + power, ~$3.00
        labor &rarr; <strong>~$3.90 unit cost</strong>.
      </p>
      <p>
        The same object in resin: ~$1.10 material, ~$0.25 machine + power, ~$0.40
        consumables, ~$4.50 labor &rarr; <strong>~$6.25 unit cost</strong>.
      </p>
      <p>
        Resin runs roughly 40&ndash;70% more per part at hobby scale, almost entirely
        because of finishing labor and consumables.
      </p>

      <h2>When each is cheaper</h2>
      <ul>
        <li>
          <strong>FDM is cheaper</strong> for functional parts, larger objects,
          prototypes, and anything where surface finish is not critical.
        </li>
        <li>
          <strong>Resin is worth the premium</strong> for miniatures, jewellery,
          dental/medical models and highly detailed display pieces.
        </li>
      </ul>

      <h2>Frequently asked questions</h2>
      {FAQS.map(([q, a]) => (
        <details key={q}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}

      <h2>Price it yourself</h2>
      <p>
        Price either technology with the free{" "}
        <Link to="/cost-calculator">3D printing cost calculator</Link>, or read{" "}
        <Link to="/guides/how-to-calculate-3d-printing-cost">how to calculate 3D printing cost</Link>.
      </p>
    </GuideLayout>
  );
}
