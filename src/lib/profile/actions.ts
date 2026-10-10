"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import {
  onboardingSchema,
  preferencesSchema,
  profileDetailsSchema,
} from "@/lib/validations/profile";

export type FormResult = { error?: string; success?: string };

function firstError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Please check the form and try again";
}

function optional(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export async function updateProfileDetailsAction(
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const parsed = profileDetailsSchema.safeParse({
    full_name: formData.get("full_name"),
    username: formData.get("username"),
    phone: formData.get("phone"),
    date_of_birth: formData.get("date_of_birth"),
    occupation: optional(formData.get("occupation")) ?? undefined,
    city: formData.get("city"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      username: parsed.data.username ? parsed.data.username : null,
      phone: parsed.data.phone ? parsed.data.phone : null,
      date_of_birth: parsed.data.date_of_birth ? parsed.data.date_of_birth : null,
      occupation: parsed.data.occupation ?? null,
      city: parsed.data.city ? parsed.data.city : null,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That username is already taken." };
    }
    return { error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/");
  return { success: "Profile updated." };
}

export async function updatePreferencesAction(
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const parsed = preferencesSchema.safeParse({
    monthly_income: formData.get("monthly_income"),
    monthly_budget: formData.get("monthly_budget"),
    savings_target_percent: formData.get("savings_target_percent"),
    week_start_day: formData.get("week_start_day"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      monthly_income: parsed.data.monthly_income,
      monthly_budget: parsed.data.monthly_budget,
      savings_target_percent: parsed.data.savings_target_percent,
      week_start_day: parsed.data.week_start_day,
      timezone: parsed.data.timezone,
      notify_email: formData.get("notify_email") === "on",
      notify_budget_alerts: formData.get("notify_budget_alerts") === "on",
      notify_bill_reminders: formData.get("notify_bill_reminders") === "on",
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: "Preferences saved." };
}

export async function completeOnboardingAction(
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const parsed = onboardingSchema.safeParse({
    full_name: formData.get("full_name"),
    occupation: formData.get("occupation"),
    city: formData.get("city"),
    monthly_income: formData.get("monthly_income"),
    monthly_budget: formData.get("monthly_budget"),
    opening_balance: formData.get("opening_balance"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      occupation: parsed.data.occupation ?? null,
      city: parsed.data.city ? parsed.data.city : null,
      monthly_income: parsed.data.monthly_income,
      monthly_budget: parsed.data.monthly_budget,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  if (parsed.data.opening_balance > 0) {
    const { error: rpcError } = await supabase.rpc("set_opening_balance", {
      p_amount: parsed.data.opening_balance,
    });
    if (rpcError && !/already set/i.test(rpcError.message)) {
      return { error: rpcError.message };
    }
  }

  redirect("/");
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function uploadAvatarAction(
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Image must be 2MB or smaller." };
  }
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return { error: "Use a PNG, JPEG or WebP image." };
  }

  const supabase = await createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: path })
    .eq("id", user.id);
  if (updateError) return { error: updateError.message };

  revalidatePath("/profile");
  return { success: "Photo updated." };
}