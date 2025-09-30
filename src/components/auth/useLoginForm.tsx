import {useEffect, useState } from "react";
import {useToast} from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { get } from "http";
import { set } from "date-fns";

type Params = { onLoginSuccess: () => void };

export function useLoginForm({ onLoginSuccess }: Params) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();
  const { login, loading, error, getRememberedEmail, clearError } = useAuth();

  useEffect (() => {
    const remembered = getRememberedEmail();
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, [getRememberedEmail]);

  useEffect(() => {
    if (error) clearError();
  }, [email, password,error, clearError]);

  async function handleSubmit (e: React.FormEvent){
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    try {
      const result = await login(email, password, rememberMe);
      if (result.success) {
        toast ({
          title: "Welcome back!",
          description: `Successfully logged in as ${result.profile?.name || result.user?.email}`,
        });
        setTimeout(onLoginSuccess, 500);
      } else {
        setErrorMessage(result.error || "Invalid email or password. Please check your credentials and try again.");
        setShowErrorDialog(true);
      }
    } catch {
      toast({
        title: "Error",
        description: "Somwthing went wrong. Please try again later.",
        variant: "destructive",
      });
    }
  }

  return {
    state: {
      email,
      password,
      rememberMe,
      showPassword,
      showErrorDialog,
      errorMessage,
      loading,
      error,
    },
    action: {
      setEmail,
      setPassword,
      setRememberMe,
    setShowPassword,
    setShowErrorDialog,
    handleSubmit
    },
  };
}
// import { useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Checkbox } from "@/components/ui/checkbox";
// import { useToast } from "@/hooks/use-toast";
// import { Eye, EyeOff, Mail, Lock, AlertCircle, X } from "lucide-react";
// import { useAuth } from "@/hooks/useAuth";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";

// interface LoginFormProps {
//   onLoginSuccess: () => void;
//   onSwitchToSignup: () => void;
// }

// const LoginForm = ({ onLoginSuccess, onSwitchToSignup }: LoginFormProps) => {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [rememberMe, setRememberMe] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const [showErrorDialog, setShowErrorDialog] = useState(false);
//   const [errorMessage, setErrorMessage] = useState("");
//   const { toast } = useToast();
//   const { login, loading, error, getRememberedEmail, clearError } = useAuth();

//   // Load remembered email on component mount
//   useEffect(() => {
//     const rememberedEmail = getRememberedEmail();
//     if (rememberedEmail) {
//       setEmail(rememberedEmail);
//       setRememberMe(true);
//     }
//   }, [getRememberedEmail]);

//   // Clear error when inputs change
//   useEffect(() => {
//     if (error) {
//       clearError();
//     }
//   }, [email, password, error, clearError]);

//     const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     // Validation
//     if (!email || !password) {
//       toast({
//         title: "Error",
//         description: "Please fill in all fields",
//         variant: "destructive",
//       });
//       return;
//     }

//     // Email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       toast({
//         title: "Error",
//         description: "Please enter a valid email address",
//         variant: "destructive",
//       });
//       return;
//     }
    
//     try {
//       const result = await login(email, password, rememberMe);
      
//       if (result.success) {
//         toast({
//           title: "Welcome back!",
//           description: `Successfully logged in as ${result.profile?.name || result.user?.email}`,
//         });
        
//         // Small delay to show success message before redirect
//         setTimeout(() => {
//           onLoginSuccess();
//         }, 500);
//       } else {
//         // Show error dialog for incorrect credentials
//         setErrorMessage(result.error || "Invalid email or password. Please check your credentials and try again.");
//         setShowErrorDialog(true);
//       }
//     } catch (error: any) {
//       // Show error dialog for any other errors
//       setErrorMessage("Something went wrong. Please try again.");
//       setShowErrorDialog(true);
//       console.error('Login error:', error);
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="space-y-6">
//       <div className="space-y-5">
//         <div className="space-y-2">
//           <div className="relative">
//             <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//             <Input
//               id="email"
//               type="email"
//               placeholder="Email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               className={`pl-12 h-14 bg-gray-50 rounded-xl text-gray-700 placeholder-gray-400 focus:bg-white transition-colors duration-200 ${
//                 error 
//                   ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
//                   : 'border-gray-200 focus:border-teal-500 focus:ring-teal-500'
//               }`}
//               required
//             />
//           </div>
//         </div>

