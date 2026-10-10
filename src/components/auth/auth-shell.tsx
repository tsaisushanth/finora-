import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Brand } from "@/components/brand";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function FormAlert({
  error,
  success,
}: {
  error?: string | null;
  success?: string | null;
}) {
  if (!error && !success) return null;
  return (
    <Alert variant={error ? "destructive" : "default"}>
      {error ? <AlertCircle /> : <CheckCircle2 />}
      <AlertDescription>{error ?? success}</AlertDescription>
    </Alert>
  );
}

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="flex justify-center">
        <Brand />
      </div>
      <div className="text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        {children}
      </div>
      {footer ? (
        <div className="text-center text-sm text-muted-foreground">{footer}</div>
      ) : null}
    </div>
  );
}