export function isSubmitEnter(event: {
  key: string;
  shiftKey: boolean;
  nativeEvent: { isComposing: boolean; keyCode: number };
}): boolean {
  if (event.key !== "Enter" || event.shiftKey) return false;
  if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return false;
  return true;
}
