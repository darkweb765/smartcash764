const ActionButtons = () => {
  const actions = [
    { label: "Join group", bold: false },
    { label: "Withdraw", bold: true },
    { label: "Transaction", bold: true },
  ];

  return (
    <div className="flex gap-2 px-4 -mt-6 relative z-10">
      {actions.map((action) => (
        <button
          key={action.label}
          className="flex-1 bg-card rounded-xl py-4 px-2 text-sm shadow-md border border-border/50 hover:bg-muted transition-colors"
        >
          <span className={action.bold ? "font-semibold text-foreground" : "font-medium text-foreground"}>
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default ActionButtons;
