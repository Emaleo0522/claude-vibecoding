# Blender / 3D — Método de trabajo y técnicas verificadas

Referencia on-demand. Cargar ANTES de empezar cualquier trabajo 3D en Blender.

Todo lo que está acá salió de trabajo real (sesiones 2026-08-18/19: espada, orco
v1, orco v2, cabeza, bosque low poly) o de investigación con fuentes verificadas.
Los errores catalogados son errores que ya se cometieron, no hipótesis.

---

## 0. La regla de oro: qué se hace y qué se delega

**Esta combinación es un excelente operador de Blender y un mal modelador.** Es
consenso de la comunidad y se verificó en carne propia dos días seguidos.

| Rinde bien | Rinde mal |
|---|---|
| Hard surface: armas, armaduras, props, arquitectura, mecánica | Anatomía orgánica: cuerpos, caras, manos |
| Materiales PBR y grafos de nodos | Geometry Nodes complejos (más de unos pocos nodos) |
| Iluminación, exposición, composición de cámara | Precisión espacial fina sin medir |
| Escenas, scatter, instanciado, low poly | Rigging y weight painting |
| Medición, gates, verificación, automatización | Topología limpia (sale en triángulos y n-gons) |
| Operaciones en lote y scripts reproducibles | Detalle de superficie matizado |

**Regla:** si el objeto tiene lógica geométrica, se construye. Si tiene anatomía
o escultura, se delega a un generador (ver `3d-generativo-reference.md`) y acá se
hace todo lo demás.

**Corolario probado:** el orco procedural falló dos días con dos técnicas
distintas. El mismo orco, generado desde una imagen, salió en tres minutos. La
espada hard surface salió bien a la primera. No es falta de pericia, es el
dominio.

---

## 1. Método de trabajo (el equivalente al TDD)

Orden fijo, con corte. Coincide con el pipeline profesional estándar: blockout,
aprobación de proporciones, recién después detalle y texturas. Los errores de
proporción se atrapan en el blockout, no después de texturizar.

### Fase 0 — Contrato de calidad, ANTES de tocar geometría

Se escribe un `.md` con criterios **verificables**, sin adjetivos. Si un criterio
no se puede medir, no entra al contrato. Mínimo:

- Qué se promete y qué NO. Decir explícitamente qué queda fuera de alcance.
- Destino: render offline, tiempo real, o ambos. **Esta pregunta cambia el 60%
  de las decisiones y hay que hacerla al principio.** Si el destino es web,
  subdividir es el proceso equivocado y hay que hornear.
- Identidad: qué rasgos hacen que la cosa se lea como lo que es. Medibles.
- Proporciones en números, no en sensaciones.
- Presupuesto geométrico.

Plantilla real: `blender-lab/CONTRATO_orco_v2.md`.

### Fase 1 — Blockout y proporciones

Geometría cruda, sin materiales. Se mide y se compara contra el contrato.

### Fase 2 — Gates de forma

- **Siluetas** a 256 px, negro sobre blanco, 4 ángulos. Si no se lee, nada más importa.
- **Proporciones** medidas por script contra los rangos del contrato.
- **Test ciego:** mirar las siluetas sin etiqueta.

### Fase 3 — Render clay (gris mate)

**Paso obligatorio y el más salteado.** Antes de materiales, un render en gris
mate con luz suave, tres vistas. Sirve para juzgar FORMA sin que el color
distraiga, que es lo que hacen los escultores.

### Fase 4 — Verificación estructural en materiales planos

Antes del render lindo, una pasada rápida con materiales para confirmar que
**cada pieza está donde dice estar**. Ver § punto ciego de la silueta.

### Fase 5 — Materiales, luz, render

Recién acá. Con exposición calibrada, no a ojo.

### Regla de corte

Ningún gate se saltea "para verlo lindo antes". En el orco v1 se fue directo a
subdividir y poner materiales sin mirar la forma, y el resultado fue una espada
bien hecha y un orco que no era un orco.

