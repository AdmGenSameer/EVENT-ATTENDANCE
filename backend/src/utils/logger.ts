type LogContext = string;

type LogPayload = Record<string, unknown> | string | number | boolean | null | undefined;

const formatPayload = (payload?: LogPayload) => {
  if (payload === undefined) {
    return "";
  }
  if (typeof payload === "string") {
    return payload;
  }
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
};

export const logInfo = (context: LogContext, message: string, payload?: LogPayload) => {
  const data = formatPayload(payload);
  const suffix = data ? ` | ${data}` : "";
  console.info(`[INFO] ${context} - ${message}${suffix}`);
};

export const logWarn = (context: LogContext, message: string, error?: unknown) => {
  const detail = error instanceof Error ? error.message : formatPayload(error as LogPayload);
  const suffix = detail ? ` | ${detail}` : "";
  console.warn(`[WARN] ${context} - ${message}${suffix}`);
};
