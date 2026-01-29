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

import { useState, useMemo, useEffect } from "react";
import { Check, ChevronsUpDown, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { getCustomers, saveCustomer } from "@/lib/core/sessionStorage";
import { Customer } from "@/types/quote";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ClientSelectorProps {
    value?: string; // customerId
    onSelect: (customer: Customer | null) => void;
    className?: string;
    id?: string;
}

export function ClientSelector({ value, onSelect, className, id }: ClientSelectorProps) {
    const [open, setOpen] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newClientName, setNewClientName] = useState("");

    const refreshCustomers = () => {
        setCustomers(getCustomers());
    };

    useEffect(() => {
        refreshCustomers();
    }, []);

    const selectedCustomer = useMemo(
        () => customers.find((c) => c.id === value),
        [customers, value]
    );

    const handleCreateClient = () => {
        if (!newClientName.trim()) return;

        try {
            const newCustomer = saveCustomer({ name: newClientName });
            refreshCustomers();
            onSelect(newCustomer);
            setShowAddDialog(false);
            setNewClientName("");
            setOpen(false);
            toast.success(`Client "${newCustomer.name}" created`);
        } catch (e) {
            toast.error("Failed to create client");
        }
    };

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        aria-label="Select Client"
                        className={cn("w-full justify-between", !value && "text-muted-foreground", className)}
                    >
                        {selectedCustomer ? (
                            <span className="flex items-center gap-2 truncate">
                                <User className="h-4 w-4 shrink-0 opacity-50" />
                                {selectedCustomer.name}
                            </span>
                        ) : (
                            "Select client..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Search clients..." aria-label="Search clients" />
                        <CommandList>
                            <CommandEmpty>No client found.</CommandEmpty>
                            <CommandGroup>
                                {customers.map((customer) => (
                                    <CommandItem
                                        key={customer.id}
                                        value={customer.name}
                                        onSelect={() => {
                                            onSelect(customer.id === value ? null : customer);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === customer.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {customer.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            <CommandSeparator />
                            <CommandGroup>
                                <CommandItem
                                    onSelect={() => setShowAddDialog(true)}
                                    className="text-primary font-medium"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create new client
                                </CommandItem>
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Client</DialogTitle>
                        <DialogDescription>
                            Quickly add a new client to associate with this quote. You can add more details later in CRM.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-client-name">Client Name</Label>
                            <Input
                                id="new-client-name"
                                name="newClientName"
                                autoComplete="organization"
                                value={newClientName}
                                onChange={(e) => setNewClientName(e.target.value)}
                                placeholder="Business or Person Name"
                                onKeyDown={(e) => e.key === "Enter" && handleCreateClient()}
                                aria-label="New Client Name"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                        <Button onClick={handleCreateClient} disabled={!newClientName.trim()}>Create Client</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
