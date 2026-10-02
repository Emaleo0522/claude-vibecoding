# 3D generativo — Generadores por IA, rigging y animación

Referencia on-demand. Cargar cuando el trabajo 3D necesita **anatomía, escultura
o un personaje**, o cuando hay que riggear o animar una malla.

Complementa `blender-3d-reference.md`, que cubre el método y lo que se construye
a mano. Acá está lo que se delega y cómo se integra después.

---

## 1. Cuándo delegar en vez de modelar

**Delegar siempre que el objeto tenga anatomía, escultura o superficie orgánica
matizada.** Cuerpos, caras, criaturas, manos, plantas realistas.

Está verificado en producción y en la comunidad: el modelado procedural de
orgánico da "un ensamblado de esferas estiradas". Dos días de intentos con dos
técnicas distintas (esqueleto con Skin modifier, y masas fusionadas con booleana
más remesh) confirmaron el techo. El mismo objeto generado desde una imagen salió
bien en minutos.

**No delegar** hard surface, escenas, low poly, props geométricos, arquitectura:
eso se construye mejor y con más control por script.

---

## 2. Hunyuan3D, el que se usó y funcionó

Space gratuito: `huggingface.co/spaces/tencent/Hunyuan3D-2.1`

### Receta verificada

1. Imagen de referencia con **un solo objeto y fondo limpio**. Si la referencia
   tiene varias vistas juntas, **recortar una sola**, si no el modelo interpreta
   tres objetos distintos.
2. Botón **Gen Shape**, no el texturizado. La textura sale del color de la
   referencia y no sirve si después se aplican materiales PBR propios.
3. Advanced Options: **Octree Resolution de 256 a 512.** Es el parámetro que más
   define cuánto detalle sobrevive. Si da error de memoria, 384.
4. Guidance Scale a 6,5 o 7 cuando se quiere fidelidad a la referencia. No pasar
   de 7,5, empieza a salir rígido.
5. Export: `glb`, **sin** Simplify Mesh. El Target Face Number solo actúa si se
   tilda Simplify.
6. Botón **Transform** y recién ahí se habilita **Download**.

Salida típica: 800k a 1,7M triángulos, una sola malla, sin materiales,
normalizada a una caja arbitraria.

### Limitaciones observadas

- **Inventa mal lo que no ve.** Un busto generado desde una vista frontal sale con
  la nuca deforme. Si se necesita la parte de atrás, usar una referencia de tres
  cuartos o generar solo lo que se va a usar.
- Las caras salen correctas pero blandas si la referencia es de cuerpo entero.
  Para carácter facial conviene una segunda generación desde un busto recortado.
- Dedos de las manos algo fusionados.
- Topología en triángulos, no sirve para riggear ni subdividir sin retopo.

### No se puede invocar desde Claude

El conector de Hugging Face de este entorno tiene las invocaciones de Spaces
deshabilitadas (`gradio=none`), y los Spaces alternativos habilitados para MCP
estaban dormidos. **Lo hace el usuario en el navegador y pasa el GLB.**
(El MCP de la comunidad `ahujasid/blender-mcp` sí trae Hunyuan3D y Rodin
integrados: con ese instalado, esto cambia.)

### Alternativas

| Herramienta | Licencia | Nota |
|---|---|---|
| **TRELLIS** (Microsoft) | **MIT**, sin restricciones | La alternativa más seria. Gana en precisión de malla, pierde en cara y detalle fino |
| **Hunyuan3D-2.1** | Community License | **Excluye UE, Reino Unido y Corea del Sur**, exige atribución. PBR completo |
| **Hunyuan3D-Omni** | Community License | No es un generador nuevo: control fino sobre 2.1 aceptando point clouds, voxels y **pose de esqueleto** como condicionantes |
| **Step1X-3D** | Apache 2.0 | La licencia más permisiva |
| **Meshy / Tripo** | Freemium | Plan gratis con outputs bajo CC BY: atribución obligatoria y asset público. Tripo gratis es **solo uso personal** |
| **Sparc3D** | CC BY-NC-SA | **No comercial.** Cuidado |

---

## 3. Integrar una malla generada

Script listo: `blender-lab/scripts/limpiar_ia.py`

