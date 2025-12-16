import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Props = {
  onBackToLogin: () => void;
};

export default function ForgotPasswordForm({ onBackToLogin }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate email
      if (!email || !email.includes("@")) {
        throw new Error("Please enter a valid email address");
      }

      // Send password reset email via Firebase
      await sendPasswordResetEmail(auth, email);
      
      setSuccess(true);
      console.log("✅ Password reset email sent to:", email);
      
    } catch (err: any) {
      console.error("❌ Password reset error:", err);
      
      // Handle specific Firebase errors
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(err.message || "Failed to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 text-center animate-fade-in">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-teal-50 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-teal-500" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold text-gray-900">Check your email</h3>
          <p className="text-gray-600">
            We've sent a password reset link to
          </p>
          <p className="font-medium text-gray-900">{email}</p>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg text-left">
          <p className="text-sm text-blue-800">
            <strong>Didn't receive the email?</strong> Check your spam folder or try again in a few minutes.
          </p>
        </div>

        <Button
          onClick={onBackToLogin}
          className="w-full h-14 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl"
        >
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
     

      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className={`pl-12 h-14 bg-gray-50 rounded-xl text-gray-700 placeholder-gray-400 focus:bg-white transition-colors duration-200 ${
            error ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-teal-500 focus:ring-teal-500"
          }`}
          required
        />
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
        {loading ? "Sending reset link..." : "Send Reset Link"}
      </Button>

      <button
        type="button"
        onClick={onBackToLogin}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Login
      </button>
    </form>
  );
}
