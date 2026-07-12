"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, SendHorizontal, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface GameChatProps {
  disabled?: boolean;
  isBusy?: boolean;
  messages: ChatMessage[];
  onSend: (message: string) => Promise<void> | void;
}

export function GameChat({
  disabled,
  isBusy,
  messages,
  onSend,
}: GameChatProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isBusy]);

  const submit = async () => {
    const text = draft.trim();
    if (!text || disabled || isBusy) return;
    setDraft("");
    await onSend(text);
  };

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-border bg-background">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
        <Sparkles className="size-3.5 text-primary" aria-hidden />
        <h3 className="text-xs font-medium">AI chat</h3>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "max-w-[95%] rounded-lg px-2.5 py-1.5 text-xs leading-relaxed",
              message.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "mr-auto border border-border bg-card text-card-foreground"
            )}
          >
            {message.content}
          </div>
        ))}
        {isBusy && (
          <div
            className="mr-auto flex items-center rounded-lg border border-border bg-card px-2.5 py-1.5"
            aria-label="Updating game"
          >
            <Loader2 className="size-3 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <form
        className="flex shrink-0 gap-2 border-t border-border p-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <input
          value={draft}
          disabled={disabled || isBusy}
          aria-label="Message"
          onChange={(event) => setDraft(event.target.value)}
          className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        />
        <Button
          type="submit"
          size="sm"
          disabled={disabled || isBusy || !draft.trim()}
          className="h-8 px-2.5"
          aria-label="Send"
        >
          {isBusy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SendHorizontal className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
