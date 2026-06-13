import {
  LayoutDashboard, BarChart3, Receipt, Repeat, Users2, Brain, FlaskConical, Activity,
  Radio, ShieldAlert, FileCheck2, Settings, UserCog, ScrollText, MessageSquare, Megaphone,
  KeyRound, LineChart, Bot, Layers, BookOpen, ShieldCheck, BellRing, BarChart4, Globe2,
} from "lucide-react";
import type { NavSection } from "@/components/AppSidebar";

export const adminNav: NavSection[] = [
  { label: "Overview", items: [
    { to: "/admin", label: "Command Center", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  ]},
  { label: "Business", items: [
    { to: "/admin/billing/analytics", label: "Revenue Analytics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { to: "/admin/billing/transactions", label: "Transactions", icon: <Receipt className="h-3.5 w-3.5" /> },
    { to: "/admin/billing/subscriptions", label: "Subscriptions", icon: <Repeat className="h-3.5 w-3.5" /> },
    { to: "/admin/billing/affiliates", label: "Affiliates / IB", icon: <Users2 className="h-3.5 w-3.5" /> },
  ]},
  { label: "AI Core", items: [
    { to: "/admin/ai/council", label: "12-Bot Council", icon: <Brain className="h-3.5 w-3.5" /> },
    { to: "/admin/ai/playground", label: "Model Playground", icon: <FlaskConical className="h-3.5 w-3.5" /> },
    { to: "/admin/ai/signals", label: "Signal Audit Log", icon: <Activity className="h-3.5 w-3.5" /> },
    { to: "/admin/ai/feeds", label: "Data Feed Health", icon: <Radio className="h-3.5 w-3.5" /> },
    { to: "/admin/automation/bots", label: "Connected Bots", icon: <Bot className="h-3.5 w-3.5" /> },
  ]},
  { label: "Users", items: [
    { to: "/admin/users/all", label: "User Directory", icon: <Users2 className="h-3.5 w-3.5" /> },
    { to: "/admin/users/risk", label: "Risk & Behavior", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
    { to: "/admin/users/compliance", label: "KYC Queue", icon: <FileCheck2 className="h-3.5 w-3.5" /> },
  ]},
  { label: "Governance", items: [
    { to: "/admin/secrets", label: "API Secret Vault", icon: <KeyRound className="h-3.5 w-3.5" /> },
    { to: "/admin/settings", label: "System Settings", icon: <Settings className="h-3.5 w-3.5" /> },
    { to: "/admin/settings/team", label: "Staff (RBAC)", icon: <UserCog className="h-3.5 w-3.5" /> },
    { to: "/admin/settings/audit", label: "Audit Trail", icon: <ScrollText className="h-3.5 w-3.5" /> },
  ]},
  { label: "Support", items: [
    { to: "/admin/messages", label: "Inbox", icon: <MessageSquare className="h-3.5 w-3.5" /> },
    { to: "/admin/support/tickets", label: "Ticket Desk", icon: <MessageSquare className="h-3.5 w-3.5" /> },
    { to: "/admin/support/broadcast", label: "Broadcast", icon: <Megaphone className="h-3.5 w-3.5" /> },
  ]},
];

export const userNav: NavSection[] = [
  { label: "Trading", items: [
    { to: "/dashboard", label: "Live Terminal", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
    { to: "/dashboard/assistant", label: "AI Assistant", icon: <Brain className="h-3.5 w-3.5" /> },
    { to: "/dashboard/signals", label: "Signal Archive", icon: <Activity className="h-3.5 w-3.5" /> },
    { to: "/dashboard/macro", label: "Macro Insights", icon: <Globe2 className="h-3.5 w-3.5" /> },
  ]},
  { label: "Automation", items: [
    { to: "/dashboard/bot", label: "Telegram Bot", icon: <Bot className="h-3.5 w-3.5" /> },
    { to: "/dashboard/automation", label: "Webhooks & Sync", icon: <Radio className="h-3.5 w-3.5" /> },
    { to: "/dashboard/sandbox", label: "Strategy Sandbox", icon: <FlaskConical className="h-3.5 w-3.5" /> },
  ]},
  { label: "Performance", items: [
    { to: "/dashboard/metrics", label: "Risk Metrics", icon: <LineChart className="h-3.5 w-3.5" /> },
  ]},
  { label: "Account", items: [
    { to: "/billing", label: "Billing", icon: <Receipt className="h-3.5 w-3.5" /> },
    { to: "/dashboard/settings", label: "Security", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { to: "/messages", label: "Messages", icon: <MessageSquare className="h-3.5 w-3.5" /> },
    { to: "/dashboard/support", label: "Help Desk", icon: <BookOpen className="h-3.5 w-3.5" /> },
  ]},
];

export { BellRing, BarChart4, Layers };
