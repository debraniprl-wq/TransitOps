'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border transition-all animate-in slide-in-from-bottom-2 ${
              toast.type === 'success'
                ? 'bg-[#FFFEFA] border-[#C2E3D8] text-[#193C49]'
                : toast.type === 'error'
                ? 'bg-[#FFFEFA] border-[#F8B4B4] text-[#193C49]'
                : 'bg-[#FFFEFA] border-[#C7E0FA] text-[#193C49]'
            }`}
          >
            <div className="shrink-0 pt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#23866D]" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-[#D95353]" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-[#4F91D8]" />}
            </div>
            <p className="text-sm font-medium flex-1 leading-snug">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#71818A] hover:text-[#193C49] p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
