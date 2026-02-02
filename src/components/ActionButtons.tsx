import { Button } from "@/components/ui/button";

const ActionButtons = () => {
  const actions = [
    { label: "Join group", variant: "outline" as const },
    { label: "Withdraw", variant: "default" as const },
    { label: "Transaction", variant: "default" as const },
  ];

  return (
    <div className="flex gap-3 px-4 -mt-8">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={action.variant}
          className={`flex-1 rounded-lg py-5 text-sm font-medium shadow-sm ${
            action.variant === "outline"
              ? "bg-card border-border text-foreground hover:bg-muted"
              : "bg-card border border-green-primary text-green-primary hover:bg-muted"
          }`}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
};

export default ActionButtons;
