export type SkillKind = "architect" | "review";

type SkillSpec = {
  name: string;
  title: string;
  queueQuery: string;
  describe: (queueStatus: string) => string;
  promptOwner: string;
  verb: string;
  jobsNote: string;
  jobsHint: string;
  executionNotes: string;
};

const SKILLS: Record<SkillKind, SkillSpec> = {
  architect: {
    name: "refinar-arquiteto",
    title: "Refinar arquiteto",
    queueQuery: "",
    describe: (queueStatus) =>
      `Lista os projetos com cards aguardando refinamento de arquitetura no monitor e roda o crivo do arquiteto Salesforce no escolhido. Use quando o usuário pedir para refinar arquitetura, pegar a fila do arquiteto ou analisar cards em "${queueStatus}".`,
    promptOwner: "do arquiteto",
    verb: "analisar",
    jobsNote:
      "O servidor monta a lista de cards e busca título e descrição atualizados no ClickUp — não mande `cards` no corpo.",
    jobsHint: "",
    executionNotes:
      "Ele começa mandando rodar `sf org list` e perguntar qual org usar — respeite isso: pergunte e aguarde antes de ler qualquer metadado.",
  },
  review: {
    name: "revisar-entrega",
    title: "Revisar entrega",
    queueQuery: "?kind=review",
    describe: (queueStatus) =>
      `Lista os projetos com cards aguardando revisão da entrega no monitor e roda o crivo do revisor Salesforce no escolhido. Use quando o usuário pedir para revisar uma entrega, pegar a fila do revisor ou revisar cards em "${queueStatus}".`,
    promptOwner: "do revisor",
    verb: "revisar",
    jobsNote:
      "O servidor monta a lista de cards e anexa a cada um a especificação que o arquiteto gravou no monitor — não mande `cards` no corpo.",
    jobsHint:
      "Se vier `400` dizendo que nenhum card tem prompt de desenvolvimento, a especificação nunca foi gravada: esses cards precisam passar pelo arquiteto antes de serem revisados. Diga isso ao usuário e pare.",
    executionNotes:
      "Ele começa mandando rodar `sf org list` e perguntar qual org usar — respeite isso: pergunte e aguarde antes de ler qualquer metadado. Ele também pede para atualizar o retrieve antes de conferir: faça isso, senão a revisão olha metadados anteriores à entrega.",
  },
};

export function skillName(skill: SkillKind): string {
  return SKILLS[skill].name;
}

type SkillFileParams = {
  apiBase: string;
  token: string;
  skill: SkillKind;
  queueStatus: string;
};

function buildFrontmatter(params: SkillFileParams): string {
  const spec = SKILLS[params.skill];
  return `---
name: ${spec.name}
description: ${spec.describe(params.queueStatus)}
---`;
}

function buildProcedure(params: SkillFileParams): string {
  const spec = SKILLS[params.skill];

  return `# ${spec.title}

Execute os quatro passos abaixo na ordem. Não pule nenhum.

## Passo 1 — buscar a fila

\`\`\`bash
curl -sS '${params.apiBase}/api/architect/queue${spec.queueQuery}' \\
  -H 'Authorization: Bearer ${params.token}'
\`\`\`

A resposta é \`{"status":"...","projects":[{"project":"...","pending":N,"cards":[{"id","customId","title"}]}]}\`.

Se vier \`401\`, o token foi revogado: diga ao usuário para gerar outro no monitor e pare.

Se \`projects\` vier vazio, diga que não há nada em "${params.queueStatus}" e pare.

## Passo 2 — mostrar e perguntar

Liste os projetos com a contagem e os títulos dos cards. **Pergunte em qual projeto trabalhar e aguarde a resposta.** Não escolha sozinho, nem quando só houver um.

## Passo 3 — pegar o prompt ${spec.promptOwner}

Com o projeto escolhido:

\`\`\`bash
curl -sS -X POST '${params.apiBase}/api/architect/jobs' \\
  -H 'Authorization: Bearer ${params.token}' \\
  -H 'Content-Type: application/json' \\
  -d '{"project":"<o projeto escolhido>","provider":"gemini","kind":"${params.skill}"}'
\`\`\`

A resposta traz \`{"prompt":"...","expiresAt":"...","cardCount":N}\`. ${spec.jobsNote}${
    spec.jobsHint ? `\n\n${spec.jobsHint}` : ""
  }

## Passo 4 — executar

O campo \`prompt\` é a instrução completa: qual org perguntar, como ${spec.verb}, para onde mandar o progresso e para onde mandar o parecer de cada card, com os tokens já embutidos.

**Siga esse prompt à risca, do começo ao fim, como se o usuário o tivesse colado na conversa.** ${spec.executionNotes}

Não resuma o prompt, não pule etapas e não troque os endpoints dele pelos deste arquivo.`;
}

export function buildSkillFile(params: SkillFileParams): string {
  return `${buildFrontmatter(params)}\n\n${buildProcedure(params)}\n`;
}

// Prompt de instalacao: o usuario cola isto no Claude Code e o que sai do outro lado
// e uma skill instalada. O token vai aqui dentro porque a skill roda na maquina dele,
// sem sessao — e por isso o texto avisa para nao versionar o arquivo.
export function buildSkillInstallPrompt(params: SkillFileParams): string {
  const spec = SKILLS[params.skill];

  return `Crie uma skill do Claude Code chamada \`${spec.name}\`.

Escreva o arquivo em \`~/.claude/skills/${spec.name}/SKILL.md\`, com este frontmatter:

\`\`\`
${buildFrontmatter(params)}
\`\`\`

O corpo do arquivo deve conter exatamente o texto abaixo, escrito como instrução para quem for executar a skill.

---

${buildProcedure(params)}

---

Ao terminar, confirme o caminho do arquivo criado e avise que o token dentro dele é pessoal: não versionar, não compartilhar. Se vazar, dá para revogar no monitor e gerar outro.`;
}
