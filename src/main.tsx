import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerShareTarget } from "./lib/registerShareTarget";

registerShareTarget();

createRoot(document.getElementById("root")!).render(<App />);
