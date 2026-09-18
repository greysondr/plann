# Plann — Identidad visual y sistema de diseño

App de tickets, reservas y planes turísticos. Barquisimeto / Lara, Venezuela.
Tema base: **oscuro con glassmorfismo y halos de neón sutiles**.

---

## 1. Color

### Marca
| Token | Hex | Uso |
|---|---|---|
| `--plann-pink` | `#E9417F` | Acento único: CTAs, estados activos, etiquetas, precios destacados, pines del mapa |
| `--plann-ink` | `#151510` | Tinta de marca (sólo en fondos claros / impresión) |
| `--plann-cream` | `#FDF7EF` | Texto principal sobre oscuro; fondo en la versión clara |

### Tema oscuro (por defecto)
| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#0B0B0A` | Fondo de pantalla |
| `--bg-canvas` | `#14141A` | Lienzo fuera del dispositivo |
| `--text` | `#FDF7EF` | Texto principal |
| `--text-2` | `rgba(253,247,239,0.74)` | Párrafos, descripciones |
| `--text-3` | `rgba(253,247,239,0.56)` | Metadatos (duración, fecha, reseñas) |
| `--text-4` | `rgba(253,247,239,0.46)` | Placeholders, labels de íconos inactivos |
| `--icon-off` | `rgba(253,247,239,0.42)` | Íconos inactivos, chevrons |

### Superficies de vidrio
| Nivel | Fondo | Borde | Blur |
|---|---|---|---|
| Tarjeta | `rgba(255,255,255,0.055)` | `1px solid rgba(255,255,255,0.10)` | `20px` |
| Campo / input | `rgba(255,255,255,0.09)` | `1px solid rgba(255,255,255,0.12)` | `20px` |
| Panel destacado (hoja de detalle, tarjeta flotante) | `rgba(255,255,255,0.06–0.08)` | `1px solid rgba(255,255,255,0.12–0.13)` | `24–26px` |
| Barra (tab bar, header, barra inferior) | `rgba(255,255,255,0.05)` | borde de 1px a `rgba(255,255,255,0.10)` en el canto que toca el contenido | `28px` |
| Botón circular sobre foto | `rgba(255,255,255,0.14)` | `1px solid rgba(255,255,255,0.18)` | `18px` |
| Chip seleccionado | `#E9417F` sólido, texto `#FFFFFF` | — | — |
| Chip no seleccionado | transparente | `1px solid rgba(255,255,255,0.10)` | — |

### Prohibido
- Segundos acentos de color. El rosa es el único.
- Degradados de color saturado como fondo.
- Emoji en la interfaz.
- Verdes/azules de "éxito" o "info": usar rosa o texto crema.

---

## 2. Luz y profundidad

**Halo ambiental** — en el fondo de cada pantalla, debajo de todo:

```css
background:
  radial-gradient(130% 55% at 50% -8%, rgba(233,65,127,0.15), rgba(233,65,127,0) 62%),
  radial-gradient(100% 45% at 108% 104%, rgba(233,65,127,0.085), rgba(233,65,127,0) 70%),
  #0B0B0A;
```

**Borde de luz en el vidrio** (siempre, en toda tarjeta):
```css
box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 10px 26px rgba(0,0,0,0.45);
```

**Glow de acento** — sólo en elementos accionables o de marca:
```css
/* botón principal */  box-shadow: 0 0 20px rgba(233,65,127,0.42), 0 10px 28px rgba(233,65,127,0.22);
/* chip / pill      */  box-shadow: 0 0 14px rgba(233,65,127,0.40);
/* pin del mapa     */  box-shadow: 0 0 26px rgba(233,65,127,0.60), 0 6px 16px rgba(0,0,0,0.50);
/* ícono activo     */  filter: drop-shadow(0 0 7px rgba(233,65,127,0.75));
/* logo             */  filter: drop-shadow(0 0 10px rgba(233,65,127,0.60));
/* texto de acento  */  text-shadow: 0 0 16px rgba(233,65,127,0.55);
/* tarjeta héroe    */  box-shadow: 0 0 44px rgba(233,65,127,0.20), inset 0 0 0 1px rgba(255,255,255,0.10);
```

Regla: **el neón nunca es el protagonista**. Opacidades entre 0.15 y 0.6, radios grandes, nunca bordes de 100% de saturación. Como máximo 2 elementos con glow fuerte por pantalla.

---

## 3. Tipografía

| Rol | Fuente | Detalle |
|---|---|---|
| Logotipo / display | **Newake** (`NewakeFont-Demo.otf`) | Sólo el wordmark "Plann" y titulares de portada. Nunca en párrafos ni en UI. Escrito "Plann", no en mayúsculas. |
| Interfaz y texto | **Manrope** (Google Fonts, 400–800) | Todo lo demás |

```css
@font-face { font-family: "Newake"; src: url("fonts/Newake.otf") format("opentype"); font-display: swap; }
/* Manrope: https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap */
```

