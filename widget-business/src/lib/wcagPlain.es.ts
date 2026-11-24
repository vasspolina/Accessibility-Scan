/* Spanish report copy. Fallback is per KEY, not per language: a rule missing
   here renders in English rather than vanishing. Keys stay exactly as in the
   English source — only the values are translated. */
import type { PlainRule } from "./wcagPlain";

export const PLAIN_ES: Record<string, PlainRule> = {
  "reflow-height-unreachable": {
    plain: "Panel fijo oculta sus botones",
    impact: "Quien amplía la página para leer no llega a estos botones.",
  },
  "reflow-height-pinned": {
    plain: "Barras fijas sin sitio para leer",
    impact: "Quien amplía la página ve las barras y casi nada más.",
  },
  "reflow-height-pinned-advisory": {
    plain: "Barras fijas estrechan la página",
    impact: "Quien amplía la página ve pocas líneas a la vez y pierde el sitio.",
  },
  "contrast-over-image": {
    plain: "Texto demasiado tenue sobre imagen",
    impact: "Quien tiene baja visión pierde las palabras sobre una imagen clara o recargada.",
  },
  "form-error-silent": {
    plain: "Formulario rechaza sin decir por qué",
    impact: "Quien se salta un campo no sabe qué ha fallado, y muchos lo dejan.",
  },
  "timing-meta-refresh": {
    found: (n) => (n === 1 ? "La página se recarga sola, o salta a otra, tras un tiempo fijo y sin forma de detenerlo." : "{n} instrucciones del código recargan la página, o saltan a otra, tras un tiempo fijo y sin forma de detenerlas.".replace("{n}", String(n))),
    plain: "La página se recarga sola",
    impact:
      "Quien siga leyendo o rellenando el formulario vuelve al principio.",
  },
  "aria-allowed-role": {
    plain: "Un rol que el elemento no puede tener",
    found: (n) =>
      `${n} ${n === 1 ? "elemento está etiquetado" : "elementos están etiquetados"} en el código como algo que no ${n === 1 ? "puede" : "pueden"} ser.`,
    impact: "Los lectores de pantalla anuncian un enlace como botón, o una lista como encabezado.",
  },
  "aria-allowed-attr": {
    plain: "Un ajuste de lector de pantalla en el elemento equivocado",
    found: (n) =>
      `${n} ${n === 1 ? "elemento lleva ajustes" : "elementos llevan ajustes"} que su tipo de elemento no puede tener.`,
    impact: "Los lectores de pantalla pueden anunciar disparates, o saltarse el elemento entero.",
  },
  "aria-prohibited-attr": {
    plain: "Una etiqueta que los lectores de pantalla deben ignorar",
    found: (n) =>
      `${n} ${n === 1 ? "elemento lleva" : "elementos llevan"} un nombre que el código no permite en ese tipo de elemento.`,
    impact: "Los lectores de pantalla ignoran ese nombre y anuncian el texto que haya dentro, a menudo nada.",
  },
  "aria-required-children": {
    plain: "Menús o listas sin sus elementos",
    found: (n) =>
      `${n} ${n === 1 ? "control está etiquetado en el código como menú o lista, pero no contiene" : "controles están etiquetados en el código como menús o listas, pero no contienen"} ninguno de los elementos que ${n === 1 ? "necesita" : "necesitan"}.`,
    impact: "Los lectores de pantalla no pueden deducir su estructura, así que nadie puede recorrerla.",
  },
  "aria-required-parent": {
    plain: "Elemento de lista fuera de su lista",
    found: (n) =>
      `${n} ${n === 1 ? "elemento está etiquetado como parte de un control mayor, como una pestaña, pero está" : "elementos están etiquetados como partes de un control mayor, como una pestaña, pero están"} fuera de él.`,
    impact: "Los lectores de pantalla no pueden decir cuál es ni cuántos hay.",
  },
  "landmark-unique": {
    plain: "Dos zonas de la página con el mismo nombre",
    found: (n) =>
      `${n} ${n === 1 ? "región comparte su nombre con otra" : "regiones comparten su nombre con otras"}.`,
    impact: "Quien usa un lector de pantalla recibe una lista de entradas idénticas y no puede distinguirlas.",
  },
  "landmark-no-duplicate-banner": {
    plain: "Más de una cabecera de página",
    found: () =>
      `La página marca más de una zona como su cabecera.`,
    impact: "Los lectores de pantalla enumeran varias cabeceras, y nadie sabe cuál es la de verdad.",
  },
  "landmark-no-duplicate-contentinfo": {
    plain: "Más de un pie de página",
    found: () =>
      `La página marca más de una zona como su pie.`,
    impact: "Los lectores de pantalla enumeran varios pies de página, y la gente no sabe cuál es cuál.",
  },
  "landmark-no-duplicate-main": {
    plain: "Más de un contenido principal",
    found: () =>
      `Más de una zona está marcada como contenido principal.`,
    impact: "«Ir al contenido principal» puede llevar a la gente a la parte equivocada de la página.",
  },
  "landmark-banner-is-top-level": {
    plain: "Cabecera metida dentro de otra zona",
    found: () =>
      `La cabecera está metida dentro de otra región en vez de al lado.`,
    impact: "Quien usa un lector de pantalla no puede saltar directo a ella como espera.",
  },
  "landmark-contentinfo-is-top-level": {
    plain: "Pie metido dentro de otra zona",
    found: () =>
      `El pie está metido dentro de otra región en vez de al lado.`,
    impact: "Quien usa un lector de pantalla no puede saltar directo a él como espera.",
  },
  "skip-link": {
    plain: "El enlace de salto no lleva a ninguna parte",
    found: (n) =>
      `${n} ${n === 1 ? "enlace de salto apunta" : "enlaces de salto apuntan"} a algo que no está en la página.`,
    impact: "Quien usa el teclado lo pulsa y aun así recorre el menú entero con el tabulador.",
  },
  "component-skip-link-dead": {
    plain: "El enlace de salto no lleva a ninguna parte",
    found: (n) =>
      `${n} ${n === 1 ? "enlace de salto apunta" : "enlaces de salto apuntan"} a algo que no está en la página.`,
    impact: "Quien usa el teclado lo pulsa y aun así recorre el menú entero con el tabulador.",
  },
  "image-redundant-alt": {
    plain: "La descripción repite el texto de al lado",
    found: (n) =>
      `${n} ${n === 1 ? "imagen repite, en su texto alternativo, las palabras que ya están escritas a su lado" : "imágenes repiten, en su texto alternativo, las palabras que ya están escritas a su lado"}.`,
    impact: "Quien usa un lector de pantalla oye las mismas palabras dos veces.",
  },
  "color-contrast": {
    research:
      "WebAIM revisa un millón de páginas de inicio cada año. El texto con poco contraste es el fallo más común que encuentra, año tras año.",
    plain: "Texto demasiado claro para leerlo",
    found: (n) =>
      `${n} ${n === 1 ? "texto de esta página está" : "textos de esta página están"} demasiado cerca en color del fondo que ${n === 1 ? "tiene" : "tienen"} detrás.`,
    impact: "Quien tiene la vista débil, o lee con luz fuerte, no distingue las palabras.",
  },
  "image-alt": {
    research:
      "WebAIM revisa un millón de páginas de inicio cada año. Las imágenes sin descripción están entre los fallos más comunes que encuentra, año tras año.",
    plain: "Las imágenes no tienen descripción",
    found: (n) =>
      `${n} ${n === 1 ? "imagen no tiene" : "imágenes no tienen"} ningún texto alternativo.`,
    impact: "Quien usa un lector de pantalla no sabe qué muestran estas imágenes.",
  },
  "svg-img-alt": {
    plain: "Los iconos no tienen descripción",
    found: (n) =>
      `${n} ${n === 1 ? "icono está marcado" : "iconos están marcados"} en el código como ${n === 1 ? "imagen" : "imágenes"}, pero no ${n === 1 ? "lleva" : "llevan"} palabras que digan qué ${n === 1 ? "muestra" : "muestran"}.`,
    impact: "Cuando el icono es la única etiqueta, el lector de pantalla no tiene nada que anunciar.",
  },
  "input-image-alt": {
    plain: "Botón de imagen sin descripción",
    found: (n) =>
      `${n} ${n === 1 ? "imagen usada como botón no tiene" : "imágenes usadas como botón no tienen"} texto alternativo.`,
    impact: "Quien usa un lector de pantalla no sabe qué hace el botón.",
  },
  "link-name": {
    research:
      "Los enlaces vacíos están entre los fallos más comunes de la revisión anual que WebAIM hace de un millón de páginas de inicio.",
    plain: "Enlaces sin texto legible",
    found: (n) =>
      `${n} ${n === 1 ? "enlace no tiene" : "enlaces no tienen"} ni palabras ni nombre dentro.`,
    impact: "Quien usa un lector de pantalla solo oye «enlace», sin pista de adónde lleva.",
  },
  "link-text-vague": {
    found: (n) => (n === 1 ? "Un enlace solo dice algo como «leer más» o «aquí»." : "{n} enlaces solo dicen algo como «leer más» o «aquí».".replace("{n}", String(n))),
    plain: "Enlaces que solo dicen «leer más»",
    impact: "En la lista de enlaces de un lector de pantalla, todos dicen lo mismo.",
  },
  "label-content-name-mismatch": {
    plain: "El nombre leído no coincide",
    found: (n) =>
      `${n} ${n === 1 ? "control muestra" : "controles muestran"} unas palabras y ${n === 1 ? "lleva" : "llevan"} otro nombre en el código.`,
    impact: "Quien maneja el sitio por voz dice las palabras que ve, y no pasa nada.",
  },
  "button-name": {
    research:
      "Los botones sin etiqueta están cerca de lo más alto de la revisión anual que WebAIM hace de un millón de páginas de inicio, año tras año. Suelen ser controles de solo icono, evidentes para quien los diseñó.",
    plain: "Los botones no tienen etiqueta",
    found: (n) =>
      `${n} ${n === 1 ? "botón no tiene" : "botones no tienen"} ni palabras dentro ni nombre en el código.`,
    impact: "Quien usa un lector de pantalla no sabe qué hace antes de pulsarlo.",
  },
  label: {
    research:
      "Los campos de formulario sin etiqueta están cerca de lo más alto de la revisión anual que WebAIM hace de un millón de páginas de inicio. En el estudio británico Click-Away Pound, la mayor parte de la clientela que se topó con una barrera así se marchó sin decir nada.",
    plain: "Los campos del formulario no tienen etiqueta",
    found: (n) =>
      `${n} ${n === 1 ? "campo del formulario no está unido" : "campos del formulario no están unidos"} a una etiqueta en el código.`,
    impact: "Quien usa un lector de pantalla no sabe qué va en cada casilla, así que abandona el formulario.",
  },
  "select-name": {
    plain: "Un desplegable sin etiqueta",
    found: (n) =>
      `${n} ${n === 1 ? "desplegable no tiene" : "desplegables no tienen"} etiqueta en el código.`,
    impact: "La gente no sabe qué está eligiendo.",
  },
  "document-title": {
    plain: "La página no tiene título",
    found: () =>
      `La página no tiene título, así que la pestaña del navegador solo muestra la dirección.`,
    impact: "Las pestañas, los marcadores y los resultados de búsqueda no muestran nada útil.",
  },
  "html-has-lang": {
    research:
      "El idioma del documento sin declarar es uno de los pocos fallos que WebAIM encuentra en la mayor parte de la web. Sigue siendo común porque el fallo es silencioso.",
    plain: "La página no declara su idioma",
    found: () => `La página no declara en qué idioma está escrita.`,
    impact: "La gente oye su contenido con el acento equivocado, y cuesta seguirlo.",
  },
  "html-lang-valid": {
    plain: "El idioma declarado no es válido",
    found: () => `La página declara un idioma, pero no uno que los programas reconozcan.`,
    impact: "La gente oye sus palabras con la voz equivocada, mal pronunciadas.",
  },
  "heading-order": {
    plain: "Los encabezados saltan niveles",
    found: (n) =>
      `En ${n} ${n === 1 ? "sitio" : "sitios"} se salta un nivel de encabezado, como un h2 seguido de un h4.`,
    impact: "Quien usa un lector de pantalla y se mueve por los encabezados pierde el hilo.",
  },
  "page-has-heading-one": {
    plain: "No hay encabezado principal",
    found: () =>
      `La página no tiene encabezado de primer nivel.`,
    impact: "Nadie sabe de un vistazo de qué trata la página.",
  },
  "empty-heading": {
    plain: "Un encabezado vacío",
    found: (n) =>
      `${n} ${n === 1 ? "encabezado está vacío" : "encabezados están vacíos"}: la etiqueta está, las palabras no.`,
    impact: "Quien se mueve por los encabezados aterriza en una entrada que no dice nada.",
  },
  "link-in-text-block": {
    plain: "Enlaces marcados solo con color",
    found: (n) =>
      `${n} ${n === 1 ? "enlace dentro del texto corrido está marcado" : "enlaces dentro del texto corrido están marcados"} solo con color, sin subrayado.`,
    impact: "Quien es daltónico no distingue un enlace del texto normal.",
  },
  "meta-viewport": {
    plain: "La ampliación está bloqueada",
    found: () => `La página impide ampliarla en el móvil.`,
    impact: "Quien necesita el texto más grande no puede tenerlo.",
  },
  "meta-viewport-large": {
    plain: "Zoom limitado a un nivel fijo",
    found: () =>
      `Ampliar funciona, pero la página lo limita por debajo del 500 %.`,
    impact: "Quien necesita el texto muy grande llega al tope y no pasa de ahí.",
  },
  "frame-title": {
    plain: "Un marco incrustado sin título",
    found: (n) =>
      `${n} ${n === 1 ? "marco incrustado no tiene" : "marcos incrustados no tienen"} título, así que se ${n === 1 ? "anuncia" : "anuncian"} solo como «marco».`,
    impact: "Quien usa un lector de pantalla no sabe qué hay dentro.",
  },
  "duplicate-id-active": {
    plain: "Dos controles con el mismo id",
    found: (n) =>
      `${n} ${n === 1 ? "id se usa" : "ids se usan"} más de una vez en controles.`,
    impact: "Los lectores de pantalla pueden leer la etiqueta de otro control.",
  },
  list: {
    plain: "Una lista que no está hecha como tal",
    found: (n) =>
      `${n} ${n === 1 ? "lista está construida" : "listas están construidas"} con algo que no son elementos de lista dentro.`,
    impact: "A quien usa un lector de pantalla no se le dice cuántos elementos hay.",
  },
  listitem: {
    plain: "Elementos de lista fuera de toda lista",
    found: (n) =>
      `${n} ${n === 1 ? "elemento de lista está" : "elementos de lista están"} fuera de cualquier lista.`,
    impact: "Quien usa un lector de pantalla pierde la agrupación.",
  },
  "aria-required-attr": {
    plain: "Un control sin un estado obligatorio",
    found: (n) =>
      `${n} ${n === 1 ? "control está etiquetado como algo con estado, como marcado o desplegado, pero nunca dice" : "controles están etiquetados como algo con estado, como marcado o desplegado, pero nunca dicen"} cuál es.`,
    impact: "Quien usa un lector de pantalla no sabe en qué estado está.",
  },
  "aria-hidden-focus": {
    plain: "Elementos ocultos que aún reciben el foco",
    found: (n) =>
      `${n} ${n === 1 ? "elemento está oculto" : "elementos están ocultos"} para los lectores de pantalla y aun así se ${n === 1 ? "alcanza" : "alcanzan"} con el teclado.`,
    impact: "Quien usa el teclado aterriza en algo que su lector de pantalla no lee.",
  },
  "aria-dialog-name": {
    plain: "Una ventana emergente sin nombre",
    found: (n) =>
      `${n} ${n === 1 ? "ventana emergente no tiene nada que la nombre, así que se anuncia" : "ventanas emergentes no tienen nada que las nombre, así que se anuncian"} como «diálogo» y nada más.`,
    impact: "Quien usa un lector de pantalla no puede oír qué se ha adueñado de la pantalla.",
  },
  "nested-interactive": {
    plain: "Un control anidado dentro de otro",
    found: (n) =>
      `${n} ${n === 1 ? "control contiene otro control" : "controles contienen cada uno otro control"}.`,
    impact: "El control interior queda oculto para los lectores de pantalla y fuera de alcance.",
  },
  "presentation-role-conflict": {
    plain: "Un control activo marcado como decoración",
    found: (n) =>
      `${n} ${n === 1 ? "elemento está marcado" : "elementos están marcados"} para que se ignore y aun así se ${n === 1 ? "alcanza y se usa" : "alcanzan y se usan"}.`,
    impact: "Algunos lectores de pantalla lo ignoran, así que quien los usa nunca lo encuentra.",
  },
  region: {
    plain: "Zonas de la página sin nombre en el código",
    found: (n) =>
      `${n} ${n === 1 ? "bloque de contenido no tiene" : "bloques de contenido no tienen"} cabecera, navegación, contenido principal ni pie alrededor.`,
    impact: "Quien usa un lector de pantalla no puede adelantar, así que lo oye todo cada vez.",
  },
  "landmark-one-main": {
    plain: "Nada marca el contenido principal",
    found: () =>
      `La página no tiene una región principal que marque dónde empieza el contenido, así que no hay adonde saltar.`,
    impact: "Quien usa un lector de pantalla se traga el menú entero en cada página.",
  },
  tabindex: {
    plain: "El orden de tabulación da saltos",
    found: (n) =>
      `${n} ${n === 1 ? "elemento usa" : "elementos usan"} un tabindex positivo, que ${n === 1 ? "lo lleva" : "los lleva"} al principio del orden de tabulación.`,
    impact: "Quien usa el teclado acaba dando tumbos por la página.",
  },
  "scrollable-region-focusable": {
    plain: "Zona desplazable fuera del alcance del teclado",
    found: (n) =>
      `${n} ${n === 1 ? "zona se desplaza" : "zonas se desplazan"} pero no se ${n === 1 ? "alcanza" : "alcanzan"} con el teclado.`,
    impact: "Sin ratón, no se puede desplazar para ver lo que hay dentro.",
  },

  "keyboard-mouse-only": {
    found: (n) => (n === 1 ? "Un control responde a un clic, pero no al teclado." : "{n} controles responden a un clic, pero no al teclado.".replace("{n}", String(n))),
    research:
      "Décadas de investigación sobre usabilidad, buena parte del Nielsen Norman Group, llegan siempre a la misma conclusión. El acceso por teclado sirve tanto a quien domina el sistema como a quien no puede sostener un ratón.",
    plain: "Un control que el teclado no alcanza",
    impact: "Quien no puede usar el ratón no puede usar este control en absoluto.",
  },
  "keyboard-no-visible-focus": {
    found: (n) => (n === 1 ? "Un control no cambia a la vista cuando el tabulador llega a él." : "{n} controles no cambian a la vista cuando el tabulador llega a ellos.".replace("{n}", String(n))),
    plain: "Nada muestra dónde está el teclado",
    impact: "Quien usa el teclado no ve dónde está, y acaba rindiéndose.",
  },
  "readability-dense-prose": {
    found: (n) => (n === 1 ? "El texto de esta página exige más o menos nivel universitario." : "{n} textos de esta página exigen más o menos nivel universitario.".replace("{n}", String(n))),
    plain: "El texto exige nivel universitario",
    impact: "Quien tiene una discapacidad cognitiva, o lee en un segundo idioma, no puede seguirlo.",
  },
  "typo-leading-for-measure": {
    found: (n) => (n === 1 ? "Hay texto en esta página con poco interlineado para la longitud de sus líneas y su tamaño de letra." : "{n} bloques de texto tienen poco interlineado para la longitud de sus líneas y su tamaño de letra.".replace("{n}", String(n))),
    plain: "Líneas demasiado juntas",
    impact: "Al volver al principio de cada línea, quien lee cae en la equivocada.",
  },
  "reading-order-mismatch": {
    found: (n) => (n === 1 ? "En una fila de controles, el tabulador no sigue el orden de la pantalla." : "En {n} filas de controles, el tabulador no sigue el orden de la pantalla.".replace("{n}", String(n))),
    plain: "El orden de tabulación contradice el visible",
    impact: "Quien usa el teclado puede acabar en Enviar cuando quería Cancelar.",
  },

  "forced-colors-focus-lost": {
    found: (n) => (n === 1 ? "En al menos un control, la marca del foco desaparece en el modo de alto contraste de Windows." : "En {n} controles, la marca del foco desaparece en el modo de alto contraste de Windows.".replace("{n}", String(n))),
    plain: "La marca del foco desaparece en Alto contraste",
    impact: "Quien usa el modo de alto contraste no ve dónde está el teclado.",
  },
  "forced-colors-icon-lost": {
    found: (n) => (n === 1 ? "Un control sin texto queda como una caja vacía en el modo de alto contraste de Windows." : "{n} controles sin texto quedan como cajas vacías en el modo de alto contraste de Windows.".replace("{n}", String(n))),
    plain: "El botón de icono desaparece en Alto contraste",
    impact: "En el modo de alto contraste, el botón se ve como una caja vacía.",
  },
  "keyboard-faint-focus": {
    found: (n) => (n === 1 ? "En al menos un control, el contorno del foco del teclado no llega a un contraste de 3:1." : "En {n} controles, el contorno del foco del teclado no llega a un contraste de 3:1.".replace("{n}", String(n))),
    plain: "La marca del teclado apenas se ve",
    impact: "Quien usa el teclado no sabe qué está a punto de activar.",
  },
  "keyboard-focus-trap": {
    found: (n) => (n === 1 ? "En un punto, el foco del teclado se queda atascado y no llega al resto de la página." : "En {n} puntos, el foco del teclado se queda atascado y no llega al resto de la página.".replace("{n}", String(n))),
    plain: "El foco del teclado se queda atrapado",
    impact: "Quien llega hasta aquí con el teclado no puede seguir.",
  },

  // Las comprobaciones de nombres para lectores de pantalla. Cada una es una
  // tarjeta agrupada cuyo recuento está en la descripción del backend, así
  // que no llevan found().
  "sr-filename-alt": {
    found: (n) => (n === 1 ? "Al menos una imagen lleva su nombre de archivo como descripción." : "{n} imágenes llevan su nombre de archivo como descripción.".replace("{n}", String(n))),
    plain: "Imágenes descritas con su nombre de archivo",
    impact: "Quien usa un lector de pantalla oye un nombre de archivo donde debería estar el sentido de la imagen.",
  },
  "sr-vague-link-name": {
    found: (n) => (n === 1 ? "Al menos un enlace se anuncia solo con un símbolo como «→» o con una dirección web a secas." : "{n} enlaces se anuncian solo con un símbolo como «→» o con una dirección web a secas.".replace("{n}", String(n))),
    plain: "Enlaces llamados «haga clic aquí»",
    impact: "Quien saca la lista de enlaces en un lector de pantalla no tiene nada para elegir.",
  },
  "sr-symbol-button-name": {
    found: (n) => (n === 1 ? "Al menos un botón tiene por nombre solo un símbolo como «×» o «>», sin ninguna palabra." : "{n} botones tienen por nombre solo un símbolo como «×» o «>», sin ninguna palabra.".replace("{n}", String(n))),
    plain: "Botones con solo un símbolo por nombre",
    impact: "Quien usa un lector de pantalla no sabe qué hace el botón al pulsarlo.",
  },
  "sr-vague-button-name": {
    found: (n) => (n === 1 ? "Al menos un botón solo tiene un nombre genérico como «Más» o «Ir»." : "{n} botones solo tienen nombres genéricos como «Más» o «Ir».".replace("{n}", String(n))),
    plain: "Nombres de botón que no dicen nada",
    impact: "Quien usa un lector de pantalla oye «por, botón» donde otros ven una cruz de cerrar.",
  },
  "form-field-placeholder-label": {
    found: (n) => (n === 1 ? "Al menos un campo del formulario solo tiene como etiqueta su texto de ejemplo." : "{n} campos del formulario solo tienen como etiqueta su texto de ejemplo.".replace("{n}", String(n))),
    plain: "Campos etiquetados solo con texto de ejemplo",
    impact: "La pista desaparece al escribir, así que no se puede comprobar qué va en cada casilla.",
  },
  "component-form-autocomplete": {
    found: (n) => (n === 1 ? "Al menos un campo de datos personales, como el nombre o el correo, no indica al navegador qué pide." : "{n} campos de datos personales, como el nombre o el correo, no indican al navegador qué piden.".replace("{n}", String(n))),
    plain: "Los campos impiden el autorrelleno",
    impact: "Todo el mundo vuelve a escribir sus datos a mano, una barrera real para algunos.",
  },
  "component-input-type": {
    found: (n) => (n === 1 ? "Al menos un campo que parece pedir un correo o un teléfono no está definido como tal en el código." : "{n} campos que parecen pedir un correo o un teléfono no están definidos como tales en el código.".replace("{n}", String(n))),
    plain: "Campos de correo definidos como texto simple",
    impact: "En el móvil sale el teclado equivocado, así que escribir cuesta más.",
  },
  "component-required-cue": {
    found: (n) => (n === 1 ? "Al menos un campo obligatorio no lo dice en su etiqueta, ni con «obligatorio» ni con asterisco." : "{n} campos obligatorios no lo dicen en su etiqueta, ni con «obligatorio» ni con asterisco.".replace("{n}", String(n))),
    plain: "Los campos obligatorios no se ven marcados",
    impact:
      "Nadie sabe que un campo era obligatorio hasta que el formulario lo rechaza. Los registros fallan.",
  },
  "component-submit-clarity": {
    found: (n) => (n === 1 ? "Un formulario parece no tener ningún botón con un nombre claro como «Enviar» o «Registrarse»." : "{n} formularios parecen no tener ningún botón con un nombre claro como «Enviar» o «Registrarse».".replace("{n}", String(n))),
    plain: "Ningún botón de envío bien etiquetado",
    impact: "La gente no sabe bien cómo terminar el formulario, así que no lo termina.",
  },
  "component-table-no-headers": {
    found: (n) => (n === 1 ? "Al menos una tabla con varias filas y columnas no tiene ni una sola celda de encabezado." : "{n} tablas con varias filas y columnas no tienen ni una sola celda de encabezado.".replace("{n}", String(n))),
    plain: "Una tabla sin celdas de encabezado",
    impact: "Quien usa un lector de pantalla oye valores sueltos, sin nombre de columna ni de fila.",
  },
  "component-nav-labels": {
    found: (n) => (n === 1 ? "La página tiene varios menús de navegación, y al menos uno de ellos no tiene nombre." : "La página tiene varios menús de navegación, y {n} de ellos no tienen nombre.".replace("{n}", String(n))),
    plain: "Menús de navegación sin nombre",
    impact: "Quien usa un lector de pantalla no distingue el menú principal de los enlaces del pie.",
  },
  "component-skip-link": {
    found: (n) => (n === 1 ? "Entre los primeros enlaces de la página no hay ninguno para saltar al contenido." : "La comprobación señala {n} veces que entre los primeros enlaces no hay ninguno para saltar al contenido.".replace("{n}", String(n))),
    plain: "No hay enlace para saltar al contenido",
    impact: "Quien usa el teclado recorre el menú entero en cada página.",
  },

  "mobile-target-spacing": {
    plain: "Zonas de pulsación demasiado juntas",
    found: (n) =>
      `${n} ${n === 1 ? "par de controles está" : "pares de controles están"} a menos de 8 px en ancho de móvil.`,
    impact: "Quien tiene temblores o dedos más grandes pulsa lo que no era.",
  },
  "consent-blocks-reader": {
    plain: "El aviso de cookies bloquea los lectores de pantalla",
    found: () =>
      `El aviso de cookies oculta toda la página a los lectores de pantalla, y el foco del teclado nunca llega al aviso.`,
    impact: "Quien usa un lector de pantalla oye silencio y no encuentra el aviso para quitarlo.",
  },
  "mobile-sticky-coverage": {
    plain: "Las barras fijas ahogan la pantalla del móvil",
    found: () =>
      `Las cabeceras, avisos o barras de herramientas fijas ocupan más de un tercio de la pantalla en ancho de móvil.`,
    impact: "En el móvil, la página se lee por una rendija estrecha.",
  },
  "mobile-horizontal-scroll": {
    found: (n) => (n === 1 ? "En ancho de móvil, un elemento sobresale de la pantalla y la página se desplaza de lado." : "En ancho de móvil, {n} elementos sobresalen de la pantalla y la página se desplaza de lado.".replace("{n}", String(n))),
    plain: "La página se desplaza de lado en el móvil",
    impact: "En el móvil hay que deslizar de lado en cada línea, y muchos se van.",
  },
  "mobile-tap-target": {
    found: (n) => (n === 1 ? "En ancho de móvil, una zona de pulsación mide menos de 24 px y tiene otra justo al lado." : "En ancho de móvil, {n} zonas de pulsación miden menos de 24 px y tienen otra justo al lado.".replace("{n}", String(n))),
    plain: "Zonas de pulsación demasiado pequeñas",
    impact: "Quien tiene dedos grandes o pulso inseguro falla al pulsarlas.",
  },

  "text-spacing-clipped": {
    found: (n) => (n === 1 ? "Al ampliar el espaciado entre líneas y letras, parte del texto de esta página se corta." : "{n} elementos cortan el texto al ampliar el espaciado entre líneas y letras.".replace("{n}", String(n))),
    plain: "El texto se corta con más espaciado",
    impact: "Quien tiene dislexia y amplía el espaciado pierde palabras detrás de una caja fija.",
  },
  "text-zoom-clipped": {
    found: (n) => (n === 1 ? "Con la letra al doble de tamaño, esta página corta parte del texto." : "{n} elementos cortan el texto con la letra al doble de tamaño.".replace("{n}", String(n))),
    plain: "El texto se corta a tamaños mayores",
    impact: "Quien agranda la letra por la vista débil pierde las palabras.",
  },
  "text-zoom-horizontal-scroll": {
    found: (n) => (n === 1 ? "Con la letra al doble de tamaño, la página se vuelve más ancha que la ventana." : "En {n} puntos, la página se sale de la ventana con la letra al doble de tamaño.".replace("{n}", String(n))),
    plain: "El texto ampliado se desplaza de lado",
    impact: "Quien agranda la letra se desplaza de lado en cada línea, y la mayoría se rinde.",
  },

  "dark-consent-no-reject": {
    found: (n) => (n === 1 ? "El aviso de cookies tiene un botón para aceptar y ninguno para rechazar." : "{n} avisos de cookies tienen un botón para aceptar y ninguno para rechazar.".replace("{n}", String(n))),
    plain: "Aviso de cookies sin opción de rechazar",
    impact: "Con el RGPD, el consentimiento recogido sin una forma fácil de rechazar puede ser inválido.",
  },
  "dark-consent-asymmetry": {
    found: (n) => (n === 1 ? "En el aviso de cookies, el botón de aceptar tiene fondo y el de rechazar no." : "En {n} avisos de cookies, el botón de aceptar tiene fondo y el de rechazar no.".replace("{n}", String(n))),
    plain: "El aviso de cookies resta peso a «Rechazar»",
    impact: "Dejar el rechazo como texto suelto empuja a aceptar, y los reguladores lo buscan.",
  },
  "dark-preselected-optin": {
    found: (n) => (n === 1 ? "Una casilla de publicidad, boletín o cesión de datos ya viene marcada antes de que la persona elija." : "{n} casillas de publicidad, boletín o cesión de datos ya vienen marcadas antes de que la persona elija.".replace("{n}", String(n))),
    plain: "Casilla de publicidad marcada de antemano",
    impact: "Con el RGPD, una casilla premarcada no es consentimiento.",
  },
  "dark-confirmshaming": {
    found: (n) => (n === 1 ? "Un botón para rechazar está redactado en primera persona." : "{n} botones para rechazar están redactados en primera persona.".replace("{n}", String(n))),
    plain: "El «no, gracias» redactado para avergonzar",
    impact: "Los visitantes leen esa redacción como manipulación.",
  },
  "dark-fake-scarcity": {
    found: (n) => (n === 1 ? "Un aviso de esta página anuncia pocas existencias o mucha demanda, sin forma de comprobarlo." : "{n} avisos de esta página anuncian pocas existencias o mucha demanda, sin forma de comprobarlo.".replace("{n}", String(n))),
    plain: "Avisos de pocas existencias como presión",
    impact: "Los reguladores persiguen la escasez falsa, y la clientela ha aprendido a desconfiar de ella.",
  },
  "dark-fake-urgency": {
    found: (n) => (n === 1 ? "Un mensaje de esta página mete prisa sin dar ninguna fecha." : "{n} mensajes de esta página meten prisa sin dar ninguna fecha.".replace("{n}", String(n))),
    plain: "Plazos usados como presión",
    impact: "En cuanto se nota una cuenta atrás falsa, ya no se cree nada de lo que diga el sitio.",
  },

  "dialog-close-unlabeled": {
    found: (n) => (n === 1 ? "En al menos una ventana emergente, el botón de cerrar es solo una cruz, sin nombre en el código." : "En {n} ventanas emergentes, el botón de cerrar es solo una cruz, sin nombre en el código.".replace("{n}", String(n))),
    plain: "Botón de cerrar sin etiqueta",
    impact: "Quien usa un lector de pantalla solo oye «botón» y no sabe cómo cerrarla.",
  },
  "dialog-keyboard-trap": {
    found: (n) => (n === 1 ? "Una ventana emergente no se cierra con Escape, y tras quince pulsaciones del tabulador el foco sigue dentro." : "{n} ventanas emergentes no se cierran con Escape, y tras quince pulsaciones del tabulador el foco sigue dentro.".replace("{n}", String(n))),
    plain: "Una ventana emergente atrapa el teclado",
    impact: "Quien usa el teclado se queda atrapado, y cerrar la pestaña es la única salida.",
  },
  "dialog-no-escape": {
    found: (n) => (n === 1 ? "Una ventana emergente siguió abierta al pulsar Escape." : "{n} ventanas emergentes siguieron abiertas al pulsar Escape.".replace("{n}", String(n))),
    plain: "La ventana emergente ignora la tecla Escape",
    impact: "Quien usa el teclado prueba primero Escape, y no pasa nada.",
  },
  "dialog-focus-not-moved": {
    found: (n) => (n === 1 ? "Apareció una ventana emergente, pero el foco del teclado no entró en ella." : "Aparecieron {n} ventanas emergentes, pero el foco del teclado no entró en ninguna.".replace("{n}", String(n))),
    plain: "La ventana emergente se abre sin tomar el foco",
    impact: "A quien usa un lector de pantalla nunca se le dice que se ha abierto.",
  },
  "dialog-focus-lost-on-close": {
    found: (n) => (n === 1 ? "Al cerrar una ventana emergente con Escape, el foco no quedó en ningún elemento." : "Al cerrar {n} ventanas emergentes con Escape, el foco no quedó en ningún elemento.".replace("{n}", String(n))),
    plain: "Al cerrar la ventana emergente se pierde el sitio",
    impact: "Quien usa el teclado tiene que empezar otra vez desde arriba.",
  },
  "dialog-no-close": {
    found: (n) => (n === 1 ? "Al menos una ventana emergente no tiene un botón de cerrar reconocible." : "{n} ventanas emergentes no tienen un botón de cerrar reconocible.".replace("{n}", String(n))),
    plain: "No hay un botón de cerrar claro",
    impact: "Si pulsar fuera es la única salida, quien usa el teclado se queda atrapado.",
  },
  "dialog-missing-role": {
    found: (n) => (n === 1 ? "Al menos una capa superpuesta a la página no está marcada como diálogo en el código." : "{n} capas superpuestas a la página no están marcadas como diálogo en el código.".replace("{n}", String(n))),
    plain: "La capa superpuesta no está marcada como diálogo",
    impact: "Los lectores de pantalla no la anuncian, y la gente pasa con el tabulador a la página de detrás.",
  },
  "dialog-missing-name": {
    found: (n) => (n === 1 ? "Al menos una ventana emergente no tiene nombre en el código." : "{n} ventanas emergentes no tienen nombre en el código.".replace("{n}", String(n))),
    plain: "La ventana emergente no dice para qué es",
    impact: "Quien usa un lector de pantalla solo oye «diálogo», sin idea de qué le pide.",
  },

  "markup-validation": {
    found: (n) => (n === 1 ? "Un validador indica que el código fuente de esta página no es HTML válido." : "Un validador señala {n} puntos en los que el código fuente de esta página no es HTML válido.".replace("{n}", String(n))),
    plain: "HTML no válido en la página",
    impact: "Cada navegador adivina el arreglo a su manera, así que la página puede romperse.",
  },

  "motion-marquee": {
    found: (n) => (n === 1 ? "Hay texto que cruza la página en un elemento «marquee», sin ninguna pausa." : "En {n} lugares hay texto que cruza la página en un elemento «marquee», sin ninguna pausa.".replace("{n}", String(n))),
    plain: "Texto en movimiento que no se puede parar",
    impact: "El texto en movimiento es ilegible para quien tiene problemas de atención o de equilibrio.",
  },
  "motion-autoplay-media": {
    found: (n) => (n === 1 ? "Al menos un vídeo se reproduce solo, sin la barra de control para pararlo." : "{n} vídeos se reproducen solos, sin la barra de control para pararlos.".replace("{n}", String(n))),
    plain: "El audio o el vídeo se reproducen solos",
    impact: "Nadie puede pararlo, y tapa a los lectores de pantalla.",
  },
  "motion-infinite-no-reduced-motion": {
    found: (n) => (n === 1 ? "Al menos una animación se repite sin fin, también con el ajuste de movimiento reducido activado." : "{n} animaciones se repiten sin fin, también con el ajuste de movimiento reducido activado.".replace("{n}", String(n))),
    plain: "La animación ignora el ajuste de movimiento reducido",
    impact: "El movimiento constante puede provocar mareo o náuseas a quien tiene trastornos del equilibrio.",
  },

  "typo-caps-letterspacing": {
    found: (n) => (n === 1 ? "Hay texto en mayúsculas con poco o ningún espacio extra entre las letras." : "En {n} lugares hay texto en mayúsculas con poco o ningún espacio extra entre las letras.".replace("{n}", String(n))),
    plain: "Mayúsculas sin espacio entre letras",
    impact: "Los titulares en mayúsculas apretadas cuestan de recorrer con la vista.",
  },
  "typo-lowercase-letterspaced": {
    found: (n) => (n === 1 ? "Parte del texto corrido tiene espacio de más forzado entre las minúsculas." : "{n} bloques de texto corrido tienen espacio de más forzado entre las minúsculas.".replace("{n}", String(n))),
    plain: "Espacio forzado entre las letras",
    impact: "Las letras separadas rompen la forma de las palabras y frenan a cualquiera.",
  },
  "typo-negative-letterspacing": {
    found: (n) => (n === 1 ? "En esta página hay texto con las letras más juntas de lo que prevé la tipografía." : "En {n} lugares de esta página hay texto con las letras más juntas de lo que prevé la tipografía.".replace("{n}", String(n))),
    plain: "Letras apretadas hasta tocarse",
    impact: "Las letras apretadas se emborronan para quien ve poco.",
  },
  "typo-line-length-long": {
    found: (n) => (n === 1 ? "En esta página hay texto de lectura con líneas de más de 90 caracteres de media." : "En {n} lugares de esta página hay texto de lectura con líneas de más de 90 caracteres de media.".replace("{n}", String(n))),
    plain: "Las líneas son demasiado largas",
    impact: "Pasados unos 75 caracteres, el ojo pierde el sitio al volver.",
  },
  "typo-line-length-short": {
    found: (n) => (n === 1 ? "En esta página hay texto de lectura con líneas de menos de 25 caracteres de media." : "En {n} lugares de esta página hay texto de lectura con líneas de menos de 25 caracteres de media.".replace("{n}", String(n))),
    plain: "Las líneas se cortan demasiado",
    impact: "El ritmo de lectura se rompe cuando casi cada frase salta a una línea nueva.",
  },
  "typo-justified-no-hyphens": {
    found: (n) => (n === 1 ? "En esta página hay texto de lectura justificado, sin partición automática de palabras." : "En {n} lugares de esta página hay texto de lectura justificado, sin partición automática de palabras.".replace("{n}", String(n))),
    plain: "Texto justificado sin partición de palabras",
    impact: "Los huecos desiguales entre palabras forman ríos de blanco que distraen.",
  },
  "typo-font-size-small": {
    found: (n) => (n === 1 ? "En esta página hay texto de lectura de menos de 13 px." : "En {n} lugares de esta página hay texto de lectura de menos de 13 px.".replace("{n}", String(n))),
    plain: "Texto de lectura muy pequeño",
    impact: "El texto pequeño cuesta de leer en el móvil o con la vista débil.",
  },
  "typo-typeface-count": {
    found: (n) => (n === 1 ? "El diseño de esta página usa más de cuatro tipografías distintas para el texto." : "La comprobación señala {n} veces que el diseño de esta página usa más de cuatro tipografías para el texto.".replace("{n}", String(n))),
    plain: "Demasiadas tipografías",
    impact: "La página parece recargada y menos fiable.",
  },

  "typo-underline-nonlink": {
    found: (n) => (n === 1 ? "En esta página hay texto subrayado que no es un enlace." : "En {n} lugares de esta página hay texto subrayado que no es un enlace.".replace("{n}", String(n))),
    plain: "Texto subrayado que no es un enlace",
    impact: "La gente pulsa texto subrayado que no lleva a ninguna parte.",
  },
  "typo-italic-body": {
    found: (n) => (n === 1 ? "En esta página hay texto de lectura en cursiva por párrafos enteros, no solo en palabras sueltas." : "En {n} lugares hay texto de lectura en cursiva por párrafos enteros, no solo en palabras sueltas.".replace("{n}", String(n))),
    plain: "Pasajes enteros en cursiva",
    impact: "Las letras inclinadas cansan a quien tiene dislexia o la vista débil.",
  },
  "typo-allcaps-block": {
    found: (n) => (n === 1 ? "En esta página hay texto de lectura de 60 caracteres o más, todo en mayúsculas." : "En {n} lugares de esta página hay texto de lectura de 60 caracteres o más, todo en mayúsculas.".replace("{n}", String(n))),
    plain: "Pasajes largos EN MAYÚSCULAS",
    impact: "Las mayúsculas borran la forma de las palabras, y eso frena sobre todo a quien tiene dislexia.",
  },
  "typo-thin-weight": {
    found: (n) => (n === 1 ? "En esta página hay texto de lectura en un grosor de 200 o menos." : "En {n} lugares de esta página hay texto de lectura en un grosor de 200 o menos.".replace("{n}", String(n))),
    plain: "Texto de lectura en grosor finísimo",
    impact: "Los trazos finos se desvanecen en pantallas baratas y para la vista débil, aunque el contraste apruebe.",
  },
  "nav-name-inconsistent": {
    plain: "El mismo enlace con nombres distintos",
    impact: "Quien usa un lector de pantalla y busca el nombre de siempre no lo encuentra.",
    found: (n) => (n === 1 ? "Un enlace del menú cambia de nombre según la página, aunque siempre lleva al mismo destino." : "{n} enlaces del menú cambian de nombre según la página, aunque cada uno lleva al mismo destino.".replace("{n}", String(n))),
  },
  "color-contrast-mobile": {
    plain: "Texto demasiado claro en ancho de móvil",
    impact: "En un móvil a plena luz del día, el texto cuesta de leer incluso con buena vista.",
    found: () => "En ancho de móvil hay texto por debajo del contraste exigido, y en escritorio no.",
  },
  "color-contrast-dark": {
    plain: "Texto demasiado claro en modo oscuro",
    impact: "Quien usa el modo oscuro por los reflejos o la vista cansada recibe la versión pálida.",
    found: () => "En el tema oscuro hay texto por debajo del contraste exigido, y en el claro no.",
  },
  "nav-order-inconsistent": {
    plain: "El menú cambia de orden",
    impact: "Quien recuerda la posición de un enlace acaba en la opción equivocada.",
    found: (n) => (n === 1 ? "Una página muestra los mismos enlaces del menú en otro orden que la primera página analizada." : "{n} páginas muestran los mismos enlaces del menú en otro orden que la primera página analizada.".replace("{n}", String(n))),
  },
  "keyboard-positive-tabindex-advisory": {
    plain: "Orden de tabulación fijado con números",
    impact: "Quien usa el teclado salta por la página en un orden sin sentido.",
    found: (n) => (n === 1 ? "Al menos un control tiene su lugar en el orden de tabulación fijado con un número." : "{n} controles tienen su lugar en el orden de tabulación fijado con un número.".replace("{n}", String(n))),
  },
  "activation-stale-state": {
    plain: "Un control anuncia el estado anterior",
    impact: "Quien usa un lector de pantalla oye «contraído» con el panel abierto.",
    found: (n) => (n === 1 ? "Al menos un control cambió a la vista al activarlo, pero el lector de pantalla sigue anunciando el estado anterior." : "{n} controles cambiaron a la vista al activarlos, pero el lector de pantalla sigue anunciando el estado anterior.".replace("{n}", String(n))),
  },
  "control-faint-boundary": {
    plain: "Bordes de los controles demasiado tenues",
    impact: "Quien ve poco no distingue dónde empiezan y acaban las casillas.",
    found: (n) => (n === 1 ? "Al menos un control tiene un borde por debajo del contraste mínimo de 3:1." : "Los bordes de {n} controles están por debajo del contraste mínimo de 3:1.".replace("{n}", String(n))),
  },
};

