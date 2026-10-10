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

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export interface MaterialBreakdownSlice {
    name: string;
    value: number;
    colour: string;
}

/**
 * The walls/infill/supports/waste donut from the quote summary.
 *
 * It lives in its own file so that recharts can be loaded on demand. `QuoteSummary` is imported
 * eagerly by the cost calculator page, and the static import of recharts pulled the whole charting
 * vendor chunk — 101 KB gzipped, more than a quarter of that page's JavaScript — into the first
 * load, for a chart that only appears once a quote is priced from a slicer file that carries
 * per-feature weights.
 */
export const MaterialBreakdownChart = ({ data }: { data: MaterialBreakdownSlice[] }) => (
    <ResponsiveContainer width="100%" height="100%">
        <PieChart>
            <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
            >
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.colour} />
                ))}
            </Pie>
            <Tooltip
                contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    fontSize: '10px'
                }}
                itemStyle={{ fontSize: '10px', padding: '0' }}
                formatter={(value: number) => [`${value.toFixed(2)}g`, '']}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
        </PieChart>
    </ResponsiveContainer>
);

export default MaterialBreakdownChart;
