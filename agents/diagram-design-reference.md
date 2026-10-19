---
name: diagram-design-reference
description: Referencia destilada para generar diagramas editoriales (HTML + SVG inline) de calidad publicable — arquitectura, flujo, secuencia, swimlane, timeline, gantt, embudo, cuadrante, capas, barras. Consultar cuando hay que producir un diagrama que va a ver otra persona (doc de proveedor, playbook, propuesta a cliente, deck, README). No es un agente — es documentación bajo demanda. Destilada de github.com/cathrynlavery/diagram-design (MIT) el 2026-08-12.
---

# Diagram Design Reference — SVG editorial on-demand

> **Qué es esto:** el subconjunto ejecutable de la skill `diagram-design` (9.1k ★, MIT), filtrado para el perfil de Ema (PM en Saldoar + freelance). 10 tipos en vez de 27, reglas geométricas completas, sin import de draw.io/Mermaid ni variantes de nicho.
>
> **Cómo funciona realmente:** no hay motor de layout. El modelo escribe el SVG a mano, coordenada por coordenada. Todo el valor está en las reglas de abajo, que son lo que separa un diagrama publicable de "slop de IA". La consecuencia práctica: **iterá mirando el render**, no confíes en la primera pasada.

---

## 0. Gate de entrada — ¿corresponde un diagrama?

Antes de dibujar, tres preguntas. Si alguna falla, no dibujes.

1. **¿El lector aprende más de esto que de un párrafo bien escrito o una tabla de 3 columnas?** Si no → escribí el párrafo.
2. **¿Esto lo va a ver alguien más que yo?** Si es para pensar o es descartable → **Mermaid en un `.md`**. Es más rápido, diffeable y gratis. Esta ref es para piezas de comunicación.
3. **¿Va a cambiar tres veces esta semana?** Si sí → Mermaid. Regenerar y re-subir un PNG a Notion cada vez es fricción que no compensa.

**Costo estimado:** ~8-12k tokens de contexto (esta ref) + ~4-6k de output por diagrama, más 1-2 rondas de corrección visual. Presupuestalo.

---

## 1. Mapa de casos reales → tipo

| Lo que estás mostrando | Tipo | § |
|---|---|---|
| Topología de integración de un LP (fuentes → core → consumidores) | **Architecture** | §5.1 |
| Cómo se mueve la plata / los datos entre actores en el tiempo | **Sequence** | §5.3 |
| Proceso cross-funcional con handoffs (quién hace qué, apertura de país, onboarding de LP) | **Swimlane** | §5.4 |
| Lógica de decisión con ramas (¿aprobamos esta operación?, triage) | **Flowchart** | §5.2 |
| Hitos de release / historia de un incidente / roadmap de fechas | **Timeline** | §5.5 |
| Plan de proyecto con tareas, fases y solapamiento temporal | **Gantt** | §5.6 |
| Embudo de conversión con caída entre etapas · jerarquía de prioridades | **Pyramid / Funnel** | §5.7 |
| Priorización 2×2 (Impacto × Esfuerzo) · matriz de escenarios para la mesa | **Quadrant** | §5.8 |
| Stack de abstracción / capas del producto | **Layer stack** | §5.9 |
| Comparación cuantitativa entre categorías | **Bar chart** | §5.10 |

Reglas de selección:

- Si una tabla de 3 columnas dice lo mismo → tabla.
- Si estás combinando dos tipos → elegí el eje dominante. No hibridices gramáticas.
- Si pasás el presupuesto de complejidad (§4) → partí en overview + detalle.

**Variantes que no son tipos aparte:**
- *Data flow de plataforma* (roles × pasos con payload tipado) = **Swimlane** con chips de entrada/salida por celda.
- *Integración de plataforma de datos* = **Architecture** con zonas.
- *Matriz de permisos por rol* = tabla HTML, no SVG.

---

## 2. Skin — tokens de marca

Todo el sistema es *skinnable*. Cambiás estos valores y todos los diagramas heredan la marca sin tocar la lógica de layout.

### Slot de marca (editar acá)

```
paper        #f5f5f5   ← fondo de página y relleno de nodo por defecto
paper-2      #ececec   ← contenedor / relleno secundario
ink          #2d3142   ← texto y trazo primario
muted        #4f5d75   ← texto secundario, flechas por defecto
soft         #7a8399   ← sublabels, etiquetas de límite
rule         rgba(45,49,66,0.12)   ← hairlines
accent       #eb6c36   ← FOCAL — 1 o 2 elementos por diagrama, nunca más
accent-tint  rgba(235,108,54,0.08) ← relleno de cajas con borde accent
link         #2e5aa8   ← llamadas HTTP/API, sistemas externos
```

**Dark mode:** invertí `paper`↔`ink`, `paper-2`→`#393e53`, `muted`→`#bfc0c0`. Cualquier `rgba(45,49,66,X)` pasa a `rgba(245,245,245,X)` con la misma opacidad. El accent se aclara levemente (`#f08a59`).