export const FIXES_ES: Record<string, string | string[]> = {
  "reflow-height-unreachable": ["Haga que el panel se desplace por dentro, o no lo fije en una ventana baja.", "Ponga sus botones encima del texto largo para que sean lo que se ve."],
  "reflow-height-pinned": ["No fije las barras de arriba y abajo cuando la ventana es baja.", "O deje que la cabecera desaparezca al bajar y vuelva al subir."],
  "reflow-height-pinned-advisory": "No fije las barras en una ventana baja, para que la página tenga el sitio.",
  "contrast-over-image": ["Ponga un fondo sólido o semitransparente detrás del texto.", "O oscurezca la imagen donde está el texto, o saque el texto de la imagen."],
  "form-error-silent": ["Diga con palabras, junto a cada campo, qué falta.", "Marque el campo como no válido, enlace el mensaje con él y lleve el foco al primer error."],
  "keyboard-mouse-only": [
    "Conviértalo en un botón o un enlace de verdad, para que el teclado llegue a él como a todo lo demás.",
    "Compruébelo apartando el ratón y recorriendo la página con el tabulador.",
  ],
  "keyboard-faint-focus": [
    "Haga el contorno del teclado más oscuro y más grueso, para que destaque sobre la página que tiene detrás.",
    "Compruébelo sobre todos los fondos en los que caiga.",
  ],
  "timing-meta-refresh": [
    "Quite la recarga automática de la página.",
    "Si tiene que actualizarse, ponga un botón y deje que la gente elija cuándo.",
  ],
  "aria-prohibited-attr": [
    "Ponga las palabras dentro del propio elemento, donde se van a leer.",
    "Cuando eso no se pueda, use un elemento hecho para llevar un nombre.",
  ],
  "aria-required-parent": "Devuelva cada pieza al control al que pertenece.",
  "landmark-no-duplicate-main": [
    "Deje un solo contenido principal por página.",
    "Marque los demás como secciones normales.",
  ],
  "landmark-banner-is-top-level":
    "Saque la cabecera del sitio al primer nivel, junto al contenido principal y no dentro de él.",
  "svg-img-alt": [
    "Escriba una descripción corta para cada icono que tenga significado.",
    "Esconda a los lectores de pantalla los que son solo decorativos.",
  ],
  "meta-viewport-large": [
    "Quite el ajuste que limita la ampliación.",
    "Deje que la página crezca hasta al menos cinco veces su tamaño normal.",
  ],
  "aria-dialog-name": "Dé a la ventana emergente un nombre que diga para qué es, para que se anuncie al abrirse.",
  "nested-interactive": [
    "Saque el control de dentro, para que se pulse una cosa y no dos.",
    "Cuando hagan falta los dos, póngalos uno al lado del otro en vez de uno dentro del otro.",
  ],
  "presentation-role-conflict": [
    "Quite la marca que lo llama decoración.",
    "Es un control que funciona, así que deje que se anuncie como tal.",
  ],
  "keyboard-no-visible-focus": [
    "Muestre un contorno claro alrededor de aquello en lo que esté el teclado.",
    "Hágalo lo bastante grueso y lo bastante vivo como para encontrarlo en una página cargada.",
    "No quite nunca un contorno sin poner otro más fuerte en su lugar.",
  ],
  "readability-dense-prose": [
    "Acorte las frases a unas quince o veinte palabras.",
    "Cambie las palabras técnicas por otras de todos los días.",
    "Parta los párrafos largos.", "Use encabezados y listas para dar estructura al texto.",
  ],
  "reading-order-mismatch": [
    "Vuelva a poner el orden interno de la página a la par de lo que ve la gente.",
    "Mueva el contenido en sí, en vez de retocar el orden de tabulación para compensar.",
  ],
  "forced-colors-focus-lost": [
    "Pruebe la página en el modo de alto contraste de Windows.",
    "Deje que el contorno del foco tome el color del propio sistema en vez de uno fijo.",
  ],
  "forced-colors-icon-lost": [
    "Pruebe la página en el modo de alto contraste de Windows.",
    "Dé a los botones de solo icono un borde real o texto, para que sobrevivan a ese modo.",
  ],
  "keyboard-focus-trap": [
    "Asegúrese de que el tabulador siempre puede seguir, y de que Escape siempre saca.",
    "Compruébelo apartando el ratón y usando solo el teclado.",
  ],
  "sr-filename-alt": [
    "Sustituya cada nombre de archivo por una frase que diga qué muestra la imagen.",
    "Marque las imágenes puramente decorativas con un texto alternativo vacío, para que los lectores de pantalla las salten.",
  ],
  "sr-vague-link-name": [
    "Nombre cada enlace por su destino. «Ver precios», no «haga clic aquí».",
    "Las palabras visibles pueden seguir siendo cortas. Su equipo de desarrollo puede añadir el nombre completo de forma invisible, solo para lectores de pantalla.",
  ],
  "sr-symbol-button-name": [
    "Ponga a cada botón el nombre de su acción: «Cerrar», «Siguiente diapositiva», «Buscar», «Reproducir».",
    "El aspecto de solo icono puede quedarse: las palabras se añaden de forma invisible, solo para lectores de pantalla.",
  ],
  "sr-vague-button-name": [
    "Ponga a cada botón el nombre de su acción: «Cerrar», «Siguiente diapositiva», «Buscar», «Reproducir».",
    "El aspecto de solo icono puede quedarse: las palabras se añaden de forma invisible, solo para lectores de pantalla.",
  ],
  "form-field-placeholder-label": [
    "Dé a cada campo una etiqueta visible, unida a él con for e id.",
    "Deje el texto de ejemplo como muestra del formato, nunca como única etiqueta.",
  ],
  "component-form-autocomplete":
    "Indique en cada campo qué recoge, para que los navegadores y los gestores de contraseñas puedan rellenarlo.",
  "component-input-type": "Diga a la página qué campos llevan un correo y cuáles un teléfono.",
  "component-required-cue": [
    "Marque los campos obligatorios a la vista, no solo en el código.",
    "Con la palabra «obligatorio» junto a la etiqueta basta.",
  ],
  "component-submit-clarity":
    "Dé al formulario un solo botón bien etiquetado que diga lo que hace, como «Enviar consulta».",
  "component-table-no-headers": [
    "Marque la fila superior como celdas de encabezado, y también la primera columna si las filas tienen nombre.",
    "Si la tabla solo sirve para maquetar, márquela como tabla sin datos.",
  ],
  "component-nav-labels": "Nombre cada menú por lo que contiene, como «Menú principal» o «Enlaces del pie».",
  "component-skip-link": [
    "Añada arriba del todo un enlace que salte directo al contenido principal.",
    "Muéstrelo cuando reciba el foco del teclado, para que la gente sepa que está ahí.",
  ],
  "mobile-target-spacing":
    "Deje algo de espacio entre los botones y los enlaces, para que un pulgar no pueda dar en dos a la vez.",
  "consent-blocks-reader": [
    "Lleve el foco del teclado al aviso en cuanto se abra.",
    "Manténgalo ahí hasta que se elija. Eso es lo que hace correcto esconder la página de detrás.",
    "O deje de esconder la página: un aviso que solo se queda abajo no necesita nada de esto.",
  ],
  "mobile-sticky-coverage": [
    "Reduzca las barras fijas de arriba y de abajo en el móvil.",
    "Deje la mayor parte de la pantalla para el contenido que la gente vino a leer.",
  ],
  "mobile-horizontal-scroll": [
    "Deje que el contenido se reajuste al ancho de la pantalla.",
    "Busque un ancho fijo o una imagen demasiado grande que estire la página.",
  ],
  "mobile-tap-target":
    "Haga los botones y los enlaces al menos tan grandes como la yema de un dedo, y déjeles aire alrededor.",
  "text-spacing-clipped": [
    "Deje que las cajas crezcan con el texto que llevan dentro.",
    "Lo que suele cortar las palabras es una altura fija.",
  ],
  "text-zoom-clipped": [
    "Deje que los contenedores crezcan cuando quien lee agranda el texto.",
    "Revise la página con el texto al doble de su tamaño normal.",
  ],
  "text-zoom-horizontal-scroll": "Deje que la página se reajuste cuando se agranda el texto, en vez de irse hacia el lado.",
  "dark-consent-no-reject": "Ponga una opción de rechazar en el aviso de cookies, tan fácil de encontrar como la de aceptar.",
  "dark-consent-asymmetry": "Dé a aceptar y a rechazar el mismo tamaño, el mismo estilo y la misma presencia.",
  "dark-preselected-optin": "Deje sin marcar las casillas de publicidad y de compartir datos.",
  "dark-confirmshaming": "Redacte con claridad la opción de rechazo, como «No, gracias», sin nada que regañe.",
  "dark-fake-scarcity": [
    "Muestre cifras de existencias y de demanda solo donde sean ciertas y estén al día.",
    "Retire cualquier número que no salga de datos reales.",
  ],
  "dark-fake-urgency": [
    "Ponga cuentas atrás solo donde el plazo sea real.",
    "Retire cualquier temporizador que se reinicie al recargar la página.",
  ],
  "dialog-close-unlabeled": "Dé un nombre al botón de cerrar, para que se anuncie como «Cerrar» y no como una simple cruz.",
  "dialog-keyboard-trap": [
    "Deje que el tabulador dé vueltas dentro de la ventana emergente mientras esté abierta.",
    "Deje que Escape la cierre y devuelva a la página.",
  ],
  "dialog-no-escape": "Deje que la tecla Escape cierre la ventana emergente.",
  "dialog-focus-not-moved": "Lleve el cursor a la ventana emergente al abrirse, para que quien usa el teclado empiece dentro.",
  "dialog-focus-lost-on-close": "Devuelva el cursor a lo que abrió la ventana emergente cuando esta se cierre.",
  "dialog-no-close": [
    "Dé a cada ventana emergente un botón de cerrar visible.",
    "Deje que Escape la cierre también.",
  ],
  "dialog-missing-role": [
    "Marque la capa superpuesta como diálogo, para que se anuncie al abrirse.",
    "Dele un nombre que diga para qué es.",
    "Mantenga el teclado dentro mientras esté abierta, y devuélvalo al cerrar.",
  ],
  "dialog-missing-name": "Dé a la ventana emergente un encabezado o un nombre que diga para qué es.",
  "markup-validation": "Pase la página por el validador del W3C y limpie lo que le indique.",
  "motion-marquee": [
    "Cambie el texto en movimiento por texto quieto.",
    "Si tiene que moverse, dé a la gente una forma de pararlo.",
  ],
  "motion-autoplay-media": [
    "Impida que el audio y el vídeo empiecen solos.",
    "Si algo tiene que sonar, que no pase de tres segundos, o añada un botón de parada.",
  ],
  "motion-infinite-no-reduced-motion": [
    "Respete el ajuste con el que la gente pide menos movimiento.",
    "Las animaciones deben pararse, o quedarse en un fundido simple, cuando esté activado.",
  ],
  "typo-caps-letterspacing":
    "Añada un poco de espacio entre letras en los titulares en mayúsculas, para que las palabras guarden su forma.",
  "typo-lowercase-letterspaced": "Quite el espacio de más entre las letras del texto normal.",
  "typo-negative-letterspacing": "Deje de apretar las letras unas contra otras.",
  "typo-justified-no-hyphens": [
    "Componga el texto alineado a la izquierda en vez de justificado.",
    "Si tiene que ir justificado, active la partición de palabras para que los huecos queden parejos.",
  ],
  "typo-typeface-count": [
    "Quédese con dos tipografías, o tres como mucho.",
    "Busque la variedad en el grosor y el tamaño, no en otra tipografía.",
  ],
  "typo-underline-nonlink": [
    "Reserve el subrayado para los enlaces.",
    "Use negrita o cursiva cuando quiera destacar algo.",
  ],
  "typo-italic-body": "Componga los pasajes largos en redonda, y guarde la cursiva para una frase suelta.",
  "typo-allcaps-block": [
    "Componga los pasajes largos en minúsculas normales.",
    "Reserve las mayúsculas para etiquetas cortas.",
  ],
  "typo-thin-weight": "Componga el texto de lectura en un grosor normal.",

  "aria-allowed-role": [
    "Use un elemento que sea de verdad lo que dice ser.",
    "Un botón para un botón, un bloque de navegación para la navegación.",
  ],
  "aria-allowed-attr": "Quite los ajustes que no corresponden a este tipo de elemento, o cámbielo por uno al que sí correspondan.",
  "aria-required-children": [
    "Ponga dentro los elementos prometidos: una lista necesita elementos de lista, un menú necesita opciones de menú.",
    "Si el contenido no es realmente una lista ni un menú, quite esa marca del contenedor.",
  ],
  "landmark-unique": "Nombre cada zona por lo que contiene, como «Menú principal» o «Enlaces del pie».",
  "landmark-no-duplicate-banner": [
    "Deje una sola cabecera del sitio, en el primer nivel de la página.",
    "Convierta las demás en contenedores normales.",
  ],
  "landmark-no-duplicate-contentinfo": [
    "Deje un solo pie del sitio, en el primer nivel de la página.",
    "Convierta los demás en contenedores normales.",
  ],
  "landmark-contentinfo-is-top-level": "Saque el pie del sitio para que quede en el primer nivel de la página, y no dentro de otra zona.",
  "skip-link": [
    "Apunte el enlace de salto al contenido principal, y compruebe que ese destino existe.",
    "Asegúrese de que el teclado aterriza ahí cuando se usa el enlace.",
  ],
  "component-skip-link-dead": [
    "Apunte el enlace de salto al contenido principal, y compruebe que ese destino existe.",
    "Asegúrese de que el teclado aterriza ahí cuando se usa el enlace.",
  ],
  "image-redundant-alt": "Dé a la imagen un alt vacío (alt=\"\") cuando el texto de al lado ya diga lo mismo.",
  "color-contrast": [
    "Oscurezca el texto, o aclare lo que tiene detrás.",
    "El texto normal necesita una proporción de contraste de al menos 4,5:1.",
    "El texto grande, de unos 24 px o de 19 px en negrita, necesita 3:1.",
  ],
  "image-alt": [
    "Escriba una descripción corta para cada imagen que tenga significado.",
    "Diga qué muestra, no que es una imagen.",
    "Deje la descripción vacía en las imágenes puramente decorativas.",
  ],
  "input-image-alt": "Describa qué hace el botón de imagen, como «Buscar», en vez de qué aspecto tiene.",
  "link-name": [
    "Ponga palabras legibles dentro de cada enlace.",
    "En un enlace de icono, añada un nombre que diga adónde lleva, no qué aspecto tiene.",
    "Cuando el enlace ya muestre palabras, conserve esas mismas palabras en el nombre.",
    "Quien maneja el sitio por voz dice lo que ve, así que los dos tienen que coincidir.",
  ],
  "link-text-vague": [
    "Escriba textos de enlace que se entiendan por sí solos.",
    "«Lea los cambios de tarifas de 2026» en vez de «Leer más».",
    "Para dejar la versión corta en pantalla, añada el texto completo como nombre.",
  ],
  "label-content-name-mismatch": [
    "Conserve las palabras que muestra el control dentro de su nombre en el código.",
    "Empiece el nombre por esas mismas palabras y añada después lo demás.",
    "Quien maneja el sitio por voz dice lo que ve, así que los dos tienen que coincidir.",
  ],
  "button-name": [
    "Dé a cada botón palabras que digan lo que hace.",
    "En un botón de icono, añada un nombre que describa la acción.",
    "Cuando el botón ya muestre palabras, conserve esas mismas palabras en el nombre.",
    "Quien maneja el sitio por voz dice lo que ve, así que los dos tienen que coincidir.",
  ],
  label: [
    "Dé a cada campo una etiqueta visible que diga qué va en él.",
    "Compruebe que, al pulsar la etiqueta, el cursor va a su campo.",
  ],
  "select-name": [
    "Dé al desplegable una etiqueta visible que diga qué se elige.",
    "Cuando no haya sitio para una, añada un nombre para los lectores de pantalla.",
  ],
  "document-title": "Dé a la página un título que la describa. Es lo que sale en la pestaña del navegador y en los resultados de búsqueda.",
  "html-has-lang": "Diga a la página en qué idioma está escrita, para que los lectores de pantalla usen la voz correcta.",
  "html-lang-valid": "Corrija el ajuste de idioma de la página con un código de idioma real, como es para el español o de para el alemán.",
  "heading-order": "Use los encabezados en orden, sin saltarse ningún nivel.",
  "page-has-heading-one": "Añada un <h1> cerca de arriba que diga de qué trata la página.",
  "empty-heading": "Ponga texto en el encabezado, o quite la etiqueta de encabezado vacía.",
  "link-in-text-block": "Dé a los enlaces dentro del texto una segunda señal visual además del color, normalmente el subrayado.",
  "meta-viewport": "Quite el ajuste que bloquea la ampliación, para que la página crezca hasta donde lo necesite quien lee.",
  "frame-title": "Dé a cada marco incrustado un nombre que diga qué contiene, como «Mapa de la ubicación».",
  "duplicate-id-active": "Haga único cada id de la página. Dos elementos no deben compartir ninguno.",
  list: "Marque como listas las listas de verdad, con cada elemento dentro de la misma lista.",
  listitem: "Ponga cada elemento de lista dentro de una lista, en vez de dejarlo suelto.",
  "aria-required-attr": [
    "Dé al control el estado que dice tener.",
    "Indique en el código si está marcado o sin marcar, abierto o cerrado.",
    "Un control que informa de un valor en una escala también debe indicar el valor.",
  ],
  "aria-hidden-focus": "O deje de esconderlo, o sáquelo también del orden de tabulación.",
  region: [
    "Ponga cada parte de la página dentro de una zona con nombre: cabecera, navegación, contenido principal, pie.",
    "El contenido que queda fuera se lo salta quien va dando saltos de sección en sección.",
  ],
  "landmark-one-main": "Marque el contenido principal de la página como su zona principal, y use solo una por página.",
  tabindex: 'Quite los valores positivos de tabindex (tabindex="1" o mayores) y deje que el orden natural de la página fije el orden del foco.',
  "scrollable-region-focusable": 'Añada tabindex="0" al contenedor desplazable para que quien usa el teclado pueda desplazarlo.',
  "keyboard-positive-tabindex-advisory": "Pida a su equipo de desarrollo que quite los números que fijan a mano el orden de tabulación. Así el teclado sigue el orden de la página, también en todo lo que se añada después.",
  "nav-name-inconsistent": "Dé a cada enlace del menú un solo nombre, «Cesta» o «Carrito», y úselo en todas las páginas.",
  "color-contrast-mobile": [
    "Busque la media query de ancho de móvil que cambia el color del texto o del fondo.",
    "Compruebe esa pareja con la misma regla: el texto normal necesita al menos 4,5:1.",
  ],
  "color-contrast-dark": [
    "Compruebe los colores de texto y fondo de la paleta oscura igual que los de la clara.",
    "El texto normal necesita al menos 4,5:1 en los dos temas.",
  ],
  "nav-order-inconsistent": "Mantenga los enlaces del menú en el mismo orden en todas las páginas. Una página puede mostrar menos enlaces, pero los que tenga deben conservar su orden.",
  "activation-stale-state": "Haga que cada control anuncie su nuevo estado en cuanto cambie: desplegado o contraído, activado o desactivado. Su equipo de desarrollo lo hace en el mismo código que abre o acciona el control.",
  "control-faint-boundary": "Haga más visibles los bordes de campos y botones. Necesitan una proporción de contraste de al menos 3:1 con lo que tienen detrás. Su equipo de diseño suele poder corregirlos todos con un solo cambio en el estilo común.",
};