### Refutación con subagente

Para cualquier plan 3D no trivial, spawn de un subagente **con contexto limpio y
consigna de refutar**, no de validar. Model opus. Funcionó: el revisor anticipó
correctamente el techo del modelado procedural orgánico dos días antes de que se
verificara, y su recomendación (blindar, cambiar de estilo, o generar por IA) fue
la correcta.

---

## 2. El punto ciego de la silueta (aprendido caro)

**La silueta NO detecta errores de estructura.** En negro sobre blanco:

- Un cilindro hueco y una placa maciza se ven idénticos.
- Una hombrera diez centímetros más abajo sigue dando un bulto en el contorno.
- Una correa flotando en el aire sin tocar el cuerpo se ve igual que una apoyada.

En el orco v2 se aprobaron 27 piezas de armadura por silueta y al encender las
luces estaban todas mal ubicadas. **La cobertura de área es todavía peor:** en el
orco v1 se corrigieron proporciones y la cobertura pasó de 21,9% a 21,7%, o sea
no detectó nada, aunque la forma sí había cambiado.

**Regla:** la silueta juzga forma general. La estructura se verifica con un
render en materiales, aunque sea feo y rápido.

---

## 3. Técnicas verificadas

### Hard surface (funciona muy bien)

```
soldar dobles → marcar crease en aristas con ángulo diedro > 33°
→ shade smooth by angle (52°) → Subdivision nivel 2 con use_creases
→ Weighted Normal
```

El crease automático por ángulo es lo que permite subdividir **sin perder los
filos**: redondea los cilindros facetados y deja el filo de una hoja como filo.
Implementación: `blender-lab/scripts/geo.py`.

**No usar remesh por vóxel en hard surface**: se come los filos.

### Materiales PBR

- **Metallic es 0 o es 1.** Nada intermedio. Un GLB exportado de un visor web
  suele traer `metallic 0.35`, que en un render se ve plástico gris. Cambiarlo a
  1.0 fue el salto visual más grande de la espada.
- **Nodo Bevel** para redondear normales en aristas sin agregar un solo polígono.
- **Desgaste por curvatura** (Geometry Pointiness), no por textura pintada.
- **La dirección del pointiness se invierte según el material:**
  - Metal: mugre en cavidades, pulido en aristas salientes.
  - Piel: mugre en cavidades, **brillo graso en convexidades**.
- Ninguna rugosidad constante: todo material lleva variación espacial.

### Piel

- **Subsurface radius en METROS.** El default de Blender es 1,0, que significa
  un metro de dispersión y convierte la piel en medusa. La piel real dispersa
  entre 1 y 3 mm: usar del orden de `(0.0038, 0.0016, 0.0010)`.
- Peso de subsurface entre 0,15 y 0,40.
- **Poros prohibidos en plano general.** A cuerpo entero un poro real es 25 veces
  más chico que un píxel: es cómputo tirado. Y agrandarlos da piel de pelota de
  golf. Solo en encuadres más cerrados que 0,6 m.
- **Manchas de tono a escala de 10 a 20 cm.** Sin eso la piel lee como plástico
  pintado de un solo color, por más subsurface que tenga.
- Lo que sí se lee a cuerpo entero: arrugas de 8 a 30 mm y variación de rugosidad
  de 20 a 100 mm.

### Iluminación y exposición

- **El metal necesita un entorno OSCURO para leerse como metal.** Con un cielo
  uniforme refleja gris parejo y parece cerámica. Estudio oscuro con paneles de
  emisión: key chica y fuerte, banda vertical larga que la hoja refleja de punta
  a punta, rim frío detrás, fill mínimo.
