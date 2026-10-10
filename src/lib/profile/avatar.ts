import { createClient } from "@/lib/supabase/server";

/**
 * Turns a stored avatar reference into a displayable URL. Storage is private,
 * so a short-lived signed URL is generated for stored object paths.
 */
export async function getAvatarUrl(
  reference: string | null | undefined,
): Promise<string | null> {
  if (!reference) return null;
  if (/^https?:\/\//i.test(reference)) return reference;

  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("avatars")
    .createSignedUrl(reference, 60 * 60);
  return data?.signedUrl ?? null;
}