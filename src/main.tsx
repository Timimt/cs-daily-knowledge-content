import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark-dimmed.css";
import "./styles.css";
import { ThemeProvider } from "./lib/theme";

const isStaticSite = import.meta.env.VITE_STATIC_SITE === "true";

async function bootstrap() {
  const root = createRoot(document.getElementById("root")!);
  if (isStaticSite) {
    const { StaticApp } = await import("./static/StaticApp");
    root.render(
      <StrictMode>
        <ThemeProvider>
          <StaticApp />
        </ThemeProvider>
      </StrictMode>,
    );
    return;
  }

  const [{ default: App }, { AuthProvider }] = await Promise.all([
    import("./App"),
    import("./lib/auth"),
  ]);
  root.render(
    <StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}

void bootstrap();
