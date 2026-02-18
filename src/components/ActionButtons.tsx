import { useNavigate } from "react-router-dom";

const ActionButtons = () => {
  const navigate = useNavigate();
  
  const actions = [
    { label: "Promo", bold: true, path: "/promo" },
    { label: "Withdraw", bold: true, path: "/withdraw" },
    { label: "Transaction", bold: true, path: "/transactions" },
  ];

  const handleClick = (path: string | null) => {
    if (path) {
      navigate(path);
    }
  };

  return (
    <div className="bg-green-primary/20 mx-4 -mt-12 pt-14 pb-4 px-3 rounded-b-2xl">
      <div className="flex gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => handleClick(action.path)}
            className="flex-1 bg-card rounded-xl py-5 px-2 text-sm shadow-sm hover:bg-muted transition-colors"
          >
            <span className={action.bold ? "font-bold text-foreground" : "font-medium text-foreground"}>
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ActionButtons;
