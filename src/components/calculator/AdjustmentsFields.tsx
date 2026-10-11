import { memo } from "react";
import { FormFieldRow, TextField, SelectField } from "./FormField";

/** The form fields these rows read and write; shared by the FDM and resin calculators. */
interface AdjustmentsState {
  pricingMode?: "markup" | "margin";
  markupPercentage: string;
  discountType?: "percent" | "amount";
  discountValue?: string;
  shippingCost?: string;
}

interface AdjustmentsFieldsProps {
  idPrefix: string;
  formData: AdjustmentsState;
  onChange: <K extends keyof AdjustmentsState>(field: K, value: AdjustmentsState[K]) => void;
  currencySymbol: string;
}

const PRICING_MODES = [
  { id: "markup", label: "Markup on cost", sublabel: "cost x (1 + m)" },
  { id: "margin", label: "Margin on price", sublabel: "cost / (1 - m)" },
];

const DISCOUNT_TYPES = [
  { id: "percent", label: "Percent (%)" },
  { id: "amount", label: "Fixed amount" },
];

/**
 * Pricing mode, markup/margin %, discount and shipping, in the order they are applied:
 * markup or margin -> minimum charge (Settings) -> discount -> shipping.
 */
export const AdjustmentsFields = memo(({ idPrefix, formData, onChange, currencySymbol }: AdjustmentsFieldsProps) => {
  const isMargin = formData.pricingMode === "margin";
  const discountType = formData.discountType ?? "percent";

  return (
    <>
      <FormFieldRow
        label="Pricing mode"
        htmlFor={`${idPrefix}-pricing-mode`}
        hint="Markup adds a percentage of cost. Margin sets the share of the selling price that is profit: 40% margin on a 60 cost sells at 100."
      >
        <SelectField
          id={`${idPrefix}-pricing-mode`}
          name="pricingMode"
          value={formData.pricingMode ?? "markup"}
          onChange={(v) => onChange("pricingMode", v as "markup" | "margin")}
          placeholder="Pricing mode"
          options={PRICING_MODES}
        />
      </FormFieldRow>

      <FormFieldRow label={isMargin ? "Profit Margin (%)" : "Profit Markup (%)"} htmlFor={`${idPrefix}-markup-percentage`}>
        <TextField
          id={`${idPrefix}-markup-percentage`}
          name="markupPercentage"
          type="number"
          step="0.1"
          value={formData.markupPercentage}
          onChange={(v) => onChange("markupPercentage", v)}
          placeholder="20"
          min={0}
          max={isMargin ? 89.9 : 10000}
        />
      </FormFieldRow>

      <FormFieldRow label="Discount" htmlFor={`${idPrefix}-discount-value`} hint="Taken off the marked-up price, after any minimum charge.">
        <div className="grid grid-cols-[1fr_1.4fr] gap-2 w-full">
          <SelectField
            id={`${idPrefix}-discount-type`}
            name="discountType"
            value={discountType}
            onChange={(v) => onChange("discountType", v as "percent" | "amount")}
            placeholder="Discount type"
            options={DISCOUNT_TYPES}
          />
          <TextField
            id={`${idPrefix}-discount-value`}
            name="discountValue"
            type="number"
            step="0.01"
            value={formData.discountValue ?? ""}
            onChange={(v) => onChange("discountValue", v)}
            placeholder="0"
            min={0}
            max={discountType === "percent" ? 100 : undefined}
            endAdornment={discountType === "percent" ? <span className="text-sm text-muted-foreground pr-3">%</span> : <span className="text-sm text-muted-foreground pr-3">{currencySymbol}</span>}
          />
        </div>
      </FormFieldRow>

      <FormFieldRow label="Shipping" htmlFor={`${idPrefix}-shipping`} hint="Billed to the customer once per order. Not counted as shop revenue or profit.">
        <TextField
          id={`${idPrefix}-shipping`}
          name="shippingCost"
          type="number"
          step="0.01"
          value={formData.shippingCost ?? ""}
          onChange={(v) => onChange("shippingCost", v)}
          placeholder="0"
          min={0}
          endAdornment={<span className="text-sm text-muted-foreground pr-3">{currencySymbol}</span>}
        />
      </FormFieldRow>
    </>
  );
});

AdjustmentsFields.displayName = "AdjustmentsFields";
