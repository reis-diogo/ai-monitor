"use client";

import { Modal } from "@/components/ai-activity/AiBits";
import { BTN, BTN_PRIMARY } from "@/components/ai-activity/AiStyles";

export type ConfirmRequest = {
  title: string;
  description: string;
  confirmLabel: string;
  run: () => Promise<void>;
};

export function AiConfirm({
  request,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  request: ConfirmRequest | null;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={!!request} onClose={onCancel}>
      <div
        style={{
          width: "min(440px, calc(100vw - 32px))",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: 24,
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--background)",
          boxShadow: "0 25px 50px -12px oklch(0 0 0 / 0.25)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontWeight: 600, fontSize: 18, letterSpacing: "-0.01em" }}>{request?.title}</div>
          <div style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{request?.description}</div>
          {error && <div style={{ fontSize: 13, color: "var(--err)" }}>{error}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} className="hv-accent" style={BTN}>
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="hv-op"
            style={{ ...BTN_PRIMARY, background: "var(--err)", color: "oklch(0.985 0 0)", opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "Apagando…" : request?.confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
