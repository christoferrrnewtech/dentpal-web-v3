import * as React from "react";

// Define the toast context type
interface ToastContextType {
  toast: (options: { title: string; description: string }) => void;
}

// Create the toast context
const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

// Create a toast provider component
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toast = React.useCallback(({ title, description }: { title: string; description: string }) => {
    // This is a simple implementation that uses alert
    // In a real application, this would be replaced with a proper toast component
    alert(`${title}\n${description}`);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
    </ToastContext.Provider>
  );
}

// Create a hook to use the toast context
export function useToast() {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Export the toast function directly for easier usage
export const toast = (options: { title: string; description: string }) => {
  // Since we can't access the context outside of a component,
  // this function will use a simple alert as fallback
  alert(`${options.title}\n${options.description}`);
};