### Cómo cargar una marca (cliente freelance o Saldoar)

1. Mirá el sitio del cliente (o `brand.json` si el proyecto pasó por el pipeline).
2. Mapeá a los roles semánticos de arriba. **No copies 8 colores** — elegí 3 (paper, ink, accent); el resto se vuelve variante de `muted`.
3. Verificá restricciones antes de dibujar:
   - `ink` debe cumplir **WCAG AA** sobre `paper`. `muted` también, para texto de 11px+.
   - **Un solo accent.** Dos accents borran la señal focal.
   - `paper` es neutro cálido, **nunca blanco puro** — el blanco puro esteriliza el diseño. Crema, hueso o gris con un toque de calidez.
   - Tres familias tipográficas, no más. Si la marca es todo sans, **mantené el serif para el título igual** — el contraste es estructural.

> **Nota de integración:** si el proyecto tiene `brand.json` del pipeline, ese es el origen; este slot es su proyección a roles de diagrama. No mantengas dos fuentes de verdad divergentes.

### Tratamiento por tipo de nodo

| Tipo | Relleno | Trazo |
|---|---|---|
| **Focal** (1-2 máx) | `accent-tint` | `accent` |
| **Backend / API / Paso** | blanco `#ffffff` | `ink` |
| **Store / Estado** | `ink @ 0.05` | `muted` |
| **Externo / Cloud** | `ink @ 0.03` | `ink @ 0.30` |
| **Input / Usuario** | `muted @ 0.10` | `soft` |
| **Opcional / Async** | `ink @ 0.02` | `ink @ 0.20` dashed `4,3` |
| **Seguridad / Límite** | `accent @ 0.05` | `accent @ 0.50` dashed `4,4` |

---

## 3. Tipografía

| Rol | Familia | Tamaño | Peso | Uso |
|---|---|---|---|---|
| Título | Instrument Serif | 1.75rem | 400 | H1 de página, solo |
| Nombre de nodo | Geist sans | 12px | 600 | Etiquetas legibles por humanos |
| Sublabel | Geist Mono | 9px | 400 | Puerto, protocolo, URL, tipo de campo |
| Eyebrow / tag | Geist Mono | 7-8px | 500, tracking 0.18em, MAYÚSCULAS | Tags de tipo, etiquetas de eje |
| Etiqueta de flecha | Geist Mono | 8px | 400, tracking 0.06em | Anotación sobre flechas |
| Aside editorial | Instrument Serif *itálica* | 14px | 400 | Solo callouts |

**Regla estructural:** la mono es para contenido *técnico* (puertos, comandos, URLs, tipos). Los **nombres van en sans**. Nunca JetBrains Mono como fuente genérica "de dev" — es el tell más obvio de diagrama generado.

```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

---

## 4. Grilla y presupuesto de complejidad

### Grilla de 4px — regla dura

**Todo valor —tamaños de fuente, padding, dimensiones de nodo, gaps, coordenadas x/y— divisible por 4.**

| Categoría | Valores permitidos |
|---|---|
| Tamaños de fuente | 8, 12, 16, 20, 24, 28, 32, 40 |
| Ancho / alto de nodo | 80, 96, 112, 120, 128, 140, 144, 160, 180, 200, 240, 320 |
| Coordenadas x / y | múltiplos de 4 |
| Gap entre nodos | 20, 24, 32, 40, 48 |
| Padding interno | 8, 12, 16 |
| Radio de borde | 4, 6, 8 |

Exentos: grosores de trazo (0.8, 1, 1.2) y valores de opacidad.

*Chequeo rápido:* si una coordenada termina en 1, 2, 3, 5, 6, 7 o 9 → corregila.

### Presupuesto por diagrama

| Límite | Valor |
|---|---|
| Nodos | **9 máx** |
| Flechas / transiciones | 12 |
| Elementos en accent | **2 máx** |
| Lifelines (sequence) | 5 |
| Carriles (swimlane) | 5 |
| Ítems (quadrant) | 12 |
| Capas (layers / pyramid) | 6 |
| Tareas (gantt) | 12 |
| Barras (bar) | 8 |

Si te pasás → **partí en dos diagramas** (overview + detalle). Nunca encojas la tipografía para que entre.

### Tamaño de lienzo según destino

| Destino | viewBox | Rampa tipográfica |
|---|---|---|
| Doc / README / Notion inline | `0 0 960 600` | estándar |
| Notion full-width / wiki | `0 0 1280 720` | estándar |
| Slide proyectada (deck cliente) | `0 0 1280 720` | **presentación** |
| Card de LinkedIn / OG | `0 0 1200 632` | presentación |
| Impresión A4 apaisado | `0 0 1120 792` | print |

**Rampa de presentación** (para slides — la clave de que se lea desde el fondo de la sala): título 40, nombre de nodo **16**, sublabel 12, etiqueta de flecha 12, alto mínimo de caja 64, gap mínimo 40.

Escalar el lienzo sin escalar la tipografía es exactamente cómo terminan ilegibles los diagramas proyectados. Si con la rampa de presentación no entra el layout, **es el lienzo diciéndote que tenés demasiados nodos** — bajá un nivel de detalle, no el tamaño de fuente.

Margen exterior: 40px en todos los lados. La franja de leyenda ocupa los 60px inferiores y nada más vive ahí.

---

## 5. Tipos — convenciones de layout

### 5.1 Architecture
Para: vistas de sistema, mapas de integración, topología de infra.

- Agrupá por capa o límite de confianza (frontend → backend → datos; público → privado).
- El flujo principal corre **izq→der o arriba→abajo**. Elegí uno y sostenelo.
- 1-2 nodos focales: el punto de integración principal, el store principal, o el nodo de decisión clave.
- Rectángulos punteados marcan regiones (VPC, zona de confianza); la etiqueta va sobre una máscara del color `paper` encima de la línea del borde.

**Zonas** (dibujar antes que flechas y nodos — orden z: fondo → zonas → flechas → nodos):

```svg
<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8"
      fill="rgba(45,49,66,0.02)" stroke="rgba(45,49,66,0.10)" stroke-width="0.8"/>