export const UNDECIDED_ES: Record<string, { what: string; ask: string }> = {
  "form-error-unlinked": {
    what: "Un formulario muestra un error tras un envío vacío, pero no lo une al campo. No se envió nada al sitio.",
    ask: "Pida a su desarrollador que marque cada campo con error como no válido. Enlace el mensaje con aria-describedby para que se lean juntos.",
  },
  "form-error-unannounced": {
    what: "Un formulario muestra errores sin mover el foco ni anunciarlos. No se envió nada al sitio.",
    ask: "Pida a su desarrollador que lleve el foco al primer error o a un resumen. Una región dinámica también sirve.",
  },
  "media-embed-no-captions": {
    what: "Un vídeo incrustado de YouTube o Vimeo no tiene subtítulos, según su propio sitio. Un vídeo mudo no los necesita.",
    ask: "Reprodúzcalo. Si alguien habla, añada subtítulos en la cuenta del vídeo, corregidos por una persona.",
  },
  "media-embed-auto-captions": {
    what: "Un vídeo incrustado de YouTube o Vimeo solo tiene subtítulos automáticos, según su propio sitio. Suelen fallar con nombres y cifras.",
    ask: "Reprodúzcalo con subtítulos. Si fallan palabras, corríjalas en la cuenta del vídeo o suba un archivo de subtítulos.",
  },
  "color-contrast": {
    what: "Texto sobre una foto, un vídeo o un degradado. Su contraste cambia de un punto a otro, así que la comprobación no pudo darle un único valor.",
    ask: "Pida a su diseñador que revise cada uno donde la imagen de fondo es más clara. El texto normal necesita un contraste de 4,5:1 y el texto grande de 3:1. Donde no llegue, ponga un panel sólido o un velo oscuro detrás de las palabras.",
  },
  "link-in-text-block": {
    what: "Enlaces dentro de párrafos que solo se distinguen por el color, sin subrayado. La comprobación no pudo medir si su color se diferencia lo bastante del texto que los rodea.",
    ask: "Pida a su diseñador que subraye estos enlaces. Es la solución más sencilla. Una diferencia de color de 3:1 con el texto de alrededor también vale, si el enlace se subraya al pasar el ratón y con el foco del teclado.",
  },
  "video-caption": {
    what: "Un vídeo en la página. La comprobación no puede reproducirlo, así que no sabe si tiene subtítulos ni si coinciden con lo que se dice.",
    ask: "Reprodúzcalo con los subtítulos activados. Si alguien habla, debe aparecer cada palabra, revisada por una persona. Los subtítulos automáticos por sí solos no cuentan.",
  },
  "media-video-captions": {
    what: "Un vídeo sin archivo de subtítulos. Un clip sin sonido no lo necesita, y los subtítulos incrustados en la imagen no dejan archivo, así que aún no es un fallo.",
    ask: "Reproduzca cada vídeo. Si alguien habla y no aparecen subtítulos, pida a quien lo hizo que los añada, revisados por una persona. Los automáticos por sí solos no cuentan.",
  },
  "media-video-descriptions": {
    what: "Un vídeo subtitulado sin nada que describa lo que se ve. Los subtítulos llevan las palabras, no la imagen, como un gráfico o un texto en pantalla.",
    ask: "Vea cada vídeo con los ojos cerrados. Si se pierde algo, como un gráfico, una demostración o un texto en pantalla, el audio tiene que describirlo. Una versión escrita en la página solo cumple el nivel A.",
  },
  "form-error-association": {
    what: "Mensajes de error de formulario que no están unidos a su campo en el código. El lector de pantalla anuncia el campo, pero no el error que está al lado.",
    ask: "Pida a su equipo de desarrollo que una cada mensaje con su campo mediante aria-describedby. Quien usa un lector de pantalla oye entonces el problema en el mismo momento en que oye el campo.",
  },
  "media-audio-transcript": {
    what: "Audio en la página. Una transcripción sería texto normal, así que la comprobación no puede saber si existe.",
    ask: "Busque junto a cada reproductor una versión escrita de todo lo que se dice. Si no la hay, pídasela a quien hizo la grabación y póngala en la página.",
  },
  "media-embedded-player": {
    what: "Un vídeo en el reproductor de otra empresa, como YouTube o Vimeo. El vídeo está en su sitio, así que la comprobación no puede mirar dentro.",
    ask: "Reproduzca cada uno y active los subtítulos con el botón CC. Si no hay botón o los subtítulos están mal, corríjalos en la cuenta donde está alojado el vídeo.",
  },
  "pdf-linked-not-checked": {
    what: "Documentos PDF a los que enlaza esta página y que la comprobación no abrió. Una comprobación de página abre los dos primeros de su propio sitio y cuenta el resto.",
    ask: "Pegue la dirección de un documento en la comprobación para revisarlo por separado. Un PDF necesita etiquetas, un título y su idioma definido para que un lector de pantalla pueda leerlo bien.",
  },
  "pdf-linked-faults": {
    what: "Un PDF al que enlaza esta página. La comprobación lo abrió y encontró fallos, como la falta de etiquetas o de título. Son fallos del documento, así que no entran en la puntuación de esta página.",
    ask: "Pegue la dirección del documento en la comprobación para obtener su propio informe. Después pida a quien lo hizo que corrija el archivo original y lo vuelva a subir.",
  },
  "office-linked-not-checked": {
    what: "Archivos de Word, Excel o PowerPoint a los que enlaza esta página. La comprobación los cuenta y nunca los abre.",
    ask: "Abra cada uno y ejecute el comprobador de accesibilidad incluido en Office, en la pestaña Revisar. Mejor aún, ponga su contenido en una página web, que todo el mundo puede leer.",
  },
  "consent-layer-in-frame": {
    what: "El banner de cookies se carga desde el sitio de otra empresa dentro de un marco, así que el análisis no puede comprobar qué oye en él un lector de pantalla.",
    ask: "Pida a alguien que abra la página con un lector de pantalla, como VoiceOver en Mac o NVDA en Windows. El banner debe leerse primero y la tecla Tab debe llegar a sus botones. Rechazar debe costar los mismos pasos que aceptar.",
  },
  "consent-layer-unheralded": {
    what: "Un banner de cookies del que nunca se avisa al lector de pantalla. No tiene rol de diálogo ni nombre, y la tecla Tab nunca llega a él.",
    ask: "Pida a su equipo de desarrollo que marque el banner como diálogo, le dé un nombre como «Ajustes de cookies» y lleve el foco del teclado a él cuando se abra.",
  },
  "consent-trap-unnamed": {
    what: "La tecla Tab se queda dentro del banner de cookies, pero el banner nunca dice qué es. Quien usa un lector de pantalla queda atrapado en algo sin nombre.",
    ask: "Pida a su equipo de desarrollo que marque el banner como diálogo y le dé un nombre, como «Ajustes de cookies».",
  },
  "interaction-motion-actuation": {
    what: "La página responde a inclinar o agitar el teléfono. Quien lo tiene en un soporte, o a quien le tiemblan las manos, no puede hacerlo.",
    ask: "Pregunte a su equipo de desarrollo si toda acción de inclinar o agitar se puede hacer también pulsando algo en pantalla. Después pregunte si la respuesta al movimiento se puede apagar, para que una mano que tiembla no la dispare sin querer.",
  },
  "interaction-gesture-listeners": {
    what: "La página espera deslizamientos o arrastres. Las personas con temblor, o que usan control por voz o por pulsador, quizá no puedan hacerlos.",
    ask: "Pruebe cada carrusel, control deslizante o mapa solo con toques sueltos. Lo que necesite deslizar o arrastrar también necesita un botón, como flechas junto a un carrusel.",
  },
  "interaction-key-shortcuts": {
    what: "La página vigila las pulsaciones de teclas en toda la pantalla. Cuando una letra suelta es un atajo, quien habla a su ordenador lo dispara al hablar.",
    ask: "Pregunte a su equipo de desarrollo si algún atajo es una sola letra o un solo número. Cada uno tiene que poder apagarse, cambiarse, o funcionar solo mientras el control tenga el foco.",
  },
  "interaction-unmarked-language": {
    what: "Pasajes escritos en un alfabeto distinto del resto de la página, sin nada que marque en qué idioma están. El lector de pantalla los lee con la pronunciación equivocada, y pueden volverse ininteligibles.",
    ask: "Pida a su equipo de desarrollo que marque cada pasaje con su idioma. Solo un cambio de alfabeto se puede detectar automáticamente, así que pregunte también por los pasajes en otro idioma con el mismo alfabeto que la página.",
  },
  "interaction-title-tooltip": {
    what: "Información emergente que solo aparece al pasar el ratón por encima. Quien usa teclado o pantalla táctil nunca la ve, y desaparece al acercarse a ella.",
    ask: "Pase el ratón por cada una y léala. Si dice algo que un visitante necesita, ponga ese texto en la página, o pida a su equipo de desarrollo una que también se abra con el foco y se cierre con Escape.",
  },
  "interaction-orientation-lock": {
    what: "Los estilos de la página la giran de vuelta o la ocultan cuando se gira el móvil. Suele significar que está bloqueada en una orientación, salvo que una vista ancha sea solo para horizontal a propósito.",
    ask: "Abra la página en un móvil y gírelo en los dos sentidos. Todo debe seguir funcionando, para quien tiene el móvil fijo en una silla de ruedas o un soporte.",
  },
  "interaction-no-status-region": {
    what: "Nada en esta página está preparado para anunciar cambios sin recargar, como una lista filtrada o un mensaje de «Guardado». Un lector de pantalla calla mientras ocurren.",
    ask: "Pregunte a su equipo de desarrollo si aquí algo se actualiza sin recargar la página. Si es así, esa actualización necesita una región dinámica (live region) para que se diga además de verse.",
  },
  "interaction-acts-on-change": {
    what: "Menús o casillas cuyo código indica que actúan en cuanto se marcan, sin botón. No los probamos, porque podría hacerse un pedido real.",
    ask: "Pruebe cada uno en una copia de prueba del sitio. Si elegir una opción envía un formulario o lleva a otra página, añada un botón que lo haga o avise junto al control.",
  },
  "interaction-pointer-cancellation": {
    what: "Controles que actúan en cuanto se pulsan, y no al soltar. Si se pulsa uno por error, no hay forma de deslizar el dedo fuera y soltar.",
    ask: "Pida a su equipo de desarrollo que estos actúen al soltar. Quien tenga un resbalón, o quien tarde un momento en apuntar, puede entonces apartarse antes de levantar el dedo.",
  },
  "aria-valid-attr-value": {
    what: "Etiquetas del código que señalan otra parte de la página por su id. La comprobación no pudo confirmar que esa parte esté ahí.",
    ask: "Pida a su equipo de desarrollo que confirme que cada id nombrado por un atributo aria existe en la página y nunca se oculta ni se elimina.",
  },
  "aria-allowed-role": {
    what: "Elementos con un rol en el código, como botón o pestaña, que quizá no les corresponde. Si está mal depende de cómo se comportan.",
    ask: "Pida a su equipo de desarrollo que compruebe que cada uno funciona como promete su rol, también con teclado. Si no, que quite el rol y use el elemento nativo adecuado, como un botón real.",
  },
  "aria-prohibited-attr": {
    what: "Elementos con un nombre en el código que su tipo quizá no admite. Un lector de pantalla puede entonces ignorar ese nombre.",
    ask: "Pida a su equipo de desarrollo que compruebe que cada uno se lee con el nombre previsto. Si no, que pase el nombre a un elemento que pueda llevarlo.",
  },
  "css-orientation-lock": {
    what: "Estilos que quizá bloquean la página en vertical u horizontal. La comprobación que lo encontró aún es experimental, así que puede equivocarse.",
    ask: "Abra la página en un móvil y gírelo en los dos sentidos. Todo debe seguir funcionando, para quien tiene el móvil o la tableta fijos en una posición.",
  },
  "label-content-name-mismatch": {
    what: "Controles cuyo nombre en el código quizá no contiene las palabras que muestran. La comprobación no pudo decidirlo, casi siempre porque el control toma el nombre de su valor actual.",
    ask: "Pida a su equipo de desarrollo que compare lo que muestra cada uno con el nombre que lee un lector de pantalla. El nombre leído debe contener las palabras visibles, en el mismo orden.",
  },
  "duplicate-id-aria": {
    what: "Un id que puede estar usado más de una vez. Toda etiqueta de código que apunte a él sigue solo al primero, así que un nombre puede acabar pegado en silencio a lo que no era.",
    ask: "Pida a su equipo de desarrollo que haga único cada id de la página, empezando por los que menciona algún atributo aria.",
  },
};