- **La exposición se calibra midiendo, no a ojo.** Se pone una esfera gris 18% en
  la escena, se renderiza chico con fondo transparente, se mide el alfa como
  máscara y se corrige hasta que el gris caiga donde debe. La primera iluminación
  hecha a ojo estaba **7,6 stops** mal y no se notaba mirando.
  Implementación: `render_common.calibrate_exposure()`.
- Para exterior: alinear la dirección del objeto Sun con los ángulos del nodo Sky,
  calculándola, no a ojo.

### HDRI y assets de Poly Haven (verificado 2026-08-19)

- **Los comandos de descarga se registran al INICIAR el servidor del add-on.** Si
  se activa la integración (Poly Haven, Sketchfab) con el servidor ya corriendo,
  las tools existen del lado MCP pero el add-on responde
  `Unknown command type: download_polyhaven_asset`. **Solución: reiniciar el
  servidor** (`blendermcp.stop_server` y `start_server`). No es un problema de
  versión del add-on: se verificó que el archivo era idéntico.
- **HDRI de cielo puro, NO de entorno con contenido.** Un HDRI que es una foto de
  bosque real (`autumn_forest_04`) tapa por completo una escena low poly: el
  fondo fotográfico gana y la geometría estilizada queda como un detalle abajo.
  Para estilizado usar la categoría `pure skies` (por ejemplo
  `belfast_sunset_puresky`).
- **HDRI para ambiente, objeto Sun para sombras.** Un cielo puro ilumina parejo y
  no da sombras marcadas. La combinación que funciona es bajar la fuerza del HDRI
  (del orden de 0,4) y agregar un Sun fuerte (energía ~14). Esa **relación** entre
  los dos es lo que da contraste, no el valor absoluto de ninguno.
- Las categorías reales de HDRIs son `nature`, `outdoor`, `skies`, `pure skies`,
  `sunrise-sunset`, `clear`, `overcast`, `high contrast`. **No existe `forest`.**
- El HDRI descargado llega apuntando a un archivo **temporal**: correr
  `bpy.ops.file.pack_all()` antes de guardar, si no se pierde.

### Taller de piezas: construir aislado, ensamblar después

**Idea de Ema, 2026-08-19, y es la forma correcta de trabajar.** Aplica tanto a
props como a partes de personaje.

Iterar una pieza dentro de la escena final es lento y ciego:
- Se renderizan decenas de miles de triángulos para mirar un objeto que ocupa el
  5% del cuadro.
- Hay que pelear con la cámara para que ningún árbol la tape.
- Los defectos de la pieza quedan a 20 píxeles y no se ven.

**Método:** cada pieza se construye **centrada en el origen y apoyada en z=0**, en
un módulo aparte (`scripts/piezas.py`), sin ninguna coordenada de escena adentro.
Un taller (`scripts/taller.py`) la arma sola sobre un piso neutro, con luz de
estudio y encuadre automático, y la renderiza en cuatro vistas. La escena la
importa recién cuando está aprobada.

Resultado medido: la tienda dentro del bosque parecía aceptable. Sola, en un solo
render, aparecieron **cinco errores** invisibles antes: no tenía piso y se veía un
hueco negro, las solapas de la entrada estaban tiradas en el suelo como alfombras,
los cuatro vientos salían del mismo punto de la cumbrera y caían hacia adelante,
y las estacas estaban a metro y medio de la lona.

**Pero mirar no es verificar.** En esas mismas cuatro vistas de la tienda no se
detectó que **no tenía entrada**: las dos solapas cubrían toda la abertura y la
tienda estaba cerrada. Lo vio Ema en una sola foto. Renderizar de cerca da la
posibilidad de ver; no reemplaza revisar contra una lista.

**Checklist mínima por pieza, antes de aprobarla:**
1. ¿Tiene las aberturas que debe tener (puertas, ventanas, huecos)?
2. ¿Está centrado lo que debe estar centrado, respecto a su propio eje?
3. ¿Apoya en el suelo, sin flotar ni hundirse?
4. ¿Se ve algún interior hueco o cara negra desde algún ángulo?
5. ¿Las partes móviles o colgantes (solapas, cuerdas, telas) están donde
   estarían por gravedad?
