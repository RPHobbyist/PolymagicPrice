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

import { Search, Filter, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterType, SortOrder } from "@/hooks/useQuotesFilter";

interface QuotesToolbarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filterType: FilterType;
    setFilterType: (type: FilterType) => void;
    sortOrder: SortOrder;
    setSortOrder: (order: SortOrder) => void;
}

export const QuotesToolbar = ({
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    sortOrder,
    setSortOrder,
}: QuotesToolbarProps) => {
    return (
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    id="search-quotes"
                    name="search"
                    autoComplete="off"
                    placeholder="Search projects or clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background"
                    aria-label="Search saved quotes"
                />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                <div className="flex items-center gap-2 min-w-[140px]">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <Select name="filterType" value={filterType} onValueChange={(v: FilterType) => setFilterType(v)}>
                        <SelectTrigger className="bg-background w-full" aria-label="Filter by Type">
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="FDM">FDM Only</SelectItem>
                            <SelectItem value="Resin">Resin Only</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2 min-w-[160px]">
                    <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                    <Select name="sortOrder" value={sortOrder} onValueChange={(v: SortOrder) => setSortOrder(v)}>
                        <SelectTrigger className="bg-background w-full" aria-label="Sort Quotes">
                            <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="price-high">Highest Price</SelectItem>
                            <SelectItem value="price-low">Lowest Price</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
};
