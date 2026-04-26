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
import { SYSTEM_CONFIG } from "@/lib/core/core-system";

export const AppHeader = () => {
    return (
        <header className="border-b border-border bg-white sticky top-0 z-50 shadow-sm w-full h-[32px] sm:h-auto" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties & { WebkitAppRegion: string }}>
            <div className="mx-auto px-6 h-16 sm:h-20 max-w-[1800px] w-full">
                <div className="flex items-center justify-between h-full gap-4">
                    {/* Left Section: Logo */}
                    <div className="flex-1 flex items-center justify-start min-w-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties & { WebkitAppRegion: string }}>
                        <Link to="/cost-calculator" className="flex-shrink-0">
                            <img src={SYSTEM_CONFIG.logo} alt={SYSTEM_CONFIG.vendor} width={1024} height={1024} className="h-16 sm:h-20 w-auto object-contain" />
                        </Link>
                    </div>

                    {/* Center Section: Branding (Always Centered) */}
                    <div className="flex-1 flex items-center justify-center min-w-0">
                        <div className="h-8 sm:h-11 flex items-center justify-center flex-shrink-0">
                            <img 
                                src="./brand-logo.png" 
                                alt="PolymagicPrice" 
                                className="h-full w-auto object-contain"
                            />
                        </div>
                    </div>

                    {/* Right Section: Actions (Empty or minimal now) */}
                    <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 min-w-0 pr-4 sm:pr-8" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties & { WebkitAppRegion: string }}>
                    </div>
                </div>
            </div>
        </header>
    );
};
