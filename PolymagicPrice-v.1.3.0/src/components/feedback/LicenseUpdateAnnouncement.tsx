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

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

const STORAGE_KEY = "license_update_agpl_v3_acknowledged";

export const LicenseUpdateAnnouncement = ({ onAcknowledge }: { onAcknowledge: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const hasAcknowledged = localStorage.getItem(STORAGE_KEY);
        if (!hasAcknowledged) {
            // Small delay to ensure smooth mounting animation
            const timer = setTimeout(() => setIsOpen(true), 1000);
            return () => clearTimeout(timer);
        } else {
            onAcknowledge();
        }
    }, [onAcknowledge]);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem(STORAGE_KEY, "true");
        onAcknowledge();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="w-6 h-6 text-green-600" />
                        <DialogTitle>License Update: GNU AGPLv3</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2 text-left">
                        <p className="mb-4 text-justify">
                            We have updated our license to the <strong>GNU Affero General Public License v3 (AGPLv3)</strong>.
                        </p>
                        <p className="mb-4 text-justify">
                            This change ensures that PolymagicPrice remains open and free forever.
                            It guarantees that anyone who builds upon this project, whether as a downloadable tool or a web service, must also share their improvements with the community.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Thank you for being part of our open source journey!
                        </p>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={handleClose} className="w-full sm:w-auto">
                        I Understand
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
