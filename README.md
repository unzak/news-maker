# news-maker

Generador de noticias en el formato de Cabronazi para Facebook. Subes una foto,
escribes el titular, y produce el PNG **1080 × 1350** listo para publicar.

## Uso

1. Arrastra una foto (o elígela con el botón).
2. Ajusta el encuadre: el deslizador hace zoom, y arrastrando sobre la vista
   previa mueves la imagen.
3. Si quieres **mosca**, añade la segunda imagen: sale recortada en circulo con
   un aro del color de resaltado. La barra cambia su tamaño y, pinchando encima
   en la vista previa, la mueves (pinchando fuera reencuadras la foto).
4. Escribe el titular. Lo que envuelvas en `*asteriscos*` sale en el color de
   resaltado, igual que "impulsarán la Liga F" en la plantilla original.
5. Cambia los colores si quieres; "Colores del PSD" los devuelve al blanco y
   amarillo de siempre.
6. **GENERA**, y abajo aparece la imagen con el botón de descarga.

El titular se ajusta solo: parte las líneas donde toca y, si es muy largo,
reduce el cuerpo hasta que quepa sin invadir el filete ni el borde inferior.

## Requisitos

- Node.js >= 20

```bash
npm install
npm run dev
```

Para publicar la versión estática:

```bash
npm run build
```

Queda en `dist/`, con rutas relativas, así que sirve tal cual en GitHub Pages o
abriendo el HTML directamente.

## De dónde salen las medidas

Todo lo de `src/format.ts` está medido sobre `NOTICIAS FRASE.psd`, no puesto a
ojo. Si cambia la plantilla hay que volver a medirlo, porque son valores que no
se adivinan mirando la imagen:

| Dato | Valor | Origen |
| --- | --- | --- |
| Lienzo | 1080 × 1350, 300 dpi | cabecera del PSD |
| Foto | 1080 × 972 | capa `FOTO` |
| Overlay | en y = 670 | capa `INFERIOR` |
| Fuente | Poppins Bold 64,59 px | `FontSize` 54.72179 × escala 1.1803 de la capa |
| Interlineado | 77,51 px | `AutoLeading` 1.2 × cuerpo |
| Ancho de párrafo | 1041,3 px | `bounds` del descriptor de tipo |
| Baseline central | 1149,44 | líneas del PSD en 1071,9 / 1149,4 / 1226,9 |
| Colores | `#ffffff` y `#ffde00` | `FillColor` del `StyleRun` |
| Mosca por defecto | centro (828, 630), radio 168 | proporcion medida sobre una publicacion ya montada |

Dos trampas que costaron encontrar, por si alguien vuelve por aquí:

- El `StyleSheet` trae `/Leading 79.16666`, pero **no se usa**: con
  `/AutoLeading true` Photoshop aplica el 1.2 del `ParagraphSheet`.
- La capa `TEXTO` mide 1005 px de ancho, pero eso es la **tinta**
  (`boundingBox` = 1002,9 px), no la caja de composición. Recortar en 1005 parte
  "con cuatro partidos en abierto" (1006,4 px de avance) una palabra antes de
  tiempo.

`src/assets/overlay.png` es la capa `INFERIOR` extraída con alfa (degradado,
logo y filetes). Se compone tal cual en lugar de reconstruirla, así que coincide
con el PSD al pixel.

## Fuente

Poppins se carga desde Google Fonts. Si vas a usarlo sin conexión, descarga el
woff2 y sírvelo desde el propio proyecto.
