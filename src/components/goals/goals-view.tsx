"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, Pencil, Pause, PiggyBank, Play, Target, Trash2, Wallet2 } from "lucide-react";
import { formatDateInTimeZone } from "@/lib/dates";
import { formatPaise } from "@/lib/money";
import { deleteGoalAction, setGoalStatusAction } from "@/lib/goals/actions";
import { GoalLinks } from "@/components/goals/goal-links";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { GoalMoneyDialog } from "@/components/goals/goal-money-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Money } from "@/components/shared/money";
import type { GoalItem } from "@/lib/goals/queries";

const statusLabel: Record<GoalItem["status"], string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

export function GoalsView({
  goals,
  categories,
  timezone,
}: {
  goals: GoalItem[];
  categories: { id: string; name: string; color: string | null }[];
  timezone: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [prevUrl, setPrevUrl] = useState<string | null>(null);
  const [goalForm, setGoalForm] = useState<{ open: boolean; editing?: GoalItem | null }>({
    open: false,
  });
  const [moneyDialog, setMoneyDialog] = useState<{
    kind: "contribution" | "withdrawal";
    goalId?: string | null;
  } | null>(null);

  const url = `${pathname}?${searchParams?.toString() ?? ""}`;

  if (url !== prevUrl) {
    setPrevUrl(url);
    const action = searchParams?.get("new");
    if (action === "goal") setGoalForm({ open: true, editing: null });
    if (action === "contribution") {
      const hasRoom = goals.some((goal) => goal.status !== "completed" && goal.remainingPaise > 0);
      if (hasRoom) {
        setMoneyDialog({ kind: "contribution", goalId: searchParams?.get("goalId") ?? null });
      } else {
        setGoalForm({ open: true, editing: null });
      }
    }
  }

  const savedPaise = goals.reduce((sum, goal) => sum + goal.savedPaise, 0);
  const targetPaise = goals.reduce((sum, goal) => sum + goal.targetPaise, 0);
  const monthlyPaise = goals.reduce(
    (sum, goal) => sum + (goal.requiredMonthlyPaise ?? 0),
    0,
  );

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          icon={PiggyBank}
          label="Saved"
          value={<Money paise={savedPaise} className="text-base font-medium" />}
        />
        <StatCard
          icon={Target}
          label="Target"
          value={<Money paise={targetPaise} className="text-base font-medium" />}
        />
        <StatCard
          icon={Wallet2}
          label="Need / month"
          value={<Money paise={monthlyPaise} tone={monthlyPaise > 0 ? "default" : "muted"} className="text-base font-medium" />}
        />
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Create a savings target — add money to it whenever you can, and watch the progress bar fill up."
          action={<GoalLinks />}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => {
            const canContribute = goal.status !== "completed" && goal.remainingPaise > 0;
            const canWithdraw = goal.savedPaise > 0;
            return (
              <li key={goal.id}>
                <Card>
                  <CardHeader className="flex-row items-start justify-between gap-2">
                    <div className="grid gap-1">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        {goal.categoryColor ? (
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: goal.categoryColor }}
                            aria-hidden="true"
                          />
                        ) : null}
                        <span className="truncate">{goal.name}</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant={goal.status === "active" ? "default" : "secondary"}>
                          {statusLabel[goal.status]}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {goal.priority} priority
                        </Badge>
                      </div>
                    </div>
                    <RowMenu
                      goal={goal}
                      canContribute={canContribute}
                      canWithdraw={canWithdraw}
                      onOpenGoals={() => setGoalForm({ open: true, editing: goal })}
                      onContribute={() => setMoneyDialog({ kind: "contribution", goalId: goal.id })}
                      onWithdraw={() => setMoneyDialog({ kind: "withdrawal", goalId: goal.id })}
                    />
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {goal.description ? (
                      <p className="text-xs text-muted-foreground">{goal.description}</p>
                    ) : null}
                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          <Money paise={goal.savedPaise} /> of <Money paise={goal.targetPaise} />
                        </span>
                        <span className="tabular-nums text-muted-foreground">{goal.progress}%</span>
                      </div>
                      <Progress value={goal.progress} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        {goal.remainingPaise > 0 ? (
                          <>
                            <Money paise={goal.remainingPaise} tone="muted" /> left
                          </>
                        ) : (
                          "Goal reached"
                        )}
                      </span>
                      {goal.targetDate ? (
                        <span>by {formatDateInTimeZone(goal.targetDate, timezone)}</span>
                      ) : null}
                    </div>
                    {goal.requiredMonthlyPaise !== null ? (
                      <p className="text-xs text-muted-foreground">
                        Save <Money paise={goal.requiredMonthlyPaise} tone="muted" /> a month to hit this target
                        {goal.targetDate ? ` by ${formatDateInTimeZone(goal.targetDate, timezone)}` : ""}.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <GoalFormDialog
        key={goalForm.open ? goalForm.editing?.id ?? "new" : "closed"}
        open={goalForm.open}
        onOpenChange={(next) => {
          if (!next) setGoalForm({ open: false });
        }}
        categories={categories}
        editing={goalForm.editing ?? null}
        onSaved={() => {
          setGoalForm({ open: false });
          router.refresh();
        }}
      />

      <GoalMoneyDialog
        key={moneyDialog ? `${moneyDialog.kind}-${moneyDialog.goalId ?? "any"}` : "closed"}
        kind={moneyDialog?.kind ?? "contribution"}
        open={moneyDialog !== null}
        onOpenChange={(next) => {
          if (!next) setMoneyDialog(null);
        }}
        goals={goals}
        preselectGoalId={moneyDialog?.goalId ?? null}
        timezone={timezone}
        onSaved={() => {
          setMoneyDialog(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent className="grid gap-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p>{value}</p>
      </CardContent>
    </Card>
  );
}

function RowMenu({
  goal,
  canContribute,
  canWithdraw,
  onOpenGoals,
  onContribute,
  onWithdraw,
}: {
  goal: GoalItem;
  canContribute: boolean;
  canWithdraw: boolean;
  onOpenGoals: () => void;
  onContribute: () => void;
  onWithdraw: () => void;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handlePauseResume() {
    const formData = new FormData();
    formData.set("id", goal.id);
    formData.set("status", goal.status === "active" ? "paused" : "active");
    const result = await setGoalStatusAction(formData);
    if (result?.error) toast.error(result.error);
    else {
      toast.success(result.success ?? "Goal updated.");
      router.refresh();
    }
  }

  async function handleDelete() {
    const formData = new FormData();
    formData.set("id", goal.id);
    setConfirmOpen(false);
    const result = await deleteGoalAction(formData);
    if (result?.error) toast.error(result.error);
    else {
      toast.success(result.success ?? "Goal deleted.");
      router.refresh();
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${goal.name}`} />}
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canContribute ? (
            <DropdownMenuItem onClick={onContribute}>
              <PiggyBank className="size-4" aria-hidden="true" />
              Add money
            </DropdownMenuItem>
          ) : null}
          {canWithdraw ? (
            <DropdownMenuItem onClick={onWithdraw}>
              <Wallet2 className="size-4" aria-hidden="true" />
              Withdraw
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={onOpenGoals}>
            <Pencil className="size-4" aria-hidden="true" />
            Edit
          </DropdownMenuItem>
          {goal.status === "active" || goal.status === "paused" ? (
            <DropdownMenuItem onClick={handlePauseResume}>
              {goal.status === "active" ? (
                <>
                  <Pause className="size-4" aria-hidden="true" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="size-4" aria-hidden="true" />
                  Resume
                </>
              )}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
            <AlertDialogDescription>
              The goal and its history are removed, and any saved amount (
              {formatPaise(goal.savedPaise)}) returns to your wallet balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export { statusLabel as goalStatusLabel };