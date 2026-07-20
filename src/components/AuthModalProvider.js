"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from "react";
import { useRouter } from "next/navigation";

import AuthPanel from "@/components/AuthPanel";

const AuthModalContext = createContext({
  openAuth: () => {},
  closeAuth: () => {},
  isOpen: false
});

export function useAuthModal() {
  return useContext(AuthModalContext);
}

export default function AuthModalProvider({ children }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [initialMode, setInitialMode] = useState("sign-in");

  const openAuth = useCallback((mode = "sign-in") => {
    setInitialMode(mode === "sign-up" ? "sign-up" : "sign-in");
    setIsOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event) {
      if (event.key === "Escape") {
        closeAuth();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, closeAuth]);

  function handleSignInSuccess() {
    closeAuth();
  }

  function handleSignUpSuccess() {
    closeAuth();
    router.push("/account");
  }

  return (
    <AuthModalContext.Provider value={{ openAuth, closeAuth, isOpen }}>
      {children}

      {isOpen && (
        <div
          className="auth-modal-overlay"
          role="presentation"
          onClick={closeAuth}
        >
          <div
            className="auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="auth-modal-close"
              onClick={closeAuth}
              aria-label="Close"
            >
              ×
            </button>

            <h2 id="auth-modal-title" className="auth-modal-sr-title">
              {initialMode === "sign-up" ? "Create account" : "Sign in"}
            </h2>

            <AuthPanel
              initialMode={initialMode}
              showTitle
              onSignInSuccess={handleSignInSuccess}
              onSignUpSuccess={handleSignUpSuccess}
            />
          </div>
        </div>
      )}
    </AuthModalContext.Provider>
  );
}
