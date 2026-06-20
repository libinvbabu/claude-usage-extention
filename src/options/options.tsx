import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OptionsPage } from "./OptionsPage";
import "../styles/options.css";

const el = document.getElementById("root");
if (el) {
  createRoot(el).render(
    <StrictMode>
      <OptionsPage />
    </StrictMode>,
  );
}
