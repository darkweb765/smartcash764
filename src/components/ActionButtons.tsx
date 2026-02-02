const ActionButtons = () => {
  const actions = [
    { label: "Join group", bold: false },
    { label: "Withdraw", bold: true },
    { label: "Transaction", bold: true },
  ];

  return (
    <div className="flex gap-3 px-4 -mt-8">
      {actions.map((action) => (
        <button
          key={action.label}
          className="flex-1 bg-card rounded-xl py-5 px-2 text-sm shadow-sm border border-border hover:bg-muted transition-colors"
        >
          <span className={action.bold ? "font-bold text-foreground" : "font-medium text-foreground"}>
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default ActionButtons;
