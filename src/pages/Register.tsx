import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Gift, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate("/dashboard", { replace: true });
    };
    checkSession();
  }, [navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    await supabase.auth.signOut();

    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          username: username,
        },
      },
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Registration Failed",
        description: error.message.toLowerCase().includes("already")
          ? "User already exists, please login"
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Account created successfully!",
      });
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto flex flex-col py-8 px-6">
      {/* Back Button */}
      <button
        onClick={() => navigate("/welcome")}
        className="flex items-center gap-2 text-muted-foreground mb-8"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      {/* Gift Icon */}
      <div className="flex justify-center mb-8">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <Gift className="w-10 h-10 text-primary-foreground" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-foreground text-center mb-8">
        Create Account
      </h1>

      {/* Form */}
      <form onSubmit={handleRegister} className="space-y-6 flex-1">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="py-6 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="py-6 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="py-6 rounded-xl"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full py-6 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl mt-8"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </Button>

        <p className="text-center text-muted-foreground">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-primary cursor-pointer hover:underline font-medium"
          >
            Login
          </span>
        </p>
      </form>
    </div>
  );
};

export default Register;
