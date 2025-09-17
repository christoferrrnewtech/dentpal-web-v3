import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  email: string;
  password: string;
  rememberMe: boolean;
  showPassword: boolean;
  loading: boolean;
  error?: string | null;
  showErrorDialog: boolean;
  errorMessage: string;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onRemember: (v: boolean) => void;
  onTogglePassword: () => void;
  onCloseError: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

export default function LoginFormView({
  email,
  password,
  rememberMe,
  showPassword,
  loading,
  error,
  showErrorDialog,
  errorMessage,
  onEmail,
  onPassword,
  onRemember,
  onTogglePassword,
  onCloseError,
  onSubmit,
}: Props) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="space-y-5">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => onEmail(e.target.value)}
            disabled={loading}
            className={`pl-12 h-14 bg-gray-50 rounded-xl text-gray-700 placeholder-gray-400 focus:bg-white transition-colors duration-200 ${
              error ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-teal-500 focus:ring-teal-500"
            }`}
            required
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => onPassword(e.target.value)}
            disabled={loading}
            className={`pl-12 pr-12 h-14 bg-gray-50 rounded-xl text-gray-700 placeholder-gray-400 focus:bg-white transition-colors duration-200 ${
              error ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-200 focus:border-teal-500 focus:ring-teal-500"
            }`}
            required
          />
          <button type="button" onClick={onTogglePassword} disabled={loading} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="remember"
          checked={rememberMe}
          onCheckedChange={(c) => onRemember(Boolean(c))}
          disabled={loading}
          className="data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
        />
        <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
          Remember me
        </Label>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-800 mb-1">Authentication Failed</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full h-14 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? "Signing in..." : "Log In"}
      </Button>

      <div className="text-center">
        <button type="button" className="text-sm text-teal-600 hover:text-teal-700 font-medium" disabled={loading}>
          Forgot Password?
        </button>
      </div>

      <AlertDialog open={showErrorDialog} onOpenChange={onCloseError}>
        <AlertDialogContent className="sm:max-w-lg border-0 shadow-2xl rounded-2xl overflow-hidden bg-white">
          <div className="bg-gradient-to-r from-red-500 to-pink-500 p-6 -m-6 mb-4">
            <AlertDialogHeader className="text-center">
              <AlertDialogTitle className="text-2xl font-bold text-white mb-2">Authentication Failed</AlertDialogTitle>
              <AlertDialogDescription className="text-red-50 text-base leading-relaxed">
                We couldn't log you in with those credentials
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="px-6 pb-2">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
              <p className="text-red-700 font-medium text-sm leading-relaxed">{errorMessage}</p>
            </div>
          </div>
          <AlertDialogFooter className="px-6 pb-6 pt-0">
            <AlertDialogAction onClick={onCloseError} className="h-12 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl">
              Try Again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}