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

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, AlertTriangle, FileCode, Clock, Scale, Calendar, HelpCircle } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { StoredGcode } from "@/types/quote";
import { useStoredGcodes } from "@/hooks/useStoredGcodes";
import { ThumbnailPreview } from "@/components/shared/ThumbnailPreview";

const GcodeManager = () => {
    const { gcodes, loading, deleteGcode } = useStoredGcodes();
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        await deleteGcode(id);
        setDeleteId(null);
    };

    if (loading) {
        return <div className="text-center py-8">Loading saved files...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">Saved Projects</h2>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger type="button" aria-label="Help">
                                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px] p-4 text-sm bg-popover border-border" side="right">
                                <div className="space-y-2">
                                    <p className="font-semibold">Important Note</p>
                                    <p>The application only stores the file location and metadata, not the actual file content.</p>
                                    <div className="bg-muted p-2 rounded text-xs">
                                        <p className="font-semibold mb-1">Please ensure:</p>
                                        <p>• The file must remain in the same location on your computer.</p>
                                        <p>• If you move or rename the file, you will need to re-save it here.</p>
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <p className="text-sm text-muted-foreground">
                    Files saved here can be quickly selected in the calculator.
                </p>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-16">Preview</TableHead>
                            <TableHead>File Name</TableHead>
                            <TableHead>Print Time</TableHead>
                            <TableHead>Weight / Vol.</TableHead>
                            <TableHead>Machine / Material</TableHead>
                            <TableHead>Date Added</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {gcodes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                    <div className="flex flex-col items-center gap-2">
                                        <FileCode className="w-8 h-8 opacity-20" />
                                        <p>No G-code files saved yet.</p>
                                        <p className="text-xs">Upload a file in the Calculator and click "Save to Library".</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            gcodes.map((file) => (
                                <TableRow key={file.id}>
                                    <TableCell>
                                        <ThumbnailPreview src={file.thumbnail || ""} className="w-10 h-10" />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{file.name}</span>
                                            <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={file.filePath}>
                                                {file.filePath}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                            {file.printTime}h
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            {file.resinVolume ? (
                                                <>
                                                    <div className="h-3.5 w-3.5 flex items-center justify-center text-muted-foreground font-bold text-[10px] border border-current rounded-sm">V</div>
                                                    {file.resinVolume}ml
                                                </>
                                            ) : (
                                                <>
                                                    <Scale className="w-3.5 h-3.5 text-muted-foreground" />
                                                    {file.filamentWeight}g
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span>{file.machineName || "-"}</span>
                                            <span className="text-xs text-muted-foreground">{file.materialName || "-"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(file.createdAt).toLocaleDateString()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => setDeleteId(file.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            Confirm Remove
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this file from your library?
                            <br />
                            <span className="text-xs text-muted-foreground mt-2 block">
                                Note: This only removes the entry from the Polymagic database, not the actual file on your disk.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteId && handleDelete(deleteId)}
                        >
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default GcodeManager;