<rect x="{label_x}" y="{y+4}" width="{label_w}" height="12" rx="2" fill="{paper}"/>
<text x="{label_cx}" y="{y+13}" fill="rgba(45,49,66,0.40)" font-size="7"
      font-family="'Geist Mono', monospace" text-anchor="middle" letter-spacing="0.14em">CAPA</text>
```

- Dejá **≥16px** entre el borde inferior del eyebrow de zona y el borde superior del primer nodo. Zona `y` = tope_del_nodo − 32.
- Relleno de zona: `rgba(45,49,66,0.02)` (2% de ink). Más fuerte compite con los rellenos de nodo.
- **Máx 3 zonas.** Más y ya es un swimlane — usá ese tipo.

### 5.2 Flowchart
Para: lógica de decisión, ruteo de onboarding, árboles de triage.

- **La forma lleva el tipo, no el color:**
  - Óvalo (`rx=20`) — inicio / fin
  - Rectángulo (`rx=6`) — paso / acción
  - Rombo — decisión (≤3 salidas)
  - Punto relleno de ink (`r=4`) — punto de merge donde las ramas se reúnen
- Flujo arriba→abajo. Desde un rombo: Sí a la derecha, No abajo — pero **etiquetá todas las salidas igual**.
- Accent en el happy path *o* en la decisión más consecuente — nunca en cada decisión.
- Rombo con 4+ salidas → refactorizá en rombos anidados.

### 5.3 Sequence
Para: flujos request/response, intercambios entre actores en el tiempo, reconstrucción de incidentes, trazas de llamadas.

- Actores como cajas en fila horizontal arriba. **Lifelines**: líneas verticales punteadas que bajan de cada actor.
- Mensajes: flechas horizontales entre lifelines; el tiempo fluye arriba→abajo.
- **Barra de activación**: rectángulo angosto (`w=8`, relleno muted, trazo 0.8) sobre la lifeline durante el intervalo que ese actor tiene el control. Se apilan para llamadas anidadas.
- Auto-mensajes: bucle corto en U que vuelve a la misma lifeline; etiqueta a la derecha del bucle.

| Tipo de mensaje | Trazo | Marcador |
|---|---|---|
| Llamada (sync) | sólido muted o link-blue | relleno |
| **Retorno** | **punteado** muted | relleno — nunca sólido |
| Async / fire-and-forget | punteado muted | **abierto** (`polyline`, sin relleno) |
| Éxito principal | sólido accent (≤1-2 mensajes) | accent relleno |

**Ramas** (token válido vs inválido, reintento, paso opcional): usá un **fragmento combinado** — un marco rectangular que abarca solo las lifelines participantes, con una pestaña de operador arriba a la izquierda. No inventes clusters de flechas if/else sueltas.

```svg
<rect x="X" y="Y" width="W" height="H" rx="4"
      fill="rgba(45,49,66,0.02)" stroke="rgba(45,49,66,0.22)" stroke-width="1"/>
<rect x="X" y="Y" width="40" height="16" rx="2" fill="#f5f5f5" stroke="rgba(45,49,66,0.22)" stroke-width="1"/>
<text x="X+20" y="Y+12" fill="#4f5d75" font-size="8" font-family="'Geist Mono', monospace"
      text-anchor="middle" letter-spacing="0.12em">ALT</text>
