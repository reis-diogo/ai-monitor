// Roda antes do primeiro paint, por isso e string injetada e nao efeito: aplicar a
// classe so depois da hidratacao faria a tela piscar clara antes de escurecer.
// So le prefers-color-scheme — nao ha seletor de tema no app, o sistema decide.
const SCRIPT = `(function(){try{var m=window.matchMedia("(prefers-color-scheme: dark)");var a=function(d){document.documentElement.classList.toggle("dark",d)};a(m.matches);m.addEventListener("change",function(e){a(e.matches)})}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
