import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  buildTemplateGalleryUrl,
  type TemplatePreviewDeviceType,
} from "./template-previews.js";

type PendingSelection = {
  allowedTemplateIds: Set<string>;
  resolve: (templateId: string) => void;
  reject: (error: Error) => void;
  promise: Promise<string>;
  timeout: NodeJS.Timeout;
  completionNotifier?: () => Promise<void>;
  settled: boolean;
};

type CreateSelectionArgs = {
  baseUrl: string;
  deviceType: TemplatePreviewDeviceType;
  templateIds?: string[];
  selectedTemplateId?: string;
  title?: string;
  timeoutMs?: number;
};

function sendHtml(
  response: ServerResponse,
  statusCode: number,
  html: string,
): void {
  response.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(html);
}

function successHtml(templateId: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Template Selected</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; background: #f3f0ea; color: #0f172a; display: grid; place-items: center; min-height: 100vh; margin: 0; }
      main { max-width: 520px; background: white; border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 24px; padding: 32px; box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12); text-align: center; }
      h1 { margin: 0 0 12px; font-size: 28px; }
      p { margin: 0; line-height: 1.6; color: #475569; }
      strong { color: #0f172a; }
    </style>
  </head>
  <body>
    <main>
      <h1>Template selected</h1>
      <p>Your choice <strong>${templateId}</strong> was sent back to the MCP flow. You can return to the chat now.</p>
    </main>
    <script>
      setTimeout(() => {
        try { window.close(); } catch {}
      }, 1200);
    </script>
  </body>
</html>`;
}

function errorHtml(message: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Template Selection Error</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; background: #fff5f5; color: #7f1d1d; display: grid; place-items: center; min-height: 100vh; margin: 0; }
      main { max-width: 520px; background: white; border: 1px solid rgba(127, 29, 29, 0.12); border-radius: 24px; padding: 32px; box-shadow: 0 24px 80px rgba(127, 29, 29, 0.08); text-align: center; }
      h1 { margin: 0 0 12px; font-size: 28px; }
      p { margin: 0; line-height: 1.6; color: #991b1b; }
    </style>
  </head>
  <body>
    <main>
      <h1>Selection failed</h1>
      <p>${message}</p>
    </main>
  </body>
</html>`;
}

export class TemplateSelectionCoordinator {
  private server = createServer((request, response) => {
    void this.handleRequest(request, response);
  });

  private listenPromise: Promise<void> | null = null;
  private port: number | null = null;
  private pendingSelections = new Map<string, PendingSelection>();

  private async ensureListening(): Promise<void> {
    if (this.port !== null) {
      return;
    }

    if (this.listenPromise) {
      await this.listenPromise;
      return;
    }

    this.listenPromise = new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(0, "127.0.0.1", () => {
        const address = this.server.address();
        if (!address || typeof address === "string") {
          reject(new Error("Failed to start template selection server"));
          return;
        }

        this.port = address.port;
        this.server.unref();
        this.server.off("error", reject);
        resolve();
      });
    });

    await this.listenPromise;
  }

  async createSelection(args: CreateSelectionArgs): Promise<{
    galleryUrl: string;
    callbackUrl: string;
    setCompletionNotifier: (notifier: (() => Promise<void>) | undefined) => void;
    waitForSelection: (signal?: AbortSignal) => Promise<string>;
    cleanup: () => void;
  }> {
    await this.ensureListening();

    const selectionId = randomUUID();
    const allowedTemplateIds = new Set(args.templateIds || []);

    let resolveSelection!: (templateId: string) => void;
    let rejectSelection!: (error: Error) => void;
    const promise = new Promise<string>((resolve, reject) => {
      resolveSelection = resolve;
      rejectSelection = reject;
    });
    promise.catch(() => undefined);

    const timeout = setTimeout(() => {
      const pending = this.pendingSelections.get(selectionId);
      if (!pending || pending.settled) {
        return;
      }

      pending.settled = true;
      this.pendingSelections.delete(selectionId);
      pending.reject(new Error("Template selection timed out"));
    }, args.timeoutMs ?? 5 * 60 * 1000);

    this.pendingSelections.set(selectionId, {
      allowedTemplateIds,
      resolve: resolveSelection,
      reject: rejectSelection,
      promise,
      timeout,
      settled: false,
    });

    const callbackUrl = `http://127.0.0.1:${this.port}/template-selection/select?selectionId=${encodeURIComponent(selectionId)}`;
    const galleryUrl = buildTemplateGalleryUrl(args.baseUrl, {
      deviceType: args.deviceType,
      templateIds: args.templateIds,
      selectedTemplateId: args.selectedTemplateId,
      title: args.title,
      returnTo: callbackUrl,
    });

    const cleanup = () => {
      const pending = this.pendingSelections.get(selectionId);
      if (!pending) {
        return;
      }

      clearTimeout(pending.timeout);
      this.pendingSelections.delete(selectionId);
      if (!pending.settled) {
        pending.settled = true;
        pending.reject(new Error("Template selection cancelled"));
      }
    };

    return {
      galleryUrl,
      callbackUrl,
      setCompletionNotifier: (notifier) => {
        const pending = this.pendingSelections.get(selectionId);
        if (pending) {
          pending.completionNotifier = notifier;
        }
      },
      waitForSelection: async (signal) => {
        const pending = this.pendingSelections.get(selectionId);
        if (!pending) {
          throw new Error("Template selection is no longer active");
        }

        const abortPromise = signal
          ? new Promise<string>((_, reject) => {
              const onAbort = () => {
                signal.removeEventListener("abort", onAbort);
                cleanup();
                reject(new Error("Template selection was aborted"));
              };
              signal.addEventListener("abort", onAbort, { once: true });
              pending.promise.finally(() =>
                signal.removeEventListener("abort", onAbort),
              );
            })
          : null;

        return abortPromise
          ? Promise.race([pending.promise, abortPromise])
          : pending.promise;
      },
      cleanup,
    };
  }

  async close(): Promise<void> {
    for (const [selectionId, pending] of this.pendingSelections) {
      clearTimeout(pending.timeout);
      if (!pending.settled) {
        pending.settled = true;
        pending.reject(new Error("Template selection server closed"));
      }
      this.pendingSelections.delete(selectionId);
    }

    if (!this.listenPromise) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private async handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const url = new URL(request.url || "/", "http://127.0.0.1");

    if (request.method !== "GET" || url.pathname !== "/template-selection/select") {
      sendHtml(response, 404, errorHtml("Unknown template selection route."));
      return;
    }

    const selectionId = url.searchParams.get("selectionId");
    const templateId = url.searchParams.get("templateId");

    if (!selectionId || !templateId) {
      sendHtml(
        response,
        400,
        errorHtml("Missing selection id or template id in callback URL."),
      );
      return;
    }

    const pending = this.pendingSelections.get(selectionId);
    if (!pending) {
      sendHtml(response, 410, errorHtml("This template selection has expired."));
      return;
    }

    if (
      pending.allowedTemplateIds.size > 0 &&
      !pending.allowedTemplateIds.has(templateId)
    ) {
      sendHtml(
        response,
        400,
        errorHtml("That template is not part of the allowed selection set."),
      );
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingSelections.delete(selectionId);

    if (!pending.settled) {
      pending.settled = true;
      pending.resolve(templateId);
    }

    try {
      await pending.completionNotifier?.();
    } catch {
      // The selection itself is already resolved; notification failure should not block the user.
    }

    sendHtml(response, 200, successHtml(templateId));
  }
}
