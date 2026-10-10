import { z } from "zod";

export const occupationValues = [
  "student",
  "salaried",
  "self_employed",
  "other",
] as const;

export type Occupation = (typeof occupationValues)[number];

export const occupationLabels: Record<Occupation, string> = {
  student: "Student",
  salaried: "Salaried",
  self_employed: "Self-employed",
  other: "Other",
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .or(z.literal(""));

export const profileDetailsSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name is too long"),
  username: z
    .string()
    .trim()
    .max(30, "Username is too long")
    .regex(/^[a-zA-Z0-9_]*$/, "Use letters, numbers and underscore only")
    .optional()
    .or(z.literal("")),
  phone: optionalText(20),
  date_of_birth: optionalText(10),
  occupation: z.enum(occupationValues).optional(),
  city: optionalText(60),
});

export const preferencesSchema = z.object({
  monthly_income: z.coerce
    .number({ message: "Enter a number" })
    .min(0, "Cannot be negative")
    .max(100_000_000, "That seems too high"),
  monthly_budget: z.coerce
    .number({ message: "Enter a number" })
    .min(0, "Cannot be negative")
    .max(100_000_000, "That seems too high"),
  savings_target_percent: z.coerce
    .number({ message: "Enter a number" })
    .min(0, "Cannot be negative")
    .max(100, "Cannot exceed 100"),
  week_start_day: z.coerce.number().int().min(0).max(6),
  timezone: z.string().min(1, "Timezone is required"),
});

export const onboardingSchema = profileDetailsSchema
  .pick({ full_name: true, occupation: true, city: true })
  .extend({
    monthly_income: z.coerce
      .number({ message: "Enter your monthly income" })
      .min(0, "Cannot be negative")
      .max(100_000_000, "That seems too high"),
    monthly_budget: z.coerce
      .number({ message: "Enter a monthly budget" })
      .min(0, "Cannot be negative")
      .max(100_000_000, "That seems too high"),
    opening_balance: z.coerce
      .number({ message: "Enter a starting balance" })
      .min(0, "Cannot be negative")
      .max(100_000_000, "That seems too high"),
  });

export type ProfileDetailsValues = z.infer<typeof profileDetailsSchema>;
export type PreferencesValues = z.infer<typeof preferencesSchema>;
export type OnboardingValues = z.infer<typeof onboardingSchema>;