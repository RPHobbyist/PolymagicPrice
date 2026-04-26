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

import { cva } from "class-variance-authority";

export const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2 py-0 h-5 text-[10px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm",
    {
        variants: {
            variant: {
                default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
                outline: "text-foreground",
                success: "border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-none",
                warning: "border-transparent bg-amber-100 text-amber-700 hover:bg-amber-200 shadow-none",
                error: "border-transparent bg-red-100 text-red-700 hover:bg-red-200 shadow-none",
                info: "border-transparent bg-blue-100 text-blue-700 hover:bg-blue-200 shadow-none",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);