1. Unir en una pieza y soldar vértices dobles.
2. **Borrar islas sueltas**: quedarse solo con la componente conexa más grande.
3. Recalcular normales.
4. **Escalar a medida real** y apoyar en el piso. Vienen normalizadas a una caja
   arbitraria: sin este paso, el radio de subsurface, el bevel y el vóxel están
   todos mal a la vez y no se nota hasta el final.
5. Recién después: materiales PBR y render con el pipeline propio.

**No remeshear ni suavizar.** Lo que el modelo esculpió se respeta.

### Trasplante de partes entre generaciones

Sirve para combinar un cuerpo bueno con una cara mejor. Script: `trasplante.py`.

- Cortar con un **cilindro vertical**, no con un plano en Z: un plano se lleva
  puesta la parte alta de los hombros y deja una repisa horizontal visible.
- Recortar la pieza donante **en alto y en ancho**, si no sus propios trapecios
  asoman como aletas a los lados.
- Escalar por una medida limpia y comparable (el ancho de la cabeza), no por el
  bbox total.
- **No fusionar con boolean**: las mallas cortadas son cáscaras abiertas y el
  boolean las destruye. Se superponen, y la costura se tapa con una pieza de
  armadura (un collar, una gola), que además es diseño válido.

---

## 4. Rigging y animación

**Ninguna herramienta gratis acepta 800k triángulos.** Hay que reducir primero,
sí o sí.

| Herramienta | Gratis | Límite | Nota |
|---|---|---|---|
| **AccuRig** (Reallusion) | Sí, pide cuenta para exportar | **600k triángulos, tope duro** confirmado por Reallusion | Exporta con preset de Blender: bone roll, escala y **nombres de hueso en convención Blender** |
| **Mixamo** (Adobe) | Sí | Sin número oficial; hay fallas reportadas con ~637k | **Adobe declaró en su foro que ya no tiene soporte.** Tuvo caídas largas. Nombres de hueso NO siguen convención Blender ("LeftArm" en vez de "Arm.L") |
| **Rigify** (Blender) | Incluido | Sin límite | **No es auto-rigger**: hay que posicionar el metarig a mano. Con mallas grandes falla el "Bone Heat Weighting" |
| **UniRig** / **MagicArticulate** | Open source | Investigación | Generan esqueleto y pesos juntos. Sin UI, requieren pipeline de PyTorch |

### Flujo que funciona con una malla densa de IA

1. **Reducir primero.** Decimate en modo Collapse **por pasos graduales** (de a
   50%, no de un saque), o mejor un remesher a quads. Objetivo: 15k a 60k
   triángulos para tiempo real, 50k a 200k quads para alta gama.
2. **Hornear normal map** de la malla original a la reducida, para no perder el
   detalle escultórico. Pipeline high-to-low estándar.
3. **Riggear la reducida.** AccuRig si entra en 600k, por la compatibilidad de
   nombres con Blender.
4. Si hace falta que la malla original deforme igual: **Data Transfer** para
   copiar los vertex groups de la baja a la alta, y después Armature Deform.

Los pasos 1, 2 y 4 se hacen acá en Blender. El 3 lo hace el usuario en el
navegador o en la app.

---

## 5. Assets ya hechos: cuándo no generar nada

Antes de generar o modelar, preguntarse si el asset ya existe gratis. Es lo que
hacen los flujos que se ven en los videos virales.

- **Poly Haven**: HDRIs, texturas y modelos CC0. Integrado en el MCP de la
  comunidad (`search_polyhaven_assets`, `download_polyhaven_asset`).
- **Sketchfab**: modelos, también integrado en ese MCP.
- **BlenderKit**: packs low poly gratis, por su propio add-on.
- **Sapling Tree Gen**: generador paramétrico de árboles, gratis, en
  extensions.blender.org. Paramétrico, o sea scripteable.
- **OpenScatter**: scatter GPLv3 gratis, por capas, con máscaras, pendiente y
  camera culling. Alternativa sin add-on: Geometry Nodes con Distribute Points on
  Faces más Instance on Points.
- **A.N.T. Landscape**: terrenos, gratis, en extensions.blender.org.
