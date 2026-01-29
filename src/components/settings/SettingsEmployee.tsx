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

import { useState, useEffect, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, Users, Search } from "lucide-react";
import { Employee } from "@/types/quote";
import { getEmployees, saveEmployee, deleteEmployee } from "@/lib/core/sessionStorage";
import { toast } from "sonner";

const SettingsEmployee = memo(() => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        jobPosition: "",
        email: "",
        phone: "",
    });

    const loadEmployees = useCallback(() => {
        setEmployees(getEmployees());
    }, []);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    const resetForm = () => {
        setEditingEmployee(null);
        setFormData({ name: "", jobPosition: "", email: "", phone: "" });
    };

    const handleEdit = (employee: Employee) => {
        setFormData({
            name: employee.name,
            jobPosition: employee.jobPosition,
            email: employee.email || "",
            phone: employee.phone || "",
        });
        setEditingEmployee(employee);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSaveEmployee = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!formData.name.trim()) {
            toast.error("Name is required");
            return;
        }
        if (!formData.jobPosition.trim()) {
            toast.error("Job position is required");
            return;
        }

        try {
            saveEmployee({
                id: editingEmployee?.id,
                name: formData.name,
                jobPosition: formData.jobPosition,
                email: formData.email || undefined,
                phone: formData.phone || undefined,
            });

            toast.success(editingEmployee ? "Employee updated" : "Employee added");
            resetForm();
            loadEmployees();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save employee");
        }
    };

    const handleDeleteConfirm = () => {
        if (deleteId) {
            deleteEmployee(deleteId);
            toast.success("Employee deleted");
            loadEmployees();
            setDeleteId(null);
        }
    };

    const filteredEmployees = employees.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.jobPosition.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.phone?.includes(searchQuery)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-lg font-medium text-foreground">Employee List</h2>
                    <p className="text-sm text-muted-foreground">Manage your team members.</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="search-employees"
                            name="search"
                            autoComplete="off"
                            type="search"
                            placeholder="Search employees..."
                            className="pl-9 bg-background/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Inline Form */}
            <form onSubmit={handleSaveEmployee} className="space-y-4 p-4 border border-border rounded-lg bg-secondary/10">
                <h2 className="text-lg font-semibold text-foreground">
                    {editingEmployee ? "Edit Employee" : "Add New Employee"}
                </h2>

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
                        <Label htmlFor="jobPosition">Job Position <span className="text-destructive">*</span></Label>
                        <Input
                            id="jobPosition"
                            name="jobPosition"
                            autoComplete="organization-title"
                            value={formData.jobPosition}
                            onChange={(e) => setFormData({ ...formData, jobPosition: e.target.value })}
                            placeholder="3D Print Operator"
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
                        <Label htmlFor="phone">Contact Number</Label>
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
                </div>

                <div className="flex gap-2">
                    <Button type="submit" className="bg-gradient-primary text-primary-foreground">
                        <Plus className="w-4 h-4 mr-2" />
                        {editingEmployee ? 'Update Employee' : 'Add Employee'}
                    </Button>
                    {editingEmployee && (
                        <Button type="button" variant="outline" onClick={resetForm}>
                            Cancel
                        </Button>
                    )}
                </div>
            </form>

            <Card className="shadow-sm border-border bg-card overflow-hidden">
                {filteredEmployees.length === 0 ? (
                    <div className="p-8 text-center">
                        <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        <h2 className="text-lg font-medium text-foreground mb-2">
                            {searchQuery ? "No employees found" : "No employees yet"}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {searchQuery ? "Try a different search term" : "Add your first employee using the form above"}
                        </p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="font-semibold">Name</TableHead>
                                <TableHead className="font-semibold">Job Position</TableHead>
                                <TableHead className="font-semibold">Email</TableHead>
                                <TableHead className="font-semibold">Phone</TableHead>
                                <TableHead className="w-24 font-semibold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEmployees.map((employee) => (
                                <TableRow key={employee.id} className="hover:bg-muted/30">
                                    <TableCell className="font-medium">{employee.name}</TableCell>
                                    <TableCell>
                                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                                            {employee.jobPosition}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {employee.email || "-"}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {employee.phone || "-"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleEdit(employee)}
                                                aria-label="Edit employee"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => setDeleteId(employee.id)}
                                                aria-label="Delete employee"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Employee</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this employee? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
});

SettingsEmployee.displayName = "SettingsEmployee";

export default SettingsEmployee;
