import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import useAuthStore from "./store/authStore";

// initialize persisted auth session (sessionStorage)
try {
  useAuthStore.getState().initialize();
} catch (e) {}

createRoot(document.getElementById("root")).render(<App />);