6. ¿Cada elemento que cuelga o tensa termina en algo que existe (estaca, anclaje)?

Es la misma lección que ya había aparecido con el orco (trabajar por partes) y que
no se aplicó a tiempo en la escena. **Vale como regla: si una pieza tiene detalle
propio, se aprueba sola antes de entrar a la escena.**

### El bug de la niebla, que mordió DOS veces

La primera vez, porque el raycast que mide el suelo chocaba con el volumen de
niebla y devolvía 28 m. La segunda, porque el script guardó el `.blend` **con la
niebla adentro**, así que al reabrirlo volvió a pasar lo mismo.

Cerrado en tres frentes, y sirve como patrón general:
1. Al abrir, **eliminar** cualquier volumen que haya quedado de una corrida previa.
2. Medir el suelo contra **el objeto suelo explícitamente** (`ob.ray_cast`), no
   contra lo primero que aparezca en la escena (`scene.ray_cast`).
3. **No re-guardar** el archivo con elementos que son solo de render.

Moraleja: un bug que se arregla con un orden de operaciones vuelve apenas cambia
el orden. Conviene arreglarlo además donde no dependa del orden.

### Low poly

Es el caso donde la primitiva **es** la decisión, no la carencia. Un pino low poly
es un cono sobre un cilindro y no hay nada que falsificar.

- `use_smooth = False` en todas las caras: el facetado es a propósito.
- Pocos segmentos (6 a 7) y jitter en los radios para que no sean regulares.
- Variación por semilla fija, para poder repetir el resultado.
- Paleta por capas de profundidad y niebla volumétrica para separar planos.
- Implementación: `blender-lab/scripts/bosque_lowpoly.py`.

---

## 4. Errores propios catalogados

Todos cometidos de verdad. Chequear contra esta lista antes de dar algo por hecho.

| Error | Síntoma | Regla |
|---|---|---|
| Fijar la cámara antes que la resolución | Encuadre descentrado, sujeto chico | La resolución define el aspecto y el aspecto define el encuadre: **primero resolución, después cámara** |
| Raycast para medir el suelo con un volumen en escena | El terreno "mide" 28 m de alto y la cámara queda en el cielo | Medir la geometría ANTES de crear volúmenes de niebla |
| Usar el diámetro de una sección como radio | Toda la armadura al doble de tamaño | `medir()` devuelve tamaño, `anillo()` espera radio. Dividir por 2 |
| Medir un miembro por caja de sección | El cuello "mide" 66 cm de fondo porque la sección incluye pecho y espalda | Medir **radio local** alrededor del eje del miembro, no bounding box |
| Boolean union sobre mallas abiertas | Desaparece más de la mitad de la geometría | El boolean necesita **volúmenes cerrados**. Una malla cortada es una cáscara |
| Ramas colgantes en Skin modifier | La malla se fragmenta y aparecen púas | En Skin: nodos **intermedios** sí engrosan, **ramas** rompen. El volumen lateral sale del perfil elíptico |
| Restar una esfera grande para hacer una cuenca | Agujero pasante, se ve el interior del cráneo | Verificar el espesor disponible antes de restar |
| Buscar un nodo por nombre ("Principled BSDF") | `KeyError` si la interfaz está en otro idioma | Buscar **por tipo**: `n.type == "BSDF_PRINCIPLED"` |
| Inventar nombres de la API | `NISHITA`, `dust_density` no existen en 5.x | Consultar la doc embebida del MCP oficial antes de escribir |
| Filtrar objetos por prefijo de nombre después de renombrarlos | Lista vacía, cámara apuntando al vacío | Verificar que el filtro devuelve algo antes de usarlo |
| Aprobar por silueta y saltear el render | 27 piezas mal ubicadas descubiertas al final | Ver § punto ciego de la silueta |
| Mover el umbral de un gate para que pase | Autoengaño | Si un criterio no se cumple, se dice; no se baja la vara |

