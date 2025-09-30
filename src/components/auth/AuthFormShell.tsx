import React, { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AuthFormShell({ title, subtitle, children }: Props) {
  return (
    <div className="w-full lg:max-w-xl mx-auto p-8">
      <div className="space-y-2 text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
        {subtitle ? <p className="text-gray-600">{subtitle}</p> : null}
      </div>
      {/* Render form/content passed in */}
      {children}
    </div>
  );
}