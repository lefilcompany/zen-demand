import { useEffect, useCallback, useState } from "react";
import { useBlocker } from "react-router-dom";

const WARNING_DISABLED_KEY = "draft-exit-warning-disabled";

interface UseNavigationBlockOptions {
  shouldBlock: boolean;
}

export function useNavigationBlock({ shouldBlock }: UseNavigationBlockOptions) {
  const [isWarningDisabled, setIsWarningDisabled] = useState(() => {
    try {
      return localStorage.getItem(WARNING_DISABLED_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Use react-router's useBlocker for internal navigation
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldBlock &&
      !isWarningDisabled &&
      currentLocation.pathname !== nextLocation.pathname
  );

  // Handle browser's beforeunload for external navigation/tab close
  useEffect(() => {
    if (!shouldBlock) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldBlock]);

  const confirmNavigation = useCallback(() => {
    if (blocker.state === "blocked") {
      blocker.proceed();
    }
  }, [blocker]);

  const cancelNavigation = useCallback(() => {
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  }, [blocker]);

  const setDontShowAgain = useCallback((value: boolean) => {
    try {
      if (value) {
        localStorage.setItem(WARNING_DISABLED_KEY, "true");
      } else {
        localStorage.removeItem(WARNING_DISABLED_KEY);
      }
      setIsWarningDisabled(value);
    } catch (error) {
      console.error("Error saving warning preference:", error);
    }
  }, []);

  return {
    isBlocked: blocker.state === "blocked",
    isWarningDisabled,
    confirmNavigation,
    cancelNavigation,
    setDontShowAgain,
  };
}