```

Máx 1 fragmento por defecto, máx 2 regiones `alt`, sin anidar más de un nivel.

### 5.4 Swimlane
Para: procesos cross-funcionales, flujos tipo RACI, handoffs con proveedores, workflows multi-equipo.

- Carriles horizontales, uno por actor/equipo. Etiquetá cada carril en el margen izquierdo con un eyebrow en Geist Mono.
- Divisores de carril: hairlines de 1px.
- Los pasos son rectángulos **dentro del carril del actor que los ejecuta**; las flechas muestran el flujo.
- **Los handoffs (flechas que cruzan carriles) son las aristas más importantes** — considerá accent en el handoff que introduce más acoplamiento o latencia.
- No fuerces la misma cantidad de pasos por carril. Un carril con un solo paso está bien.

Anti-patrones: carriles sin etiqueta · un paso dibujado a caballo entre dos carriles (elegí un dueño) · flechas que serpentean ida y vuelta (reordená los pasos para que el flujo sea mayormente recto).

*Variante data-flow:* si cada celda maneja un payload tipado, agregá chips de entrada/salida (`DB`, `TB`, `FL`) en Geist Mono 7px en las esquinas de la caja.

### 5.5 Timeline
Para: historia de releases, hitos, cronología de un incidente, roadmaps.

- Línea base horizontal hairline al medio. Marcas de tick en los límites temporales con las fechas debajo en Geist Mono.
- Eventos: círculos rellenos (`r=4`) sobre la línea base. **Las etiquetas alternan arriba y abajo** para evitar colisión, conectadas al círculo con un hairline de 1px.
- Hitos mayores: círculo accent (`r=6`) + etiqueta Geist en negrita.
- **La escala temporal debe ser honesta.** Si los intervalos no son iguales, los círculos no se espacian igual. Si una región es demasiado densa, quebrá el eje visiblemente.

### 5.6 Gantt
Para: planes de proyecto y roadmaps con fechas explícitas de inicio y fin, agrupadas en fases.

- **Columna de etiquetas:** x=20-200 (180px). Nombres en Geist sans 11px 600. Fases como eyebrows Geist Mono 7px arriba de cada grupo.
- **Área de timeline:** x=200-960 (760px). Eje temporal izq→der.
- **Alto de fila:** 40px por tarea. Cada barra ocupa h=24px centrada (8px de padding superior).
- **Eje temporal:** etiquetas Geist Mono 8px en `x=200+i×pitch`, `y=56`. Separador hairline en `y=64`.
- **Agrupación por fase:** rect de zona sutil detrás de las filas de cada fase (mismo patrón que §5.1).
- **Barra focal:** 1 barra en accent (el entregable clave o la tarea de camino crítico). El resto: relleno muted @ 0.15, trazo muted.

```svg
<!-- Tarea normal -->
<rect x="X_start" y="ROW_Y+8" width="DURACION_PX" height="24" rx="4"
      fill="rgba(79,93,117,0.15)" stroke="#4f5d75" stroke-width="1"/>
<text x="X_start+8" y="ROW_Y+25" fill="#2d3142" font-size="10" font-weight="600"
      font-family="'Geist', sans-serif">Nombre de tarea</text>
