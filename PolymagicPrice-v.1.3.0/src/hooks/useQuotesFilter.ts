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

import { useState, useMemo } from "react";
import { QuoteData } from "@/types/quote";

export type SortOrder = "newest" | "oldest" | "price-high" | "price-low";
export type FilterType = "all" | "FDM" | "Resin";

export const useQuotesFilter = (quotes: QuoteData[]) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

    const filteredAndSortedQuotes = useMemo(() => {
        let result = [...quotes];

        // Filter by type
        if (filterType !== "all") {
            result = result.filter(q => q.printType === filterType);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(q =>
                q.projectName.toLowerCase().includes(query) ||
                (q.clientName && q.clientName.toLowerCase().includes(query)) ||
                (q.notes && q.notes.toLowerCase().includes(query))
            );
        }

        // Sort
        result.sort((a, b) => {
            switch (sortOrder) {
                case "newest":
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                case "oldest":
                    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                case "price-high":
                    return b.totalPrice - a.totalPrice;
                case "price-low":
                    return a.totalPrice - b.totalPrice;
                default:
                    return 0;
            }
        });

        return result;
    }, [quotes, filterType, searchQuery, sortOrder]);

    return {
        searchQuery,
        setSearchQuery,
        filterType,
        setFilterType,
        sortOrder,
        setSortOrder,
        filteredAndSortedQuotes
    };
};