### Escala (móvil)
| Rol | Tamaño / peso | Tracking |
|---|---|---|
| Título de pantalla | 26–27px / 800 | `-0.5px` |
| Título de contenido (hoja de detalle) | 25px / 800 | `-0.5px` |
| Título de tarjeta héroe | 21px / 800 | `-0.3px` |
| Sección | 18px / 800 | `-0.3px` |
| Título de ítem en lista | 15–16px / 700 | — |
| Cuerpo | 14px / 400–500, `line-height 1.55` | — |
| Metadato | 12–13px / 500–600 | — |
| Eyebrow / categoría | 11px / 800, MAYÚSCULAS, rosa | `0.5–0.6px` |
| Precio | 16–22px / 800 | — |
| Label de tab bar | 10px / 600 (700 si activo) | — |

Mínimos: nunca texto bajo 10px, nunca cuerpo bajo 14px. Códigos de ticket en monoespaciada con `letter-spacing: 2px`.

---

## 4. Forma y espacio

- **Radios:** pantalla/hoja 22px · tarjeta grande 20px · tarjeta 16px · campo y tarjeta chica 12–14px · miniatura 10–11px · pill 999px.
- **Espaciado:** margen lateral de pantalla **20px**. Separación entre tarjetas de una lista **12px**. Entre bloques de sección **16–20px**. Padding interno de tarjeta 12–15px.
- **Altura mínima táctil: 44px.** Los ítems de tab bar usan `min-width: 56px; min-height: 44px`.
- Layout siempre con `display: flex` / `grid` + `gap`. Nunca márgenes por elemento para separar hermanos.
- Carruseles horizontales: se permite que la última tarjeta o chip se corte en el borde (indica que hay más).

---

## 5. Logotipo

Pin rosa (`#E9417F`) con un ticket recortado en crema (`#FDF7EF`) y una estrellita, seguido del wordmark **Plann** en Newake.

- El recorte del ticket es **siempre crema**, tanto sobre fondo oscuro como claro.
- Tamaño mínimo del pin: 18px de ancho. Espacio libre alrededor: la mitad del ancho del pin.
- En cabecera de app: pin 18–20px + wordmark 19–22px, `gap: 8px`.
- No rotar, no cambiar el color del pin, no poner el pin sobre fotos sin un fondo de vidrio detrás.

---

## 6. Componentes

**Tarjeta de plan (lista)** — vidrio, radio 16px, padding 10px, miniatura 84×84 radio 11px a la izquierda; a la derecha: eyebrow rosa con tipo y duración, título 15px/700 a 2 líneas, y una fila con rating (`4,9 ★ · 126 reseñas` en `--text-3`) y precio 16px/800 alineado a la derecha.

**Tarjeta héroe** — 212px de alto, radio 20px, foto a sangre con degradado `linear-gradient(to top, rgba(11,11,10,0.88), transparent 70%)`, badge rosa arriba a la izquierda, y abajo título + meta + precio + botón pill claro.

**Barra inferior de acción** (detalle, checkout) — barra de vidrio con blur 28px, borde superior a 10% de blanco, precio a la izquierda y CTA rosa a la derecha, `padding: 14px 20px 30px` (respeta el home indicator).

**Tab bar** — 4 ítems: Inicio · Buscar · Tickets · Perfil. Íconos de trazo 1.8px. Activo en rosa con glow y label 700; inactivo a 42% de crema.

**Ticket** — tarjeta de vidrio con muescas circulares del color del fondo a media altura, línea de perforación punteada `rgba(255,255,255,0.28)`, y **QR sobre placa crema con módulos en tinta** (nunca QR claro sobre fondo oscuro: no escanea).

**Chips de filtro** — pill 8–9px × 13–15px. Seleccionado rosa con glow; resto con borde a 10%.

**Imágenes faltantes** — placeholder de rayas diagonales `repeating-linear-gradient(135deg, rgba(255,255,255,0.075) 0 9px, rgba(255,255,255,0.025) 9px 18px)` con una etiqueta monoespaciada de 11px al 42% de crema describiendo la foto, colocada en una esquina libre (nunca centrada bajo el texto ni bajo la barra de estado).

---

## 7. Voz y copy

Español de Venezuela, cercano y directo, tuteo. Títulos cortos y concretos.

- Sí: «¿Qué planeas hoy?» · «Reservar» · «Mis tickets» · «Cancelación gratis hasta 24 h antes»
- No: «Descubre experiencias únicas», «¡Vive la aventura!», jerga de marketing, signos de exclamación.
- Precios en USD con coma decimal (`$73,50`) y equivalente en bolívares abajo: `≈ Bs 26.460 · tasa BCV de hoy`.
- Fechas: `Sáb 19 de sep · 6:00 am`. Duración: `10 h`. Rating: `4,9 ★ · 212 reseñas`.
- Métodos de pago nombrados como los usa la gente: Pago móvil, Zelle / transferencia USD, Tarjeta internacional.
- Lugares con su nombre real: Cubiro, Sanare, Quíbor, Bararida, Terepaima, Cerro Saroche, El Tocuyo, Yacambú, Obelisco, Estadio Antonio Herrera Gutiérrez.

---

## 8. Variante clara

Misma estructura, invirtiendo el par: fondo `#FDF7EF`, texto `#151510`, superficies `#FFFFFF` con borde `1px solid #EAE0D2`, sin blur ni glows (sólo sombras suaves). El acento sigue siendo `#E9417F`. Se usa para impresión, correo y documentos; la app vive en oscuro.
