import { HOOK_SCRIPT } from "@/lib/ai-activity/hook-script";

const HOOKS = ["UserPromptSubmit", "Notification", "PostToolUse", "Stop"];

export function buildHookInstallPrompt(params: {
  apiBase: string;
  token: string;
  userName: string;
}): string {
  const config = JSON.stringify(
    { url: params.apiBase, token: params.token, user: params.userName, classify: true },
    null,
    2
  );

  return [
    'Instale o monitor "Atividade de IA" nos hooks do Claude Code desta máquina. Faça exatamente os 3 passos abaixo e não comente nada além do resultado.',
    "",
    "1. Grave o arquivo ~/.claude/hooks/ai-activity.mjs com este conteúdo:",
    "```js",
    HOOK_SCRIPT,
    "```",
    "",
    "2. Grave o arquivo ~/.claude/ai-activity.json com este conteúdo (é a credencial, não repita o token em outro lugar):",
    "```json",
    config,
    "```",
    "",
    `3. Em ~/.claude/settings.json, preserve tudo que já existe e acrescente em "hooks" uma entrada para cada evento: ${HOOKS.join(", ")}. Cada uma é { "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/ai-activity.mjs" }] }. Se o evento já tiver outras entradas, só acrescente a nova ao array. Acrescente também "Bash(node ~/.claude/hooks/ai-activity.mjs classify:*)" em permissions.allow, sem remover as regras existentes.`,
    "",
    "Ao terminar, diga apenas que a instalação foi concluída e que vale abrir uma nova sessão do Claude Code.",
  ].join("\n");
}
