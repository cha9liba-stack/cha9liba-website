import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "primary" | "secondary" | "white";
  text?: string;
  className?: string;
}

export function LoadingSpinner({ 
  size = "md", 
  color = "primary", 
  text,
  className = "" 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const colorClasses = {
    primary: "border-blue-600",
    secondary: "border-slate-600",
    white: "border-white",
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} ${colorClasses[color]} border-2 border-t-transparent rounded-full animate-spin`}
      />
      {text && (
        <p className={`mt-2 text-sm ${color === "white" ? "text-white" : "text-slate-400"}`}>
          {text}
        </p>
      )}
    </div>
  );
}

export function LoadingPage({ text = "Chargement..." }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

export function LoadingCard({ text = "Chargement..." }: { text?: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center min-h-[200px]">
      <LoadingSpinner text={text} />
    </div>
  );
}
