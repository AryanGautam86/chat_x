import { useEffect, useRef, useState } from "react";

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();

  const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", resolve);
      existing.addEventListener("error", reject);
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load Google sign-in."));
    document.head.appendChild(script);
  });
}

/**
 * Google Identity Services button.
 *
 * Renders nothing unless the server reports a configured client ID, so the app
 * never shows a sign-in option that cannot work. onCredential receives the ID
 * token, which the backend verifies — the browser is not trusted here.
 */
function GoogleButton({ clientId, onCredential, onError }) {
  const holder = useRef(null);
  const [failed, setFailed] = useState("");

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !holder.current) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            if (credential) onCredential(credential);
            else onError?.("Google did not return a credential.");
          },
        });

        window.google.accounts.id.renderButton(holder.current, {
          theme: "filled_black",
          size: "large",
          width: 320,
          text: "continue_with",
          shape: "pill",
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setFailed("Google sign-in could not load. Check your connection.");
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential, onError]);

  if (!clientId) return null;

  if (failed) {
    return <p className="text-sm text-amber-400 text-center">{failed}</p>;
  }

  return <div ref={holder} className="flex justify-center" />;
}

export default GoogleButton;
