/*
 * PolymagicPrice - Ollama AI Client
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

import { getAISettings } from "@/lib/core/sessionStorage";
import { isValidLocalAIPort } from "@/lib/sanitization";
import { isDesktop } from "@/lib/utils";

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface OllamaChatRequest {
    model: string;
    messages: ChatMessage[];
    stream?: boolean;
    options?: {
        num_ctx?: number;
        temperature?: number;
    };
}

export interface OllamaChatResponse {
    model: string;
    created_at: string;
    message: ChatMessage;
    done: boolean;
    total_duration?: number;
    eval_count?: number;
    prompt_eval_count?: number;
}

export type OllamaErrorKind =
    | 'disabled'
    | 'offline'
    | 'timeout'
    | 'model_missing'
    | 'http'
    | 'aborted';

/**
 * Typed failure so the UI can explain what actually went wrong instead of
 * guessing from an error message string.
 */
export class OllamaError extends Error {
    readonly kind: OllamaErrorKind;
    readonly status?: number;

    constructor(kind: OllamaErrorKind, message: string, status?: number) {
        super(message);
        this.name = 'OllamaError';
        this.kind = kind;
        this.status = status;
    }

    /** Message worth showing a user, including the fix where there is one. */
    get userMessage(): string {
        switch (this.kind) {
            case 'disabled':
                return "Local AI is turned off. Enable it in Settings → Local AI.";
            case 'model_missing':
                return `The selected model is not available in Ollama. Pull it first (for example: ollama pull llama3).`;
            case 'timeout':
                return "The model took too long to respond. Try a smaller model or raise the timeout in Settings → Local AI.";
            case 'offline':
                return isDesktop
                    ? "Could not reach Ollama. Check that it is running, and that OLLAMA_ORIGINS allows the desktop app (see Settings → Local AI)."
                    : "Could not reach Ollama. Check that it is running on the configured host and port.";
            case 'aborted':
                return "Response cancelled.";
            default:
                return this.message;
        }
    }
}

interface Endpoint {
    host?: string;
    port?: number;
}

const MODEL_CACHE_MS = 5_000;

class OllamaClient {
    private isUnreachable = false;
    private lastChecked = 0;
    private OFFLINE_RETRY_MS = 60_000;

    private modelCache: { key: string; models: string[]; at: number } | null = null;

    private getBaseUrl(endpoint?: Endpoint) {
        const settings = getAISettings();
        const targetPort = endpoint?.port ?? settings.port;
        const targetHost = endpoint?.host ?? settings.host ?? 'localhost';

        // Loopback only: the privacy promise is that shop data never leaves this machine.
        const host = targetHost === '127.0.0.1' ? '127.0.0.1' : 'localhost';

        if (!isValidLocalAIPort(targetPort)) {
            console.error("Invalid AI port. Falling back to default.");
            return `http://${host}:11434`;
        }

        return `http://${host}:${targetPort}`;
    }

    private markOffline() {
        this.isUnreachable = true;
        this.lastChecked = Date.now();
    }

    private checkIfOffline() {
        if (this.isUnreachable && Date.now() - this.lastChecked < this.OFFLINE_RETRY_MS) {
            return true;
        }
        this.isUnreachable = false;
        return false;
    }

    /**
     * Clears the cached offline status.
     * Call this when settings change or when the user manually triggers a test.
     */
    resetStatus() {
        this.isUnreachable = false;
        this.lastChecked = 0;
        this.modelCache = null;
    }

    /**
     * Turns a fetch failure into a typed error. HTTP status codes are the
     * signal here, not error-message text.
     */
    private async toOllamaError(res: Response): Promise<OllamaError> {
        const body = await res.text().catch(() => "");
        if (res.status === 404 || /model .*not found|no such model/i.test(body)) {
            return new OllamaError('model_missing', body || "Model not found", res.status);
        }
        return new OllamaError('http', `Ollama error ${res.status}: ${body}`.trim(), res.status);
    }

    private classifyThrown(error: unknown, timedOut: boolean, externalAbort: boolean): OllamaError {
        if (error instanceof OllamaError) return error;
        if (timedOut) return new OllamaError('timeout', "Ollama request timed out");
        if (externalAbort) return new OllamaError('aborted', "Request cancelled");
        if (error instanceof TypeError) {
            this.markOffline();
            return new OllamaError('offline', "Could not reach the Ollama server");
        }
        return new OllamaError('http', error instanceof Error ? error.message : String(error));
    }

    private buildRequest(messages: ChatMessage[], stream: boolean): OllamaChatRequest {
        const settings = getAISettings();
        return {
            model: settings.model,
            messages,
            stream,
            options: {
                num_ctx: settings.contextLength,
                temperature: settings.temperature,
            },
        };
    }

