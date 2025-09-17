import React from "react";
import brandLogo from "@/assets/dentpal_logo.png"

 type Props = {
    gradientClassName?: string;
    logoSrc?: string;
    logoClassName?: string;
    title?: string;
    subtitle?: string;
 };

 export function AuthBrandPanel({
    gradientClassName = "bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400",
    logoSrc = brandLogo,
    logoClassName = "w-80 h-80 sm:w-36 md:w-48 lg:w-72 xl:w-80", 
    title = "Dentpal",
    subtitle = "POWERED BY R&R NEWTECH", 
    }: Props) {
        return (
            <div className={`items-center justify-center p-12 ${gradientClassName}`}>
            <div className="text-center space-y-6">
                {logoSrc && (
                    <img src={logoSrc} alt="Brand" className={`${logoClassName} object-contain mx-auto`}/>
                )}
                <h1 className="text-5xl font-bold text-white">
                    {title.slice(0,4)}
                    <span className="text-orange-300">{title.slice(4)} </span>
                </h1>
                <p className="text-white/90 tracking-wider">{subtitle} </p>
                </div>
            </div>
        );
    }
