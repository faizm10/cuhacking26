import { FieldValue, Firestore } from "@google-cloud/firestore";

import { env } from "../config/env.js";
import type { GameSpec } from "../lib/game/schema/game.js";

/**
 * Firestore persistence for projects and generated levels.
 *
 * Persistence is optional: without a GCP project (local dev), every function
 * degrades to a no-op so the API still works end to end. On Cloud Run,
 * GOOGLE_CLOUD_PROJECT is set automatically and credentials come from the
 * service account.
 */

const PROJECTS = "projects";
const LEVELS = "levels";

let db: Firestore | null | undefined;

function getDb(): Firestore | null {
  if (db === undefined) {
    if (env.GOOGLE_CLOUD_PROJECT) {
      db = new Firestore({ projectId: env.GOOGLE_CLOUD_PROJECT });
    } else {
      db = null;
    }
  }
  return db;
}

export function isFirestoreEnabled(): boolean {
  return getDb() !== null;
}

export interface ProjectRecord {
  id: string;
  name: string;
  gameType: string;
  createdAt: FirebaseFirestore.Timestamp | null;
  lastGeneratedAt: FirebaseFirestore.Timestamp | null;
}

export interface SaveLevelInput {
  projectId: string | null;
  prompt: string;
  source: "gemini" | "mock";
  screenshotUrl: string | null;
  game: GameSpec;
}

/** Persist a generated level. Returns the new document id, or null when disabled. */
export async function saveGeneratedLevel(
  input: SaveLevelInput
): Promise<string | null> {
  const firestore = getDb();
  if (!firestore) return null;

  const doc = await firestore.collection(LEVELS).add({
    projectId: input.projectId,
    prompt: input.prompt,
    source: input.source,
    screenshotUrl: input.screenshotUrl,
    game: input.game,
    createdAt: FieldValue.serverTimestamp(),
  });

  if (input.projectId) {
    await firestore
      .collection(PROJECTS)
      .doc(input.projectId)
      .set({ lastGeneratedAt: FieldValue.serverTimestamp() }, { merge: true });
  }

  return doc.id;
}

/** Create or update a project document. Returns its id, or null when disabled. */
export async function upsertProject(input: {
  id: string;
  name: string;
  gameType: string;
}): Promise<string | null> {
  const firestore = getDb();
  if (!firestore) return null;

  await firestore.collection(PROJECTS).doc(input.id).set(
    {
      name: input.name,
      gameType: input.gameType,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return input.id;
}

export async function getProject(id: string): Promise<ProjectRecord | null> {
  const firestore = getDb();
  if (!firestore) return null;

  const snapshot = await firestore.collection(PROJECTS).doc(id).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    name: typeof data.name === "string" ? data.name : "Untitled game",
    gameType: typeof data.gameType === "string" ? data.gameType : "platformer",
    createdAt: data.createdAt ?? null,
    lastGeneratedAt: data.lastGeneratedAt ?? null,
  };
}

/** Most recent levels generated for a project, newest first. */
export async function listProjectLevels(
  projectId: string,
  limit = 10
): Promise<{ id: string; game: GameSpec; createdAt: unknown }[]> {
  const firestore = getDb();
  if (!firestore) return [];

  const snapshot = await firestore
    .collection(LEVELS)
    .where("projectId", "==", projectId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      game: data.game as GameSpec,
      createdAt: data.createdAt ?? null,
    };
  });
}
