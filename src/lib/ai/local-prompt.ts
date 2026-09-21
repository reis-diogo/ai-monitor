export type LocalPromptCard = {
  id: string;
  customId: string | null;
  title: string;
  content: string;
};

type ProgressSectionParams = {
  progressUrl: string;
  token: string;
  examples: string;
  closingNote: string;
};

// A tela nao consegue enxergar a IA local: ela roda no terminal do usuario, sem
// callback nenhum. O indicador ao vivo da linha do card so existe porque o proprio
// prompt manda avisar a cada etapa.
function buildProgressSection(params: ProgressSectionParams): string {
  return `## Como avisar o app do que você está fazendo

Enquanto você trabalha, o card mostra um indicador ao vivo no monitor. Ele só se mexe se você avisar. Mande um POST curto ANTES de começar cada etapa:

\`\`\`bash
curl -sS -X POST '${params.progressUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '{"token":"${params.token}","activityId":"<o activityId do card>","stage":"lendo os metadados"}'
\`\`\`

- \`stage\` — três a cinco palavras, minúsculas, dizendo o que você está fazendo AGORA. Ex.: ${params.examples}.
- \`detail\` — opcional, uma linha com o alvo concreto: o nome do objeto, do flow, do permission set.
- \`state\` — omita enquanto estiver trabalhando. Mande \`"failed"\`, com o motivo em \`stage\`, se você travar e parar no meio.

Esse POST é barato e a resposta dele não interessa: não pare para conferir e não interrompa o trabalho se ele falhar. Ele não substitui o POST de resultado. ${params.closingNote}`;
}

