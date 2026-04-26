import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { AGPL_LICENSE_TEXT } from "@/lib/constants";

export const LicenseDialog = () => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <button className="hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0 font-normal whitespace-nowrap">
                    GNU AGPLv3 License
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>GNU AGPLv3 License</DialogTitle>
                </DialogHeader>
                <div className="mt-4 text-sm bg-muted/50 p-4 rounded-md overflow-x-auto overflow-y-auto h-[60vh]">
                    <div className="mb-6 font-mono text-sm text-justify">
                        <p className="font-bold text-left mb-1">PolymagicPrice</p>
                        <p className="text-left mb-4">Copyright (C) 2025 Rp Hobbyist</p>

                        <p className="mb-4 leading-relaxed">
                            This program is free software: you can redistribute it and/or modify
                            it under the terms of the GNU Affero General Public License as published
                            by the Free Software Foundation, either version 3 of the License, or
                            (at your option) any later version.
                        </p>
                        <p className="mb-4 leading-relaxed">
                            This program is distributed in the hope that it will be useful,
                            but WITHOUT ANY WARRANTY; without even the implied warranty of
                            MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
                            GNU Affero General Public License for more details.
                        </p>
                        <p className="mb-4 leading-relaxed">
                            You should have received a copy of the GNU Affero General Public License
                            along with this program.  If not, see <a href="https://www.gnu.org/licenses/" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline font-medium">https://www.gnu.org/licenses/</a>.
                        </p>
                    </div>
                    <hr className="my-6 border-border" />
                    {AGPL_LICENSE_TEXT.split(/\n\n+/).map((paragraph, index) => (
                        <p key={index} className="mb-4 text-justify leading-relaxed last:mb-0">
                            {paragraph.replace(/\n/g, " ").split(/(https?:\/\/[^\s<>]+)/g).map((part, i) => (
                                part.match(/^https?:\/\/[^\s<>]+$/) ? (
                                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline font-medium">{part}</a>
                                ) : (
                                    part
                                )
                            ))}
                        </p>
                    ))}
                </div>
                <div className="flex justify-end mt-4">
                    <DialogTrigger asChild>
                        <Button variant="outline">Close</Button>
                    </DialogTrigger>
                </div>
            </DialogContent>
        </Dialog>
    );
};
