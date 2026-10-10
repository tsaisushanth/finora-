import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
});

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  VISION_PROVIDER: z.enum(["google", "openai", "anthropic"]).default("google"),
  VISION_MODEL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

let cachedPublic: z.infer<typeof publicEnvSchema> | null = null;

/** Validated environment variables that are safe to expose to the browser. */
export function getPublicEnv() {
  if (cachedPublic) return cachedPublic;
  const parsed = publicEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Missing or invalid public environment variables. Add them to a local .env file.\n${details}\nSee .env.example for the expected shape.`,
    );
  }
  cachedPublic = parsed.data;
  return cachedPublic;
}

/** Validated server-only environment variables. Never import from client code. */
export function getServerEnv() {
  const merged = z
    .record(z.string(), z.string().optional())
    .parse(process.env as Record<string, string | undefined>);
  return serverEnvSchema.parse(merged);
}