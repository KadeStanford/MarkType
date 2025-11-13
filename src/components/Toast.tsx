import React, { useEffect, useState, useRef } from "react";

type ToastItem = {
  id: string;
  message: string;
  type?: "info" | "success" | "error";
  visible?: boolean;
};

export default function Toasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, number>>({});
  const ANIM = 260; // ms for enter/exit animation
  const DURATION = 4200; // total visible time

  useEffect(() => {
    // expose a simple global helper for existing code to call
    (window as any).__mt_toast = (
      message: string,
      type: ToastItem["type"] = "info"
    ) => {
      const id = `${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      // add initially hidden, then mark visible to trigger CSS transition
      setToasts((t) => [...t, { id, message, type, visible: false }]);
      // small tick so the element mounts before we add 'visible'
      setTimeout(
        () =>
          setToasts((t) =>
            t.map((x) => (x.id === id ? { ...x, visible: true } : x))
          ),
        20
      );
      // schedule hide
      const hideTimer = window.setTimeout(
        () => startRemove(id),
        DURATION - ANIM
      );
      timers.current[id] = hideTimer as any;
      return id;
    };
    return () => {
      try {
        delete (window as any).__mt_toast;
      } catch (_) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRemove = (id: string) => {
    // start exit animation by toggling visible=false
    setToasts((cur) =>
      cur.map((t) => (t.id === id ? { ...t, visible: false } : t))
    );
    // after animation, actually remove
    const rm = window.setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
      delete timers.current[id];
    }, ANIM);
    timers.current[`${id}-rm`] = rm as any;
  };

  useEffect(() => {
    return () => {
      // cleanup timers on unmount
      Object.values(timers.current).forEach((id) => clearTimeout(id));
      timers.current = {};
    };
  }, []);

  const dismiss = (id: string) => {
    // immediately cancel scheduled hide and start removal
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
    startRemove(id);
  };

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.type || "info"} ${t.visible ? "show" : "hide"}`}
          role="status"
        >
          <div className="toast-msg">{t.message}</div>
          <button
            className="toast-close"
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
