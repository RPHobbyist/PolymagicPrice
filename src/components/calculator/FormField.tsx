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

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface FormFieldProps {
  label: string;
  required?: boolean;
  highlight?: boolean;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}

export const FormFieldRow = memo(({ label, required, highlight, hint, htmlFor, children }: FormFieldProps) => (
  <div className={`grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-4 py-3 px-2 sm:px-4 items-start sm:items-center border-b border-border/50 hover:bg-muted/30 transition-colors ${highlight ? 'bg-accent/5' : ''}`}>
    <div className="font-medium text-sm sm:text-base flex items-center gap-1.5">
      <label htmlFor={htmlFor} className="cursor-pointer">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {hint && (
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <HelpCircle className="w-4 h-4 text-muted-foreground/70 hover:text-primary cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px] p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{hint}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
    <div>{children}</div>
  </div>
));

FormFieldRow.displayName = "FormFieldRow";

interface TextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  step?: string;
  min?: string | number;
  max?: string | number;
  maxLength?: number;
  className?: string;
  endAdornment?: React.ReactNode;
  id?: string;
  name?: string;
  autoComplete?: string;
}

export const TextField = memo(({ value, onChange, placeholder, type = "text", step, min, max, maxLength, className, endAdornment, id, name, autoComplete = "off" }: TextFieldProps) => (
  <div className="relative flex items-center w-full">
    <Input
      id={id}
      name={name}
      autoComplete={autoComplete}
      type={type}
      step={step}
      min={min}
      max={max}
      maxLength={maxLength}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-background border-input focus:ring-2 focus:ring-primary/20 w-full ${endAdornment ? 'pr-20' : ''} ${className || ''}`}
    />
    {endAdornment && (
      <div className="absolute right-1 top-1/2 -translate-y-1/2">
        {endAdornment}
      </div>
    )}
  </div>
));

TextField.displayName = "TextField";

interface SelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface SelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: SelectOption[];
  id?: string;
  name?: string;
}

export const SelectField = memo(({ value, onChange, placeholder, options, id, name }: SelectFieldProps) => (
  <Select name={name} value={value} onValueChange={onChange}>
    <SelectTrigger id={id} className="bg-background">
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent className="bg-popover border-border z-50">
      {options.map((option) => (
        <SelectItem key={option.id} value={option.id}>
          {option.label}
          {option.sublabel && <span className="text-muted-foreground ml-1">({option.sublabel})</span>}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
));

SelectField.displayName = "SelectField";
