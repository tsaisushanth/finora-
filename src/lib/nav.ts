import {
  ArrowLeftRight,
  ChartPie,
  HandCoins,
  PiggyBank,
  ReceiptText,
  ScanLine,
  Settings,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

export const appName = "Finora";

export const mainNav: NavItem[] = [
  { title: "Home", href: "/", icon: ChartPie },
  { title: "Wallet", href: "/wallet", icon: Wallet },
  { title: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { title: "Goals", href: "/goals", icon: Target },
  { title: "Loans", href: "/loans", icon: HandCoins },
  { title: "Insights", href: "/insights", icon: ChartPie },
];

export const scanNav: NavItem = {
  title: "Scan a bill",
  href: "/bills/scan",
  icon: ScanLine,
};

export const settingsNav: NavItem = {
  title: "Settings",
  href: "/settings",
  icon: Settings,
};

export const quickAddItems: NavItem[] = [
  {
    title: "Add expense",
    href: "/transactions?new=expense",
    icon: ReceiptText,
    description: "Log every-day spending",
  },
  {
    title: "Add income",
    href: "/transactions?new=income",
    icon: TrendingUp,
    description: "Salary, pocket money, refunds",
  },
  {
    title: "Wallet top-up",
    href: "/wallet?new=topup",
    icon: Wallet,
    description: "Add or remove cash / UPI money",
  },
  {
    title: "Goal contribution",
    href: "/goals?new=contribution",
    icon: PiggyBank,
    description: "Put money toward a goal",
  },
  {
    title: "Lend or borrow",
    href: "/loans?new=loan",
    icon: HandCoins,
    description: "Money owed to or from friends",
  },
  {
    title: "Scan a bill",
    href: "/bills/scan",
    icon: ScanLine,
    description: "Auto-capture expense from a photo",
  },
];