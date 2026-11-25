export function supportsInvokerCommands(): boolean {
  return typeof HTMLButtonElement !== "undefined" && "commandForElement" in HTMLButtonElement.prototype;
}

type TimerRef = { current: number | null };

export async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function reportCopy(button: HTMLButtonElement, tip: HTMLElement, ok: boolean, timer: TimerRef): void {
  if (timer.current !== null) window.clearTimeout(timer.current);
  button.removeAttribute("data-copied");
  button.removeAttribute("data-failed");
  const message = ok ? "Copied" : "Copy failed";
  tip.textContent = "";
  void button.offsetWidth;
  button.setAttribute(ok ? "data-copied" : "data-failed", "");
  window.requestAnimationFrame(() => {
    tip.textContent = message;
  });
  timer.current = window.setTimeout(() => {
    button.removeAttribute("data-copied");
    button.removeAttribute("data-failed");
    tip.textContent = "";
    timer.current = null;
  }, 2000);
}
