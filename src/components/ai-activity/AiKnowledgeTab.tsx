"use client";

import { useMemo, useState } from "react";
import { downloadText, hueOf, inkMix, knowledgeMarkdown, tint, topicBase } from "@/lib/ai-activity/format";
import type { KnowledgeNote } from "@/lib/ai-activity/types";
import { BADGE, BTN_GHOST_SM, BTN_SM, CARD, INPUT } from "@/components/ai-activity/AiStyles";
import { CHIP, COUNT } from "@/components/ai-activity/AiStyles";

const LABEL = { fontSize: 12.5, fontWeight: 500, color: "var(--muted-foreground)" } as const;

function techTint(tech: string) {
  const base = topicBase(hueOf(tech));
  return { bg: tint(base, 14), fg: inkMix(base) };
}

function NoteCard({
  note,
  focused,
  hasPrompt,
  onViewPrompt,
  onDelete,
}: {
  note: KnowledgeNote;
  focused: boolean;
  hasPrompt: boolean;
  onViewPrompt: (note: KnowledgeNote) => void;
  onDelete: (note: KnowledgeNote) => void;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    };
    navigator.clipboard?.writeText(knowledgeMarkdown(note)).then(done, done);
  }

  const meta = [
    note.user,
    note.project,
    new Date(note.createdAt).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      data-kb={note.id}
      style={{
        ...CARD,
        padding: "20px 24px",
        border: `1px solid ${focused ? "var(--ring)" : "var(--border)"}`,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 16.5, letterSpacing: "-0.01em", textWrap: "pretty" }}>
          {note.title}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          {note.technologies.map((tech) => {
            const t = techTint(tech);
            return (
              <span key={tech} style={{ ...BADGE, background: t.bg, color: t.fg }}>
                {tech}
              </span>
            );
          })}
          {note.subject && (
            <span style={{ ...BADGE, border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
              {note.subject}
            </span>
          )}
          <span style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginLeft: 4 }}>{meta}</span>
        </div>
      </div>

      {note.summary && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, textWrap: "pretty" }}>{note.summary}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: 16,
        }}
      >
        {note.steps.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={LABEL}>Passos</div>
            {note.steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 8, fontSize: 13.5, lineHeight: 1.5 }}>
                <span
                  style={{ flex: "none", width: 18, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}
                >
                  {i + 1}.
                </span>
                <span style={{ textWrap: "pretty" }}>{step}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          {note.connection && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
              <div style={LABEL}>Conexão</div>
              <pre
                style={{
                  margin: 0,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--muted)",
                  font: "400 12px/1.6 var(--mono)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {note.connection}
              </pre>
            </div>
          )}
          {note.gotchas.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={LABEL}>Atenção</div>
              {note.gotchas.map((gotcha, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 13.5, lineHeight: 1.5 }}>
                  <span style={{ flex: "none", color: "var(--wait)" }}>▲</span>
                  <span style={{ textWrap: "pretty" }}>{gotcha}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {note.snippets.map((snippet, i) => (
        <div key={i} style={{ borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden" }}>
          <div
            style={{
              padding: "6px 12px",
              font: "500 11.5px var(--mono)",
              color: "var(--muted-foreground)",
              borderBottom: "1px solid var(--border)",
              background: "var(--muted)",
            }}
          >
            {snippet.lang}
          </div>
          <pre style={{ margin: 0, padding: "10px 12px", font: "400 12.5px/1.6 var(--mono)", whiteSpace: "pre-wrap", overflow: "auto" }}>
            {snippet.code}
          </pre>
        </div>
      ))}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button onClick={copy} className="hv-accent" style={BTN_SM}>
          {copied ? "Copiado" : "Copiar Markdown"}
        </button>
        {hasPrompt && (
          <button onClick={() => onViewPrompt(note)} className="hv-fg" style={BTN_GHOST_SM}>
            Ver pedido de origem
          </button>
        )}
        <button onClick={() => onDelete(note)} className="hv-fg" style={{ ...BTN_GHOST_SM, marginLeft: "auto" }}>
          Apagar nota
        </button>
      </div>
    </article>
  );
}

export function AiKnowledgeTab({
  notes,
  loading,
  focusId,
  promptIds,
  onViewPrompt,
  onDelete,
  onDeleteAll,
}: {
  notes: KnowledgeNote[];
  loading: boolean;
  focusId: string | null;
  promptIds: Set<string>;
  onViewPrompt: (note: KnowledgeNote) => void;
  onDelete: (note: KnowledgeNote) => void;
  onDeleteAll: () => void;
}) {
  const [query, setQuery] = useState("");
  const [tech, setTech] = useState<string | null>(null);

  const techCount = useMemo(() => {
    const count: Record<string, number> = {};
    for (const note of notes) for (const t of note.technologies) count[t] = (count[t] ?? 0) + 1;
    return count;
  }, [notes]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter(
      (note) =>
        (!tech || note.technologies.includes(tech)) &&
        (!q ||
          JSON.stringify([
            note.title,
            note.summary,
            note.technologies,
            note.steps,
            note.connection,
            note.user,
            note.project,
            note.subject,
          ])
            .toLowerCase()
            .includes(q))
    );
  }, [notes, query, tech]);

  const techs = Object.keys(techCount).sort((a, b) => techCount[b] - techCount[a] || a.localeCompare(b));
  const chips = [{ label: "Todas", n: notes.length, value: null as string | null }].concat(
    techs.map((t) => ({ label: t, n: techCount[t], value: t }))
  );

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 14px" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por tecnologia, sistema, passo, conexão…"
          style={{ ...INPUT, flex: "1 1 260px", maxWidth: 420 }}
        />
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button
            onClick={() =>
              downloadText("base-de-conhecimento.md", shown.map(knowledgeMarkdown).join("\n---\n\n"), "text/markdown")
            }
            className="hv-accent"
            style={BTN_SM}
          >
            Exportar Markdown
          </button>
          <button
            onClick={() =>
              downloadText("base-de-conhecimento.json", JSON.stringify(shown, null, 2), "application/json")
            }
            className="hv-accent"
            style={BTN_SM}
          >
            Exportar JSON
          </button>
          {notes.length > 0 && (
            <button onClick={onDeleteAll} className="hv-accent" style={BTN_SM}>
              Apagar tudo
            </button>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {chips.map((chip) => {
          const on = tech === chip.value;
          return (
            <button
              key={chip.label}
              onClick={() => setTech(chip.value === tech ? null : chip.value)}
              style={{
                ...CHIP,
                border: `1px solid ${on ? "var(--primary)" : "var(--border)"}`,
                background: on ? "var(--primary)" : "transparent",
                color: on ? "var(--primary-foreground)" : "var(--foreground)",
              }}
            >
              {chip.label}
              <span style={COUNT}>{chip.n}</span>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
        {notes.length} {notes.length === 1 ? "nota" : "notas"} · {techs.length} tecnologias · salvas no Supabase
      </div>
      {!shown.length && (
        <div
          style={{
            padding: "48px 20px",
            textAlign: "center",
            border: "1px dashed var(--border)",
            borderRadius: 12,
            fontSize: 14,
            color: "var(--muted-foreground)",
            lineHeight: 1.6,
          }}
        >
          {loading
            ? "Carregando…"
            : notes.length
              ? "Nenhuma nota corresponde à busca."
              : "Ainda não há conhecimento registrado. Ele chega no envio final de cada pedido, quando a IA usou alguma tecnologia reutilizável."}
        </div>
      )}
      {shown.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          focused={focusId === note.id}
          hasPrompt={!!note.promptId && promptIds.has(note.promptId)}
          onViewPrompt={onViewPrompt}
          onDelete={onDelete}
        />
      ))}
    </section>
  );
}
