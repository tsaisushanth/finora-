// RLS verification for Finora.
//
// Creates two throwaway auth users, then proves that each can only see and
// mutate their own rows (using the anon key, i.e. real RLS — never the service
// role). Cleans up after itself.
//
// Usage:
//   node scripts/rls-check.mjs
//
// Requires these env vars (read from .env.local or the environment):
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvFile(resolve(__dirname, "..", ".env.local"));
loadEnvFile(resolve(__dirname, "..", ".env"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error(
    "Missing env. Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(2);
}

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${name}`);
  }
}

async function main() {
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const stamp = Date.now();
  const password = `Pw-${Math.random().toString(36).slice(2)}-Aa1!`;
  const a = await createTestUser(admin, `rls-a-${stamp}@example.com`, password);
  const b = await createTestUser(admin, `rls-b-${stamp}@example.com`, password);
  console.log(`Created test users ${a.id} and ${b.id}`);

  try {
    const clientA = await signIn(url, anonKey, a.email, password);
    const clientB = await signIn(url, anonKey, b.email, password);

    console.log("\nprofiles auto-created by trigger");
    const { data: profileA } = await clientA
      .from("profiles")
      .select("id")
      .eq("id", a.id)
      .maybeSingle();
    check("signup trigger created own profile", profileA?.id === a.id);

    const { data: profileBForA } = await clientA
      .from("profiles")
      .select("id")
      .eq("id", b.id)
      .maybeSingle();
    check("cannot read another user's profile", profileBForA === null);

    console.log("\ncategories isolation (direct table access)");
    const { data: catA, error: catErr } = await clientA
      .from("categories")
      .insert({ user_id: a.id, kind: "expense", name: `RLS cat ${stamp}` })
      .select("id")
      .single();
    check("A can insert own category", !catErr && !!catA?.id);

    const { data: seenByB } = await clientB
      .from("categories")
      .select("id")
      .eq("id", catA.id);
    check("B cannot select A's category", (seenByB ?? []).length === 0);

    const { data: updatedByB } = await clientB
      .from("categories")
      .update({ name: "hacked" })
      .eq("id", catA.id)
      .select("id");
    check("B cannot update A's category", (updatedByB ?? []).length === 0);

    const { data: deletedByB } = await clientB
      .from("categories")
      .delete()
      .eq("id", catA.id)
      .select("id");
    check("B cannot delete A's category", (deletedByB ?? []).length === 0);

    console.log("\nwallet ledger via RPC");
    const { error: expErr } = await clientA.rpc("create_expense", {
      p_amount: 250.5,
      p_merchant: "RLS test",
    });
    check("A can create an expense via RPC", !expErr);

    const { data: balA } = await clientA
      .from("wallet_balances")
      .select("balance")
      .eq("user_id", a.id)
      .maybeSingle();
    check("A sees own derived balance (-250.50)", Number(balA?.balance) === -250.5);

    const { data: balB } = await clientB
      .from("wallet_balances")
      .select("balance")
      .eq("user_id", a.id)
      .maybeSingle();
    check("B cannot see A's balance", balB === null);

    const { data: expB } = await clientB.from("expenses").select("id");
    check("B sees no expenses", (expB ?? []).length === 0);

    console.log("\nguard rails");
    const { error: overContribErr } = await clientA.rpc("contribute_to_goal", {
      p_goal_id: "00000000-0000-0000-0000-000000000000",
      p_amount: 1,
    });
    check("contributing to a non-existent goal errors", !!overContribErr);

    const { error: adjErr } = await clientA.rpc("adjust_balance", {
      p_amount_delta: 100,
      p_reason: "",
    });
    check("adjustment without a reason is rejected", !!adjErr);
  } finally {
    await admin.auth.admin.deleteUser(a.id).catch(() => {});
    await admin.auth.admin.deleteUser(b.id).catch(() => {});
    console.log("\nCleaned up test users.");
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

async function createTestUser(admin, email, password) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user;
}

async function signIn(url, anonKey, email, password) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

// Simple .env parser (no dependency). Does not override already-set vars.
function loadEnvFile(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});