---

## 5. Los dos MCP de Blender: cuál usar para qué

| | Oficial (Blender Lab) | Comunidad (`ahujasid/blender-mcp`) |
|---|---|---|
| Tools | Inspección de escena y objetos, resumen del archivo, **documentación de la API y del manual embebidas**, screenshot de ventana, render de viewport, ejecutar Python | Info de escena y objeto, screenshot, ejecutar Python, **Poly Haven, Sketchfab, Hyper3D Rodin, Hunyuan3D** |
| Sirve para | Medir, inspeccionar, debuggear, **consultar la API sin alucinar**, verificar | Traer assets ya hechos y llamar generadores 3D |
| Blender | 5.1+ | 3.x/4.x, problemas reportados en 5.x |

**Decisión tomada (2026-08-19): se usan los dos.** No compiten: uno mide y
documenta, el otro trae material.

**Choque de puertos, resolver al instalar:** los dos add-ons escuchan en
**localhost:9876** por defecto y no pueden convivir ahí. Hay que correr uno en
otro puerto. El oficial acepta `--port` en modo headless y tiene el campo en las
preferencias del add-on; mover ese, que es el que menos se usa en simultáneo, y
dejar el 9876 al de la comunidad, que es lo que su servidor espera por defecto.
Síntoma si se olvida: el segundo add-on falla al iniciar o el cliente se conecta
al add-on equivocado y las tools devuelven datos de otra escena.

