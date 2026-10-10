"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/validations/auth";

export type AuthResult = { error?: string; success?: string };

function firstError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Something went wrong";
}

async function resolveOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function signInAction(formData: FormData): Promise<AuthResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  redirect(safeNext(formData.get("next")));
}

export async function signUpAction(formData: FormData): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const origin = await resolveOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
    },
  });
  if (error) return { error: error.message };

  // When email confirmation is disabled Supabase returns a session immediately.
  if (data.session) redirect("/onboarding");

  return {
    success:
      "Check your inbox — we sent a link to confirm your email and finish setting up.",
  };
}

export async function requestPasswordResetAction(
  formData: FormData,
): Promise<AuthResult> {
  const parsed = resetPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const origin = await resolveOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${origin}/auth/callback?next=/update-password` },
  );
  if (error) return { error: error.message };

  return {
    success:
      "If an account exists for that email, a reset link is on its way.",
  };
}

export async function updatePasswordAction(
  formData: FormData,
): Promise<AuthResult> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  redirect("/");
}

export async function signInWithGoogleAction(): Promise<AuthResult> {
  const origin = await resolveOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=/` },
  });
  if (error) return { error: error.message };
  if (data.url) redirect(data.url);
  return { error: "Could not start Google sign-in." };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}