```

Duración en píxeles: `(semana_fin − semana_inicio) × pitch`, donde `pitch = ancho_timeline / total_semanas`.

Anti-patrones: >12 tareas · >5 tracks paralelos por fase · flechas de dependencia (usá callouts si es esencial) · fechas dentro de la barra (van en el eje) · todas las barras con el mismo peso visual.

### 5.7 Pyramid / Funnel
Para: jerarquías de prioridad, pirámides de valor, embudos de conversión.

- **Elegí una orientación y no la mezcles.** Pirámide (punta arriba): el ápice angosto es lo más valioso/raro. Embudo (punta abajo): el extremo angosto es la conversión.
- 4-6 capas. Cada capa es un trapecio con un `<polygon>` de 4 puntos. Alto consistente (56-72px).
- **Los anchos deben ser honestos** — proporcionales al conteo o porcentaje real. Espaciado igual con caídas desiguales es mentir con un gráfico.
- Cada capa: nombre centrado (Geist 12-14px 600) + sublabel (Geist Mono 9-10px) + anotación lateral opcional (para embudos: el `−40%` de caída).
- Relleno: o tintes graduados sutiles, **o** todo `paper-2` con divisores hairline. Elegí uno.
- **Accent en UNA capa sola**: el ápice, la capa de conversión, o el cuello de botella crítico. Nunca en la base.

### 5.8 Quadrant
Para: priorización (Impacto × Esfuerzo), mapas de portfolio, marcos de decisión 2×2.

- Grilla 2×2. Ejes: cruz de 1px en ink por el centro.
- **Etiquetas de eje minimalistas:** UNA sola palabra en cada punta de flecha. Sin glifos (`↑`, `→`), sin paréntesis, sin modificadores "ALTO/BAJO". Geist Mono 9px peso regular, tracking 0.18em, mayúsculas. Flanqueá las puntas — nunca sobre la línea del eje. Acortá la flecha ~60-80px del borde del viewBox para dejar aire.
- **Nunca etiquetes en el punto medio.**
- Ítems: puntos etiquetados (`r=4`) posicionados en los cuadrantes. Etiquetas a 8-10px; que no crucen las líneas de eje.
- Accent en el ítem "hacer primero" (típicamente arriba-derecha). Máx ~12 ítems.

**Variante consultora (matriz de escenarios 2×2)** — para enmarcar cuatro futuros o apuestas estratégicas ante la mesa de negocio, no para priorizar:
- Ejes con flecha **doble punta** (`marker-start` + `marker-end`), 1.2px en ink.
- Las celdas contienen **un escenario nombrado + descripción de 1-3 líneas**, no puntos.
- Tag numerado en la esquina: `01 · DIMENSIÓN-A / DIMENSIÓN-B` (las palabras deben coincidir exactas con las etiquetas de eje).
- Accent en un *cuadrante* entero (fondo tintado + trazo accent + tag accent), no en un ítem.
- Título de celda: Geist sans 16px 600. Descripción: Geist sans 11px muted, alineada a la izquierda.

Anti-patrón: los cuatro cuadrantes rellenos de colores distintos. La posición y la etiqueta hacen el trabajo; el color solo agrega ruido.

### 5.9 Layer stack
Para: stack tecnológico, capas de abstracción, jerarquía de contexto.

- Bandas horizontales apiladas. Cada capa es un rectángulo de ancho completo (misma x, mismo ancho). 4-6 capas. Alto 56-72px.
- Cada fila contiene, de izq a der: **tag de índice** (`L3`, `07`) en eyebrow Geist Mono 8-9px · **nombre de capa** ligeramente a la izquierda del centro en Geist 14-16px 600 · **sublabel** a la derecha en Geist Mono 9-10px muted.
- Rellenos: o tonos alternados sutiles (paper / paper-2), **o** todo paper con divisores hairline. Elegí uno.
- Indicador de dirección en el margen **izquierdo, fuera de la pila**: flechita + etiqueta Geist Mono (`abstracción ↑`).
- Accent en **una** capa focal: el cuello de botella, la capa que paga el alquiler, la que está en discusión.

### 5.10 Bar chart
Para: comparar cantidades discretas entre categorías o intervalos.

- Barras verticales por defecto. Horizontales si las etiquetas son largas o hay más de 8 categorías.
- **Márgenes del área de ploteo:** izq 80px (etiquetas de eje Y), abajo 60px, arriba 40px, der 40px — dentro de un viewBox `0 0 1000 500`.
- 4-8 barras. Ancho de barra ≥50% del pitch de columna (el gap nunca debe superar la barra). Típico: pitch=110px, barra=72px.
- Gridlines Y: 4-6 líneas a intervalos regulares, `rgba(45,49,66,0.08)` a 0.8px. Línea base X a `rgba(45,49,66,0.25)`, 1px.
- Etiquetas de valor: Geist Mono 8px arriba de cada barra. **Una sola barra focal** en accent; el resto `muted @ 0.15`.
- **Nunca truncar el eje Y** — distorsiona la comparación de magnitud. Sin extrusión 3D, sin sombras.

---

## 6. Reglas de conectores — las que de verdad rompen todo

Estas cinco son no negociables. Son el 80% de lo que hace que un diagrama se vea hecho a mano vs generado.

### 1. Conectores ortogonales con esquina redondeada — OBLIGATORIO

**Nunca uses `<line>` diagonal entre nodos que no comparten x o y.** Cada quiebre es un cuarto de arco con `r=8` (mínimo `r=6` en layouts apretados). Una diagonal es falla automática.

```svg
<!-- derecha+abajo: de (x1,y1) a (x2,y2), mid = (x1+x2)/2 -->
<path d="M x1,y1 H mid-8 Q mid,y1 mid,y1+8 V y2-8 Q mid,y2 mid+8,y2 H x2"
      fill="none" stroke="…" stroke-width="1.2" marker-end="url(#arrow)"/>
```

Usá `<line>` recta **solo** cuando los extremos comparten x o y.

**Selección de puerto:** cuando el destino está notoriamente arriba o abajo del origen, salí por el borde superior/inferior y entrá por el superior/inferior. Usá una L de un solo quiebre (horizontal → esquina → vertical):

```svg
<!-- entrando a un nodo por abajo (destino arriba del origen) -->
<path d="M x1,y_src H x2-8 Q x2,y_src x2,y_src-8 V y_dst"
      fill="none" stroke="…" stroke-width="1.2" marker-end="url(#arrow)"/>
```

Reservá los puertos laterales para conexiones que viajan principalmente en horizontal. Entrar de costado en un camino mayormente vertical parece que la flecha *perfora* el nodo en vez de llegar desde arriba.

**Los caminos punteados siguen las mismas reglas de ruteo.** El punteado comunica peso semántico, no una gramática de ruteo distinta.

### 2. Margen etiqueta-conector: 6-10px, siempre

Una etiqueta **nunca** se sienta *sobre* su flecha — el conector tiene que quedar visible. Rect de máscara opaco para que la flecha no la atraviese, **más** un gap visible entre el borde de la máscara y el trazo.

```svg
<!-- La máscara va 14px arriba de la flecha (8px de alto de texto + 6px de gap) -->
<rect x="MID_X-18" y="ARROW_Y-20" width="36" height="12" rx="2" fill="#f5f5f5"/>
<text x="MID_X" y="ARROW_Y-11" fill="#7a8399" font-size="8"
      font-family="'Geist Mono', monospace" text-anchor="middle" letter-spacing="0.06em">WRITE</text>
