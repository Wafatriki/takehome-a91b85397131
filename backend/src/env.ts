/**
 * Reads `.env` from the project root, wherever you launch this from. Copy `.env.example`
 * to `.env` before starting.
 */
import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);

function fromFile(): Record<string, string> {
    try {
        const raw = readFileSync(new URL(".env", ROOT), "utf8");
        return Object.fromEntries(
            raw
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0 && !line.startsWith("#"))
                .map((line) => {
                    const at = line.indexOf("=");
                    return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^["']|["']$/g, "")];
                }),
        );
    } catch {
        return {};
    }
}

const file = fromFile();

export function required(name: string): string {
    const value = process.env[name] ?? file[name];
    if (!value) {
        process.stderr.write(`${name} is missing. Copy .env.example to .env and fill it in.\n`);
        process.exit(1);
    }
    return value;
}

export function optional(name: string, fallback: string): string {
    return process.env[name] ?? file[name] ?? fallback;
}
