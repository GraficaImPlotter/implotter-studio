import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./hooks/use-theme.tsx";
import App from "./App.tsx";
import "./index.css";

// Validate environment variables before anything else
import "@/lib/env";

// Initialize error tracking (Sentry) as early as possible
import "@/services/errorTracking";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