```

≤14 caracteres, mayúsculas, centrada en el punto medio del segmento. Para segmentos verticales, la etiqueta va al costado con el mismo gap horizontal. **Nunca `writing-mode` vertical.**

### 3. Conectores que no se superponen

Dos conectores nunca comparten trazo, corren paralelos encimados, ni se dibujan uno sobre otro. Cuando dos flechas ortogonales **deben** cruzarse, aplicá el **puente/salto** sobre la menos importante:

```svg
<!-- Salto horizontal sobre un cruce vertical en x=cx -->
<path d="M x1,y H cx-8 a 8,8 0 0,1 16,0 H x2"
      fill="none" stroke="…" stroke-width="1.2" marker-end="url(#arrow)"/>
```

`a 8,8 0 0,1 16,0` es un arco de radio 8 que avanza 16px a la derecha, creando la jorobita. Para un salto vertical sobre una horizontal: `a 8,8 0 0,0 0,16`.

Puenteá la que sea semánticamente menos importante (pasiva, secundaria, write-back) o la de trazo más liviano. **Nunca puentees ambas.** Si te encontrás apilando conectores, rediseñá el layout: significa que dos nodos están demasiado cerca o el diagrama pasó el presupuesto.

### 4. Borde compartido → abrí los puntos de anclaje

Cuando 2+ conectores entran o salen del **mismo borde** de una caja, cada uno necesita su propio punto de anclaje, **≥12px** entre puntos adyacentes (8px mínimo en cajas muy chicas).

Para N conectores en un borde de largo L, el punto `k` (1..N) va a `L × k / (N + 1)` desde la esquina inicial. Cuando dos conectores paralelos van en la misma dirección, mantenelos a ≥12px **en todo su recorrido**, no solo en el anclaje.

*Ningún conector puede ocultar a otro.* Si no distinguís dos flechas de un vistazo, el layout falló.

### 5. No pasar por detrás de cajas que no son extremos

Reruteá alrededor de las cajas intermedias por defecto. La única excepción legítima: un nodo transversal (una barra de servicios al pie, una capa horizontal) que **físicamente** se interpone en el único camino ortogonal directo. En ese caso:
- El trazo debe ser **punteado** (`stroke-dasharray="4,3"`) para señalar "tránsito, no interacción".
- La etiqueta va en el extremo **visible** del conector (típicamente cerca del origen).
- Ningún marcador (punta de flecha) puede aterrizar sobre el borde de la caja intermedia.

Ante la duda, reruteá.

### Marcadores y estilos de flecha

```svg
<marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
  <polygon points="0 0, 8 3, 0 6" fill="#4f5d75"/></marker>
<marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
  <polygon points="0 0, 8 3, 0 6" fill="#eb6c36"/></marker>
<marker id="arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
  <polygon points="0 0, 8 3, 0 6" fill="#2e5aa8"/></marker>
```

| Flecha | Trazo | Cuándo |
|---|---|---|
| Default | muted | Interna, genérica |
| Accent | accent | Principal / destacada |
| Link-blue | link | Llamadas HTTP/API, sistemas externos |
| Punteada | `stroke-dasharray="5,4"` | Opcional, pasiva, retorno, async |

**Dibujá las flechas antes que las cajas** para que el orden z las deje por detrás.

---

## 7. Primitivas

### Caja de nodo — patrón completo

```svg
<!-- 1. Máscara opaca — evita que las flechas se transparenten a través del relleno -->
<rect x="X" y="Y" width="W" height="H" rx="6" fill="#f5f5f5"/>
<!-- 2. Caja estilada -->
<rect x="X" y="Y" width="W" height="H" rx="6" fill="RELLENO" stroke="TRAZO" stroke-width="1"/>
<!-- 3. Tag de tipo rectangular (rx=2 — NO una píldora) -->
<rect x="X+8" y="Y+6" width="28" height="12" rx="2" fill="transparent" stroke="TRAZO@0.40" stroke-width="0.8"/>
<text x="X+22" y="Y+15" fill="TRAZO@0.8" font-size="7" font-family="'Geist Mono', monospace"
      text-anchor="middle" letter-spacing="0.08em">API</text>
<!-- 4. Nombre del nodo (Geist sans) -->
<text x="CX" y="CY+2" fill="#2d3142" font-size="12" font-weight="600"
      font-family="'Geist', sans-serif" text-anchor="middle">Nombre</text>
<!-- 5. Sublabel técnico (Geist Mono) -->
<text x="CX" y="CY+18" fill="#4f5d75" font-size="9"
      font-family="'Geist Mono', monospace" text-anchor="middle">tech:puerto</text>
