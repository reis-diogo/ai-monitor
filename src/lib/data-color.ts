// Cor de dado — status, nota, faixa de atraso — sempre foi calibrada para fundo
// escuro. Sobre o branco do tema claro, verde e amarelo chegam perto de 2:1 e viram
// borrao. Esta funcao mistura preto na cor quando o tema e claro e nada quando e
// escuro, entao o mesmo hex serve nos dois sem virar duas tabelas de cor.
//
// A dose vem de variavel CSS porque a cor e aplicada em style inline, por JS: media
// query nao alcanca, mas var() sim.
export function dataColor(color: string): string {
  return `color-mix(in srgb, var(--data-ink) var(--data-ink-amount), ${color})`;
}

// Transparencia sobre uma cor de dado. Nao da para concatenar sufixo hex ("#fff" + "4d")
// porque a escala virou oklch(...) — e uma funcao, nao um literal de 6 digitos.
export function dataAlpha(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

// Fundo de pilula: a cor diluida na superficie do card, nao sobre transparente. Assim
// a pilula fica opaca e o que passa atras dela nao vaza pelo meio do texto.
export function dataSurface(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, var(--card))`;
}

// Dois niveis de enfase. Status que pede acao de alguem chama mais; o resto informa.
// Sem isso, "1 bug" e "19 dev liberado" gritam no mesmo volume.
const ACTION_STATUSES = new Set(["bug", "refinar po", "revisar dev", "impedido"]);

export function statusEmphasis(value: string): "action" | "info" {
  return ACTION_STATUSES.has(value.toLowerCase()) ? "action" : "info";
}
