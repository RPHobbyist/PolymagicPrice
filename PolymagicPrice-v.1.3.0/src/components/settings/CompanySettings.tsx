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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Save, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getCompanySettings, saveCompanySettings } from "@/lib/core/sessionStorage";
import { CompanySettings as CompanySettingsType } from "@/types/quote";
import { MAX_LOGO_SIZE_BYTES, MAX_LOGO_SIZE_MB } from "@/lib/utils";

const CompanySettings = () => {
    const [formData, setFormData] = useState<CompanySettingsType>({
        name: "",
        address: "",
        email: "",
        phone: "",
        website: "",
        taxId: "",
        logoUrl: "",
        footerText: ""
    });

    useEffect(() => {
        const settings = getCompanySettings();
        if (settings) {
            setFormData(settings);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > MAX_LOGO_SIZE_BYTES) {
                toast.error(`Logo file is too large (max ${MAX_LOGO_SIZE_MB}MB)`);
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const removeLogo = () => {
        setFormData(prev => ({ ...prev, logoUrl: "" }));
    };

    const handleSave = () => {
        if (!formData.name.trim()) {
            toast.error("Company name is required");
            return;
        }

        if (formData.name.length > 100) {
            toast.error("Company name is too long (max 100 chars)");
            return;
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            toast.error("Please enter a valid email address");
            return;
        }

        if (formData.email && formData.email.length > 255) {
            toast.error("Email address is too long (max 255 chars)");
            return;
        }

        if (formData.phone && formData.phone.length > 20) {
            toast.error("Phone number is too long (max 20 chars)");
            return;
        }

        if (formData.website && formData.website.length > 100) {
            toast.error("Website URL is too long (max 100 chars)");
            return;
        }

        if (formData.taxId && formData.taxId.length > 50) {
            toast.error("Tax ID is too long (max 50 chars)");
            return;
        }

        if (formData.address && formData.address.length > 500) {
            toast.error("Address is too long (max 500 chars)");
            return;
        }

        if (formData.footerText && formData.footerText.length > 200) {
            toast.error("Footer text is too long (max 200 chars)");
            return;
        }

        saveCompanySettings(formData);
        toast.success("Company settings saved successfully");
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <Card>
                <CardHeader>
                    <div>
                        <h2 className="text-2xl font-semibold leading-none tracking-tight">Company Information</h2>
                        <CardDescription>
                            These details will appear on your generated quote PDFs and invoices.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Company Name</Label>
                            <Input
                                id="name"
                                name="name"
                                autoComplete="organization"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="My 3D Printing Service"
                                maxLength={100}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                name="email"
                                autoComplete="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="contact@example.com"
                                maxLength={255}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                name="phone"
                                autoComplete="tel"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+1 (555) 123-4567"
                                maxLength={20}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <Input
                                id="website"
                                name="website"
                                autoComplete="url"
                                value={formData.website}
                                onChange={handleChange}
                                placeholder="www.example.com"
                                maxLength={100}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="taxId">Tax ID / VAT Number</Label>
                            <Input
                                id="taxId"
                                name="taxId"
                                autoComplete="off"
                                value={formData.taxId}
                                onChange={handleChange}
                                placeholder="Optional"
                                maxLength={50}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Business Address</Label>
                        <Textarea
                            id="address"
                            name="address"
                            autoComplete="street-address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="123 Print St, Maker City, MC 12345"
                            rows={3}
                            maxLength={500}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="logo-upload">Company Logo</Label>
                        <div className="flex items-start gap-4">
                            {formData.logoUrl ? (
                                <div className="relative group">
                                    <img
                                        src={formData.logoUrl}
                                        alt="Company Logo"
                                        className="w-32 h-32 object-contain border rounded-lg bg-white p-2"
                                    />
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={removeLogo}
                                        aria-label="Remove logo"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="w-32 h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-muted/50">
                                    <Upload className="w-8 h-8 mb-2 opacity-50" />
                                    <span className="text-xs">No logo</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Input
                                    id="logo-upload"
                                    name="logo"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="max-w-[250px]"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Recommended: Square PNG or JPG, max {MAX_LOGO_SIZE_MB}MB.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="footerText">PDF Footer Text</Label>
                        <Input
                            id="footerText"
                            name="footerText"
                            autoComplete="off"
                            value={formData.footerText}
                            onChange={handleChange}
                            placeholder="Thank you for your business!"
                            maxLength={200}
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} className="w-full sm:w-auto gap-2">
                            <Save className="w-4 h-4" />
                            Save Settings
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CompanySettings;