```

### Leyenda — franja horizontal abajo

**Nunca dentro del área del diagrama.** Va después de todos los nodos, con un separador hairline. Expandí el `viewBox` ~60px de alto.

```svg
<line x1="30" y1="LEGEND_Y-8" x2="VIEWBOX_W-30" y2="LEGEND_Y-8"
      stroke="rgba(45,49,66,0.10)" stroke-width="0.8"/>
<text x="30" y="LEGEND_Y+8" fill="#4f5d75" font-size="8" font-family="'Geist Mono', monospace"
      letter-spacing="0.14em">LEYENDA</text>
<!-- Ítems en fila horizontal, ~160px de separación -->
```

### Fondo

Por defecto: **papel limpio, sin patrón**. Un solo `<rect>` con `paper`. Sin contenedor secundario — el diagrama se apoya directo sobre la página.

El patrón de puntos (22×22, ink al 10%) es opt-in, solo para diagramas editoriales largos donde el diagrama es el héroe. **No lo uses** dentro de una página de producto, una slide o una card — la textura se suma al chrome de alrededor y se lee como ruido.

---

## 8. Template base

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Título del diagrama]</title>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --color-paper:  #f5f5f5;
      --color-ink:    #2d3142;
      --color-muted:  #4f5d75;
      --color-accent: #eb6c36;
      --font-sans:    'Geist', system-ui, sans-serif;
      --font-serif:   'Instrument Serif', serif;
      --font-mono:    'Geist Mono', ui-monospace, monospace;
    }
    body {
      font-family: var(--font-sans); background: var(--color-paper); color: var(--color-ink);
      min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 3rem 2rem;
    }
    .frame { max-width: 1200px; width: 100%; }
    .eyebrow {
      font-family: var(--font-mono); font-size: 0.66rem; font-weight: 500;
      letter-spacing: 0.18em; text-transform: uppercase; color: var(--color-muted); margin-bottom: 0.5rem;
    }
    h1 {
      font-family: var(--font-serif); font-size: clamp(1.5rem, 2.4vw + 0.75rem, 2rem);
      font-weight: 400; letter-spacing: -0.02em; line-height: 1.15; margin-bottom: 1.5rem;
    }
    svg { width: 100%; min-width: 900px; display: block; }
  </style>
</head>
<body>
  <div class="frame">
    <p class="eyebrow">[Tipo] · [Proyecto]</p>
    <h1>[Título del diagrama]</h1>

    <svg viewBox="0 0 1000 600" xmlns="http://www.w3.org/2000/svg" role="img"
         aria-labelledby="[slug]-title [slug]-desc">
      <title id="[slug]-title">[Título — ≤60 caracteres]</title>
      <desc id="[slug]-desc">[Una oración: qué muestra el diagrama, en términos que sirvan sin ver la imagen]</desc>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#4f5d75"/></marker>
        <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#eb6c36"/></marker>
        <marker id="arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#2e5aa8"/></marker>
      </defs>

      <rect width="100%" height="100%" fill="#f5f5f5"/>

      <!-- Orden: zonas → flechas → nodos → leyenda -->

    </svg>
  </div>
</body>
</html>
```

**Contrato de accesibilidad:** el `<title>` es el **primer hijo** del `<svg>`, antes de `<defs>` (los lectores de pantalla pueden ignorar un title más abajo). Los IDs llevan prefijo del slug — nunca `title`/`desc` pelados, porque dos diagramas inline generarían IDs duplicados. El `<desc>` describe el **contenido**, no la geometría: *"Diagrama de flujo mostrando cómo una operación pasa de solicitud a liquidación"*, no *"Una caja arriba con cinco cajas debajo"*.

---

## 9. Checklist antes de entregar

El original tiene 30 casillas. Estas son las que de verdad fallan:

**Geometría (donde se rompe el 80%):**
- [ ] ¿Ningún conector diagonal entre nodos fuera de eje? ¿Todos los quiebres con arco `r=8`?
- [ ] ¿Toda etiqueta de flecha tiene gap visible de 6-10px sobre su conector, y máscara opaca detrás?
- [ ] ¿Ningún par de conectores encimado? ¿Los cruces usan puente?
- [ ] ¿Los conectores que comparten borde de caja tienen anclajes propios a ≥12px?
- [ ] ¿Flechas dibujadas antes que las cajas?
- [ ] ¿Toda coordenada, tamaño y gap divisible por 4?

**Señal:**
- [ ] ¿Accent en ≤2 elementos? Si hay más, no decidiste qué es focal.
- [ ] ¿Dentro del presupuesto de complejidad (§4)?
- [ ] ¿La leyenda es una franja abajo, no algo flotando adentro?

**Test de borrado** (el que más mejora el resultado):
- [ ] ¿Puedo eliminar algún nodo y que el lector siga entendiendo?
- [ ] ¿Hay dos nodos que siempre viajan juntos? Son uno solo.
- [ ] ¿Alguna flecha cuya relación ya es obvia por el layout?

