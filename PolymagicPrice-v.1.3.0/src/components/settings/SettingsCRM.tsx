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

import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Pencil, Users, Phone, Mail, Search, Plus, Eye, Building2 } from "lucide-react";
import { Customer } from "@/types/quote";
import { getCustomers, saveCustomer, deleteCustomer } from "@/lib/core/sessionStorage";
import { toast } from "sonner";
import { CustomerDetailsDialog } from "@/components/crm/CustomerDetailsDialog";
import { useCurrency } from "@/hooks/useCurrency";
import { Badge } from "@/components/ui/badge";

interface CustomerStats {
    totalSpent: number;
    orderCount: number;
}

// Helper hook for stats
const useAllCustomerStats = (customers: Customer[]) => {
    const [stats, setStats] = useState<Record<string, CustomerStats>>({});

    useEffect(() => {
        const newStats: Record<string, CustomerStats> = {};
        import("@/lib/core/sessionStorage").then(({ getCustomerStats }) => {
            customers.forEach(c => {
                newStats[c.id] = getCustomerStats(c.id);
            });
            setStats(newStats);
        });
    }, [customers]);

    return stats;
};

const SettingsCRM = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const { formatPrice } = useCurrency();
    const customerStats = useAllCustomerStats(customers);

    // Form state
    const [formData, setFormData] = useState<Partial<Customer>>({
        name: "",
        company: "",
        email: "",
        phone: "",
        address: "",
        notes: "",
        tags: [],
    });

    const loadCustomers = useCallback(() => {
        setCustomers(getCustomers());
    }, []);

    useEffect(() => {
        loadCustomers();
    }, [loadCustomers]);

    const resetForm = () => {
        setEditingCustomer(null);
        setFormData({ name: "", company: "", email: "", phone: "", address: "", notes: "", tags: [] });
        setIsDialogOpen(false);
    };

    const handleEdit = (customer: Customer) => {
        setFormData({
            name: customer.name,
            company: customer.company || "",
            email: customer.email || "",
            phone: customer.phone || "",
            address: customer.address || "",
            notes: customer.notes || "",
            tags: customer.tags || [],
        });
        setEditingCustomer(customer);
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setEditingCustomer(null);
        setFormData({ name: "", company: "", email: "", phone: "", address: "", notes: "", tags: [] });
        setIsDialogOpen(true);
    };

    const handleSaveCustomer = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!formData.name?.trim()) {
            toast.error("Name is required");
            return;
        }

        try {
            const customerToSave = {
                id: editingCustomer?.id, // undefined for new
                name: formData.name!,
                company: formData.company,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                notes: formData.notes,
                tags: formData.tags,
                createdAt: editingCustomer?.createdAt, // undefined for new (handled in saveCustomer)
            };

            saveCustomer(customerToSave);
            toast.success(editingCustomer ? "Customer updated" : "Customer added");
            resetForm();
            loadCustomers();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save customer");
        }
    };

    const handleDeleteConfirm = () => {
        if (deleteId) {
            deleteCustomer(deleteId);
            toast.success("Customer deleted");
            setDeleteId(null);
            loadCustomers();
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-lg font-medium text-foreground">Customer List</h2>
                    <p className="text-sm text-muted-foreground">Manage your client database for quotes.</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            id="search-customers"
                            name="search"
                            autoComplete="off"
                            placeholder="Search customers..."
                            className="pl-9 bg-background/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleAddNew} className="bg-gradient-accent">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Customer
                    </Button>
                </div>
            </div>

            <Card className="shadow-sm border-border bg-card overflow-hidden">
                {filteredCustomers.length === 0 ? (
                    <div className="p-10 flex flex-col items-center justify-center text-center gap-5">
                        <div className="p-5 bg-muted/30 rounded-full">
                            <Users className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-foreground">No Customers Found</h3>
                            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                                {searchQuery ? "No customers match your search." : "Start by adding your first customer using the button above."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="font-semibold text-foreground">Name / Company</TableHead>
                                    <TableHead className="font-semibold text-foreground">Contact</TableHead>
                                    <TableHead className="text-right font-semibold text-foreground">Total Revenue</TableHead>
                                    <TableHead className="w-32 font-semibold text-foreground text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCustomers.map((customer) => (
                                    <TableRow key={customer.id} className="hover:bg-muted/40 transition-colors group">
                                        <TableCell>
                                            <div className="font-semibold text-foreground">{customer.name}</div>
                                            {customer.company && (
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Building2 className="w-3 h-3" />
                                                    {customer.company}
                                                </div>
                                            )}
                                            {customer.tags && customer.tags.length > 0 && (
                                                <div className="flex gap-1 mt-1">
                                                    {customer.tags.slice(0, 2).map(tag => (
                                                        <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0 h-4">{tag}</Badge>
                                                    ))}
                                                    {customer.tags.length > 2 && <span className="text-[10px] text-muted-foreground">+{customer.tags.length - 2}</span>}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                                                {customer.email && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Mail className="w-3.5 h-3.5" />
                                                        <span>{customer.email}</span>
                                                    </div>
                                                )}
                                                {customer.phone && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone className="w-3.5 h-3.5" />
                                                        <span>{customer.phone}</span>
                                                    </div>
                                                )}
                                                {!customer.email && !customer.phone && "-"}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="font-bold text-foreground tabular-nums">
                                                {formatPrice(customerStats[customer.id]?.totalSpent || 0)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">{customerStats[customer.id]?.orderCount || 0} orders</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setViewingCustomer(customer)}
                                                    className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8"
                                                    title="View Details"
                                                    aria-label="View details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(customer)}
                                                    className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8"
                                                    aria-label="Edit customer"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleteId(customer.id)}
                                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                                    aria-label="Delete customer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>

            {/* Add/Edit Customer Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSaveCustomer} className="space-y-4 py-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                                <Input
                                    id="name"
                                    name="name"
                                    autoComplete="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="John Doe"
                                    className="bg-background"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company">Company</Label>
                                <Input
                                    id="company"
                                    name="company"
                                    autoComplete="organization"
                                    value={formData.company}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    placeholder="Acme Inc."
                                    className="bg-background"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    autoComplete="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="john@example.com"
                                    className="bg-background"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    autoComplete="tel"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+1 234 567 890"
                                    className="bg-background"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">Address</Label>
                                <Input
                                    id="address"
                                    name="address"
                                    autoComplete="street-address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="123 Main St, City, Country"
                                    className="bg-background"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="tags">Tags (comma separated)</Label>
                                <Input
                                    id="tags"
                                    name="tags"
                                    autoComplete="off"
                                    value={formData.tags?.join(", ")}
                                    onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
                                    placeholder="VIP, Local, Retail"
                                    className="bg-background"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    name="notes"
                                    autoComplete="off"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Preferences, specific requirements, etc."
                                    className="bg-background min-h-[60px]"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={resetForm}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-gradient-accent">
                                <Plus className="w-4 h-4 mr-2" />
                                {editingCustomer ? 'Update Customer' : 'Add Customer'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                            <Trash2 className="w-5 h-5" />
                            Delete Customer
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this customer? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Details Dialog */}
            <CustomerDetailsDialog
                open={!!viewingCustomer}
                customer={viewingCustomer}
                onOpenChange={(open) => !open && setViewingCustomer(null)}
            />
        </div>
    );
};

export default SettingsCRM;
