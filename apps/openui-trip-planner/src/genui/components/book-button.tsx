import { Button } from "@/components/ui/button";
import { useBooking } from "@/genui/booking.tsx";
import {
  useTriggerAction,
  type ComponentRenderProps,
} from "@openuidev/react-lang";

type BookButtonProps = {
  label: string;
  action?: Parameters<ReturnType<typeof useTriggerAction>>[2];
};

export function BookButtonView({
  props,
}: ComponentRenderProps<BookButtonProps>) {
  const triggerAction = useTriggerAction();
  const { booked } = useBooking();

  return (
    <Button
      type="button"
      size="lg"
      className="w-full"
      disabled={booked}
      onClick={() => {
        if (booked) return;
        void triggerAction(props.label, undefined, props.action);
      }}
    >
      {booked ? "Booked ✓ (mock)" : props.label}
    </Button>
  );
}
