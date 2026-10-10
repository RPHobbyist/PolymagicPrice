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
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CarbonDashboard } from "@/components/dashboard/CarbonDashboard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { FileDown } from "lucide-react";
import { useSavedQuotes } from "@/hooks/useSavedQuotes";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";
import * as sessionStore from "@/lib/core/sessionStorage";
import { generateShopReport } from "@/lib/reportGenerator";
import { buildCarbonOverview, computeIdleOverheadKg, selectPooledMachines } from "@/lib/carbon/carbonStats";
import { formatCarbon } from "@/lib/carbon/carbonCalculator";
import {
    DEFAULT_GRID_G_PER_KWH,
    GRID_CONSTANT_ID,
    GRID_CONSTANT_UNIT,
    GRID_PRESETS,
    matchMaterialPreset,
    resolveMaterialFactor,
} from "@/lib/carbon/carbonFactors";

/** The same muted palette the quote summary's breakdown chart uses. */
const SOURCE_COLOURS = ["#0ea5e9", "#10b981", "#f59e0b"];

const CarbonFootprint = () => {
    useDocumentSEO({
        title: "Carbon Footprint: 3D Printing Emissions Analysis",
        description: "Estimate the carbon footprint of your 3D printing: energy, material and waste per job, per part and per machine.",
        canonical: "/carbon-footprint",
    });

    const { quotes, stats } = useSavedQuotes();

    const machines = useMemo(() => sessionStore.getMachines(), []);
    const materials = useMemo(() => sessionStore.getMaterials(), []);
    const [constants, setConstants] = useState(() => sessionStore.getConstants());
    const [carbonSettings, setCarbonSettings] = useState(() => sessionStore.getCarbonSettings());

    const gridGPerKWh = constants.find(c => c.id === GRID_CONSTANT_ID)?.value ?? DEFAULT_GRID_G_PER_KWH;
    const gridPreset = GRID_PRESETS.find(p => p.gPerKWh === gridGPerKWh);

    /**
     * Only printers in the production pool idle in this shop: a machine switched off in Print
     * Manager is not sitting on standby, and charging it would inflate the overhead figure. Same
     * rule the capacity engine uses — an empty list means every machine counts.
     */
    const pooledMachines = useMemo(
        () => selectPooledMachines(machines, sessionStore.getProductionSettings().enabledMachineIds),
        [machines]
    );

    const handleRegionChange = (presetId: string) => {
        const preset = GRID_PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        sessionStore.saveConstant({
            id: GRID_CONSTANT_ID,
            name: "Grid Emission Factor",
            value: preset.gPerKWh,
            unit: GRID_CONSTANT_UNIT,
            is_visible: false,
        });
        setCarbonSettings(sessionStore.saveCarbonSettings({ regionId: preset.id, regionConfirmed: true }));
        setConstants(sessionStore.getConstants());
        toast.success(`Grid factor set to ${preset.gPerKWh} gCO₂e/kWh (${preset.label}).`);
    };

    const handleEolChange = (path: "landfill" | "incineration" | "recycling") => {
        setCarbonSettings(sessionStore.saveCarbonSettings({ defaultEolPath: path }));
        toast.success("Disposal assumption saved. It applies to materials without their own setting.");
    };

    /*
     * The carbon report is built by the same `reportGenerator` the assistant uses, so the printed
     * document and this screen can never disagree. It used to be reachable only by asking the local
     * assistant for it, which meant a shop on the hosted build — where `isAIAllowed` is false — had
     * no way to get the figure out of the app at all.
     */
    const handleExportReport = () => {
        const { opened, message } = generateShopReport("CARBON");
        if (opened) toast.success(message);
        else toast.error(message);
    };

    const [recalcOpen, setRecalcOpen] = useState(false);

    const handleRecalculate = (scope: "auto" | "all") => {
        setRecalcOpen(false);
        const { updated, untouched } = sessionStore.recalculateCarbonHistory(scope);
        toast.success(
            updated > 0
                ? `Recalculated ${updated} footprint${updated === 1 ? "" : "s"}${untouched > 0 ? `, left ${untouched} untouched` : ""}.`
                : "Nothing to recalculate."
        );
    };

    const overview = useMemo(() => buildCarbonOverview(quotes), [quotes]);
    const idleKg = useMemo(
        () => computeIdleOverheadKg(quotes, pooledMachines, gridGPerKWh),
        [quotes, pooledMachines, gridGPerKWh]
    );

    const sourceData = useMemo(() => ([
        { name: "Energy", value: Number(overview.sources.energyKg.toFixed(3)) },
        { name: "Material", value: Number(overview.sources.materialKg.toFixed(3)) },
        { name: "Waste", value: Number(overview.sources.wasteKg.toFixed(3)) },
    ].filter(entry => entry.value > 0)), [overview.sources]);

    /** Every factor currently in play, with where it came from — the audit trail in one place. */
    const factorsInPlay = useMemo(() => materials.map(material => {
        const resolved = resolveMaterialFactor(material, undefined, material.print_type);
        const preset = matchMaterialPreset(material.name, material.print_type);
        return {
            name: material.name,
            value: resolved.kgPerKg,
            source: resolved.sourceNote,
            year: resolved.source === "library" ? preset.year : undefined,
            own: resolved.source !== "library",
        };
    }), [materials]);

    // Published factors move by several percent a year, and the grid moves fastest of all — the UK
    // has roughly halved in five years — so the grid's own vintage is checked alongside materials'.
    const currentYear = new Date().getFullYear();
    const staleFactors = factorsInPlay.filter(f => f.year !== undefined && currentYear - f.year > 2);
    const gridIsStale = gridPreset !== undefined && currentYear - gridPreset.year > 2;

    return (
        <div className="min-h-full bg-slate-50 font-sans text-slate-900 animate-fade-in flex flex-col">
            <PageHeader
                title="Carbon Footprint"
                subtitle="Estimated Emissions & Energy Analysis"
                actions={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportReport}
                        className="h-8 px-3 bg-background hover:bg-muted text-xs sm:text-sm border-input font-medium whitespace-nowrap"
                    >
                        <FileDown className="w-4 h-4 mr-1.5" />
                        Export Report
                    </Button>
                }
            />

            <main className="container mx-auto px-6 py-8 max-w-[1600px] space-y-8">
                <section className="animate-fade-in stagger-1">
                    <div className="mb-4">
                        <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wider">Shop Footprint</h2>
                    </div>
                    <CarbonDashboard stats={stats} />
                </section>

                <section className="animate-fade-in stagger-2">
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="fleet">Fleet</TabsTrigger>
                            <TabsTrigger value="jobs">Jobs</TabsTrigger>
                        </TabsList>

                        {/* --- Overview ------------------------------------------------------ */}
                        <TabsContent value="overview" className="mt-4 space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card className="p-5">
                                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Where it comes from</h3>
                                    {sourceData.length > 0 ? (
                                        <div className="h-[220px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={sourceData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                                                        {sourceData.map((entry, index) => (
                                                            <Cell key={entry.name} fill={SOURCE_COLOURS[index % SOURCE_COLOURS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value: number) => formatCarbon(value)} />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-600">No completed job has a footprint yet.</p>
                                    )}
                                </Card>

                                <Card className="p-5">
                                    <h3 className="text-sm font-semibold text-slate-900 mb-4">By month completed</h3>
                                    {overview.months.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="font-semibold text-foreground">Month</TableHead>
                                                    <TableHead className="font-semibold text-foreground">Jobs</TableHead>
                                                    <TableHead className="text-right font-semibold text-foreground">Footprint</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {overview.months.map(month => (
                                                    <TableRow key={month.month}>
                                                        <TableCell className="font-medium">{month.label}</TableCell>
                                                        <TableCell>{month.jobs}</TableCell>
                                                        <TableCell className="text-right tabular-nums">{formatCarbon(month.kg)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <p className="text-sm text-slate-600">
                                            Jobs appear here in the month they were completed, not the month they were quoted.
                                        </p>
                                    )}
                                </Card>
                            </div>

                            <Card className="p-5">
                                <h3 className="text-sm font-semibold text-slate-900 mb-1">Shop overhead, last 30 days</h3>
                                <p className="text-2xl font-semibold tabular-nums">{formatCarbon(idleKg)}</p>
                                <p className="text-xs text-slate-600 mt-2">
                                    Printers left on but not printing. Counted separately from the job figures above, because
                                    idle time belongs to the shop rather than to any one print.
                                </p>
                            </Card>
                        </TabsContent>

                        {/* --- Fleet --------------------------------------------------------- */}
                        <TabsContent value="fleet" className="mt-4 space-y-4">
                            {overview.meterNext && (
                                <Card className="p-4">
                                    <p className="text-sm text-slate-700">
                                        <span className="font-semibold">Worth measuring next: {overview.meterNext}.</span>{" "}
                                        It carries the most energy of any machine still using a library wattage. One reading
                                        from a plug-in meter, entered in Settings → Machines, upgrades every future job on it.
                                    </p>
                                </Card>
                            )}

                            <Card className="p-0 overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="font-semibold text-foreground">Machine</TableHead>
                                            <TableHead className="font-semibold text-foreground">Jobs</TableHead>
                                            <TableHead className="text-right font-semibold text-foreground">Print hours</TableHead>
                                            <TableHead className="text-right font-semibold text-foreground">kWh</TableHead>
                                            <TableHead className="text-right font-semibold text-foreground">kWh / hour</TableHead>
                                            <TableHead className="text-right font-semibold text-foreground">Footprint</TableHead>
                                            <TableHead className="font-semibold text-foreground">Wattage</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {overview.fleet.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center text-slate-600 py-8">
                                                    No completed jobs yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {overview.fleet.map(row => (
                                            <TableRow key={row.machineName}>
                                                <TableCell className="font-medium">{row.machineName}</TableCell>
                                                <TableCell>{row.jobs}</TableCell>
                                                <TableCell className="text-right tabular-nums">{row.hours.toFixed(1)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{row.kWh.toFixed(2)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{row.energyRate.toFixed(3)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{formatCarbon(row.kg)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                                        {row.wattsSource === "measured" ? "Measured" : row.wattsSource === "nameplate" ? "Rated" : "Library"}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>

                            <p className="text-xs text-slate-600">
                                Machines are compared on kWh per print-hour. Emissions per kilogram mostly reflect the shape
                                of the parts that happened to run on each printer, not the printer itself.
                            </p>
                        </TabsContent>

                        {/* --- Jobs ---------------------------------------------------------- */}
                        <TabsContent value="jobs" className="mt-4">
                            <Card className="p-0 overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="font-semibold text-foreground">Project</TableHead>
                                            <TableHead className="font-semibold text-foreground">Machine</TableHead>
                                            <TableHead className="font-semibold text-foreground">Material</TableHead>
                                            <TableHead className="text-right font-semibold text-foreground">Per part</TableHead>
                                            <TableHead className="text-right font-semibold text-foreground">Total</TableHead>
                                            <TableHead className="font-semibold text-foreground">Grade</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {overview.jobs.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-slate-600 py-8">
                                                    Completed jobs will be listed here, heaviest first.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {overview.jobs.slice(0, 100).map(job => (
                                            <TableRow key={job.id}>
                                                <TableCell className="font-medium">
                                                    {job.projectName}
                                                    {/* Slicers other than OrcaSlicer and Bambu Studio do not report what
                                                        supports and purge weighed, so those rows cannot separate avoidable
                                                        material from the part itself. Saying so beats a silent difference. */}
                                                    {job.flagged && <span className="ml-1 text-slate-500" title="No slicer feature data: supports and purge could not be separated">*</span>}
                                                </TableCell>
                                                <TableCell className="text-slate-600">{job.machineName}</TableCell>
                                                <TableCell className="text-slate-600">{job.materialName || "N/A"}</TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {job.perPart !== undefined ? formatCarbon(job.perPart) : "N/A"}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">{formatCarbon(job.kg)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                                        {job.grade === "MEASURED" ? "Measured" : job.grade === "ACTUAL" ? "Actual" : "Estimate"}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>

                            {overview.jobs.some(job => job.flagged) && (
                                <p className="text-xs text-slate-600 mt-3">
                                    * Sliced outside OrcaSlicer or Bambu Studio, so supports and purge could not be
                                    separated from the part. The total still counts all the material used.
                                </p>
                            )}
                        </TabsContent>
                    </Tabs>
                </section>

                {/* --- Method -------------------------------------------------------------- */}
                <section className="animate-fade-in stagger-3">
                    <div className="mb-4">
                        <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wider">Method &amp; Assumptions</h2>
                    </div>

                    <Card className="p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="region">Electricity in your region</Label>
                                <Select value={gridPreset?.id ?? "custom"} onValueChange={handleRegionChange}>
                                    <SelectTrigger id="region">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GRID_PRESETS.map(preset => (
                                            <SelectItem key={preset.id} value={preset.id}>
                                                {preset.label} ({preset.gPerKWh} gCO₂e/kWh)
                                            </SelectItem>
                                        ))}
                                        {!gridPreset && <SelectItem value="custom">Custom ({gridGPerKWh} gCO₂e/kWh)</SelectItem>}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-600">
                                    {gridPreset
                                        ? `${gridPreset.source} (${gridPreset.year}).`
                                        : "Your own figure."} Any value can also be typed in
                                    Settings → Consumables, under “Grid Emission Factor”.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="defaultEol">Waste disposal, by default</Label>
                                <Select
                                    value={carbonSettings.defaultEolPath ?? "landfill"}
                                    onValueChange={(value: "landfill" | "incineration" | "recycling") => handleEolChange(value)}
                                >
                                    <SelectTrigger id="defaultEol">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="landfill">Landfill</SelectItem>
                                        <SelectItem value="incineration">Incineration</SelectItem>
                                        <SelectItem value="recycling">Recycling</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-600">
                                    Applies to materials with no disposal route of their own. Recycling is counted as
                                    zero, because claiming a credit needs a method this app cannot verify for you.
                                </p>
                            </div>
                        </div>

                        {!carbonSettings.regionConfirmed && (
                            <p className="text-xs text-slate-600 border-l-2 border-border pl-3">
                                These figures currently use the world average of {DEFAULT_GRID_G_PER_KWH} gCO₂e/kWh.
                                Picking your region above is the single biggest accuracy gain after measuring a machine.
                                National factors range from about 41 to 710.
                            </p>
                        )}

                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-2">Material factors in use</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="font-semibold text-foreground">Material</TableHead>
                                        <TableHead className="text-right font-semibold text-foreground">kgCO₂e / kg</TableHead>
                                        <TableHead className="font-semibold text-foreground">Source</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {factorsInPlay.map(factor => (
                                        <TableRow key={factor.name}>
                                            <TableCell className="font-medium">{factor.name}</TableCell>
                                            <TableCell className="text-right tabular-nums">{factor.value.toFixed(2)}</TableCell>
                                            <TableCell className="text-slate-600 text-xs">
                                                {factor.source}
                                                {factor.own && <span className="ml-2 text-slate-500">(yours)</span>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {(staleFactors.length > 0 || gridIsStale) && (
                                <p className="text-xs text-slate-600 mt-2">
                                    {staleFactors.length > 0 && (
                                        <>
                                            {staleFactors.length} material factor{staleFactors.length > 1 ? "s are" : " is"} more
                                            than two years old, worth checking against your supplier's current data.{" "}
                                        </>
                                    )}
                                    {gridIsStale && (
                                        <>
                                            The grid factor is from {gridPreset!.year}; grids change fastest of all, so a newer
                                            figure from your utility or Ember is worth a minute.
                                        </>
                                    )}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">Changed a factor?</h3>
                                <p className="text-xs text-slate-600">
                                    Past figures keep the factors they were calculated with, so a report you have already
                                    sent cannot change underneath you. Restating them is deliberate.
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setRecalcOpen(true)}>
                                Recalculate footprints…
                            </Button>
                            {/* Controlled, matching how the other managers use this dialog. */}
                            <AlertDialog open={recalcOpen} onOpenChange={setRecalcOpen}>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Recalculate stored footprints?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This rewrites the footprint on past quotes using today's factors. Figures you
                                            have already shown to a customer will change. Recorded print times and material
                                            usage are not affected.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleRecalculate("auto")}>
                                            Library figures only
                                        </AlertDialogAction>
                                        <AlertDialogAction onClick={() => handleRecalculate("all")}>
                                            Everything, including mine
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-1">What these figures do not cover</h3>
                            <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
                                <li>One material per quote, so a multi-material or AMS print attributes all of its mass to one factor.</li>
                                <li>Purge and support waste is only visible for files sliced in OrcaSlicer or Bambu Studio.</li>
                                <li>Wattage is a published average for the machine class unless you enter a measured figure.</li>
                                <li>Warm-up energy, consumables, packaging, freight and the printers themselves are out of scope.</li>
                                <li>Every figure is an estimate. The app makes no environmental claim on your behalf.</li>
                            </ul>
                        </div>
                    </Card>
                </section>
            </main>
        </div>
    );
};

export default CarbonFootprint;
