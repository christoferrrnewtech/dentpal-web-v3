import React from "react";
type BannerType = "info" | "error" | "success";

export type AuthStatusBannerProps = {
  type: BannerType;
  message: string;
  onClose: () => void;
};

const colors: Record<BannerType, string> = {
  info: "bg-blue-100 border-blue-400 text-blue-700",
  error: "bg-red-100 border-red-400 text-red-700",
  success: "bg-green-100 border-green-400 text-green-700",
};

export function AuthStatusBanner({type, message, onClose}: AuthStatusBannerProps) {
  const role = type === "error" ? "alert" : "status";
  const live = type === "error" ? "assertive" : "polite";

  return (
    <div
    role={role}
    aria-live={live}
    className={`w-full border ${colors[type]} px-4 py-3 rounded relative mb-4`}
    >
      <p className="text-sm">{message}</p>
      {onClose && (
        <button
            aria-label="Dismmis Banner"
            className="ml-4 text-sm underline"
            onClick={onClose}
      >
          Dismiss
        </button>
      )}
    </div>
  );
}

// import { ReactNode } from "react";
// import dentpalLogo from "@/assets/dentpal_logo.png";

// interface AuthLayoutProps {
//   children: ReactNode;
//   title: string;
//   subtitle: string;
// }

// const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
//   return (
// <div className="min-h-screen bg-gradient-to-br from-teal-100 via-white to-cyan-100 flex items-center justify-center p-4">
//       <div className="w-full max-w-6xl flex items-center justify-center">
//         <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full flex">
//           {/* Left side - Branding */}
//             <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400 p-12 flex-col justify-center items-center relative">
//               <div className="text-center space-y-8">
//               {/* Logo */}
//               <div className="flex items-center justify-center">
//                 <div className="w-100 h-100 flex items-center justify-center p-6">
//                   <img 
//                     src={dentpalLogo} 
//                     alt="DentPal Logo" 
//                     className="w-full h-full object-contain"
//                   />
//                 </div>
//               </div>
              
//               {/* Brand Name */}
//               <div className="space-y-4">
//                 <h1 className="text-6xl font-bold text-white">
//                   Dent<span className="text-orange-500">Pal</span>
//                 </h1>
//                 <p className="text-white/90 text-lg font-medium tracking-wider">
//                   POWERED BY R&R NEWTECH
//                 </p>
//               </div>
              
//               {/* Decorative Elements */}
//               <div className="absolute top-8 right-8 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
//               <div className="absolute bottom-16 left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
//             </div>
//           </div>

//           {/* Right side - Login Form */}
//           <div className="w-full lg:w-1/2 p-12 flex flex-col justify-center">
//             <div className="max-w-sm mx-auto w-full space-y-8">
//               {/* Mobile Logo */}
//               <div className="lg:hidden text-center mb-8">
//                 <div className="flex items-center justify-center mb-4">
//                   <div className="w-24 h-24 flex items-center justify-center p-2">
//                     <img 
//                       src={dentpalLogo} 
//                       alt="DentPal Logo" 
//                       className="w-full h-full object-contain"
//                     />
//                   </div>
//                 </div>
//                 <h1 className="text-4xl font-bold text-gray-800">
//                   Dent<span className="text-teal-500">Pal</span>
//                 </h1>
//                 <p className="text-gray-600 text-sm mt-2">POWERED BY R&R NEWTECH</p>
//               </div>

//               {/* Welcome Text */}
//               <div className="text-center space-y-2">
//                 <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
//                 <p className="text-gray-600">{subtitle}</p>
//               </div>

//               {/* Form */}
//               {children}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AuthLayout;