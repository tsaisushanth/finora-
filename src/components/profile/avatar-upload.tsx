"use client";

import { useRef, useState, useTransition } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { uploadAvatarAction } from "@/lib/profile/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AvatarUpload({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const formData = new FormData();
    formData.set("avatar", file);
    setError(null);
    startTransition(async () => {
      const result = await uploadAvatarAction(formData);
      if (result?.error) setError(result.error);
      else if (result?.success) toast.success(result.success);
    });
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="grid gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="justify-self-start"
        >
          <Camera aria-hidden="true" />
          Change photo
        </Button>
        <p className="text-xs text-muted-foreground">
          PNG, JPEG or WebP, up to 2MB.
        </p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}