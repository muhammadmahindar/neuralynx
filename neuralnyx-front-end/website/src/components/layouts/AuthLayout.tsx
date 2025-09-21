import { AppleHelloEnglishEffect } from "@/components/ui/shadcn-io/apple-hello-effect";
import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  showImage?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  description,
  showImage = true,
}) => {
  return (
    <div className="w-full grid grid-cols-1 h-screen bg-background lg:grid-cols-2 gap-12">
      {showImage && (
        <div className="grid-cols-1 p-4 hidden lg:grid">
          <div className="flex-1 p-4 items-center justify-center flex rounded-2xl bg-muted">
            <AppleHelloEnglishEffect />
          </div>
        </div>
      )}
      <div className="flex flex-col gap-6 items-center w-full max-w-md mx-auto justify-center h-full">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Neuralynx" className="w-20 h-20" />
        </div>
        <div className="w-full">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
};