export const PRINCIPLES_ES: Record<string, { principleLabel: string; plainTitle: string; plainDescription: string }> = {
  "1": {
    principleLabel: "Perceptible",
    plainTitle: "¿Se puede ver y oír?",
    plainDescription:
      "Texto demasiado claro, imágenes sin descripción, vídeo sin subtítulos, audio sin transcripción.",
  },
  "2": {
    principleLabel: "Operable",
    plainTitle: "¿Se puede usar?",
    plainDescription:
      "Si la gente puede recorrer su sitio con el teclado, en el móvil, con la voz o sin un control fino de las manos.",
  },
  "3": {
    principleLabel: "Comprensible",
    plainTitle: "¿Se puede seguir?",
    plainDescription:
      "Si sus palabras y su disposición tienen sentido, y si el sitio se comporta como la gente espera.",
  },
  "4": {
    principleLabel: "Robusto",
    plainTitle: "¿Va a seguir funcionando?",
    plainDescription:
      "Si su sitio funciona en otros navegadores, en otros dispositivos y con lectores de pantalla.",
  },
};

export const LEVEL_FRAMING_ES: Partial<Record<"A" | "AA" | "AAA", string>> = {
  A: "Requisito básico (nivel A)",
  AA: "Exigido por ley en casi todas partes (nivel AA)",
  AAA: "Avanzado (nivel AAA): buena idea, ni obligatorio ni puntuado",
};
