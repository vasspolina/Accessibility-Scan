import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Library-mode build: bundles React itself (host pages can't be assumed to
// already have it) into a single self-contained IIFE. Styles are imported
// via Vite's `?inline` query and injected manually into the widget's Shadow
// DOM root at mount time (see utils/shadowMount.ts) rather than appended to
// document.head, so the bundle stays a single JS file with no separate CSS
// asset for the embedder to remember.
// `vite build --mode gemini` (and `vite --mode gemini` for the harness) swaps
// the stylesheet for styles/gemini.css and writes widget-business-gemini.js,
// for backend/public/demo-gemini.html (user's instruction, 26 Nov 2026: copy
// the demo, strip all CSS, design it like the Gemini app). The product bundle
// and global.css are untouched by it.
const geminiStyles = path.resolve(__dirname, "src/styles/gemini.css");
function geminiTheme(): Plugin {
  return {
    name: "gemini-theme",
    enforce: "pre",
    resolveId(source) {
      return /styles\/global\.css\?inline$/.test(source) ? `${geminiStyles}?inline` : null;
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: mode === "gemini" ? [geminiTheme(), react()] : [react()],
  server: {
    // widget/ already claims 5173 — distinct port so both dev servers can
    // run side by side.
    port: 5174,
  },
  // Vite's automatic process.env.NODE_ENV replacement doesn't reach the
  // bundled react-dom CJS internals in this lib-mode IIFE build, which left
  // a literal `process.env.NODE_ENV` reference in the output — throws
  // ReferenceError in the browser (no `process` global there) the instant
  // react-dom's module body evaluates, before any of our own code runs.
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.tsx"),
      name: "A11yWidgetBusiness",
      formats: ["iife"],
      fileName: () => (mode === "gemini" ? "widget-business-gemini.js" : "widget-business.js"),
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
}));
