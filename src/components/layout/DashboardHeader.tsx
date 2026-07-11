"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";

interface DashboardHeaderProps {
  title: string;
  onNewProject: () => void;
}

export function DashboardHeader({ title, onNewProject }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {/* The sidebar (with the logo) is hidden below md */}
          <Logo className="md:hidden" />
          <h1 className="hidden font-heading text-lg font-semibold md:block">
            {title}
          </h1>
        </div>
        <Button onClick={onNewProject}>
          <Plus data-icon="inline-start" />
          New Project
        </Button>
      </div>
    </header>
  );
}
