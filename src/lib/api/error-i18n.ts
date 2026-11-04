import type { ApiErrorCode } from "@/types/api";

/**
 * Server messages are English. In other UI languages errorMessage() asks
 * this translator (registered by <ApiErrorTranslator/> in the root layout)
 * for a localized message by error code first.
 */
type Translator = (code: ApiErrorCode | "NETWORK" | "UNKNOWN") => string;

let translator: Translator | null = null;

export function setApiErrorTranslator(fn: Translator | null) {
  translator = fn;
}

export function translateApiErrorCode(code: ApiErrorCode | "NETWORK" | "UNKNOWN"): string | null {
  return translator ? translator(code) : null;
}
