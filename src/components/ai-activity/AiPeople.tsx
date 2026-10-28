"use client";

import { motion } from "motion/react";
import { fmtTokens } from "@/lib/ai-activity/format";
import type { GroupView, RowView } from "@/lib/ai-activity/view";
import { AnimatedCount, Collapse, PulseDot, Svg } from "@/components/ai-activity/AiBits";
import { BADGE, BTN, CARD } from "@/components/ai-activity/AiStyles";


export function PersonCard({
  group,
  selected,
  dimmed,
  seeded,
  onSelect,
}: {
  group: GroupView;
  selected: boolean;
  dimmed: boolean;
  seeded: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="hv-ring"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        minWidth: 0,
        textAlign: "left",
        cursor: "pointer",
        borderRadius: 12,
        border: `1px solid ${selected ? "var(--foreground)" : "var(--border)"}`,
        background: selected ? "color-mix(in oklch, var(--foreground) 5%, var(--card))" : "var(--card)",
        opacity: dimmed ? 0.6 : 1,
        color: "var(--foreground)",
        boxShadow: selected
          ? "0 0 0 1px var(--foreground), 0 8px 24px -12px oklch(0 0 0 / 0.35)"
          : "var(--shadow-xs)",
        font: "inherit",
        transition: "border-color .15s, box-shadow .15s, opacity .15s, background-color .15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, width: "100%" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            flex: "none",
            background: group.avBg,
            color: group.avFg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          {group.initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {group.name}
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--muted-foreground)",
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {group.meta} · <AnimatedCount value={group.tok} format={fmtTokens} fromZero={seeded} /> tokens
          </div>
        </div>
        {selected && (
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--foreground)",
              color: "var(--background)",
            }}
          >
            <Svg size={12} strokeWidth={3}>
              <path d="M20 6 9 17l-5-5" />
            </Svg>
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {group.hasLive && (
          <div style={{ ...BADGE, color: group.liveColor, background: group.liveBg }}>
            <PulseDot color={group.liveColor} />
            {group.liveLabel}
          </div>
        )}
        {group.idle && (
          <div style={{ ...BADGE, border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
            {group.idleLabel}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          width: "100%",
          minWidth: 0,
          paddingTop: 10,
          borderTop: "1px solid var(--border)",
        }}
      >
        {group.sumItems.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, minWidth: 0 }}>
            <span
              style={{ width: 6, height: 6, marginTop: 7, borderRadius: "50%", flex: "none", background: item.color }}
            />
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.text}
              </span>
              <span
                style={{
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: item.color,
                }}
              >
                {item.meta}
              </span>
            </div>
          </div>
        ))}
      </div>
    </button>
  );
}