**Riesgo conocido del de la comunidad:** si Blender no está corriendo, su servidor
se cuelga en el handshake inicial y **rompe el cliente entero**, impidiendo que
carguen los demás MCPs hasta sacarlo del config (issue #275). Además hay
incompatibilidades reportadas con Blender 5.x, y acá se usa 5.2. Tener backup del
`claude_desktop_config.json` antes de tocarlo.

La regla de uso:

- ¿Necesito saber cómo se llama una función o una propiedad? → **oficial**,
  `search_api_docs` / `get_python_api_docs`. Evita el error más frecuente.
- ¿Necesito medir o verificar la escena? → **oficial**.
- ¿Necesito un HDRI, una textura, un árbol, una roca? → **comunidad**, Poly Haven
  o Sketchfab, en vez de modelarlo.
- ¿Necesito un objeto orgánico o escultórico? → **comunidad**, generador, o el
  flujo manual de `3d-generativo-reference.md`.

### Configuración instalada (2026-08-19), verificada

| | Oficial | Comunidad |
|---|---|---|
| Nombre del server en el config | `blender` | `blender-assets` |
| Prefijo de las tools | `mcp__blender__*` | `mcp__blender-assets__*` |
| Add-on en Blender | extensión `mcp` (Blender Lab) | `blender_mcp_addon.py` en `scripts/addons/` |
| **Puerto** | **9877** (movido para no chocar) | **9876** (su default) |
| Cómo sabe el puerto el servidor | variable de entorno `BLENDER_MCP_PORT=9877` en el config | default, sin configurar |
| Arranca solo al abrir Blender | **Sí**, `use_autostart` en preferencias | **Sí**, `blendermcp_auto_start_server` guardado en el archivo de inicio |

**Los dos arrancan solos** (configurado el 2026-08-19). El de la comunidad guarda
sus opciones como **propiedades de escena**, o sea dentro de cada `.blend`: por eso
se dejaron activadas en el **archivo de inicio** (`save_homefile`), si no cada
archivo nuevo volvía a los defaults apagados.

**Estado de las integraciones (verificado 2026-08-19):**

| Integración | Estado | Nota |
|---|---|---|
| Poly Haven | **Activa y probada** | 988 HDRIs indexados. No pide clave, es CC0. Ojo: las categorías reales son `nature`, `outdoor`, `sunrise-sunset`, `skies`; **no existe `forest`** |
| Hunyuan3D | **Activa y lista** | Sin clave. Permite generar desde acá, sin que Ema use el navegador |
| Hyper3D Rodin | Activa, **sin clave** | Existe un operador de free trial: `blendermcp.set_hyper3d_free_trial_api_key` |
| Sketchfab | Apagada | Requiere clave de API del usuario |
| Telemetría | **Apagada** | Queda solo conteo anónimo de nombre de tool y duración, que se apaga desde Preferences > Add-ons > Blender MCP |

### CHEQUEO OBLIGATORIO antes de usar `blender-assets`

**Regla:** la primera vez en cada sesión que se vaya a usar una tool
`mcp__blender-assets__*`, llamar antes a **`get_addon_status`**. Es barata,
devuelve versión, protocolo, versión de Blender y si hay conexión.

- **Responde bien** → seguir, está todo arriba.
- **Falla o da error de conexión** → NO reintentar ni buscarle la vuelta.
  Decirle al usuario, textual:

  > El servidor del MCP de la comunidad no responde. Fijate que Blender esté
  > abierto. Si lo está, apretá `N` en el viewport, pestaña **BlenderMCP**, y
  > apretá **Connect to Claude**.

Motivo: aunque el autostart está configurado, si se abrió un `.blend` viejo
guardado antes del 2026-08-19 ese archivo trae la propiedad apagada y no arranca.
Sin el chequeo, el síntoma es un error de conexión en medio de una tarea larga,
que es peor que avisar al principio.

**Si el archivo abierto es viejo**, además del Connect conviene tildar las casillas
del panel BlenderMCP (Poly Haven, Hunyuan3D) porque también viajan dentro del
`.blend`.

**Si algo falla, mirar en este orden:** que Blender esté abierto; que los dos
puertos escuchen (`netstat -ano | grep -E ":9876|:9877"`); que haya **una sola**
instancia de Blender, porque dos procesos peleando el mismo puerto dan errores
que parecen otra cosa.

Backups del config en `%APPDATA%\Claude\`:
`claude_desktop_config.backup-2026-08-19-pre-blendermcp.json`.

**Advertencia de seguridad, vale para los dos:** ejecutan código generado por el
modelo dentro de Blender sin ninguna barrera. Guardar el trabajo antes de usarlos.

---

## 6. Pipeline propio: qué hay hecho y dónde

Todo en `C:\Users\Ema\Desktop\claude\blender-lab\`.

| Script | Para qué |
|---|---|
| `render_common.py` | Estudio oscuro y neutro, encuadre automático con fit real, **calibración de exposición con gris 18%**, piso, world |
| `geo.py` | Tratamiento hard surface: soldar, crease por ángulo, subsurf, weighted normal |
| `mats.py` | Recetas PBR: metal, cuero, gema, hueso, piel, pelo, tela. Asignación por nombre de material |
| `render_clay.py` | Render en gris mate, tres vistas. **Gate de forma** |
| `silueta.py` | Siluetas negro sobre blanco por alfa, cuatro ángulos |
| `proporciones.py` | Mide alturas de cabeza, hombros, mano vs cara, simetría, inclinación de pelvis |
| `limpiar_ia.py` | Limpieza de malla generada por IA: unir, soldar, borrar islas, normales, escala real, apoyo en el piso |
| `bosque_lowpoly.py` | Bosque procedural: terreno, pinos, frondosos, rocas, distribución con separación mínima |
| `trasplante.py` | Corte cilíndrico de cabeza y encaje de otra, con alineación por medidas |

**Headless vs MCP:** headless (`blender --background --python x.py`) para
mediciones, renders largos y todo lo repetible; MCP para trabajar sobre la sesión
abierta cuando el usuario quiere ver lo que pasa. Decirle al usuario cuál se está
usando, porque headless es invisible para él.
