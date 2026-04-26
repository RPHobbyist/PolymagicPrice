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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, MessageSquare, ExternalLink } from "lucide-react";


interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Hardcoded feedback - Add your approved feedback here
const HARDCODED_FEEDBACK = [
  {
    id: 1,
    name: "John Doe",
    rating: 5,
    message: "Excellent tool! Makes pricing so much easier.",
    timestamp: "2026-01-08T12:00:00.000Z",
  },
  // Add more feedback here as you receive them from Google Forms
];

// Google Form URL - Feedback collection form
const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScNQaWb0loTDxzbGcULqQPcOQTVA_zifKZY5BXQ22yeYlZA0A/viewform?usp=header";

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [activeTab, setActiveTab] = useState("submit");

  // Use hardcoded feedback instead of fetching from GitHub
  const communityFeedback = HARDCODED_FEEDBACK;

  const openGoogleForm = () => {
    window.open(GOOGLE_FORM_URL, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MessageSquare className="w-5 h-5 text-primary" />
            Community Feedback
          </DialogTitle>
          <DialogDescription>
            Share your experience and see what others are saying.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="submit">Share Feedback</TabsTrigger>
              <TabsTrigger value="reviews">
                Community Reviews ({communityFeedback.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Submit Tab - Google Form Link */}
          <TabsContent value="submit" className="flex-1 p-6 overflow-y-auto data-[state=inactive]:hidden">
            <div className="flex flex-col items-center justify-center py-8 space-y-6">
              <div className="w-20 h-20 rounded-full bg-gradient-primary/10 flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-primary" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">We'd Love Your Feedback!</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Help us improve by sharing your thoughts, suggestions, and experience with this tool.
                </p>
              </div>

              <Button
                size="lg"
                onClick={openGoogleForm}
                className="bg-accent text-accent-foreground font-semibold shadow-lg hover:shadow-xl transition-all hover:bg-accent/90"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Feedback Form
              </Button>

              <p className="text-xs text-muted-foreground text-center max-w-sm">
                Your feedback will be reviewed and may appear in the Community Reviews section.
              </p>
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="flex-1 overflow-hidden flex flex-col data-[state=inactive]:hidden">
            <div className="px-6 py-2 border-b">
              <p className="text-sm text-muted-foreground">
                {communityFeedback.length} review{communityFeedback.length !== 1 ? 's' : ''}
              </p>
            </div>

            <ScrollArea className="flex-1 p-6">
              {communityFeedback.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 opacity-20" />
                  <p>No reviews yet. Be the first to share your feedback!</p>
                  <Button variant="link" onClick={() => setActiveTab("submit")}>
                    Share feedback
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {communityFeedback.map((feedback) => (
                    <div key={feedback.id} className="bg-muted/30 p-4 rounded-xl space-y-3 border border-border/50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm text-white font-bold border border-white/20 shadow-sm">
                            {feedback.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm leading-none">{feedback.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(feedback.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < feedback.rating ? "text-yellow-400 fill-current" : "text-muted-foreground/20"
                                }`}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-sm text-foreground leading-relaxed">
                        "{feedback.message}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
