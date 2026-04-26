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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Customer, CustomerReview } from "@/types/quote";
import { getCustomerStats, getReviews, deleteReview } from "@/lib/core/sessionStorage";
import { useCurrency } from "@/hooks/useCurrency";
import { Building2, MapPin, Calendar, Receipt, TrendingUp, Mail, Phone, Clock, Users, Star, Plus, Trash2, MessageSquare } from "lucide-react";
import { CustomerReviewDialog } from "./CustomerReviewDialog";
import { toast } from "sonner";

interface CustomerDetailsDialogProps {
    customer: Customer | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const CustomerDetailsDialog = ({ customer, open, onOpenChange }: CustomerDetailsDialogProps) => {
    const { formatPrice } = useCurrency();
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const stats = !customer ? null : getCustomerStats(customer.id);

    const reviews = !customer ? [] : getReviews(customer.id);

    const handleDeleteReview = (reviewId: string) => {
        deleteReview(reviewId);
        toast.success("Review deleted");
        setRefreshKey(k => k + 1);
    };

    if (!customer || !stats) return null;

    const averageRating = customer.averageRating ?? 0;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="bg-card border-border sm:max-w-[700px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <div className="bg-gradient-primary px-6 py-6 text-primary-foreground">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span>{customer.name}</span>
                                    {averageRating > 0 && (
                                        <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                            <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
                                        </div>
                                    )}
                                </div>
                                {customer.tags && customer.tags.length > 0 && (
                                    <div className="flex gap-2">
                                        {customer.tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-0">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </DialogTitle>
                            <DialogDescription className="text-primary-foreground/80 flex items-center gap-4 mt-2">
                                {customer.company && (
                                    <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {customer.company}</span>
                                )}
                                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Member since {new Date(customer.createdAt).toLocaleDateString()}</span>
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className="mx-6 mt-4 w-fit">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="reviews" className="flex items-center gap-2">
                                Reviews
                                {reviews.length > 0 && (
                                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{reviews.length}</Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="flex-1 overflow-y-auto m-0 p-0">
                            <div className="p-6 space-y-6">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <Card className="p-4 bg-muted/30 border-dashed border-2">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-primary/10 rounded-lg text-primary"><Receipt className="w-5 h-5" /></div>
                                            <span className="text-sm font-medium text-muted-foreground">Total Orders</span>
                                        </div>
                                        <p className="text-2xl font-bold">{stats.orderCount}</p>
                                    </Card>
                                    <Card className="p-4 bg-muted/30 border-dashed border-2">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-success/10 rounded-lg text-success"><TrendingUp className="w-5 h-5" /></div>
                                            <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
                                        </div>
                                        <p className="text-2xl font-bold">{formatPrice(stats.totalSpent)}</p>
                                    </Card>
                                    <Card className="p-4 bg-muted/30 border-dashed border-2">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-accent/10 rounded-lg text-accent"><Calendar className="w-5 h-5" /></div>
                                            <span className="text-sm font-medium text-muted-foreground">Last Order</span>
                                        </div>
                                        <p className="text-lg font-semibold truncate" title={stats.lastOrderDate ? new Date(stats.lastOrderDate).toLocaleDateString() : "Never"}>
                                            {stats.lastOrderDate ? new Date(stats.lastOrderDate).toLocaleDateString() : "-"}
                                        </p>
                                    </Card>
                                </div>

                                <div className="grid md:grid-cols-[1fr_300px] gap-6">
                                    {/* Order History */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            <Receipt className="w-5 h-5 text-primary" /> Order History
                                        </h3>
                                        <Card className="border border-border shadow-sm overflow-hidden">
                                            <ScrollArea className="h-[300px]">
                                                {stats.quotes.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground">
                                                        <Receipt className="w-10 h-10 mb-2 opacity-20" />
                                                        <p>No orders yet</p>
                                                    </div>
                                                ) : (
                                                    <div className="divide-y divide-border">
                                                        {stats.quotes.map((quote, i) => (
                                                            <div key={quote.id || i} className="p-4 hover:bg-muted/50 transition-colors flex justify-between items-center bg-card">
                                                                <div>
                                                                    <p className="font-medium text-foreground">{quote.projectName}</p>
                                                                    <p className="text-xs text-muted-foreground">{new Date(quote.createdAt || "").toLocaleDateString()} • {quote.printType}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="font-bold text-primary">{formatPrice(quote.totalPrice)}</p>
                                                                    <span className="text-xs text-muted-foreground">{quote.quantity} units</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </ScrollArea>
                                        </Card>
                                    </div>

                                    {/* Contact Info */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            <div className="p-1 rounded bg-secondary"><Users className="w-4 h-4" /></div> Contact Info
                                        </h3>
                                        <Card className="p-4 space-y-4 bg-muted/10 h-fit">
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</p>
                                                <div className="flex items-center gap-2 text-sm break-all">
                                                    <Mail className="w-4 h-4 text-primary shrink-0" />
                                                    {customer.email ? <a href={`mailto:${customer.email}`} className="hover:underline">{customer.email}</a> : "-"}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</p>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Phone className="w-4 h-4 text-primary shrink-0" />
                                                    {customer.phone ? <a href={`tel:${customer.phone}`} className="hover:underline">{customer.phone}</a> : "-"}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Address</p>
                                                <div className="flex items-start gap-2 text-sm">
                                                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                    <span className="whitespace-pre-line">{customer.address || "-"}</span>
                                                </div>
                                            </div>
                                            {customer.notes && (
                                                <div className="space-y-1 pt-2 border-t border-dashed">
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Internal Notes</p>
                                                    <p className="text-sm text-muted-foreground italic bg-muted/50 p-2 rounded">{customer.notes}</p>
                                                </div>
                                            )}
                                        </Card>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="reviews" className="flex-1 overflow-y-auto m-0 p-0">
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5 text-primary" /> Customer Reviews
                                    </h3>
                                    <Button size="sm" onClick={() => setReviewDialogOpen(true)}>
                                        <Plus className="w-4 h-4 mr-2" /> Add Review
                                    </Button>
                                </div>

                                {reviews.length === 0 ? (
                                    <Card className="p-10 flex flex-col items-center justify-center text-center">
                                        <Star className="w-12 h-12 text-muted-foreground/20 mb-3" />
                                        <p className="text-muted-foreground">No reviews yet</p>
                                        <Button variant="outline" className="mt-4" onClick={() => setReviewDialogOpen(true)}>
                                            Add First Review
                                        </Button>
                                    </Card>
                                ) : (
                                    <div className="space-y-3">
                                        {reviews.map((review) => (
                                            <Card key={review.id} className="p-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="flex">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <Star
                                                                        key={star}
                                                                        className={`w-4 h-4 ${star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">
                                                                {new Date(review.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        {review.tags && review.tags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mb-2">
                                                                {review.tags.map((tag) => (
                                                                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                                                        {tag}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {review.comment && (
                                                            <p className="text-sm text-muted-foreground">{review.comment}</p>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleDeleteReview(review.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            <CustomerReviewDialog
                open={reviewDialogOpen}
                onOpenChange={setReviewDialogOpen}
                customerId={customer.id}
                customerName={customer.name}
                onSaved={() => setRefreshKey(k => k + 1)}
            />
        </>
    );
};
