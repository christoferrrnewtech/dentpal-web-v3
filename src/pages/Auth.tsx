import { useState } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);

  const handleLoginSuccess = () => {
    // Authentication is handled by useAuth hook
    // This component will be unmounted when user is authenticated
    console.log("✅ Login successful - redirecting to dashboard");
  };

  const handleSignupSuccess = () => {
    // Switch to login after successful signup
    setIsLogin(true);
    console.log("✅ Signup successful - please login");
  };

  return (
    <AuthLayout
      title={isLogin ? "Welcome" : "Create Account"}
      subtitle={isLogin ? "Sign in to your dental dashboard" : "Join DentPal today"}
    >
      {isLogin ? (
        <LoginForm
          onLoginSuccess={handleLoginSuccess}
          onSwitchToSignup={() => setIsLogin(false)}
        />
      ) : (
        <SignupForm
          onSignup={(name, email, password) => {
            console.log("Signup attempted:", { name, email });
            handleSignupSuccess();
          }}
          onSwitchToLogin={() => setIsLogin(true)}
        />
      )}
    </AuthLayout>
  );
};

export default Auth;