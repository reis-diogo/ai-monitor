export type LocalPromptCard = {
  id: string;
  customId: string | null;
  title: string;
  content: string;
};

export function buildLocalArchitectPrompt(params: {
  project: string;
  cards: LocalPromptCard[];
  token: string;
  ingestUrl: string;
  systemPrompt: string;
}): string {
  const cardsBlock = params.cards
    .map((card, index) => {
      const label = card.customId ?? card.id;
      const description = card.content.trim() || "(sem descrição)";
      return `### ${index + 1}. ${label}\nactivityId: ${card.id}\nTítulo: ${card.title}\n\n${description}`;
    })
    .join("\n\n---\n\n");

  return `Você é um arquiteto sênior de Salesforce. Analise os ${params.cards.length} card(s) abaixo do projeto "${params.project}" e envie o parecer de cada um para o app.

## Onde estão os metadados

Trabalhe sobre o retrieve de metadados da org de desenvolvimento deste projeto.

Comece rodando \`sf org list\` para ver as orgs autorizadas e identificar qual corresponde a "${params.project}". Se não houver um retrieve disponível, ou se você não conseguir identificar com segurança qual org corresponde a este projeto, **pergunte ao usuário qual retrieve deve ser utilizado e aguarde a resposta**.

Não comece a análise antes de ter localizado o retrieve que o usuário indicou. Não invente metadados e não deduza a estrutura da org a partir do texto do card.

Depois de localizar, leia de \`force-app/main/default/**\` (ou do caminho que o usuário indicar) apenas o que for relevante para cada card — objetos, campos, flows, classes, validation rules, permission sets. Não leia a árvore inteira.

## Como analisar

${params.systemPrompt}

Use sua própria busca web para confirmar o comportamento atual na documentação oficial da Salesforce (help.salesforce.com, developer.salesforce.com, trailhead.salesforce.com, architect.salesforce.com). Nunca afirme uma limitação da plataforma de memória.

## Como enviar o resultado

Para CADA card, faça um POST assim que terminar aquele card — não acumule para o fim:

\`\`\`bash
curl -sS -X POST '${params.ingestUrl}' \\
  -H 'Content-Type: application/json' \\
  -d @- <<'JSON'
{
  "token": "${params.token}",
  "activityId": "<o activityId do card>",
  "architecture": 0,
  "reasoning": "",
  "nativeSolution": "",
  "usesCustom": false,
  "customJustification": "",
  "ambiguities": [],
  "metadataFindings": [],
  "docReferences": [{ "title": "", "url": "" }],
  "devPrompt": ""
}
JSON
\`\`\`

Campos:

- \`architecture\` — inteiro de 0 a 10: o quanto o card está PRONTO PARA DESENVOLVIMENTO. 10 = solução clara, atendida pelo nativo, sem ambiguidade. 7 a 9 = implementável, dúvidas menores. 4 a 6 = depende de decisão de negócio que o PO ainda não tomou. 0 a 3 = vago demais para arquitetar.
- \`reasoning\` — justificativa direta da nota.
- \`nativeSolution\` — a solução declarativa proposta.
- \`usesCustom\` / \`customJustification\` — se precisar de Apex/LWC/integração, diga onde exatamente o nativo para.
- \`ambiguities\` — perguntas objetivas para o PO. Vazio se não houver.
- \`metadataFindings\` — o que os metadados já cobrem ou conflitam.
- \`docReferences\` — a documentação oficial que sustenta a decisão.
- \`devPrompt\` — este é o entregável final. Escreva um prompt autocontido, em português, para a IA que vai APLICAR o desenvolvimento na org. Ele aparece no app como um badge próprio, visível só em cards que foram para "dev liberado", e é copiado dali direto para a IA que implementa — quem recebe não terá acesso a esta conversa, ao card, nem aos metadados. Então o prompt precisa carregar tudo sozinho: o objetivo, os metadados relevantes que você leu (nomes reais de objetos, campos e automações), o passo a passo da configuração com os caminhos de Setup, o que NÃO fazer e por quê, e os critérios de aceite verificáveis. Escreva como instrução de execução, não como parecer.

  Se a nota for menor que 7, o card não vai para "dev liberado" e o badge não aparece — ainda assim preencha \`devPrompt\` com o que já dá para instruir, deixando explícito o que depende das \`ambiguities\` serem resolvidas.

O app move o card no ClickUp conforme a nota: 7 ou mais vai para "dev liberado", abaixo disso volta para "refinar po" com as \`ambiguities\` como comentário, para o PO esclarecer. Então trate a nota como uma decisão real, não como um palpite.

Se um POST responder erro, mostre a resposta e siga para o próximo card.

## Cards

${cardsBlock}`;
}