export function buildLocalArchitectPrompt(params: {
  project: string;
  cards: LocalPromptCard[];
  token: string;
  ingestUrl: string;
  progressUrl: string;
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

Você só vai LER metadados: não faz deploy, não altera nada na org. Então trabalhe sobre o retrieve que já está em disco, e não gaste uma ida e volta perguntando org quando não precisa.

Comece olhando o diretório atual. Se houver um \`sfdx-project.json\`, ele é o projeto: leia os caminhos em \`packageDirectories\` e use esse retrieve direto, sem rodar \`sf org list\` e sem perguntar nada. Diga em uma linha qual caminho você está usando e siga para a análise.

Pergunte ao usuário apenas quando o diretório atual não for um projeto Salesforce, ou quando \`packageDirectories\` tiver mais de um caminho e não estiver claro qual cobre estes cards. Nesse caso, peça o caminho do retrieve e aguarde — não saia procurando pelo disco.

Antes de analisar, veja há quanto tempo esse retrieve não é atualizado: \`git log -1 --format=%cr -- <caminho do pacote>\`. Informe a idade em uma linha e siga. Só pare e pergunte se o usuário quer rodar \`sf project retrieve start\` quando passar de trinta dias — aí sim vale confirmar a org antes, com \`sf org list\`, porque um retrieve da org errada estraga o parecer.

Não comece a análise antes de ter localizado o retrieve. Não invente metadados e não deduza a estrutura da org a partir do texto do card.

Leia do caminho do pacote (normalmente \`force-app/main/default/**\`) apenas o que for relevante para cada card — objetos, campos, flows, classes, validation rules, permission sets. Não leia a árvore inteira.

## Como analisar

${params.systemPrompt}

Use sua própria busca web para confirmar o comportamento atual na documentação oficial da Salesforce (help.salesforce.com, developer.salesforce.com, trailhead.salesforce.com, architect.salesforce.com). Nunca afirme uma limitação da plataforma de memória.

${buildProgressSection({
  progressUrl: params.progressUrl,
  token: params.token,
  examples: `"escolhendo a org", "lendo os metadados", "consultando a documentação", "escrevendo o parecer"`,
  closingNote: "Quando o parecer do card chegar, o app apaga o indicador sozinho.",
})}

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
  "assumptions": [],
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
- \`ambiguities\` / \`assumptions\` — o que fazer com os pontos em aberto depende da nota, e só disso.

  **Nota 7 ou mais:** deixe \`ambiguities\` vazio. Resolva cada ponto você mesmo, com a documentação oficial e o que os metadados da org mostram, e registre em \`assumptions\` a decisão tomada e a razão dela. Cada decisão precisa aparecer também dentro do \`devPrompt\` como instrução — quem implementa não pode receber "depende do PO". Na escolha, siga o caminho que o resto da org já usa: consistência com o que existe erra menos que preferência sua.

  **Nota menor que 7:** deixe \`assumptions\` vazio e escreva em \`ambiguities\` APENAS perguntas de negócio. Cada item vira item de checklist lido pelo PO: descreva a situação e a decisão que falta em termos da operação (quem faz, quando, o que deve acontecer, qual a exceção), como pergunta que se responde sem conhecer Salesforce. Nada de nome de API de objeto ou campo, nada de Flow, trigger, validation rule, permission set, FLS, Apex ou LWC — o PO decide regra de negócio, não implementação. Em vez de "Qual o valor default de Lead.Origem__c quando o Flow de conversão roda?", escreva "Quando um lead vira oportunidade sem origem informada, qual origem deve ficar registrada?".
- \`metadataFindings\` — o que os metadados já cobrem ou conflitam.
- \`docReferences\` — a documentação oficial que sustenta a decisão.
- \`devPrompt\` — este é o entregável final. **Não escreva o alias de nenhuma org dentro dele.** Em vez disso, instrua quem for implementar a rodar \`sf org list\`, mostrar todas as orgs ao usuário e confirmar qual usar antes de aplicar qualquer mudança. O alias não indica o ambiente, então nem quem implementa nem você conseguem deduzir qual é a de desenvolvimento — e um alias fixo no texto vira erro silencioso quando o prompt for reaproveitado depois, com o ambiente já diferente. Escreva um prompt autocontido, em português, para a IA que vai APLICAR o desenvolvimento na org. Ele aparece no app como um badge próprio, visível só em cards que foram para "dev liberado", e é copiado dali direto para a IA que implementa — quem recebe não terá acesso a esta conversa, ao card, nem aos metadados. Então o prompt precisa carregar tudo sozinho: o objetivo, os metadados relevantes que você leu (nomes reais de objetos, campos e automações), o passo a passo da configuração com os caminhos de Setup, o que NÃO fazer e por quê, e os critérios de aceite verificáveis. Escreva como instrução de execução, não como parecer. Não escreva instruções de progresso dentro dele: o app acrescenta isso sozinho quando entrega o prompt ao dev.

  Se a nota for menor que 7, o card não vai para "dev liberado" e o badge não aparece — ainda assim preencha \`devPrompt\` com o que já dá para instruir, deixando explícito o que depende das \`ambiguities\` serem respondidas.

O app move o card no ClickUp olhando só a nota: 7 ou mais vai para "dev liberado", abaixo disso volta para "refinar po" com as \`ambiguities\` como checklist para o PO responder. Então trate a nota como decisão real, não como palpite — é ela, sozinha, que decide se alguém começa a construir.

Confira a resposta de cada POST: ela pode vir com HTTP 200 e ainda assim trazer
\`statusError\` preenchido — o parecer foi gravado, mas o ClickUp recusou a mudança de status
ou o checklist. Nesse caso mostre a mensagem ao usuário; não trate como sucesso. Se o POST
responder erro, mostre a resposta e siga para o próximo card.

## Cards

${cardsBlock}`;
}

export type ReviewPromptCard = LocalPromptCard & {
  devPrompt: string;
};

export function buildLocalReviewPrompt(params: {
  project: string;
  cards: ReviewPromptCard[];
  token: string;
  ingestUrl: string;
  progressUrl: string;
  systemPrompt: string;
}): string {
  const cardsBlock = params.cards
    .map((card, index) => {
      const label = card.customId ?? card.id;
      return `### ${index + 1}. ${label}\nactivityId: ${card.id}\nTítulo: ${card.title}\n\n**Especificação entregue ao dev:**\n\n${
        card.devPrompt.trim() || "(sem prompt de desenvolvimento registrado)"
      }`;
    })
    .join("\n\n---\n\n");

  return `Você é um arquiteto sênior de Salesforce. Revise a entrega de ${params.cards.length} card(s) do projeto "${params.project}" e envie o parecer de cada um para o app.

## Onde estão os metadados

Trabalhe sobre o retrieve de metadados da org de desenvolvimento deste projeto.

Comece rodando \`sf org list\` e mostre ao usuário **todas** as orgs autorizadas que aparecerem.

**Sempre pergunte qual usar e aguarde a resposta antes de qualquer outra coisa** — inclusive quando só houver uma, e inclusive quando alguma parecer obviamente a certa.

O alias da org é escolhido por quem autenticou: não segue padrão, não precisa citar o projeto e não indica o ambiente. \`solven\` pode ser produção, \`teste2\` pode ser o desenvolvimento deste projeto. Deduzir pelo nome é adivinhar, e o custo do erro é mexer em homologação ou produção. Se o usuário não responder, não prossiga.

Não comece a revisão antes de ter localizado o retrieve. Uma revisão feita sem ler o metadado real não vale nada — ela aprovaria uma entrega inexistente.

Aqui, ao contrário do arquiteto, o retrieve em disco não basta: ele não mostra o que o dev acabou de configurar, e você reprovaria uma entrega correta. Atualize antes de revisar — mas de forma dirigida, não puxando a org inteira.

Monte a lista a partir da especificação de cada card: os objetos, campos, flows, classes, validation rules e permission sets citados nela são exatamente o que você precisa conferir. Puxe só eles:

\`\`\`bash
sf project retrieve start -o <a org confirmada> -m CustomObject:Conta -m Flow:Atualiza_Margem -m PermissionSet:PS_Vendedor
\`\`\`

Um retrieve completo leva minutos e traz milhares de arquivos que você não vai abrir. Se algum metadado citado não vier no retrieve dirigido, isso já é um achado: ele não existe na org, e entra em \`missing\`.

## Como revisar

${params.systemPrompt}

${buildProgressSection({
  progressUrl: params.progressUrl,
  token: params.token,
  examples: `"escolhendo a org", "atualizando o retrieve", "conferindo os metadados", "escrevendo o parecer"`,
  closingNote: "Quando o parecer do card chegar, o app apaga o indicador sozinho.",
})}

## Como enviar o resultado

Para CADA card, faça um POST assim que terminar aquele card — não acumule para o fim:

\`\`\`bash
curl -sS -X POST '${params.ingestUrl}' \\
  -H 'Content-Type: application/json' \\
  -d @- <<'JSON'
{
  "token": "${params.token}",
  "kind": "review",
  "activityId": "<o activityId do card>",
  "review": 0,
  "reasoning": "",
  "delivered": [],
  "missing": [],
  "deviations": [],
  "fixPrompt": ""
}
JSON
\`\`\`

Campos:

- \`review\` — inteiro de 0 a 10 para a aderência da entrega à especificação.
- \`reasoning\` — justificativa direta da nota, citando os metadados que você abriu.
- \`delivered\` / \`missing\` / \`deviations\` — as três listas, com o nome de API do metadado em cada item.
- \`fixPrompt\` — só quando a nota for menor que 7. Prompt autocontido, em português, para a IA que vai corrigir a entrega: o que falta, o que está divergente, e o passo a passo com os caminhos de Setup. Quem receber não terá acesso a esta conversa nem ao card. Se a nota for 7 ou mais, deixe vazio.

O app move o card no ClickUp conforme a nota: 7 ou mais vai para "em qa", abaixo disso volta para "revisar dev" com as pendências como checklist. Então trate a nota como uma decisão real — ela define se alguém vai testar algo incompleto.

Confira a resposta de cada POST: ela pode vir com HTTP 200 e ainda assim trazer
\`statusError\` preenchido — o parecer foi gravado, mas o ClickUp recusou a mudança de status
ou o checklist. Nesse caso mostre a mensagem ao usuário; não trate como sucesso. Se o POST
responder erro, mostre a resposta e siga para o próximo card.

## Cards

${cardsBlock}`;
}

export type DevPromptCard = LocalPromptCard & {
  devPrompt: string;
};

// O dev nao devolve nota nenhuma: o token dele serve so para o indicador de
// progresso. Quem move o card para "dev finalizado" continua sendo o dev, porque
// esse status e a afirmacao de que a entrega foi testada — nao de que o script rodou.
export function buildLocalDevPrompt(params: {
  card: DevPromptCard;
  token: string;
  progressUrl: string;
}): string {
  const label = params.card.customId ?? params.card.id;

  return `${params.card.devPrompt.trim()}

---

## Card no monitor

activityId: ${params.card.id} (${label} — ${params.card.title})

${buildProgressSection({
  progressUrl: params.progressUrl,
  token: params.token,
  examples: `"escolhendo a org", "lendo os metadados", "aplicando as mudanças", "fazendo o deploy", "validando na org"`,
  closingNote: `Aqui não existe POST de resultado: o último POST, com \`"state":"done"\`, é o que encerra a etapa — ele apaga o indicador E move o card para "dev finalizado", entregando a implementação para o revisor.

Por isso ele não é automático. Antes de mandá-lo, mostre ao usuário o que você aplicou e **pergunte se ele testou e confirma o encerramento**. Só dispare com a resposta dele. "dev finalizado" significa que a entrega foi testada, não que o script rodou — se você mandar sozinho, o revisor vai conferir algo que ninguém olhou.

A resposta desse POST você confere: ela pode vir com HTTP 200 e \`statusError\` preenchido, quando o ClickUp recusa a mudança de status. Nesse caso mostre a mensagem ao usuário e avise que o card continua onde estava.`,
})}`;
}
