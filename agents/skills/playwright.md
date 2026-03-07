# SKILL: Testing con Playwright MCP (2026)

Leer esta skill cuando el proyecto tiene frontend (web, app, juego) y el agente QA
necesita ejecutar pruebas reales en el navegador.

---

## 1. VERIFICAR SI PLAYWRIGHT MCP ESTÁ DISPONIBLE

Antes de intentar usar Playwright, verificar que el MCP está activo:

```bash
# Si este comando falla → Playwright no disponible → usar solo fases 1 y 2 del QA
# Si funciona → el MCP está listo para usar
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Las herramientas de Playwright se llaman `mcp__playwright__*` (o similar según la instalación).
Si al intentar usar `browser_navigate` el sistema devuelve "tool not found" → Playwright no está
instalado. En ese caso: documentar en el reporte "Playwright no disponible — testing limitado a
análisis estático + curl" y continuar sin él.

---

## 2. CUÁNDO USAR PLAYWRIGHT

### SIEMPRE usar Playwright si está disponible:
- **Web estática**: verificar interacciones (botones, formularios, navegación)
- **App Vite/React**: verificar rendering de componentes, estado, formularios
- **Juego Phaser**: verificar que el canvas carga y no hay errores JS
- **API Node**: NO usar Playwright (no hay UI — usar curl en su lugar)

### Orden en el pipeline QA:
```
Fase 1: Análisis estático (leer archivos)          ← siempre primero
Fase 2: curl (verificar HTTP 200 en localhost:3000) ← siempre antes de Playwright
Fase 3: Playwright (pruebas reales en browser)      ← solo si Fase 1+2 pasan
Fase 4: Compliance con el spec                      ← siempre última
```

**No saltar a Playwright si el curl falla.** Si el servidor no responde en 3000, reportar
a `ops` como problema de infraestructura, no de código.

---

## 3. CÓMO USAR PLAYWRIGHT — SECUENCIA ESTÁNDAR

### Paso 1: Navegar al preview
```
browser_navigate → url: "http://localhost:3000"
```

### Paso 2: Tomar snapshot de accesibilidad
```
browser_snapshot
```
Esto devuelve el árbol de accesibilidad (texto, roles, IDs de elementos) sin screenshots.
Usar para verificar:
- Que el texto esperado existe en la página
- Que los elementos interactivos (botones, inputs) están presentes
- Que el título/heading es correcto

### Paso 3: Interactuar con elementos
```
browser_click → ref: "<id del elemento en el snapshot>"
browser_fill  → ref: "<id>", value: "<texto>"
```
Siempre usar los `ref` del snapshot, no inventar selectores.

### Paso 4: Leer errores de consola
```
browser_console_messages
```
Buscar mensajes de tipo `error` o `warning`. Errores JS en consola = bug.

### Paso 5: Screenshot para evidencia
```
browser_take_screenshot
```
Tomar screenshot SOLO cuando hay algo visual que verificar (layout, imagen cargada, juego renderizado).

### Paso 6: Cerrar el browser al terminar
```
browser_close
```

---

## 4. CHECKLIST POR TIPO DE PROYECTO

### WEB ESTÁTICA

```
Secuencia:
1. browser_navigate → http://localhost:3000
2. browser_snapshot  → verificar título H1, textos principales, elementos del spec
3. Por cada botón del spec:
   - browser_click → verificar que la acción ocurre (snapshot post-click)
4. Por cada formulario del spec:
   - browser_fill → llenar con datos válidos
   - browser_click → submit
   - browser_snapshot → verificar mensaje de éxito
   - browser_navigate → volver al form
   - browser_click → submit sin llenar campos
   - browser_snapshot → verificar mensaje de error
5. browser_console_messages → debe estar vacío de errores
6. browser_take_screenshot → evidencia visual del estado final
7. browser_close
```

**Verificar en el snapshot:**
- [ ] H1 con el título del spec
- [ ] Todos los botones del spec presentes
- [ ] Formularios con labels correctos
- [ ] Navegación lleva a las secciones correctas

---

### APP VITE / REACT

```
Secuencia:
1. browser_navigate → http://localhost:3000
2. browser_snapshot  → verificar que React cargó (texto principal visible)
3. browser_console_messages → verificar que no hay errores de hydration ni warnings
4. Por cada componente del spec:
   - browser_snapshot → verificar que renderizó
   - browser_click / browser_fill → interactuar
   - browser_snapshot → verificar resultado
5. Si hay estado (contador, lista, formulario):
   - Interactuar varias veces y verificar que el estado se actualiza
