// Prompt de instalacao: o usuario cola isto no Claude Code e o que sai do outro lado
// e uma skill instalada. O token vai aqui dentro porque a skill roda na maquina dele,
// sem sessao — e por isso o texto avisa para nao versionar o arquivo.
export function buildSkillInstallPrompt(params: {
  apiBase: string;
  token: string;
  queueStatus: string;
}): string {
  return `Crie uma skill do Claude Code chamada \`refinar-arquiteto\`.

Escreva o arquivo em \`~/.claude/skills/refinar-arquiteto/SKILL.md\`, com este frontmatter:

\`\`\`
---
name: refinar-arquiteto
description: Lista os projetos com cards aguardando refinamento de arquitetura no monitor e roda o crivo do arquiteto Salesforce no escolhido. Use quando o usuário pedir para refinar arquitetura, pegar a fila do arquiteto ou analisar cards em "${params.queueStatus}".
---
\`\`\`

O corpo do arquivo deve conter exatamente o procedimento abaixo, escrito como instrução para quem for executar a skill.

---

## Passo 1 — buscar a fila

\`\`\`bash
curl -sS '${params.apiBase}/api/architect/queue' \\
  -H 'Authorization: Bearer ${params.token}'
\`\`\`

A resposta é \`{"status":"...","projects":[{"project":"...","pending":N,"cards":[{"id","customId","title"}]}]}\`.

Se vier \`401\`, o token foi revogado: diga ao usuário para gerar outro no monitor e pare.

Se \`projects\` vier vazio, diga que não há nada em "${params.queueStatus}" e pare.

## Passo 2 — mostrar e perguntar

Liste os projetos com a contagem e os títulos dos cards. **Pergunte em qual projeto trabalhar e aguarde a resposta.** Não escolha sozinho, nem quando só houver um.

## Passo 3 — pegar o prompt do arquiteto

Com o projeto escolhido:

\`\`\`bash
curl -sS -X POST '${params.apiBase}/api/architect/jobs' \\
  -H 'Authorization: Bearer ${params.token}' \\
  -H 'Content-Type: application/json' \\
  -d '{"project":"<o projeto escolhido>","provider":"gemini","kind":"architect"}'
\`\`\`

A resposta traz \`{"prompt":"...","expiresAt":"...","cardCount":N}\`. O servidor monta a lista de cards e busca título e descrição atualizados no ClickUp — não mande \`cards\` no corpo.

## Passo 4 — executar

O campo \`prompt\` é a instrução completa: qual org perguntar, como analisar, para onde mandar o progresso e para onde mandar o parecer de cada card, com os tokens já embutidos.

**Siga esse prompt à risca, do começo ao fim, como se o usuário o tivesse colado na conversa.** Ele começa mandando rodar \`sf org list\` e perguntar qual org usar — respeite isso: pergunte e aguarde antes de ler qualquer metadado.

Não resuma o prompt, não pule etapas e não troque os endpoints dele pelos deste arquivo.

---

Ao terminar, confirme o caminho do arquivo criado e avise que o token dentro dele é pessoal: não versionar, não compartilhar. Se vazar, dá para revogar no monitor e gerar outro.`;
}
