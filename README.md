# news-maker

**Esto se ha mudado.** News Maker vive ahora en
[unzak/taller](https://github.com/unzak/taller), junto a las otras dos
herramientas de la casa, y se publica en
<https://unzak.github.io/taller/news-maker/>.

Estaban en tres repositorios y acabaron pagando el mismo cambio tres veces: la
piel del panel Pulso Viral, la barra de las tres herramientas, la vista previa
flotante del móvil, la revisión ortográfica, los faviconos. Ahora comparten lo
que de verdad era idéntico y cada una conserva lo suyo, que es lo que las
distingue.

Este repositorio queda **archivado y de solo lectura**. Lo único que sirve es la
redirección: los marcadores viejos siguen llevando al sitio nuevo.

## La historia

Se importó entera en el taller con `git subtree`, árbol por árbol y sin perder
un commit. Para leerla allí:

```bash
git clone https://github.com/unzak/taller
cd taller
git log --oneline --grep="Add 'news-maker/'"
git log --oneline <ese-hash>^2
```

Y aquí sigue tal cual estaba el día de la mudanza: el código de entonces está en
el historial de este mismo repositorio, un commit por detrás de este.
