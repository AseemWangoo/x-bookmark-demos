export const INVOICE_PAGE_SIZE = 10;

export interface EstimateStep {
  label: string;
  count: number;
}

export type EstimateTask = "list_invoices" | "list_vendors" | "add_vendor";

export function stepsFor(task: EstimateTask, rowCount: number): EstimateStep[] {
  switch (task) {
    case "list_invoices":
    case "list_vendors":
      return listSteps(task, rowCount);
    case "add_vendor":
      return [
        { label: "Sign in (username, password, submit)", count: 3 },
        { label: "Open Add Vendor", count: 1 },
        { label: "Fill name, email, category, terms, and certify", count: 5 },
        { label: "Submit", count: 1 },
        { label: "Confirm vendor creation", count: 1 },
      ];
    default: {
      const neverTask: never = task;
      return neverTask;
    }
  }
}

function listSteps(task: "list_invoices" | "list_vendors", rowCount: number): EstimateStep[] {
  const pages = Math.max(1, Math.ceil(Math.max(0, rowCount) / INVOICE_PAGE_SIZE));
  const steps: EstimateStep[] = [
    { label: "Sign in (username, password, submit)", count: 3 },
    { label: task === "list_invoices" ? "Open Invoices" : "Open Vendors", count: 1 },
  ];
  if (task === "list_invoices") {
    steps.push({ label: "Pick status", count: 1 }, { label: "Click Go", count: 1 });
  }
  steps.push({ label: "Read page", count: pages });
  if (pages > 1) steps.push({ label: "Click Next", count: pages - 1 });
  return steps;
}

export function totalSteps(steps: readonly EstimateStep[]): number {
  return steps.reduce((sum, step) => sum + step.count, 0);
}

export function estimateSeconds(steps: readonly EstimateStep[], secondsPerStep: number): number {
  return totalSteps(steps) * secondsPerStep;
}

export function speedupRatio(estimateSec: number, measuredSec: number): number | null {
  if (!(measuredSec > 0) || !Number.isFinite(estimateSec)) return null;
  return estimateSec / measuredSec;
}
