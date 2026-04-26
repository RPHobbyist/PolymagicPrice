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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Lightbulb, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const RECIPIENT_EMAIL = "rpelectrical06@gmail.com";

export const FeatureSuggestion = () => {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [suggestion, setSuggestion] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Create mailto link with suggestion details
        const subject = encodeURIComponent("PolymagicPrice - Feature Suggestion");
        const body = encodeURIComponent(
            `Feature Suggestion for PolymagicPrice\n\n` +
            `From: ${name || "Anonymous"}\n` +
            `Email: ${email || "Not provided"}\n\n` +
            `Suggestion:\n${suggestion}\n\n` +
            `---\nSent from PolymagicPrice`
        );

        // Open mailto link
        window.open(`mailto:${RECIPIENT_EMAIL}?subject=${subject}&body=${body}`, "_blank");

        toast({
            title: "Email client opened!",
            description: "Please send the email to submit your suggestion.",
        });

        // Reset form
        setName("");
        setEmail("");
        setSuggestion("");
        setOpen(false);
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0 font-normal whitespace-nowrap text-inherit h-auto">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Submit Suggestion
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border border-black/20">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5" />
                        Submit a Suggestion
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Share your ideas to help us improve!
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">
                            Name <span className="text-muted-foreground text-xs">(optional)</span>
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            autoComplete="name"
                            placeholder="Your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="border-black/20"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">
                            Email <span className="text-muted-foreground text-xs">(optional)</span>
                        </Label>
                        <Input
                            id="email"
                            name="email"
                            autoComplete="email"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="border-black/20"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="suggestion" className="text-sm font-medium">
                            Your Suggestion <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="suggestion"
                            name="suggestion"
                            placeholder="Describe your feature idea..."
                            value={suggestion}
                            onChange={(e) => setSuggestion(e.target.value)}
                            required
                            rows={4}
                            className="resize-none border-black/20"
                        />
                    </div>
                    <Button
                        type="submit"
                        variant="outline"
                        className="w-full border-black/30 hover:bg-black hover:text-white"
                        disabled={loading || !suggestion.trim()}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Opening email...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Submit via Email
                            </>
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default FeatureSuggestion;
