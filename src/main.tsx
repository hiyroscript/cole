import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/app.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
if (
  "serviceWorker" in navigator &&
  import.meta.env.PROD &&
  location.protocol !== "chrome-extension:"
) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      location.reload();
    }
  });
  void navigator.serviceWorker
    .register(import.meta.env.BASE_URL + "sw.js")
    .then((reg) => {
      const notify = () =>
        window.dispatchEvent(new CustomEvent("varek-update", { detail: reg }));
      if (reg.waiting) notify();
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        worker?.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          )
            notify();
        });
      });
    })
    .catch(() => {
      /* Offline cache unavailable; the online app remains usable. */
    });
}
