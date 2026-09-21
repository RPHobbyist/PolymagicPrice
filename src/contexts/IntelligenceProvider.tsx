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
import React, { createContext, useEffect, useCallback, useRef } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import {
    getQuotes,
    getMachines,
    getMaterials,
    getLowStockMaterials,
    getProductionJobs,
    getSpools,
    getConstants,
} from '@/lib/core/sessionStorage';
import { analyzeShop, Finding } from '@/lib/shopIntelligence';
import { useLocation } from 'react-router-dom';

interface IntelligenceContextType {
    analyzeSystem: () => void;
}

const IntelligenceContext = createContext<IntelligenceContextType | undefined>(undefined);

/**
 * Turns shop findings into notifications.
 *
 * Detection itself lives in `@/lib/shopIntelligence` so the AI assistant reads
 * exactly the same findings the bell shows — this provider owns scheduling,
 * de-duplication and emission only.
 */
export const IntelligenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { addNotification, notifications } = useNotifications();
    const location = useLocation();

    // Use a ref for notifications to avoid dependency cycle:
    // analyzeSystem → adds notification → notifications change → analyzeSystem recreates → useEffect re-runs
    const notificationsRef = useRef(notifications);
    notificationsRef.current = notifications;

    const analyzeSystem = useCallback(() => {
        // Optimization: Never run analysis or show notifications on landing page
        if (location.pathname === '/') return;

        const findings = analyzeShop({
            quotes: getQuotes(),
            machines: getMachines(),
            materials: getMaterials(),
            spools: getSpools(),
            jobs: getProductionJobs(),
            constants: getConstants(),
            lowStock: getLowStockMaterials(),
        });

        const current = notificationsRef.current;

        const alreadyRaised = (finding: Finding): boolean =>
            current.some(n =>
                n.metadata?.type === finding.metadata.type &&
                // `period` belongs in this list: matching is done against every notification ever
                // stored, regardless of age or status, so a recurring shop-wide finding without one
                // would be raised a single time and never again.
                (['quoteId', 'machineId', 'materialId', 'materialName', 'machineName', 'jobId', 'period'] as const)
                    .every(key => finding.metadata[key] === undefined || n.metadata?.[key] === finding.metadata[key])
            );

        findings.forEach(finding => {
            if (alreadyRaised(finding)) return;
            addNotification({
                type: finding.severity,
                title: finding.title,
                message: finding.message,
                metadata: finding.metadata,
            });
        });
    }, [addNotification, location.pathname]);

    useEffect(() => {
        // Initial analysis after a short delay to ensure other providers are ready
        const timeout = setTimeout(analyzeSystem, 2000);

        // Re-analyze when the user moves from landing to a tool page
        if (location.pathname !== '/') {
            analyzeSystem();
        }

        // Cross-tab Synchronization: Re-analyze immediately on relevant data changes
        const handleStorageChange = (e: StorageEvent) => {
            const relevantKeys = [
                'session_production_jobs',
                'session_spools',
                'session_quotes',
                'session_constants',
                'session_machines',
                // Materials carry stock thresholds and carbon factors, so editing one in another
                // tab changes what the analysis would find.
                'session_materials'
            ];
            if (relevantKeys.includes(e.key || '')) {
                analyzeSystem();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        // Periodic analysis every 15 minutes as a fallback
        const interval = setInterval(analyzeSystem, 15 * 60 * 1000);

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [analyzeSystem, location.pathname]);

    return (
        <IntelligenceContext.Provider value={{ analyzeSystem }}>
            {children}
        </IntelligenceContext.Provider>
    );
};
