"use client";

import { useEffect, useState } from "react";
import { Modal, Svg } from "@/components/ai-activity/AiBits";
import { BTN, BTN_PRIMARY, INPUT } from "@/components/ai-activity/AiStyles";

export function AiConnectModal({
  open,
  defaultName,
  onClose,
}: {
  open: boolean;
  defaultName: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function flashCopied() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-activity/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar o prompt.");
      setPrompt(data.installPrompt as string);
      await navigator.clipboard?.writeText(data.installPrompt).catch(() => {});
      flashCopied();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar o prompt.");
    } finally {
      setBusy(false);
    }
  }

  function copyAgain() {
    if (prompt) navigator.clipboard?.writeText(prompt).then(flashCopied, flashCopied);
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div
        style={{
          width: "min(720px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 48px)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: 24,
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--background)",
          boxShadow: "0 25px 50px -12px oklch(0 0 0 / 0.25)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontWeight: 600, fontSize: 18, letterSpacing: "-0.01em" }}>Prompt para a IA</div>
            <div style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              1. Informe seu nome · 2. Gere o prompt, que cria um token só seu · 3. Cole no Claude Code para instalar
              os hooks nesta máquina.
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="hv-fg"
            style={{
              border: 0,
              background: "transparent",
              color: "var(--muted-foreground)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: "2px 4px",
              borderRadius: 4,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 500 }}>Seu nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Diogo Reis"
            style={{ ...INPUT, maxWidth: 300 }}
          />
        </div>
        {error && <div style={{ fontSize: 13, color: "var(--err)" }}>{error}</div>}
        <pre
          style={{
            margin: 0,
            flex: 1,
            minHeight: 120,
            overflow: "auto",
            padding: "14px 16px",
            borderRadius: 8,
            background: "var(--muted)",
            font: "400 12.5px/1.6 var(--mono)",
            color: "var(--foreground)",
            whiteSpace: "pre-wrap",
          }}
        >
          {prompt ?? "O prompt aparece aqui depois de gerar. O token só é mostrado uma vez."}
        </pre>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
          {prompt && (
            <button onClick={copyAgain} className="hv-accent" style={BTN}>
              <Svg>
                <rect width="14" height="14" x="8" y="8" rx="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </Svg>
              {copied ? "Copiado" : "Copiar de novo"}
            </button>
          )}
          <button
            onClick={generate}
            disabled={busy || !name.trim()}
            className="hv-op"
            style={{ ...BTN_PRIMARY, padding: "0 16px", opacity: busy || !name.trim() ? 0.6 : 1 }}
          >
            {busy ? "Gerando…" : prompt ? "Gerar outro e copiar" : "Gerar e copiar prompt"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
