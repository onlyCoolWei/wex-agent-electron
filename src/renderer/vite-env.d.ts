/// <reference types="vite/client" />

import type { WexAgentAPI } from "../../electron/preload";

declare global {
  interface Window {
    wexAgent: WexAgentAPI;
  }
}
