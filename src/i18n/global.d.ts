import type { Locale } from "./config";
import type { Messages } from "./messages-en";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
