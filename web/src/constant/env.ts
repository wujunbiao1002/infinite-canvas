export const APP_VERSION = __APP_VERSION__ || "dev";

export const DOCS_URL = import.meta.env.VITE_DOC_URL || "https://docs.canvas.best";
export const SUB2API_BASE_URL = import.meta.env.VITE_SUB2API_BASE_URL || "https://tokenhub.junly.top";
export const TOKENHUB_LOGIN_URL = import.meta.env.VITE_TOKENHUB_LOGIN_URL || "https://tokenhub.junly.top/login";

// Official plugin registry URL: CI publishes to plugins-dist for jsDelivr delivery; an environment variable may override it for self-hosting.
export const PLUGIN_REGISTRY_URL = import.meta.env.VITE_PLUGIN_REGISTRY_URL || "https://cdn.jsdelivr.net/gh/basketikun/infinite-canvas@plugins-dist/official-plugins.json";
