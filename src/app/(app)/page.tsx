import Link from "next/link";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mainNav, scanNav, type NavItem } from "@/lib/nav";

const dashboardTiles: NavItem[] = [
  mainNav[1],
  mainNav[2],
  mainNav[3],
  mainNav[4],
  mainNav[5],
  scanNav,
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Welcome to Finora"
        description="Your money at a glance — balance, spending and goals. This dashboard fills in as features connect in the coming phases."
      />

      <Card className="mb-6 border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            Getting started
          </CardTitle>
          <CardDescription>
            Sign-in and onboarding arrive next. Until then, explore the sections
            below — each one lights up with real data shortly.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dashboardTiles.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/40">
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">Coming in phase {phaseFor(item.href)}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}

function phaseFor(href: string): string {
  if (href === "/bills/scan") return "7";
  if (href === "/insights") return "6";
  if (href === "/goals" || href === "/loans") return "5";
  if (href === "/wallet" || href === "/transactions") return "4";
  return "3";
}