import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing root");

createRoot(root).render(
  <StrictMode>
    <ThemeProvider attribute="class" forcedTheme="light">
      <TooltipProvider>
        <App />
        <Toaster duration={1800} />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
);
