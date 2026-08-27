# news-maker

Generador de noticias en el formato de Cabronazi para Facebook. Subes una foto,
escribes el titular, y produce el PNG **1080 × 1350** listo para publicar.

## Uso

1. Elige la **vertical**. Cambia el logo central por el distintivo de esa
   cuenta y tiñe el halo de los filetes con su color; Cabronazi viene puesto
   por defecto.
2. Arrastra una foto (o elígela con el botón).
3. Ajusta el encuadre: el deslizador hace zoom, y arrastrando sobre la vista
   previa mueves la imagen.
4. Si quieres **mosca**, añade la segunda imagen: sale recortada en circulo con
   un aro, que tiene su propio color en la fila de abajo. Una barra cambia el
   tamaño del círculo y otra el zoom de la imagen de dentro. Un interruptor
   decide que hacen los gestos sobre la mosca: mover el círculo o encuadrar su
   contenido.
5. Escribe el titular. Lo que envuelvas en `*asteriscos*` sale en el color de
   resaltado, igual que "impulsarán la Liga F" en la plantilla original.
6. Cambia los colores si quieres: base y resaltado del titular, y aro de la
   mosca por separado. Cada uno lleva la paleta de la casa (blanco, amarillo y
   el color de cada vertical) ademas del selector libre.
7. **GENERA**, y abajo aparece la imagen con el botón de descarga.

Para el zoom, la **rueda del ratón** en el ordenador y el **pellizco de dos dedos**
en el móvil. Ambos actúan sobre la capa que hay debajo: fuera de la mosca hacen
zoom de la foto de fondo, y encima de ella siguen el modo elegido (tamaño del
círculo o zoom de su contenido). Al pellizcar, el punto medio de los dedos
arrastra a la vez, así que se coloca y se dimensiona en un solo gesto.

El encuadre del contenido de la mosca está topado para que la imagen no deje
nunca hueco dentro del círculo. Eso significa que solo se puede desplazar lo que
sobra del encaje: con una imagen cuadrada a zoom 1 no sobra nada, así que hay
que ampliar antes.

En el móvil aparece una **miniatura flotante** abajo a la derecha en cuanto hay
foto, para ir viendo el resultado mientras se escribe el titular. Se retira sola
al llegar al apartado de la vista previa, se cierra con la ✕ (y ya no vuelve en
esa sesión), y tocándola salta a la previa completa.

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
| Foto | 1080 × 990 | capa `FOTO` (972) llevada hasta donde el degradado tapa del todo |
| Overlay | en y = 670 | capa `INFERIOR` |
| Fuente | Poppins Bold 64,59 px | `FontSize` 54.72179 × escala 1.1803 de la capa |
| Interlineado | 77,51 px | `AutoLeading` 1.2 × cuerpo |
| Ancho de párrafo | 1041,3 px | `bounds` del descriptor de tipo |
| Baseline central | 1149,44 | líneas del PSD en 1071,9 / 1149,4 / 1226,9 |
| Colores | `#ffffff` y `#ffde00` | `FillColor` del `StyleRun` |
| Fin del logo | y = 978 | capa `INFERIOR`, medido entre filetes |
| Mosca por defecto | centro (828, 630), radio 168 | proporcion medida sobre una publicacion ya montada |
| Aro de la mosca | 10% del radio (16,8 px por defecto) | ajustado a ojo sobre la referencia |
| Caja del logo | (464, 852) 151 x 127 | posicion de la mascota dentro de la capa `INFERIOR` |

Dos trampas que costaron encontrar, por si alguien vuelve por aquí:

- El `StyleSheet` trae `/Leading 79.16666`, pero **no se usa**: con
  `/AutoLeading true` Photoshop aplica el 1.2 del `ParagraphSheet`.
- El margen superior del texto (`TEXT_SAFE_TOP`) sale del logo, que acaba en
  y = 978, no de un numero redondo. Con el 960 que habia antes, un titular de 5
  lineas encogia lo justo para caber por abajo y se montaba sobre la cara.
- La capa `TEXTO` mide 1005 px de ancho, pero eso es la **tinta**
  (`boundingBox` = 1002,9 px), no la caja de composición. Recortar en 1005 parte
  "con cuatro partidos en abierto" (1006,4 px de avance) una palabra antes de
  tiempo.

## El overlay y los logos

`src/assets/overlay.png` es la capa `INFERIOR` extraída con alfa, pero **sin el
logo**: degradado y filetes solamente. Cada logo va aparte en
`src/assets/logo-*.png`, para poder cambiarlo por vertical.

Separarlos se pudo hacer sin pérdida porque el fondo bajo la mascota es negro
puro, así que todo el color de esa zona es suyo. En premultiplicado el color del
overlay **es** el de la mascota, y su alfa sale de `(ao - g) / (1 - g)`, donde
`g` es el degradado medido en una columna limpia (x = 1060, pasado el final del
filete). Donde el degradado ya es casi opaco ese divisor se dispara y amplifica
el redondeo, así que por debajo de ahí el alfa se deriva del color, que sobre
negro también es exacto. Recomponiendo las dos piezas, la diferencia con el
overlay original es de 0,002 / 255 de media.

Los distintivos de las demás verticales son circulares y se escalan al alto de
la mascota (127 px), centrados en el hueco entre filetes. Así ocupan lo mismo y
no hay que tocar `TEXT_SAFE_TOP`.

Los filetes salieron del overlay por el mismo motivo. Cada uno es un núcleo
blanco de 3 px con un halo alrededor, y ese halo resultó ser el rosa `#cc1c65` a
opacidad variable, así que se puede teñir con el color de cada vertical. Van en
dos máscaras, `rule-glow.png` y `rule-core.png`, de 1080 × 25 px y apenas 1,5 KB
entre las dos: el halo se tiñe en un lienzo auxiliar con `source-in` y el núcleo
se pinta encima sin tocarlo.

**La descomposición hay que hacerla en premultiplicado.** Haciéndola sobre el
color recto el halo sale un 10 % más claro, porque la mezcla con el fondo ocurre
en premultiplicado. Con los valores correctos, la banda del filete reproduce el
PSD con 1,84 / 255 de diferencia media.

## El degradado

Una vez fuera el logo y los filetes, el overlay es solo el desvanecido, así que
se regeneró como **función pura de la altura**: cada fila lleva un alfa y todas
las columnas valen igual. Pasó de 40 KB a 4 KB, y la diferencia entre columnas
es exactamente 0.

Eso arregla dos defectos que venían del PSD y se veían como líneas cortantes:

- La capa original traía una **mancha rojiza pegada al borde izquierdo** que
  cortaba en seco a media altura (a x = 20 el color pasa de `92,32,43` a
  `9,3,4` en una sola fila). Solo afectaba a los ~60 px de la izquierda.
- La foto se recortaba en y = 972, donde el degradado **todavía deja pasar
  3/255** de imagen. Ese salto a cero cruzaba el ancho entero. Ahora la foto
  llega a 990, por debajo de la primera fila totalmente opaca (989), y la cola
  del degradado baja de un nivel por fila.

El perfil quedó monótono, con un paso máximo de 3/255 en la parte más inclinada
(y = 875), que es lo más suave que permiten 8 bits en esa pendiente.

## Fuente

Poppins se carga desde Google Fonts. Si vas a usarlo sin conexión, descarga el
woff2 y sírvelo desde el propio proyecto.
