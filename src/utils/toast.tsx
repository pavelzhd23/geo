import { useEffect } from "react";
import { createRoot } from "react-dom/client";

export type ToastKind = "info" | "success" | "error";

interface ToastItem {
  id: number;
  text: string;
  kind: ToastKind;
}

let nextId = 1;
let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;
let items: ToastItem[] = [];

function render() {
  if (!container) return;
  if (!root) {
    root = createRoot(container);
    document.body.appendChild(container);
  }
  root.render(
    <div className="toast-container">
      {items.map((t) => (
        <Toast key={t.id} item={t} />
      ))}
    </div>
  );
}

function Toast({ item }: { item: ToastItem }) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(item.id), 4000);
    return () => clearTimeout(timer);
  }, [item.id]);
  return <div className={`toast toast-${item.kind}`}>{item.text}</div>;
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  render();
}

export function showToast(text: string, kind: ToastKind = "info") {
  if (!container) container = document.createElement("div");
  items = [...items, { id: nextId++, text, kind }];
  render();
}

export function translateCategory(t: (key: string, opts?: any) => string, category: string): string {
  if (!category) return "";
  const key = `category.${category}`;
  const translated = t(key, { defaultValue: "" });
  return translated || category;
}