//         <div className="space-y-2">
//           <div className="relative">
//             <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//             <Input
//               id="password"
//               type={showPassword ? "text" : "password"}
//               placeholder="Password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               className={`pl-12 pr-12 h-14 bg-gray-50 rounded-xl text-gray-700 placeholder-gray-400 focus:bg-white transition-colors duration-200 ${
//                 error 
//                   ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
//                   : 'border-gray-200 focus:border-teal-500 focus:ring-teal-500'
//               }`}
//               required
//             />
//             <button
//               type="button"
//               onClick={() => setShowPassword(!showPassword)}
//               className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
//             >
//               {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
//             </button>
//           </div>
//         </div>
//       </div>

//       <div className="flex items-center space-x-2">
//         <Checkbox 
//           id="remember" 
//           checked={rememberMe}
//           onCheckedChange={(checked) => setRememberMe(checked as boolean)}
//           className="data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
//         />
//         <Label 
//           htmlFor="remember" 
//           className="text-sm text-gray-600 cursor-pointer"
//         >
//           Remember me
//         </Label>
//       </div>

//       {/* Error Display */}
//       {error && (
//         <div className="flex items-start gap-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-in slide-in-from-top-2 duration-200">
//           <div className="flex-shrink-0">
//             <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
//           </div>
//           <div className="flex-1">
//             <h4 className="text-sm font-medium text-red-800 mb-1">
//               Authentication Failed
//             </h4>
//             <p className="text-sm text-red-700">
//               {error}
//             </p>
//           </div>
//         </div>
//       )}

//       <Button 
//         type="submit" 
//         className="w-full h-14 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed" 
//         disabled={loading}
//       >
//         {loading ? "Signing in..." : "Log In"}
//       </Button>

//       <div className="text-center">
//         <button
//           type="button"
//           className="text-sm text-teal-600 hover:text-teal-700 font-medium"
//         >
//           Forgot Password?
//         </button>
//       </div>

//       <div className="text-center pt-4">
//         <p className="text-sm text-gray-600">
//           Don't have an account?{" "}
//           <button
//             type="button"
//             onClick={onSwitchToSignup}
//             className="text-teal-600 hover:text-teal-700 font-semibold"
//           >
//             Sign up
//           </button>
//         </p>
//       </div>

//       {/* Beautiful Error Alert Dialog */}
//       <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
//         <AlertDialogContent className="sm:max-w-lg border-0 shadow-2xl rounded-2xl overflow-hidden bg-white">
//           {/* Header with gradient background */}
//           <div className="bg-gradient-to-r from-red-500 to-pink-500 p-6 -m-6 mb-4">
//             <AlertDialogHeader className="text-center">
//               <div className="mx-auto mb-4">
//                 <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mx-auto">
//                   <AlertCircle className="h-8 w-8 text-white animate-pulse" />
//                 </div>
//               </div>
//               <AlertDialogTitle className="text-2xl font-bold text-white mb-2">
//                 Authentication Failed
//               </AlertDialogTitle>
//               <AlertDialogDescription className="text-red-50 text-base leading-relaxed">
//                 We couldn't log you in with those credentials
//               </AlertDialogDescription>
//             </AlertDialogHeader>
//           </div>

//           {/* Content section */}
//           <div className="px-6 pb-2">
//             <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
//               <div className="flex items-start gap-3">
//                 <div className="flex-shrink-0">
//                   <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
//                 </div>
//                 <p className="text-red-700 font-medium text-sm leading-relaxed">
//                   {errorMessage}
//                 </p>
//               </div>
//             </div>

//             {/* Tips section */}
//             <div className="bg-gray-50 rounded-xl p-4 mb-6">
//               <h4 className="text-sm font-semibold text-gray-700 mb-2">💡 Quick Tips:</h4>
//               <ul className="text-xs text-gray-600 space-y-1">
//                 <li>• Double-check your email address for typos</li>
//                 <li>• Ensure your password is correct (case-sensitive)</li>
//                 <li>• Try clearing your browser cache if issues persist</li>
//               </ul>
//             </div>
//           </div>

//           <AlertDialogFooter className="px-6 pb-6 pt-0">
//             <div className="flex gap-3 w-full">
//               <Button
//                 variant="outline"
//                 onClick={() => setShowErrorDialog(false)}
//                 className="flex-1 h-12 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 transition-all duration-200"
//               >
//                 Cancel
//               </Button>
//               <AlertDialogAction 
//                 onClick={() => setShowErrorDialog(false)}
//                 className="flex-1 h-12 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
//               >
//                 Try Again
//               </AlertDialogAction>
//             </div>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </form>
//   );
// };

// export default LoginForm;