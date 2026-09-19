import type { ReactNode } from "react";
import clsx from "clsx";
import { InfoTip } from "@/components/InfoTip";
import { getHelp } from "@/lib/help";

function Tip({ label, help }: { label?: string; help?: string | false }) {
  const text = help === false ? undefined : (help ?? getHelp(label));
  return text ? <InfoTip text={text} /> : null;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={clsx("rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(21,21,16,0.04)]", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, help }: { title: string; subtitle?: string; action?: ReactNode; help?: string | false }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div>
        <h3 className="flex items-center gap-1.5 text-[15px] font-bold text-foreground">
          {title}
          <Tip label={title} help={help} />
        </h3>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-foreground-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = "neutral" | "pink" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-surface-muted text-foreground-2 border border-border",
  pink: "bg-pink-soft text-pink border border-transparent",
  success: "bg-success-soft text-success-ink border border-transparent",
  warning: "bg-warning-soft text-warning border border-transparent",
  danger: "bg-danger-soft text-danger border border-transparent",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap", TONE_CLASSES[tone])}>
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...rest
}: { children: ReactNode; variant?: "primary" | "ghost" | "danger" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold transition-colors disabled:opacity-40 disabled:pointer-events-none";
  const variants = {
    primary: "bg-pink text-white hover:bg-[#d63873]",
    ghost: "border border-border-strong text-foreground-2 hover:bg-surface-muted",
    danger: "bg-danger-soft text-danger hover:bg-danger/15",
  };
  return (
    <button className={clsx(base, variants[variant], className)} {...rest}>
      {children}
    </button>
  );
}

export function StatCard({
  label,
  value,
  delta,
  deltaTone = "success",
  hint,
  help,
}: {
  help?: string | false;
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "success" | "danger";
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <p className="flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-wide text-foreground-3">
        {label}
        <Tip label={label} help={help} />
      </p>
      <p className="mt-2 text-[26px] font-extrabold leading-none text-foreground">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {delta && (
          <span className={clsx("text-[12px] font-bold", deltaTone === "success" ? "text-success-ink" : "text-danger")}>
            {delta}
          </span>
        )}
        {hint && <span className="text-[12px] text-foreground-3">{hint}</span>}
      </div>
    </Card>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-14 text-center">
      <p className="text-[14px] font-bold text-foreground">{title}</p>
      {subtitle && <p className="max-w-sm text-[12.5px] text-foreground-3">{subtitle}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action, help }: { title: string; subtitle?: string; action?: ReactNode; help?: string | false }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight text-foreground">
          {title}
          <Tip label={title} help={help} />
        </h1>
        {subtitle && <p className="mt-1 text-[13.5px] text-foreground-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="thin-scroll overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={clsx("border-b border-border bg-surface-muted px-4 py-3 text-[11.5px] font-bold uppercase tracking-wide text-foreground-3", className)}>
      {children}
    </th>
  );
}
export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={clsx("border-b border-border px-4 py-3 align-middle text-foreground-2", className)}>{children}</td>;
}
export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={clsx("hover:bg-surface-muted/60", className)}>{children}</tr>;
}
