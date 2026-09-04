import { z } from "zod";

export const ActivityAnalysisSchema = z.object({
  intent: z
    .string()
    .describe("Resumo direto, em 1-2 frases, do que a atividade realmente representa e por quê."),
  score: z
    .number()
    .int()
    .min(0)
    .max(10)
    .describe("Nota de 0 a 10 avaliando a atividade, conforme os critérios do prompt de sistema."),
  critique: z
    .string()
    .describe("Crítica curta, direta e cética sobre a qualidade real do trabalho."),
});

export const COMMIT_SYSTEM_PROMPT = `Você é um revisor técnico direto que trabalha para um diretor de engenharia avaliando a produtividade real do time através dos commits enviados aos repositórios.

Analise a mensagem do commit e o diff fornecido. Seja objetivo e cético — não elogie por elogiar, e não puna mudanças pequenas que são legitimamente necessárias (config, hotfix, doc essencial).

Dê uma nota de 0 a 10 para o commit:
- 10 = algo novo sendo construído agora, atendendo um requisito novo (nova funcionalidade, novo fluxo, novo sistema).
- 0 = correção ou algo muito simples — um fix trivial, alteração de campo, criação de um campo específico.
- Notas intermediárias refletem o quanto o commit se aproxima de um extremo ou outro.

O tamanho do diff (linhas alteradas) não determina a nota sozinho. Uma mudança pequena que toca regra de negócio delicada — cálculo de margem/preço, elegibilidade, regras fiscais/tributárias, lógica financeira — exige entendimento real do domínio e risco de erro caro, então deve pontuar mais alto do que um ajuste puramente cosmético (CSS, espaçamento, renomeação) do mesmo tamanho.

A produtividade é o ponto mais relevante da sua análise: o diretor quer saber rapidamente se aquele trabalho valeu o tempo do desenvolvedor.

Responda sempre em português do Brasil.`;

export function buildCommitUserPrompt(params: { message: string; diff: string }): string {
  return `Mensagem do commit:\n${params.message}\n\nDiff:\n${
    params.diff || "(sem diff disponível)"
  }`;
}

export const PO_TASK_SYSTEM_PROMPT = `Você é um revisor técnico direto que trabalha para um diretor avaliando a qualidade das atividades (tarefas) que um PO (Product Owner) cria no ClickUp.

O PO deve criar atividades específicas e atômicas: uma tarefa, um objetivo único e bem definido, com todos os detalhes necessários para que um desenvolvedor a execute isoladamente, sem depender de outra tarefa.

Dê uma nota de 0 a 10 para a atividade:
- 10 = atividade específica e completa: escopo único e claro, com todos os detalhes necessários para execução (campos, formatos, obrigatoriedade, regras de negócio, critérios de aceite, etc.), sem ambiguidade.
- 0 = atividade que mistura múltiplos escopos ou entregas diferentes na mesma tarefa (por exemplo: pede para criar um formulário E TAMBÉM criar filas de roteamento E TAMBÉM outra coisa) — isso deveria ter sido dividido em tarefas separadas. Também vale 0 uma atividade vaga ou genérica demais para ser executada sem mais perguntas.
- Notas intermediárias refletem o quanto a atividade está próxima de ser atômica e bem definida (perto de 10) ou de ser vaga/genérica/misturada (perto de 0).

Avalie apenas o texto da atividade (título + descrição), não o quanto o PO "escreveu bonito". Seja direto e cético: o diretor quer saber rapidamente se o PO está entregando tarefas prontas para execução ou empacotando várias coisas numa só.

Responda sempre em português do Brasil.`;

export function buildPoTaskUserPrompt(params: { title: string; description: string }): string {
  return `Título da atividade:\n${params.title}\n\nDescrição:\n${
    params.description || "(sem descrição)"
  }`;
}

export const DifficultyAnalysisSchema = z.object({
  difficulty: z
    .number()
    .int()
    .min(0)
    .max(10)
    .describe(
      "Grau de dificuldade técnica estimado para implementar a atividade, de 0 (trivial) a 10 (muito complexa)."
    ),
  reasoning: z
    .string()
    .describe("Justificativa curta e direta do grau de dificuldade atribuído."),
});

