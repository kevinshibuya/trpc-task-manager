import { InvalidCursorError } from "./errors";
import type { TaskPosition } from "./task-repository";

/*
 * A cursor names the last task of a page by its creation date and id, the
 * two fields the list is sorted by (ADR 0006). It is "<epoch ms>:<id>" in
 * base64url, so callers treat it as an opaque string and the sort key can
 * change later without breaking them. It holds a position, not an offset: the
 * next page starts after that position even when the task there was deleted.
 */

export function encodeCursor({ createdAt, id }: TaskPosition): string {
  return Buffer.from(`${createdAt.getTime()}:${id}`).toString("base64url");
}

export function decodeCursor(cursor: string): TaskPosition {
  const text = Buffer.from(cursor, "base64url").toString("utf8");
  // Base64url decoding skips characters it does not know, so a cursor is only
  // accepted when it encodes back to itself.
  const match = /^(\d{1,15}):(.+)$/.exec(text);
  if (!match || encodeCursor(toPosition(match)) !== cursor) {
    throw new InvalidCursorError();
  }
  return toPosition(match);
}

function toPosition(match: RegExpExecArray): TaskPosition {
  return { createdAt: new Date(Number(match[1])), id: match[2] };
}
