// O corpo vem de um curl rodado no terminal de quem usa. Em shell com code page
// legada (cmd/PowerShell no Windows costuma vir em cp1252), o acento sai como um
// byte so: "ção" vira 63 e7 e3 6f em vez de 63 c3a7 c3a3 6f. request.json() decodifica
// como UTF-8, nao reconhece esses bytes e troca cada um por U+FFFD — o acento se perde
// antes de qualquer validacao nossa. Decodificar em UTF-8 estrito e cair para cp1252
// quando falhar recupera o texto original.
export async function readJsonBody(request: Request): Promise<unknown | null> {
  let buffer: ArrayBuffer;
  try {
    buffer = await request.arrayBuffer();
  } catch {
    return null;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    text = new TextDecoder("windows-1252").decode(buffer);
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