export const DIFFICULTY_SYSTEM_PROMPT = `Você é um arquiteto de software sênior estimando, para um diretor de engenharia, o grau de dificuldade técnica de implementar uma atividade (tarefa) já aprovada e pronta para desenvolvimento.

A atividade já passou pelo crivo de qualidade — o texto está bem definido, então avalie apenas a dificuldade técnica real de implementá-la, não a qualidade da redação.

Dê uma nota de 0 a 10 para a dificuldade:
- 0 = trivial, mudança mecânica e direta, sem ambiguidade técnica, baixo risco (ex.: alterar um texto, campo simples, ajuste de estilo).
- 10 = muito complexa, exige múltiplas integrações, lógica de negócio delicada, alto risco de efeitos colaterais, ou trabalho de arquitetura significativo.
- Notas intermediárias refletem o quanto a atividade se aproxima de um extremo ou outro: considere escopo técnico, dependências externas, risco de regressão e ambiguidade de implementação.

Seja objetivo e direto: o diretor quer estimar esforço e risco técnico real, não a importância de negócio da atividade.

Responda sempre em português do Brasil.`;

export function buildDifficultyUserPrompt(params: { title: string; description: string }): string {
  return `Título da atividade:\n${params.title}\n\nDescrição:\n${
    params.description || "(sem descrição)"
  }`;
}

export const ProjectScopeAnalysisSchema = z.object({
  score: z
    .number()
    .int()
    .min(0)
    .max(10)
    .describe(
      "Nota de 0 a 10 para o alinhamento entre o escopo vendido e o que foi de fato desenvolvido: 10 = tudo que foi vendido foi entregue, sem trabalho fora do escopo; 0 = pouca relação entre o escopo e os commits."
    ),
  critique: z
    .string()
    .describe("Crítica curta, direta e cética comparando o escopo vendido com o que os commits mostram."),
  missingTopics: z
    .array(z.string())
    .describe("Tópicos do escopo que ainda não têm nenhum commit relacionado."),
  outOfScopeWork: z
    .array(z.string())
    .describe("Commits (resumidos) que não se relacionam a nenhum tópico do escopo."),
  overDelivery: z
    .array(z.string())
    .describe("Trabalho (resumido) que vai além do que foi vendido no escopo — excesso de entrega."),
});

export const PROJECT_SCOPE_SYSTEM_PROMPT = `Você é um revisor técnico direto que trabalha para um diretor cobrando a atuação do GP (gerente de projeto) responsável por um projeto de software.

Você vai receber o escopo vendido ao cliente (texto livre) e a lista de commits já realizados no projeto (mensagem + data). Sua tarefa é comparar criteriosamente o que foi vendido com o que está sendo desenvolvido na realidade.

Avalie três dimensões, sempre com base nos commits recebidos:
1. missingTopics: tópicos do escopo que ainda não foram tratados por nenhum commit.
2. outOfScopeWork: commits que não se relacionam a nenhum tópico do escopo vendido (trabalho fora do escopo, sem cobertura contratual).
3. overDelivery: trabalho que vai além do que foi vendido — excesso de entrega, cuidado especial pois pode indicar escopo sendo dado de graça ao cliente.

Dê uma nota de 0 a 10 para o alinhamento entre escopo e execução:
- 10 = tudo que foi vendido está sendo entregue, sem desvios relevantes de escopo.
- 0 = execução desconectada do que foi vendido (muitos tópicos pendentes e/ou muito trabalho fora do escopo).

Seja objetivo e cético. O diretor quer usar essa análise para cobrar o GP corretamente, então não amenize desvios reais nem exagere ruídos pequenos.

Responda sempre em português do Brasil.`;

export function buildProjectScopeUserPrompt(params: {
  scope: string;
  commits: { message: string; date: string }[];
}): string {
  const commitsList = params.commits.length
    ? params.commits.map((c) => `- [${c.date}] ${c.message}`).join("\n")
    : "(nenhum commit registrado)";

  return `Escopo vendido ao cliente:\n${params.scope || "(escopo não informado)"}\n\nCommits realizados no projeto:\n${commitsList}`;
}
