import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, LifeBuoy } from "lucide-react";

export interface LoginHelp {
  likely_cause: string;
  try_this: string;
  steps: string[];
}

interface Props {
  open: boolean;
  loading: boolean;
  help: LoginHelp | null;
  suggestion?: string | null;
  onUseSuggestion?: () => void;
  onClose: () => void;
}

const LoginHelpDialog = ({ open, loading, help, suggestion, onUseSuggestion, onClose }: Props) => (
  <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
    <DialogContent className="max-w-sm rounded-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-left">
          <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <LifeBuoy className="w-5 h-5 text-primary" />
          </span>
          Trouble signing in
        </DialogTitle>
      </DialogHeader>

      {loading && (
        <div className="flex items-center gap-3 py-6 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Checking your details...
        </div>
      )}

      {!loading && help && (
        <div className="space-y-4 text-sm">
          <p className="text-foreground">{help.likely_cause}</p>
          {help.try_this && (
            <p className="rounded-xl bg-muted p-3 text-muted-foreground">{help.try_this}</p>
          )}
          {help.steps.length > 0 && (
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
              {help.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
        </div>
      )}

      {!loading && !help && (
        <p className="text-sm text-muted-foreground py-2">
          Please check your details and try again. Make sure there are no extra spaces and that
          your email is written exactly as you registered it.
        </p>
      )}

      <div className="flex flex-col gap-2 pt-2">
        {suggestion && onUseSuggestion && (
          <Button onClick={onUseSuggestion} className="w-full rounded-xl py-5">
            Use {suggestion}
          </Button>
        )}
        <Button variant="outline" onClick={onClose} className="w-full rounded-xl py-5">
          Close
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default LoginHelpDialog;
