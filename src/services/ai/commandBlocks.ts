/*
 * PolymagicPrice - Command block scanning
 * Copyright (C) 2025 Rp Hobbyist
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/*
 * Finds [CMD:NAME {...}] blocks by balanced-brace scanning rather than a
 * regex with a non-greedy `\{[\s\S]*?\}`. That regex terminates at the FIRST
 * `}]` it finds — if a payload's JSON string value ever contains that literal
 * two-character sequence (e.g. a shop item name like "Batch A}] Notes" echoed
 * into a CREATE_NOTIFICATION message), the match ends early. In command
 * parsing that just throws on JSON.parse (caught, reported as malformed —
 * safe). In display cleanup it left the real tail of the payload — raw JSON —
 * visible in the chat, which is exactly what this feature promises never to
 * show. This scanner tracks JSON string quoting so a `}` or `]` sitting
 * inside a string value is never mistaken for the block's real boundary.
 */

export interface CommandBlockMatch {
    command: string;
    /** Raw JSON text of the payload, or null if the block had none. */
    payloadRaw: string | null;
    /** Index range of the whole [CMD:...] block in the source string. */
    start: number;
    end: number;
}

/**
 * Returns the index just past the `}` that closes the object starting at
 * `openBraceIndex`, or -1 if it never closes (the payload is still
 * streaming in, or the model produced malformed JSON).
 */
function findBalancedBraceEnd(text: string, openBraceIndex: number): number {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = openBraceIndex; i < text.length; i++) {
        const ch = text[i];

        if (inString) {
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === '"') inString = false;
            continue;
        }

        if (ch === '"') { inString = true; continue; }
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) return i + 1;
        }
    }
    return -1;
}

/**
 * Scans `content` for complete [CMD:NAME] / [CMD:NAME {...}] blocks. A block
 * whose payload braces or closing `]` haven't arrived yet is skipped, not
 * guessed at — callers see it once a later chunk completes it.
 */
const WHITESPACE = new Set([' ', '\t', '\n', '\r']);

function skipWhitespace(content: string, cursor: number): number {
    while (WHITESPACE.has(content[cursor])) cursor++;
    return cursor;
}

export function findCommandBlocks(content: string): CommandBlockMatch[] {
    const results: CommandBlockMatch[] = [];
    const startPattern = /\[CMD:([A-Z_]+)/g;
    let match: RegExpExecArray | null;

    while ((match = startPattern.exec(content)) !== null) {
        const command = match[1];
        // Small local models (the app itself recommends gemma3:1b) are
        // exactly the kind prone to a stray space or newline around the
        // payload. Without tolerating it on both sides, the block went
        // unrecognised entirely: silently dropped by processAICommands
        // (no approval card, no error, nothing) and left as raw JSON text
        // in the chat by renderSafeText — the one thing this scanner
        // exists to prevent.
        let cursor = skipWhitespace(content, startPattern.lastIndex);

        let payloadRaw: string | null = null;
        if (content[cursor] === '{') {
            const end = findBalancedBraceEnd(content, cursor);
            if (end === -1) continue; // payload still arriving
            payloadRaw = content.slice(cursor, end);
            cursor = skipWhitespace(content, end);
        }

        if (content[cursor] !== ']') continue; // not a real command block

        results.push({ command, payloadRaw, start: match.index, end: cursor + 1 });
        startPattern.lastIndex = cursor + 1;
    }

    return results;
}
