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


import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";

interface ThumbnailPreviewProps {
    src: string;
    alt?: string;
    className?: string;
}

export const ThumbnailPreview = ({ src, alt = "Preview", className }: ThumbnailPreviewProps) => {
    if (!src) return null;

    return (
        <HoverCard>
            <HoverCardTrigger asChild>
                <div className={`relative cursor-pointer ${className}`}>
                    <img
                        src={src}
                        alt={alt}
                        className="h-10 w-10 object-cover rounded-md border border-border bg-background hover:ring-2 hover:ring-primary/20 transition-all"
                    />
                </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-auto p-2" side="top">
                <img
                    src={src}
                    alt={`${alt} Large`}
                    className="max-w-[200px] max-h-[200px] rounded-lg shadow-sm bg-background"
                />
            </HoverCardContent>
        </HoverCard>
    );
};

// Also export a variant for larger trigger if needed, or make the trigger component flexible
export const LargeThumbnailPreview = ({ src, alt = "Preview" }: ThumbnailPreviewProps) => {
    if (!src) return null;

    return (
        <HoverCard>
            <HoverCardTrigger asChild>
                <div className="relative group mt-2 flex justify-center cursor-pointer">
                    <img
                        src={src}
                        alt={alt}
                        className="h-24 w-24 object-cover rounded-lg border border-border bg-background shadow-sm hover:ring-2 hover:ring-primary/20 transition-all"
                    />
                </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-auto p-2" side="right">
                <img
                    src={src}
                    alt={`${alt} Large`}
                    className="max-w-[300px] max-h-[300px] rounded-lg shadow-sm bg-background"
                />
            </HoverCardContent>
        </HoverCard>
    );
};
