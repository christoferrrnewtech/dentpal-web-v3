import React from "react";

export function AuthLoadingOverlay({show}: {show?: boolean}) {
    if (!show) return null;
    return (
        <div
            aria-live="polite"
            aria-busy="true"
            className="absolute inset-0 z-50 bg-white/70 backdrop-blur-sm flex items-center justify-center"
        >
        <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600" />
            <span className="text-sm text-gray-700">Loading </span>
        </div>
        </div>
    );
}