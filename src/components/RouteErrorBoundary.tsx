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
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, Database, LayoutDashboard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ErrorBoundary";

/**
 * A boundary around the page, inside the app shell.
 *
 * The only boundary used to be the one at the root, so a single bad record anywhere replaced the
 * entire application with a full-screen crash card whose one remedy was "Reload Page" — which read
 * the same record and crashed again. Keeping the failure inside the page leaves the sidebar and
 * every other screen usable, and the offer below is one that can actually get a shop out of
 * trouble: take a backup, or go somewhere that works.
 *
 * Keyed on the pathname so navigating away clears the error rather than carrying it to the next
 * page.
 */
export const RouteErrorBoundary = ({ children }: { children: ReactNode }) => {
    const { pathname } = useLocation();

    const fallback = (
        <div className="p-6">
            <Card className="max-w-xl mx-auto p-6 border-destructive/30">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="p-3 bg-destructive/10 rounded-full">
                        <AlertTriangle className="w-7 h-7 text-destructive" />
                    </div>

                    <div className="space-y-1.5">
                        <h2 className="text-xl font-bold">This page ran into a problem</h2>
                        <p className="text-sm text-muted-foreground">
                            The rest of the app is still working. Your data has not been changed by
                            this error, and it is worth taking a backup before going further.
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 pt-1">
                        <Button asChild variant="default" className="gap-2">
                            <Link to="/cost-calculator">
                                <LayoutDashboard className="w-4 h-4" />
                                Cost Calculator
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="gap-2">
                            <Link to="/database-manager">
                                <Database className="w-4 h-4" />
                                Back up my data
                            </Link>
                        </Button>
                        <Button variant="ghost" className="gap-2" onClick={() => window.location.reload()}>
                            <RefreshCw className="w-4 h-4" />
                            Reload
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );

    return (
        <ErrorBoundary key={pathname} fallback={fallback}>
            {children}
        </ErrorBoundary>
    );
};

export default RouteErrorBoundary;
