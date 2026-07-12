import type { ChatMessage } from "@/components/canvas/GameChat";
import type { GenerateGameResult } from "@/lib/api/generate";
import type { GameModeValue, GameType, Project, ProjectStatus } from "@/types";

/**
 * Browser localStorage for PlayBox projects. The dashboard list and editor
 * contents (description, mode, chat, last generated game) all live here so
 * refresh / reopen keeps working until a real backend exists.
 *
 * Canvas drawings stay in tldraw's IndexedDB via `playbox-${projectId}`.
 */

const STORAGE_KEY = "playbox-projects-v1";

/** Full project record: dashboard card fields + editor snapshot. */
export interface ProjectRecord extends Project {
  description: string;
  mode: GameModeValue;
  chatMessages: ChatMessage[];
  result: GenerateGameResult | null;
}

export type ProjectPatch = Partial<
  Omit<ProjectRecord, "id"> & {
    status: ProjectStatus;
    gameType: GameType | undefined;
  }
>;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseChatMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  const messages: ChatMessage[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const role =
      item.role === "user" || item.role === "assistant" ? item.role : null;
    if (!role) continue;
    const content = typeof item.content === "string" ? item.content : "";
    messages.push({
      id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
      role,
      content,
    });
  }
  return messages;
}

function parseProject(value: unknown): ProjectRecord | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.name !== "string") return null;

  const status: ProjectStatus =
    value.status === "generating" ||
    value.status === "playable" ||
    value.status === "draft"
      ? value.status
      : "draft";

  return {
    id: value.id,
    name: value.name,
    gameType: typeof value.gameType === "string" ? (value.gameType as GameType) : undefined,
    status,
    thumbnailUrl:
      typeof value.thumbnailUrl === "string" ? value.thumbnailUrl : null,
    updatedAt:
      typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date().toISOString(),
    description: typeof value.description === "string" ? value.description : "",
    mode: (typeof value.mode === "string" ? value.mode : "auto") as GameModeValue,
    chatMessages: parseChatMessages(value.chatMessages),
    result: (value.result as GenerateGameResult | null) ?? null,
  };
}

function readAll(): ProjectRecord[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(parseProject)
      .filter((project): project is ProjectRecord => project !== null)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  } catch {
    return [];
  }
}

function writeAll(projects: ProjectRecord[]): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // Quota / private mode — keep the session going without persistence.
  }
}

/** Dashboard list shape (no heavy editor fields needed in the UI). */
export function listProjects(): Project[] {
  return readAll().map(
    ({ id, name, gameType, status, thumbnailUrl, updatedAt }) => ({
      id,
      name,
      gameType,
      status,
      thumbnailUrl,
      updatedAt,
    })
  );
}

export function getProject(id: string): ProjectRecord | null {
  return readAll().find((project) => project.id === id) ?? null;
}

export function createProject(name: string): ProjectRecord {
  const project: ProjectRecord = {
    id: crypto.randomUUID(),
    name: name.trim() || "Untitled game",
    status: "draft",
    thumbnailUrl: null,
    updatedAt: new Date().toISOString(),
    description: "",
    mode: "auto",
    chatMessages: [],
    result: null,
  };
  writeAll([project, ...readAll()]);
  return project;
}

export function updateProject(
  id: string,
  patch: ProjectPatch
): ProjectRecord | null {
  const projects = readAll();
  const index = projects.findIndex((project) => project.id === id);
  if (index < 0) return null;

  const next: ProjectRecord = {
    ...projects[index],
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  };
  projects[index] = next;
  writeAll(projects);
  return next;
}

export function renameProject(id: string, name: string): ProjectRecord | null {
  const trimmed = name.trim();
  if (!trimmed) return getProject(id);
  return updateProject(id, { name: trimmed });
}

export function duplicateProject(id: string): ProjectRecord | null {
  const source = getProject(id);
  if (!source) return null;

  const copy: ProjectRecord = {
    ...structuredClone(source),
    id: crypto.randomUUID(),
    name: `${source.name} copy`,
    updatedAt: new Date().toISOString(),
  };
  writeAll([copy, ...readAll()]);
  return copy;
}

export function deleteProject(id: string): void {
  writeAll(readAll().filter((project) => project.id !== id));
}

/** Ensure a record exists when opening a brand-new / deep-linked id. */
export function ensureProject(
  id: string,
  fallbackName = "Untitled game"
): ProjectRecord {
  const existing = getProject(id);
  if (existing) return existing;

  const project: ProjectRecord = {
    id,
    name: fallbackName,
    status: "draft",
    thumbnailUrl: null,
    updatedAt: new Date().toISOString(),
    description: "",
    mode: "auto",
    chatMessages: [],
    result: null,
  };
  writeAll([project, ...readAll()]);
  return project;
}
