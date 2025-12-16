import { useState, useEffect } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Clear any tab query parameter when on auth page
  // This ensures users start fresh at dashboard after login
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('tab')) {
        params.delete('tab');
        const newUrl = params.toString() 
          ? `${window.location.pathname}?${params.toString()}`
          : window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    } catch {}
  }, []);

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
      title={showForgotPassword ? "Reset Password" : isLogin ? "Welcome" : "Create Account"}
      subtitle={showForgotPassword ? "We'll help you get back to your account" : isLogin ? "Sign in to your dental dashboard" : "Join DentPal today"}
    >
      {showForgotPassword ? (
        <ForgotPasswordForm
          onBackToLogin={() => {
            setShowForgotPassword(false);
            setIsLogin(true);
          }}
        />
      ) : isLogin ? (
        <LoginForm
          onLoginSuccess={handleLoginSuccess}
          onForgotPassword={() => setShowForgotPassword(true)}
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