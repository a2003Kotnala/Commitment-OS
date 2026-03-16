import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

type FormMessageProps = {
  message?: string;
  tone?: "error" | "success" | "info";
};

const styles = {
  error: "border-danger/20 bg-danger/5 text-danger",
  success: "border-success/20 bg-success/5 text-success",
  info: "border-accent/20 bg-accent/5 text-accent"
} satisfies Record<NonNullable<FormMessageProps["tone"]>, string>;

export function FormMessage({ message, tone = "error" }: FormMessageProps) {
  if (!message) {
    return null;
  }

  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={cn("flex items-start gap-2 rounded-xl border px-3 py-2 text-sm", styles[tone])}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
