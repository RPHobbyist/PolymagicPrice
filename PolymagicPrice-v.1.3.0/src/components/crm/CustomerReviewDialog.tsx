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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Star, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { saveReview } from "@/lib/core/sessionStorage";
import { CustomerReview } from "@/types/quote";
import { Checkbox } from "@/components/ui/checkbox";

interface CustomerReviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customerId: string;
    customerName: string;
    quoteId?: string;
    existingReview?: CustomerReview;
    onSaved?: () => void;
}

type ReviewTag = 'quality' | 'communication' | 'timeliness' | 'value';

const TAG_OPTIONS: { value: ReviewTag; label: string }[] = [
    { value: 'quality', label: 'Quality Work' },
    { value: 'communication', label: 'Good Communication' },
    { value: 'timeliness', label: 'On Time' },
    { value: 'value', label: 'Great Value' },
];

export function CustomerReviewDialog({
    open,
    onOpenChange,
    customerId,
    customerName,
    quoteId,
    existingReview,
    onSaved
}: CustomerReviewDialogProps) {
    const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(existingReview?.rating ?? 5);
    const [comment, setComment] = useState(existingReview?.comment ?? "");
    const [selectedTags, setSelectedTags] = useState<ReviewTag[]>(existingReview?.tags ?? []);
    const [hoveredStar, setHoveredStar] = useState<number | null>(null);

    const handleSubmit = () => {
        try {
            saveReview({
                id: existingReview?.id,
                customerId,
                quoteId,
                rating,
                comment: comment.trim() || undefined,
                tags: selectedTags.length > 0 ? selectedTags : undefined,
            });
            toast.success(existingReview ? "Review updated" : "Review added");
            onOpenChange(false);
            onSaved?.();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save review");
        }
    };

    const toggleTag = (tag: ReviewTag) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        {existingReview ? "Edit Review" : "Add Review"} for {customerName}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Star Rating */}
                    <div className="space-y-2">
                        <Label>Rating</Label>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star as 1 | 2 | 3 | 4 | 5)}
                                    onMouseEnter={() => setHoveredStar(star)}
                                    onMouseLeave={() => setHoveredStar(null)}
                                    className="p-1 transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={`w-8 h-8 transition-colors ${star <= (hoveredStar ?? rating)
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "text-muted-foreground/30"
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <Label>Tags (optional)</Label>
                        <div className="flex flex-wrap gap-2">
                            {TAG_OPTIONS.map((tag) => (
                                <label
                                    key={tag.value}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${selectedTags.includes(tag.value)
                                        ? "bg-primary/10 border-primary text-primary"
                                        : "bg-muted/50 border-border hover:bg-muted"
                                        }`}
                                >
                                    <Checkbox
                                        checked={selectedTags.includes(tag.value)}
                                        onCheckedChange={() => toggleTag(tag.value)}
                                        className="sr-only"
                                    />
                                    <span className="text-sm">{tag.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Comment */}
                    <div className="space-y-2">
                        <Label htmlFor="comment">Comment (optional)</Label>
                        <Textarea
                            id="comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Add notes about this customer..."
                            className="min-h-[80px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        {existingReview ? "Update" : "Save"} Review
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
