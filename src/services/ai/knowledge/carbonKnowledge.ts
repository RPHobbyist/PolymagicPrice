/*
 * PolymagicPrice - Carbon terminology
 *
 * Pulled into the prompt only when one of these terms is actually in play. Without them the model
 * answers "what is kgCO₂e?" from its own priors, and the boundary questions — what a cradle-to-gate
 * figure covers, where grid electricity sits — are exactly where it is confidently wrong.
 */

export const CARBON_GLOSSARY = {
    "kgCO2e / kgCO₂e / CO2e":
        "Kilograms of carbon dioxide equivalent: all greenhouse gases expressed as the amount of CO2 with the same warming effect.",
    "Grid intensity":
        "Grams of CO2e released per kilowatt-hour of electricity taken from the grid. It varies hugely by country, from about 40 in France to about 710 in India.",
    "Cradle-to-gate":
        "Everything up to the point the material leaves its producer — extraction, processing, transport and packaging — but not its use or disposal.",
    "Data grade":
        "How the app rates a footprint: Estimate uses planned time and library figures, Actual uses recorded runtime and material, Measured adds a metered wattage for the machine.",
    "Energy rate":
        "Kilowatt-hours per print-hour for a machine. Used to compare printers, because energy per kilogram mostly reflects the shape of the parts rather than the printer.",
    "Embodied carbon":
        "Emissions already contained in a material before it reaches the printer, as opposed to the electricity used while printing it.",
};
