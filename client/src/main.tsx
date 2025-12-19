import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./index.css";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

if (!clientId) {
 console.warn("Missing VITE_GOOGLE_CLIENT_ID environment variable for Google Sign-In");
}

createRoot(document.getElementById("root")!).render(
 <GoogleOAuthProvider clientId={clientId}>
  <App />
 </GoogleOAuthProvider>
);
