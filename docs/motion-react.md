# Motion for React — Base de Conhecimento

Referência consolidada de https://motion.dev/docs/react e subpáginas, para uso no projeto getnow.

## Índice

- [Instalação e conceitos básicos](#instalação-e-conceitos-básicos)
- [Acessibilidade](#acessibilidade)
- [Reduzir o tamanho do bundle](#reduzir-o-tamanho-do-bundle)
- [Animação de texto](#animação-de-texto)
- [Animação SVG](#animação-svg)
- [Transições](#transições)
- [Animações de scroll](#animações-de-scroll)
- [Animações de layout](#animações-de-layout)
- [motion (componente base)](#motion-componente-base)
- [AnimatePresence](#animatepresence)
- [AnimateActivity](#animateactivity)
- [AnimateView](#animateview)
- [LayoutGroup](#layoutgroup)
- [LazyMotion](#lazymotion)
- [MotionConfig](#motionconfig)
- [Reorder](#reorder)
- [Gestures (visão geral)](#gestures-visão-geral)
- [Drag](#drag)
- [Hover animation](#hover-animation)
- [Motion Values (useMotionValue)](#motion-values-usemotionvalue)
- [useMotionTemplate](#usemotiontemplate)
- [useMotionValueEvent](#usemotionvalueevent)
- [useScroll](#usescroll)
- [useSpring](#usespring)
- [useTime](#usetime)
- [useTransform](#usetransform)
- [useVelocity](#usevelocity)
- [useAnimate](#useanimate)
- [useAnimationFrame](#useanimationframe)
- [useDragControls](#usedragcontrols)
- [useInView](#useinview)
- [usePageInView](#usepageinview)
- [useReducedMotion](#usereducedmotion)
- [Motion + Tailwind CSS](#motion--tailwind-css)

---

## Instalação e conceitos básicos

Fonte: https://motion.dev/docs/react-installation

Requer **React 18.2+**.

```bash
npm install motion
# yarn add motion
# pnpm add motion
```

```javascript
// React padrão
import { motion } from "motion/react"

// React Server Components (Next.js)
import * as motion from "motion/react-client"
```

### Via CDN (sem instalação local)

```html
<script type="module">
  import motion from "https://cdn.jsdelivr.net/npm/motion@latest/react/+esm"
</script>
```

> Em produção, substituir `latest` por uma versão específica.

### Por framework

- **Next.js (App Router)**: usar a diretiva `"use client"` no componente, **ou** importar de `"motion/react-client"` para reduzir JS enviado ao cliente. Também suporta o Page Router.
- **Vite**: nenhuma configuração especial necessária — funciona direto após instalar.

Os componentes motion "bypass React's render cycle entirely" — animações rodam no compositor do navegador a até 120fps sem causar re-renders React.

---

## Acessibilidade

Fonte: https://motion.dev/docs/react-accessibility

Animações podem ter implicações sérias de usabilidade, inclusive induzir enjoo (motion sickness). Sistemas operacionais modernos oferecem a preferência "Reduced Motion" para quem prefere menos movimento visual.

### Abordagem automática — `MotionConfig`

`reducedMotion="user"` desabilita automaticamente animações de transform e layout, preservando transições de opacidade e cor.

```jsx
import { MotionConfig } from "motion/react"

export function App({ children }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  )
}
```

### Abordagem manual — `useReducedMotion`

```jsx
import { useReducedMotion } from "motion/react"

const shouldReduceMotion = useReducedMotion()
```

### Casos de uso

```jsx
// Substituir transformação por opacidade
function Sidebar({ isOpen }) {
  const shouldReduceMotion = useReducedMotion()
  const animate = isOpen
    ? (shouldReduceMotion ? { opacity: 1 } : { x: 0 })
    : (shouldReduceMotion ? { opacity: 0 } : { x: "-100%" })

  return <motion.div animate={animate} />
}

// Desabilitar autoplay de vídeo de fundo
function BackgroundVideo() {
  const shouldReduceMotion = useReducedMotion()
  return <video autoPlay={!shouldReduceMotion} />
}

// Desabilitar parallax
function Parallax() {
  const shouldReduceMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 1], [0, -0.2])

  return <motion.div style={{ y: shouldReduceMotion ? 0 : y }} />
}
```

### Recomendações

- Preservar transições "educacionais" enquanto remove movimento excessivo.
- Usar a abordagem automática (`MotionConfig`) como base — melhor cobertura.
- Usar o hook para ajustes finos em componentes sensíveis.
- Testar com Reduced Motion habilitado em dispositivos reais.

---

## Reduzir o tamanho do bundle

Fonte: https://motion.dev/docs/react-reduce-bundle-size

### Tree-shaking

Bundlers como Rollup/Webpack removem código não usado automaticamente — importar só `useReducedMotion`, por exemplo, resulta em ~1kb, não os 50kb anunciados.

### `useAnimate` — duas versões

- **Mini** (2.3kb): usa exclusivamente WAAPI, animações aceleradas por hardware.
- **Hybrid** (17kb): suporta sequências, motion values e transformações independentes.

### `m` component + `LazyMotion`

```javascript
import * as m from "motion/react-m"
```

`m` é muito mais leve (4.6kb) — não precarrega layout animations, gestos de drag, etc.

```javascript
import { LazyMotion, domAnimation } from "motion/react"

function App({ children }) {
  return (
    <LazyMotion features={domAnimation}>
      {children}
    </LazyMotion>
  )
}
```

### Pacotes de features

| Feature | Tamanho | Funcionalidades |
|---------|---------|-----------------|
| `domAnimation` | +15kb | Animações, variantes, exit animations, gestos tap/hover/focus |
| `domMax` | +25kb | Tudo do anterior + drag/pan e layout animations |

### Lazy loading dinâmico

```javascript
// features.js
import { domMax } from "motion/react"
export default domMax

// App.js
const loadFeatures = () => import("./features.js").then(res => res.default)

function App() {
  return (
    <LazyMotion features={loadFeatures}>
      <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
    </LazyMotion>
  )
}
```

### Strict mode (evita regressões)

```javascript
<LazyMotion strict>
  {/* Lança erro se motion.div for usado em vez de m.div */}
</LazyMotion>
```

> Nota: Webpack gera bundles maiores que Rollup devido a limitações no tree-shaking.

---

## Animação de texto

Fonte: https://motion.dev/docs/text-animation

### Split text

Divide um bloco de texto em caracteres, palavras ou linhas para animá-los independentemente:

```html
<h1>Hello</h1>
<!-- vira -->
<h1><span>H</span><span>e</span><span>l</span><span>l</span><span>o</span></h1>
```

```javascript
import { animate, stagger } from "motion"
import { splitText } from "motion-plus"

useEffect(() => {
  const { chars } = splitText(ref.current)
  animate(
    chars,
    { opacity: 1, y: 0 },
    { delay: stagger(0.03) }
  )
}, [])
```

### Stagger

Transforma um intervalo em segundos em uma sequência de delays:

```javascript
animate(
  chars,
  { opacity: 1 },
  { delay: stagger(0.05, { from: "center" }) }
)
```

### Componentes especializados (Motion+)

| Componente | Função |
|-----------|--------|
| `Typewriter` | Digitação com variância humana |
| `ScrambleText` | Caracteres aleatórios antes do texto final |
| `AnimateNumber` | Animação de números/contadores |
| `RollingTextButton` | Efeito de rolo em hover |

```javascript
import { Typewriter } from "motion-plus/react"

<Typewriter speed="slow">Hello world!</Typewriter>
```

### Performance

Split text expande bastante o DOM. Animar `transform` e `opacity` (rodam no compositor), evitar blur agressivo, usar `contain: layout` quando possível.

---

## Animação SVG

Fonte: https://motion.dev/docs/react-svg-animation

Motion tem um componente para cada elemento SVG (`<motion.svg>`, `<motion.path>`, `<motion.circle>`, etc.), animando tanto estilos CSS quanto atributos SVG nativos.

```javascript
<motion.circle cx={0} animate={{ cx: 50 }} />
```

### Animação de `viewBox`

```javascript
// Deslocamento horizontal
<motion.svg viewBox="0 0 200 200" animate={{ viewBox: "100 0 200 200" }} />

// Zoom out
<motion.svg animate={{ viewBox: "-100 -100 300 300" }} />
```

### Line drawing (desenho de linhas)

Três propriedades especiais, valores de 0 a 1:

- `pathLength`: comprimento total desenhado.
- `pathSpacing`: espaço entre segmentos.
- `pathOffset`: início do segmento.

```javascript
<motion.path d={d} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />
```

### Path morphing

```javascript
<motion.path d="M 0,0 l 0,10 l 10,10" animate={{ d: "M 0,0 l 10,0 l 10,10" }} />
```

Funciona nativamente quando ambos os paths têm a mesma estrutura. Para paths muito diferentes, usar biblioteca como Flubber.

---

## Transições

Fonte: https://motion.dev/docs/react-transitions

### Tipos

- **tween**: baseada em duração + curva de easing. Movimento linear e previsível.
- **spring**: física com `stiffness`, `damping`, `mass`, incorpora velocidade de gestos existentes; também tem variante baseada em duração via `bounce`.
- **inertia**: desacelera um valor a partir da velocidade inicial — usado em inertial scrolling e drag.

### Propriedades principais

| Propriedade | Descrição |
|---|---|
| `duration` | Padrão 0.3s (0.8s com múltiplos keyframes). |
| `delay` | Adia a animação; valores negativos iniciam já em progresso. |
| `repeatDelay` | Pausa entre repetições. |
| `ease` | Nomes predefinidos (`linear`, `easeIn`, `easeOut`, `easeInOut`, `circIn`, `backIn`, `anticipate`) ou array de 4 números (Bézier cúbica). |
| `stiffness` (spring) | Padrão 1; maior = mais abrupto. |
| `damping` (spring) | Padrão 10; força de oposição. |
| `mass` (spring) | Padrão 1; maior = mais inércia. |
| `bounce` (spring) | Padrão 0.25; 0 = sem bounce, 1 = extremamente elástico. |
| `restSpeed` / `restDelta` | Definem quando a animação é considerada terminada. |
| `repeat` | Número de repetições ou `Infinity`. |
| `repeatType` | `"loop"`, `"reverse"` ou `"mirror"`. |

### Transições por propriedade

```javascript
animate("li",
  { x: 0, opacity: 1 },
  {
    default: { type: "spring" },
    opacity: { ease: "linear" }
  }
)
```

Propriedades com `inherit: true` herdam config de escopos menos específicos.

### Orquestração

- `when`: com variants, define quando a animação dispara em relação aos filhos (`"beforeChildren"` / `"afterChildren"`).
- `delayChildren`: atrasa animações dos filhos; compatível com `stagger()`.
- `stagger()`: distribui delays entre filhos (suporta `from: "last"` ou `"center"`).

```javascript
<motion.div
  animate={{ x: 100 }}
  transition={{
    duration: 0.8,
    delay: 0.5,
    ease: [0, 0.71, 0.2, 1.01]
  }}
/>
```

> Essa sintaxe funciona tanto em componentes `motion` quanto na função `animate()`.

---

## Animações de scroll

Fonte: https://motion.dev/docs/react-scroll-animations

Dois tipos de animação vinculada a scroll:

### 1. Scroll-triggered (disparada por scroll)

Ativa quando o elemento entra/sai da viewport, via `whileInView`.

```javascript
<motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} />
```

Configurações: `once: true` (anima só na primeira entrada), `root` (container de scroll customizado via `useRef`). Para controlar estado React sem componente `motion`, usar o hook `useInView`.

### 2. Scroll-linked (vinculada a scroll)

Conecta estilos CSS diretamente à posição de scroll, via `useScroll`. Retorna `scrollX`/`scrollY` (pixels) e `scrollXProgress`/`scrollYProgress` (0 a 1).

```javascript
// Barra de progresso
const { scrollYProgress } = useScroll();
return <motion.div style={{ scaleX: scrollYProgress, originX: 0 }} />

// Parallax: camadas de fundo mais lentas, primeiro plano mais rápido

// Scroll horizontal: useScroll + container position: sticky dentro
// de seção alta (height: 300vh), mapeando scrollYProgress para x
```

Motion usa `ScrollTimeline` nativo do navegador para aceleração total por hardware.

---

## Animações de layout

Fonte: https://motion.dev/docs/react-layout-animations

Automatizam a animação de tamanho/posição quando o layout muda. Motion mede a mudança e anima via CSS `transform` (translate + scale) em vez de width/height diretamente — alta performance.

### Prop `layout`

```jsx
<motion.div layout />
```

Funciona com qualquer mudança CSS que afete o layout: `justify-content`, número de colunas em grid, reordenar listas, adicionar/remover elementos. **Importante**: mudanças de layout devem vir de `style`/`className`, não de props como `animate` ou `whileHover`.

### `layoutId` (shared layout)

Cria transições entre elementos diferentes — quando um novo componente com `layoutId` correspondente entra, anima a partir da posição/tamanho do anterior.

```jsx
isSelected && <motion.div layoutId="underline" />
```

Se ambos coexistem, fazem crossfade automático. Combinar com `AnimatePresence` para controlar a saída do DOM.

### Customização

```jsx
<motion.div layout transition={{ duration: 0.3 }} />

// Transição diferente por propriedade
<motion.div
  layout
  animate={{ opacity: 0.5 }}
  transition={{
    ease: "linear",
    layout: { duration: 0.3 }
  }}
/>

// Curvar o caminho
transition={{ layout: { path: arc() } }}
```

### Casos avançados

- **Containers roláveis**: `layoutScroll` no container, para contar o offset de scroll.
- **Elementos fixed**: `layoutRoot` em elementos `position: fixed`.
- **Múltiplos componentes**: envolver em `<LayoutGroup>` para sincronizar layout changes entre componentes que não renderizam juntos.
- **Animação relativa ao pai**: Motion usa cálculos parent-relative para filhos não "ficarem para trás" — controlável via `layoutAnchor`.

### Limitações

- Requer `display` diferente de `inline`.
- Bloqueado durante resize horizontal do navegador.
- SVGs não suportados.
- Pode distorcer filhos ou propriedades como `border-radius` — adicionar `layout` aos filhos corrige.
- Conteúdo pode "pular" quando a scrollbar aparece — usar `scrollbar-gutter: stable`.

### Motion vs. View Transitions API

Motion é interruptível, não bloqueia interação, permite múltiplas animações simultâneas e trata scroll corretamente. A View Transitions API nativa do navegador não é interruptível, bloqueia eventos e tem performance pior com muitos elementos.

---

## motion (componente base)

Fonte: https://motion.dev/docs/react-motion-component

Substitui elementos HTML/SVG (`motion.div`, `motion.button`, `motion.circle`, etc.) adicionando capacidades de animação via props declarativas.

### Principais props

| Prop | Descrição |
|------|-----------|
| `animate` | Alvo de animação ao montar/atualizar. Aceita valores ou labels de variantes. |
| `initial` | Estado visual inicial. Pode ser `false` para desativar animação de entrada. |
| `exit` | Alvo de animação ao remover o componente da árvore. Requer `AnimatePresence`. |
| `transition` | Duração, easing, spring e delay das animações. |
| `variants` | Objeto com estados nomeados reutilizáveis entre componentes. |
| `whileHover` | Animação durante hover. |
| `whileTap` | Animação enquanto pressionado. |
| `whileFocus` | Animação ao receber foco. |
| `whileInView` | Anima quando o elemento entra na viewport. |
| `drag` | Ativa arraste (`true`, `"x"` ou `"y"`). |
| `layout` | Habilita animações de layout quando dimensões mudam. |
| `layoutId` | Anima mudanças de layout com transição suave entre elementos (shared layout). |

### Exemplos

```javascript
// Hover + spring
<motion.button
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  whileHover={{ scale: 1.2 }}
  transition={{ type: "spring" }}
>
  Clique-me
</motion.button>

// Variantes reutilizáveis
const variants = {
  visible: { opacity: 1, y: 0 },
  hidden: { opacity: 0, y: 20 }
}

<motion.div
  variants={variants}
  initial="hidden"
  animate="visible"
  transition={{ duration: 0.5 }}
/>

// Drag com constraints
<motion.div
  drag
  dragConstraints={{ left: 0, right: 300 }}
  whileDrag={{ scale: 0.9 }}
>
  Arraste-me
</motion.div>
```

---

## AnimatePresence

Fonte: https://motion.dev/docs/react-animate-presence

Permite animações de saída (`exit`) ao remover componentes `motion` da árvore.

```javascript
import { AnimatePresence } from "motion/react"

<AnimatePresence>
  {show && <motion.div key="modal" exit={{ opacity: 0 }} />}
</AnimatePresence>
```

### Regras importantes

- **Key única obrigatória** nos filhos diretos. Evitar índice como key em listas dinâmicas — usar identificador único do item.
- **Posicionamento**: a condicional de renderização deve estar **dentro** de `AnimatePresence`, não fora — se o componente se desmontar por fora, a saída não é controlada.

### Props principais

| Prop | Descrição |
|------|-----------|
| `initial={false}` | Desativa animação de entrada inicial. |
| `custom` | Passa dados para variantes dinâmicas. |
| `mode` | `"sync"` (padrão), `"wait"` ou `"popLayout"`. |
| `onExitComplete` | Callback ao término de todas as saídas. |
| `propagate={true}` | Permite saída em `AnimatePresence` aninhado. |

### Modos

- **sync**: elementos animam imediatamente ao serem adicionados/removidos.
- **wait**: elemento entrante aguarda a saída completa do anterior.
- **popLayout**: remove o elemento do fluxo, permitindo que outros refluam.

### Hooks úteis

```javascript
const isPresent = useIsPresent()
const direction = usePresenceData()
const [isPresent, safeToRemove] = usePresence()
```

---

## AnimateActivity

Fonte: https://motion.dev/docs/react-animate-activity

> Requer Motion@12.23.24+, React@19.2.0+, Motion+ (Early Access). Ainda em alpha — quando estável, será importado do pacote principal `motion`.

```javascript
import { AnimateActivity } from "motion-plus/animate-activity"
```

Usa o componente `Activity` do React para exibir/ocultar filhos com `display: none`, **mantendo o estado interno** — diferente do `AnimatePresence`, que anima elementos ao serem adicionados/removidos da árvore.

### Props principais

- `mode`: `"visible"` ou `"hidden"` (oculta com `display: none` após a animação de saída).
- `layoutMode`: `"pop"` remove imediatamente o elemento do fluxo de layout, permitindo que elementos adjacentes se reorganizem durante a animação de saída.

### Exemplos

```jsx
<AnimateActivity mode={isVisible ? "visible" : "hidden"}>
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  />
</AnimateActivity>

// Com stagger em variants
<AnimateActivity mode={isVisible ? "visible" : "hidden"}>
  <motion.ul exit="hidden" variants={{ hidden: { delayChildren: stagger(0.1) } }}>
    {items.map(item => (
      <motion.li variants={{ hidden: { opacity: 0 } }}>{item.title}</motion.li>
    ))}
  </motion.ul>
</AnimateActivity>

// Com layoutMode="pop"
<AnimateActivity mode={isVisible ? "visible" : "hidden"} layoutMode="pop" />
```

---

## AnimateView

Fonte: https://motion.dev/docs/react-animate-view

> Requer Motion 12.34.0+, React canary+, suporte do navegador à View Transition API nativa, e membro Motion+ para token de acesso.

```javascript
import { AnimateView } from "motion-plus/animate-view"
```

Ideal para **transições em nível de página** (mudança de rota) — não é interruptível como animações de layout tradicionais.

### Props principais

- `transition`: animação padrão para todos os tipos (aceita springs).
- `enter`: animação ao entrar no DOM (padrão `{ opacity: 1 }`).
- `exit` / `update`: animações de saída e de atualização de conteúdo/estilos.
- `name`: ativa animação de elemento compartilhado entre componentes com o mesmo `name` que entram/saem simultaneamente.

### Exemplos

```javascript
<AnimateView transition={{ duration: 1, ease: "easeOut" }}>

<AnimateView enter={{ clipPath: ["inset(0 50% 0 100%)", "inset(0 0% 0 0%)"] }}>

// Enter/Exit básico
{show && (
  <AnimateView>
    <div className="box" />
  </AnimateView>
)}
startTransition(() => setShow(!show))

// Elemento compartilhado
<AnimateView name="item-1">
  <div onClick={() => startTransition(() => setSelected("item-1"))} />
</AnimateView>
```

---

## LayoutGroup

Fonte: https://motion.dev/docs/react-layout-group

Coordena animações de layout entre componentes Motion que não renderizam juntos mas afetam o estado visual um do outro.

```javascript
import { LayoutGroup } from "motion/react"

function Accordion() {
  return (
    <LayoutGroup>
      <ToggleContent />
      <ToggleContent />
    </LayoutGroup>
  )
}
```

### Prop `id`

Como `layoutId` é global, `id` cria um namespace isolado — essencial para múltiplos grupos independentes que compartilham o mesmo `layoutId` na mesma aplicação.

```javascript
<LayoutGroup id="tabs-group">
  {items.map(item => <Tab {...item} />)}
</LayoutGroup>
```

### Caso de uso: shared layout transitions (abas)

```javascript
function Tab({ label, isSelected }) {
  return (
    <li>
      {label}
      {isSelected && <motion.div layoutId="underline" />}
    </li>
  )
}
```

---

## LazyMotion

Fonte: https://motion.dev/docs/react-lazy-motion

Reduz o bundle inicial de ~34kb para ~4.6kb, substituindo `motion` pelo componente `m`.

```javascript
import { LazyMotion, domAnimation } from "motion/react"
import * as m from "motion/react-m"

export const MyComponent = ({ isVisible }) => (
  <LazyMotion features={domAnimation}>
    <m.div animate={{ opacity: 1 }} />
  </LazyMotion>
)
```

### Carregamento síncrono vs. assíncrono

- **Síncrono**: features carregadas imediatamente na renderização inicial — bundle reduzido com funcionalidades sempre disponíveis.
- **Assíncrono**: features carregadas dinamicamente após a hidratação.

```javascript
const loadFeatures = () => import("./features.js").then(res => res.default)

function Component() {
  return (
    <LazyMotion features={loadFeatures}>
      <m.div animate={{ scale: 1.5 }} />
    </LazyMotion>
  )
}
```

### Strict mode

Com `strict={true}`, lança erro se detectar uso de `motion` (em vez de `m`) dentro do `LazyMotion`, preservando os benefícios de code-splitting.

> Nota: a doc consultada referencia apenas o pacote de features `domAnimation`; não há comparação detalhada com `domMax` disponível na página.

---

## MotionConfig

Fonte: https://motion.dev/docs/react-motion-config

Define opções de configuração para todos os componentes `motion` filhos.

```javascript
import { motion, MotionConfig } from "motion/react"

export const MyComponent = ({ isVisible }) => (
  <MotionConfig transition={{ duration: 1 }}>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
  </MotionConfig>
)
```

### Props principais

- `transition`: transição padrão aplicada a todos os filhos.
- `reducedMotion`: `"user"` (respeita preferência do dispositivo), `"always"` (força reduced motion, útil para debug), `"never"` (padrão — ignora a preferência). Quando ativo, animações de transform/layout são desabilitadas, mas opacidade e cores persistem.
- `transformPagePoint`: mapeia coordenadas do pointer para o espaço de coordenadas dos elementos — necessário para drag em elementos transformados ou SVGs com viewBox diferente.
- `nonce`: para Content Security Policy, permite que os blocos de estilo gerados pela Motion funcionem com segurança.

```javascript
import { correctParentTransform } from "motion/react"
const ref = useRef(null)

<div ref={ref} style={{ transform: "scale(0.5)" }}>
  <MotionConfig transformPagePoint={correctParentTransform(ref)}>
    <motion.div drag />
  </MotionConfig>
</div>
```

---

## Reorder

Fonte: https://motion.dev/docs/react-reorder

Cria layouts drag-to-reorder (abas, listas de tarefas, grids).

```javascript
import { Reorder } from "motion/react"

const [items, setItems] = useState([0, 1, 2, 3])

<Reorder.Group values={items} onReorder={setItems} axis="xy">
  {items.map((item) => (
    <Reorder.Item key={item} value={item}>
      {item}
    </Reorder.Item>
  ))}
</Reorder.Group>
```

### Props principais

**Reorder.Group**
- `values` (obrigatório): array de valores a reordenar.
- `onReorder`: callback disparado ao reordenar.
- `axis`: `"x"`, `"y"` ou `"xy"`.
- `as`: elemento HTML a renderizar (padrão `"ul"`).

**Reorder.Item**
- `value`: valor representado pelo item.
- `as`: elemento HTML (padrão `"li"`).

`Reorder.Group` detecta automaticamente se os itens estão dispostos horizontal, vertical ou em ambas as dimensões.

---

## Gestures (visão geral)

Fonte: https://motion.dev/docs/react-gestures

Motion suporta seis tipos de gesto: **hover**, **tap**, **pan**, **drag**, **focus** e **inView**. Todos usam props `while-` para animações temporárias durante o gesto ativo.

### Hover

Detecta quando um pointer entra/sai de um componente.

```javascript
<motion.a
  whileHover={{ scale: 1.2 }}
  onHoverStart={event => {}}
  onHoverEnd={event => {}}
/>
```

### Tap

Detecta clique/toque. Dispara `tap` (conclusão) e `tapCancel` (fora do componente). Acessível por teclado — `Enter` dispara a animação.

```javascript
<motion.button whileTap={{ scale: 0.9, rotate: 3 }} />
```

### Pan

Reconhece quando o pointer é pressionado e se move mais de 3px. Usa `onPan` (sem prop `while-` associada). Requer `touch-action` CSS para funcionar corretamente com toque.

```javascript
<motion.div onPan={(e, pointInfo) => {}} />
```

### Drag

Aplica o movimento do pointer aos eixos x/y do componente. Ver seção [Drag](#drag) para detalhes.

```javascript
<motion.div drag whileDrag={{ scale: 1.2, backgroundColor: "#f00" }} />
```

### Focus

Detecta ganho/perda de foco, seguindo as regras CSS `:focus-visible`.

```javascript
<motion.a whileFocus={{ scale: 1.2 }} href="#" />
```

### inView

Suportado (ver `whileInView` na seção [motion](#motion-componente-base)); a página de gestures não detalha exemplos além disso.

---

## Drag

Fonte: https://motion.dev/docs/react-drag

```jsx
<motion.div drag />
```

### Props principais

| Prop | Descrição |
|------|-----------|
| `drag` | `true` (ambos os eixos), `"x"` ou `"y"`. |
| `dragConstraints` | Limita o movimento: objeto de pixels (`{ top, left, right, bottom }`) ou um `ref` de elemento contêiner. |
| `dragElastic` | Elasticidade além dos limites, de 0 a 1. |
| `dragMomentum` | Por padrão, ao soltar o elemento há momentum/inércia; `false` desabilita. |
| `dragTransition` | Personaliza a física da inércia (`bounceStiffness`, `bounceDamping`). |
| `dragListener` | `false` desabilita o handler padrão de drag — usado junto com `useDragControls` para iniciar o drag a partir de outro elemento. |
| `onDragStart` / `onDrag` / `onDragEnd` | Callbacks do ciclo de vida do gesto, recebem `(event, info)`. `info` traz `point`, `delta`, `offset` e `velocity`. |
| `whileDrag` | Animação enquanto o elemento é arrastado. |

### Exemplos

```jsx
// Pixel constraints
<motion.div
  drag
  dragConstraints={{ top: -50, left: -50, right: 50, bottom: 50 }}
/>

// Ref-based constraints
const constraintsRef = useRef(null)
<motion.div ref={constraintsRef}>
  <motion.div drag dragConstraints={constraintsRef} />
</motion.div>

// Elasticidade e feedback visual
<motion.div
  drag
  dragConstraints={{ left: 0, right: 300 }}
  dragElastic={0.1}
  whileDrag={{ scale: 1.1, boxShadow: "0px 10px 20px rgba(0,0,0,0.2)" }}
/>

// Sem momentum
<motion.div drag dragMomentum={false} />

// Callback onDrag
function onDrag(event, info) {
  console.log(info.point.x, info.point.y)
  console.log(info.delta)
  console.log(info.offset)
  console.log(info.velocity)
}
<motion.div drag onDrag={onDrag} />
```

### Controle manual com useDragControls

Permite iniciar o drag a partir de outro elemento (ex.: um "handle" separado):

```jsx
import { motion, useDragControls } from "motion/react"

export function Scrubber() {
  const dragControls = useDragControls()

  function startDrag(event) {
    dragControls.start(event, { snapToCursor: true })
  }

  return (
    <>
      <div onPointerDown={startDrag} className="scrubber-track" />
      <motion.div drag="x" dragControls={dragControls} dragListener={false} />
    </>
  )
}
```

---

## Hover animation

Fonte: https://motion.dev/docs/react-hover-animation

```jsx
<motion.button whileHover={{ scale: 1.1 }} />
```

O componente anima para os valores de `whileHover` ao iniciar o gesto e retorna ao estado anterior quando termina.

### Transições separadas para entrada e saída do hover

```jsx
<motion.button
  whileHover={{
    scale: 1.1,
    transition: { duration: 0.1 }
  }}
  transition={{ duration: 0.5 }}
/>
```

A `transition` dentro de `whileHover` rege o início do gesto; a `transition` do componente rege o retorno ao estado original.

### Touch devices

Motion filtra ativamente eventos de hover emulados em dispositivos touch — evita que animações de hover "grudem" após o usuário levantar o dedo. `onHoverStart`/`onHoverEnd` só disparam onde o hover é genuinamente possível.

```jsx
<motion.a
  onHoverStart={() => console.log('Hover starts')}
  onHoverEnd={() => console.log('Hover ends')}
/>
```

### Alternativa leve: hover()

Função standalone (< 1kb) para quando não se quer o overhead do componente `motion`:

```jsx
import { hover } from "motion"
import { useRef, useEffect } from "react"

function Component() {
  const ref = useRef(null)
  useEffect(() => {
    return hover(ref.current, () => {
      console.log("on hover start")
      return () => console.log("on hover end")
    })
  }, [])
  return <button ref={ref} />
}
```

---

## Motion Values (useMotionValue)

Fonte: https://motion.dev/docs/react-motion-value

Um `MotionValue` é uma estrutura de dados que rastreia estado e velocidade de valores animados. Atualiza estilos DOM sem disparar re-render do React, via renderizador otimizado do Motion.

```javascript
import { useMotionValue } from "motion/react"

const x = useMotionValue(0)

<motion.div style={{ x }} />
```

Um mesmo motion value pode ser compartilhado entre múltiplos componentes para sincronizar animações.

### Principais métodos

| Método | Função |
|--------|--------|
| `get()` | Retorna o estado atual. |
| `set()` | Define um novo estado (ex.: `x.set(100)`). |
| `getVelocity()` | Retorna a velocidade por segundo; `0` para strings. |
| `on()` | Inscreve listeners em eventos específicos. |
| `isAnimating()` | Verifica se há animação ativa. |
| `stop()` | Interrompe a animação em andamento. |
| `jump()` | Muda o estado imediatamente, quebrando continuidade e resetando velocidade. |

### Exemplos

```javascript
// Transformação de valores
const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0])
return <motion.div drag="x" style={{ x, opacity }} />

// Listener de evento
useMotionValueEvent(x, "change", (latest) => console.log(latest))

// Acoplar a um spring
const dragX = useMotionValue(0)
const x = useSpring(dragX)
```

---

## useMotionTemplate

Fonte: https://motion.dev/docs/react-use-motion-template

Cria um novo motion value a partir de uma string template (tagged template literal) contendo outros motion values — a string se atualiza automaticamente quando qualquer motion value interpolado muda, sem re-render React.

```javascript
const x = useMotionValue(100)
const transform = useMotionTemplate`transform(${x}px)`
```

```javascript
const blur = useMotionValue(10)
const saturate = useMotionValue(50)
const filter = useMotionTemplate`blur(${blur}px) saturate(${saturate}%)`
```

### Exemplo — sombra dinâmica

```javascript
const shadowX = useSpring(0)
const shadowY = useMotionValue(0)
const filter = useMotionTemplate`drop-shadow(${shadowX}px ${shadowY}px 20px rgba(0,0,0,0.3))`

return <motion.div style={{ filter }} />
```

---

## useMotionValueEvent

Fonte: https://motion.dev/docs/react-use-motion-value-event

Gerencia um handler de evento de motion value durante o ciclo de vida do componente React, com limpeza automática ao desmontar.

```javascript
import { useMotionValueEvent } from "motion/react"
```

### Eventos suportados

- `change` — dispara quando o valor muda, fornece o valor mais recente.
- `animationStart` — quando uma animação inicia.
- `animationComplete` — quando uma animação é concluída.
- `animationCancel` — quando uma animação é cancelada.

### Exemplo

```javascript
function Component() {
  const x = useMotionValue(0)

  useMotionValueEvent(x, "animationStart", () => {
    console.log("animation started on x")
  })

  useMotionValueEvent(x, "change", (latest) => {
    console.log("x changed to", latest)
  })

  return <motion.div style={{ x }} />
}
```

> Alternativa: o método `on()` do motion value permite gerenciar subscriptions manualmente dentro de `useEffect`, exigindo cleanup explícito.

---

## useScroll

Fonte: https://motion.dev/docs/react-use-scroll

Cria animações sincronizadas com a rolagem (barras de progresso, parallax), usando a API `ScrollTimeline` do navegador para aceleração por GPU.

### Valores retornados

- `scrollX` / `scrollY` — posição absoluta de rolagem em pixels.
- `scrollXProgress` / `scrollYProgress` — posição normalizada entre 0 e 1.

### Opções

| Opção | Descrição | Padrão |
|-------|-----------|--------|
| `container` | Elemento rolável a rastrear. | Viewport do navegador |
| `target` | Elemento cujo progresso será rastreado. | Área rolável do container |
| `axis` | Eixo rastreado (`"x"` ou `"y"`). | `"y"` |
| `offset` | Pontos de interseção entre target e container. | `["start start", "end end"]` |
| `trackContentSize` | Rastreia mudanças no tamanho do conteúdo. | `false` |

### Exemplos

```javascript
// Indicador de progresso
const { scrollYProgress } = useScroll()
return <motion.div style={{ scaleX: scrollYProgress }} />

// Rastreando elemento específico
const ref = useRef(null)
const { scrollYProgress } = useScroll({
  target: ref,
  offset: ["start end", "end end"]
})

// Com suavização (spring)
const { scrollYProgress } = useScroll()
const scaleX = useSpring(scrollYProgress)
return <motion.div style={{ scaleX }} />
```

---

## useSpring

Fonte: https://motion.dev/docs/react-use-spring

Cria um motion value que anima para seu alvo mais recente usando física de spring — pode funcionar de forma independente ou acoplado a outro motion value.

```javascript
useSpring(0, { stiffness: 300 })
```

> A página não detalha `damping`/`mass` explicitamente — apenas `stiffness` é demonstrado, mas aceita as opções usuais de transição do tipo spring.

### Valor estático vs. motion value acoplado

```javascript
// Valor estático — anima ao chamar .set()
const x = useSpring(0)
x.set(100)

// Rastreando outro motion value — anima automaticamente quando x muda
const x = useMotionValue(0)
const y = useSpring(x)
```

### skipInitialAnimation

Útil para valores como os de `useScroll`, que podem mudar logo após a medição do DOM — evita a animação de spring na montagem inicial.

```javascript
const { scrollYProgress } = useScroll()
const smoothProgress = useSpring(scrollYProgress, {
  skipInitialAnimation: true,
})
```

---

## useTime

Fonte: https://motion.dev/docs/react-use-time

Cria animações contínuas/perpétuas. Retorna um motion value que se atualiza a cada frame com a duração em milissegundos desde sua criação.

```javascript
import { useTime } from "motion/react"

const time = useTime()
const rotate = useTransform(
  time,
  [0, 4000],
  [0, 360],
  { clamp: false }
)

return <motion.div style={{ rotate }} />
```

No exemplo, `rotate` completa um ciclo de 360° a cada 4 segundos, gerando rotação infinita suave.

---

## useTransform

Fonte: https://motion.dev/docs/react-use-transform

Cria um novo motion value que transforma a saída de um ou mais motion values existentes, sem causar re-renders React.

### 1. Função de transformação

```javascript
const doubledX = useTransform(() => x.get() * 2)
const distance = useTransform(() => Math.sin(time.get() / 1000) * 100)
```

Qualquer mudança nos motion values lidos dentro da função ativa recálculo no próximo frame.

### 2. Mapeamento de range

```javascript
const opacity = useTransform(x, [0, 100], [1, 0])
const color = useTransform(x, [0, 100], ["#f00", "#00f"])
```

Os ranges de entrada e saída precisam ter o mesmo comprimento. O range de entrada deve ser ascendente ou descendente; a saída aceita qualquer tipo animável (números, cores, unidades CSS).

### 3. Múltiplos outputs

```javascript
const { opacity, scale, filter } = useTransform(offset, [100, 600], {
  opacity: [1, 0.4],
  scale: [1, 0.6],
  filter: ["blur(0px)", "blur(10px)"],
})
```

### Opções

- `clamp` (padrão `true`): limita a saída ao intervalo, ou permite extrapolação com `false`.
- `ease`: função de easing para interpolar entre valores.
- `mixer`: função customizada para misturar pares de valores de saída.

---

## useVelocity

Fonte: https://motion.dev/docs/react-use-velocity

Cria um novo motion value que rastreia a velocidade de outro motion value numérico.

```javascript
const x = useMotionValue(0)
const xVelocity = useVelocity(x)
const scale = useTransform(xVelocity, [-3000, 0, 3000], [2, 1, 2])
return <motion.div drag="x" style={{ x, scale }} />
```

### Monitorar mudanças de velocidade

```javascript
useMotionValueEvent(xVelocity, "change", latest => {
  console.log("Velocity", latest)
})
```

### Encadeamento (aceleração)

Motion values de velocidade podem ser encadeados — chamar `useVelocity()` sobre o resultado de outro `useVelocity()` produz a aceleração:

```javascript
const xAcceleration = useVelocity(xVelocity)
```

---

## useAnimate

Fonte: https://motion.dev/docs/react-use-animate

Permite usar a função `animate` de forma imperativa, circunscrita aos elementos dentro do escopo do componente. Fornece controles manuais de animação, timelines e seletores CSS limitados ao escopo, com limpeza automática ao desmontar.

```javascript
const [scope, animate] = useAnimate()

return <ul ref={scope}>{children}</ul>
```

O ref `scope` deve ser anexado a um elemento HTML/SVG ou componente `motion`. A partir daí, é possível animar o próprio elemento ou filhos via seletor CSS (limitado ao escopo):

```javascript
// Animar o elemento com scope
animate(scope.current, { opacity: 1 }, { duration: 1 })

// Animar filhos com seletor
animate("li", { backgroundColor: "#000" }, { ease: "linear" })
```

### Sequências com async/await

```javascript
const enterAnimation = async () => {
  await animate(scope.current, { opacity: 1 })
  await animate("li", { opacity: 1, x: 0 })
}
```

### Casos de uso comuns

- **Animações ao entrar na viewport**: combinar com `useInView` para disparar animações quando o componente fica visível.
- **Animações de saída**: combinar com `usePresence` para sequências customizadas antes da desmontagem real.

---

## useAnimationFrame

Fonte: https://motion.dev/docs/react-use-animation-frame

Executa um callback a cada frame de animação, sincronizado com o ciclo de renderização do navegador.

### Parâmetros do callback

- `time`: tempo total decorrido desde a primeira execução.
- `delta`: intervalo de tempo desde o último frame.

```javascript
import { useAnimationFrame } from "motion/react"

function Component() {
  const ref = useRef(null)

  useAnimationFrame((time, delta) => {
    ref.current.style.transform = `rotateY(${time}deg)`
  })

  return <div ref={ref} />
}
```

---

## useDragControls

Fonte: https://motion.dev/docs/react-use-drag-controls

Permite iniciar e controlar manualmente gestos de arrasto — útil quando o arraste deve começar a partir de um elemento diferente (ex.: clicar em um ponto de um controlador de vídeo).

### Métodos

- `start(event, options)` — inicia o arrasto a partir de qualquer evento de pointer. Opções: `snapToCursor: true` (faz o componente ir até o cursor), `distanceThreshold` (pixels de movimento antes de iniciar; padrão 3).
- `stop()` — encerra o gesto manualmente.
- `cancel()` — encerra o gesto sem chamar o callback `onDragEnd`.

```javascript
import { useDragControls } from "motion/react"
const controls = useDragControls()

<motion.div drag dragControls={controls} />

<div onPointerDown={event => controls.start(event)} />

controls.start(event, { snapToCursor: true })

<motion.div dragListener={false} dragControls={controls} />
```

> Para touch, adicionar `style={{ touchAction: "none" }}` ao elemento disparador.

---

## useInView

Fonte: https://motion.dev/docs/react-use-in-view

Hook minimalista (0.6kb) que detecta quando um elemento está na viewport — `false` fora, `true` dentro.

```javascript
const ref = useRef(null)
const isInView = useInView(ref)
return <div ref={ref} />
```

### Opções

| Opção | Padrão | Descrição |
|-------|--------|-----------|
| `once` | `false` | Se `true`, para de observar após a primeira vez que entra em vista — sempre retorna `true` depois. |
| `margin` | `"0px"` | Margem ao redor da viewport, no formato CSS (topo/direita/base/esquerda). |
| `root` | viewport da janela | Ref de um elemento pai rolável, para usar como viewport alternativa. |
| `initial` | `false` | Valor inicial enquanto o elemento ainda não foi medido. |
| `amount` | `"some"` | Quanto do elemento deve entrar na viewport: `"some"`, `"all"` ou número de 0 a 1. |

```javascript
const isInView = useInView(ref, {
  margin: "0px 100px -50px 0px",
  once: true
})
```

---

## usePageInView

Fonte: https://motion.dev/docs/react-use-page-in-view

Rastreia a visibilidade da página/documento — útil para pausar animações, reprodução de vídeo ou outra atividade quando o usuário troca de aba, economizando CPU/bateria. SSR-compatível, retorna `true` por padrão no servidor.

```javascript
import { usePageInView } from "motion/react"

const isPageInView = usePageInView()
```

### Exemplos

```javascript
// Controlar vídeo
const videoRef = useRef(null)
const isInView = usePageInView()

useEffect(() => {
  const videoElement = videoRef.current
  if (!videoElement) return
  if (isInView) videoElement.play()
  else videoElement.pause()
}, [isInView])

// Pausar loop de animação
useAnimationFrame(isPageInView ? update : undefined)
```

---

## useReducedMotion

Fonte: https://motion.dev/docs/react-use-reduced-motion

Detecta se o dispositivo tem "Reduced Motion" ativado, para experiências acessíveis. Retorna `true`/`false`.

### Casos de uso

- Substituir animações de movimento (`x`/`y`) que causam tontura por alternativas como `opacity`.
- Desabilitar autoplay de vídeos de fundo.
- Desativar efeitos de parallax.

```javascript
import { useReducedMotion } from "motion/react"

export function Sidebar({ isOpen }) {
  const shouldReduceMotion = useReducedMotion()
  const closedX = shouldReduceMotion ? 0 : "-100%"

  return (
    <motion.div animate={{
      opacity: isOpen ? 1 : 0,
      x: isOpen ? 0 : closedX
    }} />
  )
}
```

---

## Motion + Tailwind CSS

Fonte: https://motion.dev/docs/react-tailwind

**Abordagem recomendada**: cada biblioteca faz o que faz melhor — classes utilitárias do Tailwind para estilo estático/responsivo, props de animação do Motion (`animate`, `layout`, etc.) para animação.

### Animações básicas

```javascript
import { motion } from "motion/react";

function Button() {
  return (
    <motion.button
      className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      Click Me!
    </motion.button>
  );
}
```

### Animações responsivas com variáveis CSS do Tailwind

```javascript
<motion.div
  className="
    p-8 bg-rose-500 text-white rounded-xl shadow-lg max-w-md mx-auto
    [--entry-distance-y:20px]
    md:[--entry-distance-y:50px]
  "
  initial={{ opacity: 0, y: "var(--entry-distance-y)" }}
  animate={{ opacity: 1, y: 0 }}
/>
```

Em telas pequenas o deslocamento inicial é 20px; em telas médias, 50px.

### Springs como CSS easing (para utilities do Tailwind puras, sem Motion)

```css
@theme {
  --ease-spring-snappy: linear(0, 0.2375, 0.5904, ...);
  --ease-spring-soft: linear(0, 0.0332, 0.1241, ...);
}
```

```html
<div className="transition-transform duration-700 ease-spring-soft">
```

### ⚠️ Conflito conhecido

Transições do Tailwind (`transition-`, `transition-all`) e animações do Motion no mesmo elemento causam stuttering. **Solução**: remover as classes `transition-` do elemento animado pelo Motion.