6. browser_take_screenshot → evidencia visual
7. browser_close
```

**Verificar en el snapshot:**
- [ ] App cargó sin pantalla en blanco
- [ ] No hay "Error: ..." en el árbol de accesibilidad
- [ ] Todos los componentes del spec están presentes

**Errores de consola que siempre son bugs:**
- `React does not recognize the prop`
- `Each child in a list should have a unique "key" prop`
- `Cannot read properties of undefined`
- `Warning: An update to X inside a test was not wrapped in act`

---

### JUEGO PHASER

Playwright puede verificar que el juego:
- ✅ Carga el canvas en el DOM
- ✅ No tiene errores JS en consola
- ✅ Responde a teclas sin romper (no hay crash)
- ✅ La pantalla no queda en negro (screenshot)
- ❌ No puede verificar lógica del juego ni jugarlo

```
Secuencia:
1. browser_navigate → http://localhost:3000
2. browser_snapshot  → verificar que existe elemento <canvas> en el DOM
3. browser_console_messages → verificar que no hay errores de carga de assets
4. Esperar 2 segundos para que Phaser inicialice:
   browser_wait_for → condición: presencia de canvas visible
5. browser_take_screenshot → evidencia de que el juego renderizó
6. Leer el screenshot: ¿hay imagen en el canvas o es negro/gris?
   - Negro/gris = posible falla de carga de assets o error de escena
   - Con sprites/fondo = juego cargó correctamente
7. Simular teclas básicas para verificar que no crashea:
   browser_press → key: "Space" (o ArrowLeft, ArrowRight según el spec)
8. browser_console_messages → verificar que no aparecieron nuevos errores
9. browser_close
```

**Errores de consola en Phaser que son bugs:**
- `Failed to load resource: the server responded with a status of 404` → asset faltante
- `Uncaught ReferenceError: X is not defined` → variable no declarada
- `Cannot read properties of null` → escena no inicializada
- `TypeError: this.X is not a function` → método inexistente

**Verificar en el screenshot:**
- [ ] Canvas visible (no solo fondo blanco de HTML)
- [ ] Hay algo renderizado dentro del canvas
- [ ] No hay overlay de error tipo "Asset failed to load"

**Lo que Playwright NO puede verificar en juegos:**
- Si el jugador se mueve correctamente (requiere lógica de juego)
- Si las colisiones funcionan
- Si el puntaje aumenta cuando corresponde
- Mecánicas específicas del juego

Para esas verificaciones, el QA debe leer el código (Fase 1) y explicar en el reporte
que la lógica fue verificada estáticamente, no en ejecución real.

---

### API NODE/EXPRESS

**No usar Playwright para APIs.** Usar `curl` (Fase 2 del QA).

Playwright es para interfaces de usuario. Una API sin frontend no tiene DOM, canvas ni
elementos interactivos que testear con un browser.

---

## 5. INTERPRETACIÓN DE RESULTADOS

### browser_snapshot devuelve árbol vacío
→ La app no cargó. Verificar:
- ¿El servidor sigue corriendo? (`curl localhost:3000`)
- ¿Hay errores en consola? (`browser_console_messages`)

### browser_console_messages tiene errores
→ Clasificar por severidad:
- `404 Not Found` para un asset → 🟡 IMPORTANTE si el asset era del spec, 🔵 MENOR si es opcional
- `SyntaxError` / `ReferenceError` / `TypeError` → 🔴 CRÍTICO
- `Warning:` (React) → 🔵 MENOR a menos que cause un comportamiento incorrecto

### Screenshot muestra pantalla en blanco
→ 🔴 CRÍTICO para apps y juegos. Causas:
- JavaScript no ejecutó (ver consola)
- Error en main.js / App.jsx / BootScene.js
- Assets no cargaron (ver 404 en consola)

### Screenshot muestra la UI pero con texto incorrecto
→ Comparar con el spec:
- Texto del spec presente pero diferente → 🔵 MENOR
- Feature principal del spec completamente ausente → 🟡 IMPORTANTE o 🔴 CRÍTICO

---

## 6. REPORTE DE EVIDENCIA PLAYWRIGHT

Incluir en el reporte QA una sección específica:

```
── Playwright (browser real) ────────────────────────
  URL testeada: http://localhost:3000
  Canvas detectado: sí / no                    ← solo para Phaser
  Errores JS en consola: ninguno / [lista]
  Interacciones probadas:
    - [OK]   Botón "Guardar" → muestra confirmación
    - [FAIL] Botón "Enviar" → no hace nada al click
  Screenshot: [adjunto / descripción de lo visible]
  Playwright disponible: sí / no (testing limitado)
```

---

## 7. ERRORES COMUNES AL USAR PLAYWRIGHT MCP

| Error | Causa | Solución |
|---|---|---|
| `tool not found: browser_navigate` | MCP no instalado | Reportar "Playwright no disponible", continuar sin él |
| Snapshot vacío en Phaser | Canvas es WebGL/2D, no tiene árbol de accesibilidad rico | Usar browser_take_screenshot en su lugar |
| Screenshot negro en Phaser | Assets no cargados o escena no arrancó | Ver browser_console_messages por errores 404 |
| `browser_click` no funciona | Elemento no interactivo según accesibilidad | Probar con `browser_press` o verificar el elemento en snapshot |
| Timeout en browser_wait_for | App tarda más de lo esperado | Esperar y reintentar una vez, si falla → bug de performance |
