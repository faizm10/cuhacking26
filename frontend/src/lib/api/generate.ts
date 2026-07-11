import type { GenerateResponse } from "@/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8080";

interface GenerateGameInput {
  projectId: string;
  shapes: Record<string, unknown>[];
  screenshot?: string | null;
  prompt?: string;
  selectedGameType?: string;
}

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { message?: string; code?: string };
    };
    if (body.error?.message) return body.error.message;
  } catch {
    // ignore parse failures
  }
  return `Generate failed (${response.status})`;
}

export async function generateGame(
  input: GenerateGameInput
): Promise<GenerateResponse> {
  if (!input.screenshot && input.shapes.length === 0) {
    throw new Error("Draw something on the canvas before generating");
  }

  const response = await fetch(`${API_BASE}/api/games/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: input.projectId,
      prompt: input.prompt ?? "",
      selectedGameType: input.selectedGameType,
      shapes: input.shapes,
      ...(input.screenshot ? { screenshot: input.screenshot } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return (await response.json()) as GenerateResponse;
}