function Row({
  row,
  seeded,
  onOpenKnowledge,
  onDelete,
}: {
  row: RowView;
  seeded: boolean;
  onOpenKnowledge: (id: string) => void;
  onDelete: (row: RowView) => void;
}) {
  return (
    <motion.div
      initial={seeded ? { opacity: 0, x: -8 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        gap: "4px 18px",
        padding: "10px 20px",
        borderTop: "1px solid var(--border)",
        background: row.bg,
      }}
    >
      <div style={{ flex: "1 1 320px", minWidth: 0, display: "flex", gap: 12, alignItems: "baseline" }}>
        <span
          style={{
            width: 18,
            flex: "none",
            textAlign: "right",
            fontFamily: "var(--mono)",
            fontSize: 12.5,
            color: "var(--muted-foreground)",
          }}
        >
          {row.n}
        </span>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <div
            style={{
              fontSize: 14.5,
              lineHeight: 1.4,
              textWrap: "pretty",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {row.summary}
          </div>
          {row.showActivity && <div style={{ fontSize: 12.5, color: row.statusColor }}>{row.activity}</div>}
          {row.kbId && (
            <button
              onClick={() => onOpenKnowledge(row.kbId as string)}
              className="hv-ul"
              style={{
                alignSelf: "flex-start",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: 0,
                border: 0,
                background: "transparent",
                cursor: "pointer",
                font: "500 12.5px var(--sans)",
                color: "var(--ok)",
              }}
            >
              <Svg size={14}>
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </Svg>
              Gerou conhecimento
            </button>
          )}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 18,
          marginLeft: "auto",
          fontSize: 13.5,
          color: "var(--muted-foreground)",
        }}
      >
        <span
          style={{
            width: 118,
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
            color: row.statusColor,
          }}
        >
          {row.live && <PulseDot color={row.statusColor} style={{ flex: "none" }} />}
          {row.time}
        </span>
        <span style={{ width: 200, flex: "none", display: "flex", minWidth: 0 }}>
          <span
            title={row.chip}
            style={{
              display: "inline-flex",
              minWidth: 0,
              maxWidth: "100%",
              alignItems: "center",
              height: 22,
              padding: "0 8px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              background: row.chipBg,
              color: row.chipFg,
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.chip}</span>
          </span>
        </span>
        <span
          style={{ width: 92, flex: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 13 }}
        >
          {row.area}
        </span>
        <span style={{ width: 96, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          <AnimatedCount
            value={row.tok}
            format={fmtTokens}
            fromZero={seeded}
            style={{ color: "var(--foreground)", fontWeight: 500 }}
          />{" "}
          tokens
        </span>
        <button
          onClick={() => onDelete(row)}
          aria-label="Apagar pedido"
          title="Apagar pedido"
          className="hv-fg"
          style={{
            alignSelf: "center",
            width: 24,
            height: 24,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: 0,
            borderRadius: 6,
            background: "transparent",
            color: "var(--muted-foreground)",
            cursor: "pointer",
          }}
        >
          <Svg size={14}>
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </Svg>
        </button>
      </div>
    </motion.div>
  );
}

export function SelectionTables({
  open,
  groups,
  seeded,
  onClose,
  onOpenKnowledge,
  onDeleteRow,
  onDeleteUser,
}: {
  open: boolean;
  groups: GroupView[];
  seeded: boolean;
  onClose: (name: string) => void;
  onOpenKnowledge: (id: string) => void;
  onDeleteRow: (row: RowView) => void;
  onDeleteUser: (group: GroupView) => void;
}) {
  return (
    <Collapse open={open}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {groups.map((group) => (
          <section key={group.name} data-seltable="1" style={{ ...CARD, overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "6px 12px",
                padding: "14px 20px",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  flex: "none",
                  background: group.avBg,
                  color: group.avFg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {group.initials}
              </div>
              <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em" }}>{group.name}</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>
                {group.meta} · <AnimatedCount value={group.tok} format={fmtTokens} fromZero={false} /> tokens
              </div>
              {group.hasLive && (
                <div style={{ ...BADGE, color: group.liveColor, background: group.liveBg }}>
                  <PulseDot color={group.liveColor} />
                  {group.liveLabel}
                </div>
              )}
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  onClick={() => onDeleteUser(group)}
                  className="hv-accent"
                  style={{ ...BTN, height: 30, padding: "0 10px", borderRadius: 7, gap: 6, font: "500 13px var(--sans)", boxShadow: "none" }}
                >
                  Apagar pedidos
                </button>
                <button
                  onClick={() => onClose(group.name)}
                  className="hv-accent"
                  style={{ ...BTN, height: 30, padding: "0 10px", borderRadius: 7, font: "500 13px var(--sans)", boxShadow: "none" }}
                >
                  Fechar
                </button>
              </div>
            </div>
            <div>
              {group.rows.map((row) => (
                <Row
                  key={row.id}
                  row={row}
                  seeded={seeded}
                  onOpenKnowledge={onOpenKnowledge}
                  onDelete={onDeleteRow}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Collapse>
  );
}