**Tipografía:**
- [ ] ¿Los nombres legibles están en Geist sans, no en mono?
- [ ] ¿La mono está reservada para puertos, comandos, URLs, tipos?
- [ ] ¿Cero JetBrains Mono?

---

## 10. Anti-patrones universales

| Anti-patrón | Por qué falla |
|---|---|
| Dark mode + glow cian/violeta | Parece "técnico" sin haber tomado ninguna decisión de diseño |
| JetBrains Mono como fuente genérica "de dev" | La mono es para contenido técnico, no para todo |
| Cajas idénticas para cada nodo | Borra la jerarquía |
| Leyenda flotando dentro del diagrama | Colisiona con los nodos |
| Etiqueta de flecha sin máscara | La línea la atraviesa |
| Texto vertical con `writing-mode` | Ilegible |
| **Cualquier `box-shadow`** | Las sombras están afuera. Los bordes están adentro |
| `border-radius` grande (`rounded-2xl`) | Máximo 6-10px, o ninguno |
| Accent en cada nodo "importante" | Accent son 1-2 énfasis editoriales, no un sistema de señalización |
| 3 cards de igual ancho como default | Grilla genérica — variá los anchos (`1.1fr 1fr 0.9fr`) |
| Reproducir el layout del renderer de Mermaid | Importa espaciado y ruteo automáticos en vez de un layout editorial |

---

## 11. Flujo operativo

1. **Gate §0** — ¿corresponde diagrama? ¿es para otro o para mí?
2. **Elegí tipo** (§1) y **tamaño de lienzo** según destino (§4).
3. **Cargá el skin** (§2) — marca del cliente o `brand.json` del proyecto.
4. **Escribí el HTML** desde el template (§8), orden: zonas → flechas → nodos → leyenda.
5. **Renderizá y mirá.** Con Playwright MCP o abriendo el archivo. **Este paso no es opcional** — no hay validación de colisiones, los solapamientos solo se ven mirando.
6. **Corregí** contra el checklist §9. Presupuestá 1-2 rondas.
7. **Exportá si hace falta** (§12).

### Destino → formato

| Destino | Formato | Nota |
|---|---|---|
| Notion / wiki interna | **PNG @2** | Notion no renderiza HTML embebido |
| Slide / deck de cliente | **PNG @2**, lienzo `slide-16x9`, rampa presentación | |
| README / docs site | HTML embebido o PNG | |
| LinkedIn / card OG | PNG @2, lienzo `social-og` | Dejá 64px libres en todo el borde — los recortes varían por plataforma |
| Figma / Illustrator | SVG | ⚠️ ver advertencia §12 |

---

## 12. Export

**El HTML es siempre la fuente de verdad.** Nunca escribas un `.svg` a mano; se genera *desde* el HTML.

**PNG (el camino seguro):** renderizá el **HTML original** con Playwright y capturá solo el bounding box del elemento `<svg>`, con `omit_background=True` para que quede fondo transparente y se pueda apoyar sobre cualquier color de slide. Las fuentes ya están cargadas en el HTML, así que la tipografía sale correcta.

**SVG (con advertencia):** extraé el primer bloque `<svg>…</svg>`, agregá `xmlns` si falta, preservá `role`/`aria-labelledby`/`<title>`/`<desc>`, y prependé `<?xml version="1.0" encoding="UTF-8"?>`. Hay que inyectar las fuentes por `@import` dentro de un `<defs><style>`:

```svg
<defs><style>@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&display=swap');</style></defs>
```

> ⚠️ **Trampa conocida:** las herramientas que no bajan fuentes remotas al importar (Illustrator offline, varios paths de import de Figma, visores SVG viejos) **sustituyen la tipografía y rompen la maquetación**. En el navegador se ve perfecto y en el destino no. Si el destino no es un navegador, **entregá PNG**.

Ambos formatos entregan **solo el diagrama** — el header, las cards y el footer se descartan a propósito. Nunca exportes sin que te lo pidan.

---

## Procedencia

Destilado de [`cathrynlavery/diagram-design`](https://github.com/cathrynlavery/diagram-design) v2.2 (MIT), 2026-08-12. Original: 27 tipos, 37 referencias, ~60k palabras. Esta ref: 10 tipos, ~1/6 del volumen.

**Descartado a propósito:** import de draw.io/Mermaid (scripts Python — si hace falta, usar el repo directo) · variantes sketchy y terminal · set de iconos · tipos de nicho (ER, state machine, radar, venn, nested, tree, org chart, scatter, loop, line, medallion, high-level, process, dp-integration, dp-security-matrix, it-current-state) · paleta de series multi-color · la prosa filosófica.

**Agregado que el original no tiene:** el gate §0 (cuándo *no* usar esto), el mapa de casos en vocabulario de trabajo real (§1), el flujo operativo con destinos (§11), y la advertencia de fuentes en export SVG elevada a trampa explícita (§12).
