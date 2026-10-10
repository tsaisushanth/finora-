"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/forms/field";

export type SelectOption = { value: string; label: string };

export function SelectField({
  label,
  id,
  error,
  hint,
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  className,
}: {
  label?: string;
  id?: string;
  error?: string;
  hint?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} className={className}>
      <Select
        value={value}
        onValueChange={(next) => onValueChange(next as string)}
        items={options}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}