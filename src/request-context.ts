import { AsyncLocalStorage } from "node:async_hooks";
import { errorCategory } from "./telemetry.js";

const requestSignalStorage = new AsyncLocalStorage<AbortSignal>();
const widgetFallbackStorage = new AsyncLocalStorage<boolean>();

export function withWidgetFallback<T>(enabled: boolean, run: () => T): T {
  return widgetFallbackStorage.run(enabled, run);
}

export function needsWidgetFallback(): boolean {
  return widgetFallbackStorage.getStore() === true;
}
interface RequestTelemetry {
  requestId: string;
  analyticsIdentity?: { userId: string; clientName: string };
}
const requestTelemetryStorage = new AsyncLocalStorage<RequestTelemetry>();

export function runWithRequestTelemetry<T>(
  requestId: string,
  callback: () => T,
  analyticsIdentity?: RequestTelemetry["analyticsIdentity"],
): T {
  return requestTelemetryStorage.run(
    { requestId, analyticsIdentity },
    callback,
  );
}

export function requestTelemetry(): { requestId?: string } {
  const requestId = requestTelemetryStorage.getStore()?.requestId;
  return requestId ? { requestId } : {};
}

export function runWithRequestSignal<T>(
  signal: AbortSignal | undefined,
  callback: () => T,
): T {
  return signal ? requestSignalStorage.run(signal, callback) : callback();
}

export function upstreamSignal(
  timeoutMs: number,
  explicitSignal?: AbortSignal,
): AbortSignal {
  const signals = [
    explicitSignal,
    requestSignalStorage.getStore(),
    AbortSignal.timeout(timeoutMs),
  ].filter((signal): signal is AbortSignal => signal !== undefined);

  return signals.length === 1 ? signals[0] : AbortSignal.any(signals);
}

export function requestAnalyticsIdentity() {
  return requestTelemetryStorage.getStore()?.analyticsIdentity;
}

/** SDK cancellation reasons may be plain Error objects, not AbortError. */
export function requestErrorCategory(
  error: unknown,
  signal = requestSignalStorage.getStore(),
): string {
  if (signal?.aborted)
    return errorCategory(signal.reason) === "timeout" ? "timeout" : "cancelled";
  return errorCategory(error);
}
