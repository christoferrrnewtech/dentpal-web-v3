import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthLayout from "@/components/auth/AuthLayout";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");

  const oobCode = searchParams.get("oobCode");

  useEffect(() => {
    // Verify the reset code is valid
    const verifyCode = async () => {
      if (!oobCode) {
        setError("Invalid or missing reset code");
        setVerifying(false);
        return;
      }

      try {
        // Verify the code and get the email
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(userEmail);
        setVerifying(false);
      } catch (err: any) {
        console.error("❌ Code verification error:", err);
        if (err.code === "auth/invalid-action-code") {
          setError("This reset link has expired or has already been used.");
        } else if (err.code === "auth/expired-action-code") {
          setError("This reset link has expired. Please request a new one.");
        } else {
          setError("Invalid reset link. Please request a new one.");
        }
        setVerifying(false);
      }
    };

    verifyCode();
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!oobCode) {
      setError("Invalid reset code");
      return;
    }

    setLoading(true);

    try {
      // Reset the password
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
      console.log("✅ Password reset successful");

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (err: any) {
      console.error("❌ Password reset error:", err);
      if (err.code === "auth/weak-password") {
        setError("Password is too weak. Please choose a stronger password.");
      } else if (err.code === "auth/invalid-action-code") {
        setError("This reset link has expired or has already been used.");
      } else {
        setError(err.message || "Failed to reset password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <AuthLayout title="Reset Password" subtitle="Verifying reset link...">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Verifying your reset link...</p>
        </div>
      </AuthLayout>
    );
  }

  if (error && !oobCode) {
    return (
      <AuthLayout title="Reset Password" subtitle="Invalid reset link">
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold text-gray-900">Invalid Link</h3>
            <p className="text-gray-600">{error}</p>
          </div>

          <Button
            onClick={() => navigate("/")}
            className="w-full h-14 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl"
          >
            Go to Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout title="Password Reset" subtitle="Your password has been updated">
        <div className="space-y-6 text-center animate-fade-in">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-teal-50 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-teal-500" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold text-gray-900">Password Updated!</h3>
            <p className="text-gray-600">
              Your password has been successfully reset.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to login...
            </p>
          </div>

          <Button
            onClick={() => navigate("/")}
            className="w-full h-14 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl"
          >
            Go to Login Now
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset Password" subtitle={`Reset password for ${email}`}>
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="space-y-5">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="new-password"
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              className="pl-12 pr-12 h-14 bg-gray-50 rounded-xl text-gray-700 placeholder-gray-400 focus:bg-white transition-colors duration-200 border-gray-200 focus:border-teal-500 focus:ring-teal-500"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="pl-12 pr-12 h-14 bg-gray-50 rounded-xl text-gray-700 placeholder-gray-400 focus:bg-white transition-colors duration-200 border-gray-200 focus:border-teal-500 focus:ring-teal-500"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={loading}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            Password must be at least 6 characters long.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 mb-1">Error</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-14 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Resetting password..." : "Reset Password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