    // ---- Chat API (multi-turn, streaming) ----

    /**
     * Streaming chat: yields partial tokens as they arrive.
     * Uses the /api/chat endpoint with messages[] for conversation memory.
     */
    async *chatStream(
        messages: ChatMessage[],
        onAbort?: AbortSignal,
    ): AsyncGenerator<string, void, unknown> {
        const settings = getAISettings();
        if (!settings.enabled) throw new OllamaError('disabled', "Local AI is disabled in settings.");

        if (this.checkIfOffline()) {
            throw new OllamaError('offline', "Ollama is unreachable (cached status)");
        }

        const controller = new AbortController();
        let timedOut = false;
        let externalAbort = false;

        /*
         * An idle timeout, not a whole-request one.
         *
         * A single timer armed before the fetch aborted the request `requestTimeoutMs` after it
         * started, however healthy the stream was — so a model answering steadily but slowly, the
         * normal case for a large model on a laptop, was cut off mid-sentence and reported as a
         * timeout. What the timeout is for is a server that has stopped responding, so it is
         * restarted each time a chunk arrives.
         */
        let timeout = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, settings.requestTimeoutMs);

        const resetIdleTimeout = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                timedOut = true;
                controller.abort();
            }, settings.requestTimeoutMs);
        };

        // Bridge the caller's signal, and always detach it again — the old
        // listener was never removed, so every message leaked one.
        const forwardAbort = () => {
            externalAbort = true;
            controller.abort();
        };
        if (onAbort) {
            if (onAbort.aborted) forwardAbort();
            else onAbort.addEventListener("abort", forwardAbort, { once: true });
        }

        try {
            const res = await fetch(`${this.getBaseUrl()}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(this.buildRequest(messages, true)),
                signal: controller.signal,
            });

            if (!res.ok) throw await this.toOllamaError(res);

            const reader = res.body?.getReader();
            if (!reader) throw new OllamaError('http', "No response body");

            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // The server is still answering, so the idle clock starts again.
                resetIdleTimeout();

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // keep incomplete line in buffer

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const chunk: OllamaChatResponse = JSON.parse(line);
                        if (chunk.message?.content) {
                            yield chunk.message.content;
                        }
                    } catch {
                        // skip malformed JSON lines
                    }
                }
            }
        } catch (error: unknown) {
            throw this.classifyThrown(error, timedOut, externalAbort);
        } finally {
            clearTimeout(timeout);
            onAbort?.removeEventListener("abort", forwardAbort);
        }
    }

    /**
     * Non-streaming chat (for simple one-shot internal calls).
     */
    async chat(messages: ChatMessage[], onAbort?: AbortSignal): Promise<OllamaChatResponse> {
        const settings = getAISettings();
        if (!settings.enabled) throw new OllamaError('disabled', "Local AI is disabled in settings.");

        if (this.checkIfOffline()) {
            throw new OllamaError('offline', "Ollama is unreachable (cached status)");
        }

        const controller = new AbortController();
        let timedOut = false;
        let externalAbort = false;

        const timeout = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, settings.requestTimeoutMs);

        const forwardAbort = () => {
            externalAbort = true;
            controller.abort();
        };
        if (onAbort) {
            if (onAbort.aborted) forwardAbort();
            else onAbort.addEventListener("abort", forwardAbort, { once: true });
        }

        try {
            const res = await fetch(`${this.getBaseUrl()}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(this.buildRequest(messages, false)),
                signal: controller.signal,
            });

            if (!res.ok) throw await this.toOllamaError(res);

            return await res.json();
        } catch (error: unknown) {
            throw this.classifyThrown(error, timedOut, externalAbort);
        } finally {
            clearTimeout(timeout);
            onAbort?.removeEventListener("abort", forwardAbort);
        }
    }

    async testConnection(endpoint?: Endpoint): Promise<boolean> {
        try {
            const res = await fetch(`${this.getBaseUrl(endpoint)}/api/tags`, {
                signal: AbortSignal.timeout(5000),
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    /**
     * Installed model names. Cached briefly so the status poll and the settings
     * page don't hit the server twice for the same answer.
     */
    async listModels(endpoint?: Endpoint): Promise<string[]> {
        const base = this.getBaseUrl(endpoint);

        if (this.modelCache && this.modelCache.key === base && Date.now() - this.modelCache.at < MODEL_CACHE_MS) {
            return this.modelCache.models;
        }

        try {
            const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(5000) });
            if (!res.ok) return [];
            const data = await res.json();
            const models: string[] = data.models?.map((m: { name: string }) => m.name) || [];
            this.modelCache = { key: base, models, at: Date.now() };
            return models;
        } catch {
            return [];
        }
    }
}

export const ollamaClient = new OllamaClient();
