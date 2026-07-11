"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GAME_TYPE_OPTIONS } from "@/lib/mock-data/projects";
import type { GameType, NewProjectInput } from "@/types";

interface NewProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: NewProjectInput) => void;
}

export function NewProjectModal({
  open,
  onOpenChange,
  onCreate,
}: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [gameType, setGameType] = useState<GameType>("platformer");

  const handleCreate = () => {
    const input: NewProjectInput = { name: name.trim(), gameType };
    console.log("Create project", input);
    onCreate(input);
    setName("");
    setGameType("platformer");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => onOpenChange(nextOpen)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Name your game and pick a type. You&apos;ll sketch it next.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              placeholder="e.g. Moon Jumper"
              value={name}
              autoFocus
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim()) handleCreate();
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-type">Game type</Label>
            <Select
              items={GAME_TYPE_OPTIONS}
              value={gameType}
              onValueChange={(value) => setGameType(value as GameType)}
            >
              <SelectTrigger id="project-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GAME_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
