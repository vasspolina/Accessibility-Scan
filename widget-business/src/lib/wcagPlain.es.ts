/* Spanish report copy. Fallback is per KEY, not per language: a rule missing
   here renders in English rather than vanishing. Keys stay exactly as in the
   English source — only the values are translated. */
import type { PlainRule } from "./wcagPlain";

export const PLAIN_ES: Record<string, PlainRule> = {
  "timing-meta-refresh": {
    found: (n) => (n === 1 ? "La página se recarga sola, o salta a otra página, tras un tiempo fijo de espera. Nada ofrece una forma de detenerlo." : "{n} instrucciones del código recargan la página, o saltan a otra, tras un tiempo fijo de espera. Ninguna se puede detener.".replace("{n}", String(n))),
    plain: "La página se recarga sola",
    impact:
      "Quien siga leyendo, o esté a mitad del formulario, vuelve al principio sin aviso. Leer despacio no es un defecto, y esto lo castiga.",
  },
  "aria-allowed-role": {
    plain: "Un rol que el elemento no puede tener",
    found: (n) =>
      `${n} ${n === 1 ? "elemento está etiquetado" : "elementos están etiquetados"} en el código como algo que no ${n === 1 ? "puede" : "pueden"} ser. Ese rol no corresponde a ese tipo de elemento.`,
    impact:
      "Los lectores de pantalla anuncian algo equivocado. A la gente se le dice que llegó a un botón cuando es un enlace, o a un encabezado cuando es una lista.",
  },
  "aria-allowed-attr": {
    plain: "Un ajuste de lector de pantalla en el elemento equivocado",
    found: (n) =>
      `${n} ${n === 1 ? "elemento lleva ajustes" : "elementos llevan ajustes"} que su tipo de elemento no puede tener. El navegador y el lector de pantalla no coinciden en qué ${n === 1 ? "es" : "son"}.`,
    impact: "Los lectores de pantalla pueden anunciar disparates, o saltarse el elemento entero.",
  },
  "aria-prohibited-attr": {
    plain: "Una etiqueta que los lectores de pantalla deben ignorar",
    found: (n) =>
      `${n} ${n === 1 ? "elemento lleva" : "elementos llevan"} un nombre que el código no permite en ese tipo de elemento. El nombre se tira en vez de leerse en voz alta.`,
    impact:
      "En su código el elemento parece nombrado, así que nadie nota nada raro. Los lectores de pantalla ignoran ese nombre y anuncian el texto que haya dentro, que a menudo no es nada.",
  },
  "aria-required-children": {
    plain: "Menús o listas sin sus elementos",
    found: (n) =>
      `${n} ${n === 1 ? "control está etiquetado en el código como menú o lista, pero no contiene" : "controles están etiquetados en el código como menús o listas, pero no contienen"} ninguno de los elementos que ${n === 1 ? "necesita" : "necesitan"}. Se ${n === 1 ? "anuncia" : "anuncian"} como si ${n === 1 ? "estuviera vacío" : "estuvieran vacíos"}.`,
    impact: "Los lectores de pantalla no pueden deducir su estructura, así que nadie puede recorrerla.",
  },
  "aria-required-parent": {
    plain: "Elemento de lista fuera de su lista",
    found: (n) =>
      `${n} ${n === 1 ? "elemento está etiquetado como pieza" : "elementos están etiquetados como piezas"} de un control mayor: una pestaña, una opción de menú, una opción de lista. ${n === 1 ? "No está" : "Ninguno está"} dentro del control al que ${n === 1 ? "pertenece" : "pertenecen"}.`,
    impact:
      "Una pestaña fuera de su barra de pestañas no es pestaña de nada. El lector de pantalla no puede decir cuál es ni de cuántas. Las flechas del teclado que sirven para moverse por estos controles no tienen por dónde moverse.",
  },
  "landmark-unique": {
    plain: "Dos zonas de la página con el mismo nombre",
    found: (n) =>
      `${n} ${n === 1 ? "región comparte su nombre con otra" : "regiones comparten su nombre con otras"}. La lista de regiones se lee como repeticiones, sin forma de distinguirlas.`,
    impact: "Quien usa un lector de pantalla recibe una lista de entradas idénticas y no puede distinguirlas.",
  },
  "landmark-no-duplicate-banner": {
    plain: "Más de una cabecera de página",
    found: () =>
      `La página marca más de una zona como su cabecera, así que la lista de regiones ofrece varias y ninguna es la cabecera.`,
    impact: "Los lectores de pantalla enumeran varias cabeceras, y nadie sabe cuál es la de verdad.",
  },
  "landmark-no-duplicate-contentinfo": {
    plain: "Más de un pie de página",
    found: () =>
      `La página marca más de una zona como su pie, así que no hay un único sitio al que ir a buscar el contacto o las condiciones.`,
    impact: "Los lectores de pantalla enumeran varios pies de página, y la gente no sabe cuál es cuál.",
  },
  "landmark-no-duplicate-main": {
    plain: "Más de un contenido principal",
    found: () =>
      `Más de una zona está marcada como contenido principal. "Ir al contenido principal" tiene que elegir una, y no puede saber cuál quería usted.`,
    impact: "La gente aterriza en la mitad equivocada de la página.",
  },
  "landmark-banner-is-top-level": {
    plain: "Cabecera metida dentro de otra zona",
    found: () =>
      `La cabecera está metida dentro de otra región en vez de al lado. No está donde la busca quien salta de una región a otra.`,
    impact: "Quien usa un lector de pantalla no puede saltar directo a ella como espera.",
  },
  "landmark-contentinfo-is-top-level": {
    plain: "Pie metido dentro de otra zona",
    found: () =>
      `El pie está metido dentro de otra región en vez de al lado. No está donde lo busca quien salta de una región a otra.`,
    impact: "Quien usa un lector de pantalla no puede saltar directo a él como espera.",
  },
  "skip-link": {
    plain: "El enlace de salto no lleva a ninguna parte",
    found: (n) =>
      `${n} ${n === 1 ? "enlace de salto apunta" : "enlaces de salto apuntan"} a algo que no está en la página, así que pulsar${n === 1 ? "lo" : "los"} no lleva a nadie a ningún sitio.`,
    impact:
      "Quien usa el teclado lo pulsa y se queda donde estaba, y luego recorre el menú entero con el tabulador igualmente.",
  },
  "component-skip-link-dead": {
    plain: "El enlace de salto no lleva a ninguna parte",
    found: (n) =>
      `${n} ${n === 1 ? "enlace de salto apunta" : "enlaces de salto apuntan"} a algo que no está en la página, así que pulsar${n === 1 ? "lo" : "los"} no lleva a nadie a ningún sitio.`,
    impact:
      "Quien usa el teclado lo pulsa y se queda donde estaba, y luego recorre el menú entero con el tabulador igualmente.",
  },
  "image-redundant-alt": {
    plain: "La descripción repite el texto de al lado",
    found: (n) =>
      `${n} ${n === 1 ? "imagen repite, en su texto alternativo, las palabras que ya están escritas a su lado" : "imágenes repiten, en su texto alternativo, las palabras que ya están escritas a su lado"}. El lector de pantalla dice lo mismo dos veces.`,
    impact: "Quien usa un lector de pantalla oye lo mismo dos veces, y pierde tiempo para nada.",
  },
  "color-contrast": {
    research:
      "WebAIM revisa un millón de páginas de inicio cada año. El texto con poco contraste es el fallo más común que encuentra, año tras año. Mucha más gente ve con menos nitidez de lo que suponen los monitores de un equipo de diseño.",
    plain: "Texto demasiado claro para leerlo",
    found: (n) =>
      `${n} ${n === 1 ? "texto de esta página está" : "textos de esta página están"} demasiado cerca en color del fondo que ${n === 1 ? "tiene" : "tienen"} detrás. ${n === 1 ? "Aparece" : "Cada uno aparece"} en Elementos afectados, y la versión técnica da la proporción medida.`,
    impact:
      "Cuesta leerlo con luz fuerte, en una pantalla barata o con la vista imperfecta. Su mensaje no llega.",
  },
  "image-alt": {
    research:
      "WebAIM revisa un millón de páginas de inicio cada año. Las imágenes sin descripción están entre los fallos más comunes que encuentra, año tras año. También es uno de los más sencillos de resolver.",
    plain: "Las imágenes no tienen descripción",
    found: (n) =>
      `${n} ${n === 1 ? "imagen no tiene" : "imágenes no tienen"} ningún texto alternativo, ni siquiera uno vacío que ${n === 1 ? "la marque" : "las marque"} como decorativa. El lector de pantalla acaba leyendo el nombre del archivo en voz alta, o ${n === 1 ? "la salta" : "las salta"} en silencio.`,
    impact:
      "Quien usa un lector de pantalla no oye nada de estas imágenes, y los buscadores no saben qué muestran. Le cuesta accesibilidad y posicionamiento.",
  },
  "svg-img-alt": {
    plain: "Los iconos no tienen descripción",
    found: (n) =>
      `${n} ${n === 1 ? "icono está marcado" : "iconos están marcados"} en el código como ${n === 1 ? "imagen" : "imágenes"}, pero no ${n === 1 ? "lleva" : "llevan"} palabras que digan qué ${n === 1 ? "muestra" : "muestran"}.`,
    impact:
      "A menudo el icono es la única etiqueta de un control: una lupa para buscar, una cesta para el carrito. El lector de pantalla llega y no tiene nada que anunciar.",
  },
  "input-image-alt": {
    plain: "Botón de imagen sin descripción",
    found: (n) =>
      `${n} ${n === 1 ? "imagen usada como botón no tiene" : "imágenes usadas como botón no tienen"} texto alternativo, así que no hay nada que anunciar ni nada que leer.`,
    impact: "Quien usa un lector de pantalla no sabe qué hace el botón, así que no puede terminar.",
  },
  "link-name": {
    research:
      "Los enlaces vacíos están entre los fallos más comunes de la revisión anual que WebAIM hace de un millón de páginas de inicio. Quien usa un lector de pantalla se mueve sacando una lista de enlaces. Un enlace vacío aparece en esa lista como la palabra \"enlace\" y nada más.",
    plain: "Enlaces sin texto legible",
    found: (n) =>
      `${n} ${n === 1 ? "enlace no tiene" : "enlaces no tienen"} texto legible dentro: ni palabras, ni nombre, nada que anunciar. ${n === 1 ? "Casi siempre es un icono, una flecha o una imagen usada como enlace." : "Casi siempre son iconos, flechas o imágenes usadas como enlace."} La imagen carga con el significado y el código no carga con nada.`,
    impact:
      "Quien usa un lector de pantalla suele sacar una lista con todos los enlaces y elegir de ahí. Un enlace sin texto aparece ahí como la palabra suelta \"enlace\". Varios así convierten la lista en \"enlace, enlace, enlace\".",
  },
  "link-text-vague": {
    found: (n) => (n === 1 ? "Un enlace solo dice algo como «leer más» o «aquí». Leído por sí solo, no dice adónde lleva." : "{n} enlaces solo dicen algo como «leer más» o «aquí». Leído por sí solo, ninguno dice adónde lleva.".replace("{n}", String(n))),
    plain: "Enlaces que solo dicen \"leer más\"",
    impact:
      "Quien usa un lector de pantalla puede sacar una lista con todos los enlaces de la página. Si todos dicen lo mismo, la lista no sirve de nada.",
  },
  "button-name": {
    research:
      "Los botones sin etiqueta están cerca de lo más alto de la revisión anual que WebAIM hace de un millón de páginas de inicio, año tras año. Suelen ser controles de solo icono, evidentes para quien los diseñó.",
    plain: "Los botones no tienen etiqueta",
    found: (n) =>
      `${n} ${n === 1 ? "botón no tiene" : "botones no tienen"} etiqueta de ningún tipo: ni palabras dentro ni nombre en el código. Casi siempre son botones de icono, donde el símbolo carga con el significado y el código no carga con nada.`,
    impact: "Nadie sabe qué hace antes de pulsarlo. Un motivo habitual de abandono.",
  },
  label: {
    research:
      "Los campos de formulario sin etiqueta están cerca de lo más alto de la revisión anual que WebAIM hace de un millón de páginas de inicio. En el estudio británico Click-Away Pound, la mayoría de los compradores que se topó con una barrera así se marchó sin decir nada. Se llevó su dinero a otra parte.",
    plain: "Los campos del formulario no tienen etiqueta",
    found: (n) =>
      `${n} ${n === 1 ? "campo del formulario no está unido" : "campos del formulario no están unidos"} a una etiqueta en el código. Las palabras pueden estar justo al lado del campo en pantalla, pero nada une las dos cosas. El lector de pantalla anuncia el campo sin saber para qué sirve.`,
    impact:
      "Quien usa un lector de pantalla no sabe qué va en cada casilla, así que abandona el formulario, y la compra con él.",
  },
  "select-name": {
    plain: "Un desplegable sin etiqueta",
    found: (n) =>
      `${n} ${n === 1 ? "desplegable no tiene" : "desplegables no tienen"} etiqueta en el código. Se ${n === 1 ? "anuncia" : "anuncian"} como una lista de opciones, sin nada que diga qué se está eligiendo.`,
    impact: "La gente no sabe qué está eligiendo. Vienen los errores y los formularios abandonados.",
  },
  "document-title": {
    plain: "La página no tiene título",
    found: () =>
      `La página no tiene título, así que la pestaña del navegador y el lector de pantalla recurren a la dirección.`,
    impact: "Las pestañas, los marcadores y los resultados de búsqueda no muestran nada útil.",
  },
  "html-has-lang": {
    research:
      "El idioma del documento sin declarar es uno de los pocos fallos que WebAIM encuentra en la mayor parte de la web. Sigue siendo común porque el fallo es silencioso: la página se ve bien, y solo quien la oye con la voz equivocada se topa con él.",
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
      `Los niveles de encabezado dan saltos en vez de avanzar uno a uno. En ${n} ${n === 1 ? "sitio" : "sitios"} se salta un nivel: un h2 seguido directamente de un h4, o parecido.`,
    impact: "La mayoría de quienes usan un lector de pantalla se mueve por los encabezados. Pierden el hilo.",
  },
  "page-has-heading-one": {
    plain: "No hay encabezado principal",
    found: () =>
      `La página no tiene encabezado de primer nivel, así que nada dice de qué trata.`,
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
      `${n} ${n === 1 ? "enlace dentro del texto corrido está marcado" : "enlaces dentro del texto corrido están marcados"} solo con color, sin subrayado. Quien no separa esos colores no ve ningún enlace ahí.`,
    impact: "Quien es daltónico no distingue un enlace del texto normal.",
  },
  "meta-viewport": {
    plain: "La ampliación está bloqueada",
    found: () => `La página bloquea la ampliación, así que quien necesita agrandarla en el móvil no puede.`,
    impact: "Quien necesita el texto más grande no puede tenerlo. En el móvil, simplemente se va.",
  },
  "meta-viewport-large": {
    plain: "Zoom limitado a un nivel fijo",
    found: () =>
      `Ampliar funciona, pero la página lo limita por debajo del 500%, y quien necesita el mayor aumento se queda en el tope.`,
    impact:
      "Más suave que bloquear la ampliación del todo, y falla a la misma gente. Quien necesita el texto muy grande llega al tope y no pasa de ahí.",
  },
  "frame-title": {
    plain: "Un marco incrustado sin título",
    found: (n) =>
      `${n} ${n === 1 ? "marco incrustado no tiene" : "marcos incrustados no tienen"} título, así que se ${n === 1 ? "anuncia" : "anuncian"} solo como "marco".`,
    impact: "Quien usa un lector de pantalla no sabe qué hay dentro, ni si le merece la pena.",
  },
  "duplicate-id-active": {
    plain: "Dos controles con el mismo id",
    found: (n) =>
      `${n} ${n === 1 ? "id se usa" : "ids se usan"} más de una vez en controles, así que las etiquetas y las referencias pueden apuntar al elemento equivocado.`,
    impact: "Los lectores de pantalla se confunden y responde lo que no toca cuando alguien pulsa.",
  },
  list: {
    plain: "Una lista que no está hecha como tal",
    found: (n) =>
      `${n} ${n === 1 ? "lista está construida" : "listas están construidas"} con algo que no son elementos de lista dentro. La agrupación existe en pantalla y no en el código.`,
    impact: "A quien usa un lector de pantalla no se le dice cuántos elementos hay, y no puede saltar de uno a otro.",
  },
  listitem: {
    plain: "Elementos de lista fuera de toda lista",
    found: (n) =>
      `${n} ${n === 1 ? "elemento de lista está" : "elementos de lista están"} fuera de cualquier lista. El lector de pantalla nunca anuncia cuántos hay ni dónde empieza el grupo.`,
    impact: "Quien usa un lector de pantalla pierde la agrupación, y el contenido deja de tener sentido.",
  },
  "aria-required-attr": {
    plain: "Un control sin un estado obligatorio",
    found: (n) =>
      `${n} ${n === 1 ? "control está etiquetado" : "controles están etiquetados"} como algo que tiene estado: marcado, desplegado, un valor en una escala. ${n === 1 ? "Nunca dice" : "Ninguno dice"} cuál es ese estado.`,
    impact: "Quien usa un lector de pantalla no sabe en qué estado está, ni cómo manejarlo.",
  },
  "aria-hidden-focus": {
    plain: "Elementos ocultos que aún reciben el foco",
    found: (n) =>
      `${n} ${n === 1 ? "elemento está oculto" : "elementos están ocultos"} para los lectores de pantalla y aun así se ${n === 1 ? "alcanza" : "alcanzan"} con el teclado. El foco aterriza en un sitio que no anuncia nada.`,
    impact: "Quien avanza con el tabulador aterriza en algo que su lector de pantalla no lee. La página parece rota.",
  },
  "aria-dialog-name": {
    plain: "Una ventana emergente sin nombre",
    found: (n) =>
      `${n} ${n === 1 ? "ventana emergente no tiene nada que la nombre, así que se anuncia" : "ventanas emergentes no tienen nada que las nombre, así que se anuncian"} como "diálogo" y nada más.`,
    impact:
      "Se anuncia como \"diálogo\" y nada más. Algo se ha adueñado de la pantalla y no hay forma de oír qué es.",
  },
  "nested-interactive": {
    plain: "Un control anidado dentro de otro",
    found: (n) =>
      `${n} ${n === 1 ? "control contiene otro control" : "controles contienen cada uno otro control"}. Lo que parece una sola cosa que pulsar son dos, una envuelta en la otra.`,
    impact:
      "Los lectores de pantalla anuncian el de fuera y esconden lo de dentro, así que el control interior queda fuera de alcance. Cuál de los dos se activa al pulsar o al teclear es una incógnita.",
  },
  "presentation-role-conflict": {
    plain: "Un control activo marcado como decoración",
    found: (n) =>
      `${n} ${n === 1 ? "elemento está marcado" : "elementos están marcados"} para que se ignore y aun así se ${n === 1 ? "alcanza y se usa" : "alcanzan y se usan"}. El código se contradice sobre si ${n === 1 ? "existe" : "existen"}.`,
    impact:
      "El código dice que se ignore y el elemento dice que se use. Los lectores de pantalla resuelven eso de formas distintas, así que hay quien nunca lo encuentra.",
  },
  region: {
    plain: "Zonas de la página sin nombre en el código",
    found: (n) =>
      `Parte de esta página queda fuera de cualquier zona con nombre. ${n} ${n === 1 ? "bloque de contenido no tiene" : "bloques de contenido no tienen"} cabecera, navegación, contenido principal ni pie alrededor.`,
    impact: "Quien usa un lector de pantalla no puede adelantar. Lo oye todo, cada vez.",
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
      `${n} ${n === 1 ? "elemento usa" : "elementos usan"} un tabindex positivo. Eso ${n === 1 ? "lo empuja" : "los empuja"} al principio del orden de tabulación, ${n === 1 ? "esté donde esté" : "estén donde estén"} en la página.`,
    impact: "Quien no puede usar el ratón acaba dando tumbos por la página.",
  },
  "scrollable-region-focusable": {
    plain: "Zona desplazable fuera del alcance del teclado",
    found: (n) =>
      `${n} ${n === 1 ? "zona se desplaza" : "zonas se desplazan"} pero no se ${n === 1 ? "alcanza" : "alcanzan"} con el teclado. Lo que ha quedado fuera de vista es inalcanzable sin ratón.`,
    impact: "Sin ratón, no se puede desplazar para ver lo que hay dentro.",
  },

  "keyboard-mouse-only": {
    found: (n) => (n === 1 ? "Un control responde a un clic, pero no al teclado. El tabulador no llega hasta él, o Intro y la barra espaciadora no hacen nada." : "{n} controles responden a un clic, pero no al teclado. El tabulador no llega hasta ellos, o Intro y la barra espaciadora no hacen nada.".replace("{n}", String(n))),
    research:
      "Décadas de investigación sobre usabilidad, buena parte del Nielsen Norman Group, llegan siempre a la misma conclusión. El acceso por teclado sirve tanto a quien domina el sistema como a quien no puede sostener un ratón.",
    plain: "Un control que el teclado no alcanza",
    impact:
      "Aquí no hay apaño que valga. Quien no puede usar el ratón no puede hacer lo que hace este control. Si es un botón de compra o un paso del formulario, la visita se acaba ahí.",
  },
  "keyboard-no-visible-focus": {
    found: (n) => (n === 1 ? "Al recorrer la página con el tabulador, hay controles que no cambian a la vista. Ni contorno ni resalte muestran dónde se está." : "{n} controles no cambian a la vista cuando el tabulador llega a ellos. Ni contorno ni resalte muestran dónde se está.".replace("{n}", String(n))),
    plain: "Nada muestra dónde está el teclado",
    impact:
      "Mucha gente no toca nunca un ratón. Sin un resalte visible navegan a ciegas, y acaban rindiéndose.",
  },
  "readability-dense-prose": {
    found: (n) => (n === 1 ? "El texto de esta página exige más o menos nivel universitario. Se mide por la longitud de frases y palabras." : "{n} textos de esta página exigen más o menos nivel universitario. Se mide por la longitud de frases y palabras.".replace("{n}", String(n))),
    plain: "El texto exige nivel universitario",
    impact:
      "No es una exigencia legal, y es el cambio de mayor alcance de este informe. Ayuda a las personas con discapacidad cognitiva y a quien lee en un segundo idioma. GOV.UK escribe para una edad lectora de unos nueve años, y no es un sitio sencillo.",
  },
  "typo-leading-for-measure": {
    found: (n) => (n === 1 ? "Hay texto en esta página con poco interlineado para la longitud de sus líneas y su tamaño de letra." : "{n} bloques de texto tienen poco interlineado para la longitud de sus líneas y su tamaño de letra.".replace("{n}", String(n))),
    plain: "Líneas demasiado juntas",
    impact:
      "El ojo no se desliza por la línea, salta. El salto más difícil es volver al principio de la siguiente. Cuanto más larga la línea, más fácil es caer en la equivocada.",
  },
  "reading-order-mismatch": {
    found: (n) => (n === 1 ? "En una fila de controles uno junto a otro, el tabulador no sigue el orden de la pantalla. El diseño los reordena, el código no." : "En {n} filas de controles uno junto a otro, el tabulador no sigue el orden de la pantalla. El diseño los reordena, el código no.".replace("{n}", String(n))),
    plain: "El orden de tabulación contradice el visible",
    impact:
      "La página movió cosas en pantalla sin moverlas en su propio código, y la tecla Tab sigue al código. En un par como Cancelar y Enviar, el botón que hay bajo el cursor no es aquel en el que está el teclado.",
  },

  "forced-colors-focus-lost": {
    found: (n) => (n === 1 ? "En varios controles, la marca del foco es solo una sombra o un cambio de color. Por eso desaparece en el modo de alto contraste de Windows." : "En {n} controles, la marca del foco es solo una sombra o un cambio de color. Por eso desaparece en el modo de alto contraste de Windows.".replace("{n}", String(n))),
    plain: "La marca del foco desaparece en Alto contraste",
    impact:
      "El modo de alto contraste quita las sombras y los colores con los que se dibuja la mayoría de los resaltes de foco. Quien más necesita ver dónde está no ve nada, en una página que parece perfecta hasta que ese modo se enciende.",
  },
  "forced-colors-icon-lost": {
    found: (n) => (n === 1 ? "Un control sin texto es solo una imagen de fondo. En el modo de alto contraste de Windows la imagen desaparece y queda una caja vacía." : "{n} controles sin texto son solo una imagen de fondo. En el modo de alto contraste de Windows la imagen desaparece y quedan cajas vacías.".replace("{n}", String(n))),
    plain: "El botón de icono desaparece en Alto contraste",
    impact:
      "El icono está dibujado como imagen de fondo, y ese modo quita las imágenes de fondo. El botón sigue funcionando, pero se dibuja como una caja vacía: sin dibujo, sin etiqueta, sin nada que indique que es un botón.",
  },
  "keyboard-faint-focus": {
    found: (n) => (n === 1 ? "En varios controles, el contorno que marca el foco del teclado es demasiado tenue. Su contraste con el fondo no llega a 3:1, el mínimo que piden las WCAG." : "En {n} controles, el contorno que marca el foco del teclado es demasiado tenue. Su contraste con el fondo no llega a 3:1, el mínimo que piden las WCAG.".replace("{n}", String(n))),
    plain: "La marca del teclado apenas se ve",
    impact:
      "El tabulador mueve un cursor invisible, y el contorno es lo único que muestra hasta dónde ha llegado. Si es demasiado tenue, quien usa el teclado no sabe qué está a punto de activar. Se cuela en las pruebas porque contorno sí que hay.",
  },
  "keyboard-focus-trap": {
    found: (n) => (n === 1 ? "En un punto, el foco se queda atascado al pulsar el tabulador. Se queda en un elemento o va y viene entre dos, y no llega al resto de la página." : "En {n} puntos, el foco se queda atascado al pulsar el tabulador. Se queda en un elemento o va y viene entre dos, y no llega al resto de la página.".replace("{n}", String(n))),
    plain: "El foco del teclado se queda atrapado",
    impact:
      "Quien llega hasta aquí con el teclado no puede seguir. Uno de los peores fallos que puede tener un sitio.",
  },

  // Las comprobaciones de nombres para lectores de pantalla. Cada una es una
  // tarjeta agrupada cuyo recuento está en la descripción del backend, así
  // que no llevan found().
  "sr-filename-alt": {
    found: (n) => (n === 1 ? "Al menos una imagen lleva su nombre de archivo como descripción. El lector de pantalla lee cifras y signos, no lo que muestra la imagen." : "{n} imágenes llevan su nombre de archivo como descripción. El lector de pantalla lee cifras y signos, no lo que muestran.".replace("{n}", String(n))),
    plain: "Imágenes descritas con su nombre de archivo",
    impact:
      "El lector de pantalla lee el nombre del archivo en voz alta, con cifras y signos incluidos. El visitante oye ruido donde debería estar el sentido de la imagen.",
  },
  "sr-vague-link-name": {
    found: (n) => (n === 1 ? "Al menos un enlace se anuncia solo con un símbolo como «→» o con una dirección web a secas. Un símbolo no dice adónde lleva, y una dirección se oye como una ristra de letras y signos." : "{n} enlaces se anuncian solo con un símbolo como «→» o con una dirección web a secas. Un símbolo no dice adónde lleva, y una dirección se oye como una ristra de letras y signos.".replace("{n}", String(n))),
    plain: "Enlaces llamados «haga clic aquí»",
    impact:
      "Quien usa un lector de pantalla saca todos los enlaces en una lista. Una lista de «haga clic aquí» y «leer más» no le da nada para elegir.",
  },
  "sr-symbol-button-name": {
    found: (n) => (n === 1 ? "Al menos un botón tiene por nombre solo un símbolo como «×» o «>», sin ninguna palabra." : "{n} botones tienen por nombre solo un símbolo como «×» o «>», sin ninguna palabra.".replace("{n}", String(n))),
    plain: "Botones con solo un símbolo por nombre",
    impact:
      "El lector de pantalla anuncia el símbolo o nada en absoluto. Quien escucha no puede saber qué hace el botón al pulsarlo.",
  },
  "sr-vague-button-name": {
    found: (n) => (n === 1 ? "Al menos un botón solo tiene un nombre genérico como «More» o «Go». Ese nombre no dice qué hace." : "{n} botones solo tienen nombres genéricos como «More» o «Go». Esos nombres no dicen qué hacen.".replace("{n}", String(n))),
    plain: "Nombres de botón que no dicen nada",
    impact:
      "Quien puede ver encuentra la × en la esquina y lo entiende. Quien escucha oye «por, botón», sin una esquina en la que apoyarse.",
  },
  "form-field-placeholder-label": {
    found: (n) => (n === 1 ? "Al menos un campo del formulario solo tiene como etiqueta su texto de ejemplo. No hay otra etiqueta ni al lado ni en el código." : "{n} campos del formulario solo tienen como etiqueta su texto de ejemplo. No hay otra etiqueta ni al lado ni en el código.".replace("{n}", String(n))),
    plain: "Campos etiquetados solo con texto de ejemplo",
    impact:
      "La pista desaparece en cuanto alguien escribe. Quien se para a medio formulario vuelve a unas casillas llenas sin poder comprobar qué va en cada una.",
  },
  "component-form-autocomplete": {
    found: (n) => (n === 1 ? "Al menos un campo de datos personales, como el nombre o el correo, no indica al navegador qué pide. Navegadores y gestores de contraseñas tienen que adivinarlo." : "{n} campos de datos personales, como el nombre o el correo, no indican al navegador qué piden. Navegadores y gestores de contraseñas tienen que adivinarlo.".replace("{n}", String(n))),
    plain: "Los campos impiden el autorrelleno",
    impact:
      "Todo el mundo vuelve a escribir a mano su nombre, su correo y su dirección. Lento para todos, y una barrera real para algunos.",
  },
  "component-input-type": {
    found: (n) => (n === 1 ? "Al menos un campo que parece pedir un correo o un teléfono no está definido como tal en el código." : "{n} campos que parecen pedir un correo o un teléfono no están definidos como tales en el código.".replace("{n}", String(n))),
    plain: "Campos de correo definidos como texto simple",
    impact:
      "En el móvil, la gente recibe el teclado genérico en vez de uno con \"@\" o con teclas numéricas. Más toques y más errores.",
  },
  "component-required-cue": {
    found: (n) => (n === 1 ? "Al menos un campo obligatorio solo está marcado como tal en el código. Su etiqueta no dice «obligatorio» ni lleva asterisco." : "{n} campos obligatorios solo están marcados como tales en el código. Sus etiquetas no dicen «obligatorio» ni llevan asterisco.".replace("{n}", String(n))),
    plain: "Los campos obligatorios no se ven marcados",
    impact:
      "Nadie sabe que un campo era obligatorio hasta que el formulario lo rechaza. Los registros fallan.",
  },
  "component-submit-clarity": {
    found: (n) => (n === 1 ? "Un formulario parece no tener ningún botón con un nombre claro como «Enviar» o «Registrarse»." : "{n} formularios parecen no tener ningún botón con un nombre claro como «Enviar» o «Registrarse».".replace("{n}", String(n))),
    plain: "Ningún botón de envío bien etiquetado",
    impact:
      "Un botón que solo dice \"Ir\", que muestra solo un icono o que ni siquiera está deja a la gente sin saber cómo terminar. Así que no terminan.",
  },
  "component-table-no-headers": {
    found: (n) => (n === 1 ? "Al menos una tabla con varias filas y columnas no tiene ni una sola celda de encabezado." : "{n} tablas con varias filas y columnas no tienen ni una sola celda de encabezado.".replace("{n}", String(n))),
    plain: "Una tabla sin celdas de encabezado",
    impact: "Un lector de pantalla lee cada celda como un valor suelto, sin el nombre de su columna o fila. Los números y palabras de la tabla pierden su sentido.",
  },
  "component-nav-labels": {
    found: (n) => (n === 1 ? "La página tiene varios menús de navegación, y al menos uno de ellos no tiene nombre." : "La página tiene varios menús de navegación, y {n} de ellos no tienen nombre.".replace("{n}", String(n))),
    plain: "Menús de navegación sin nombre",
    impact:
      "Quien usa un lector de pantalla oye \"navegación… navegación…\" sin forma de separar el menú principal de los enlaces del pie. Moverse por su sitio se vuelve una adivinanza.",
  },
  "component-skip-link": {
    found: (n) => (n === 1 ? "Entre los primeros enlaces de la página no hay ninguno para saltar al contenido." : "Entre los primeros enlaces de la página no hay ninguno para saltar al contenido. La comprobación lo ha señalado {n} veces.".replace("{n}", String(n))),
    plain: "No hay enlace para saltar al contenido",
    impact:
      "Quien usa el teclado recorre su menú entero en cada página. Decenas de pulsaciones de más en cada visita.",
  },

  "mobile-target-spacing": {
    plain: "Los botones están demasiado juntos",
    found: (n) =>
      `${n} ${n === 1 ? "par de controles está" : "pares de controles están"} a menos de 8px en ancho de móvil. Cada uno es bastante grande por separado; juntos no dejan margen para fallar.`,
    impact:
      "Un pulgar no es un cursor. Un dedo que apunta a un control y cae en el vecino pulsa o compra lo que no era. Quien tiene temblores o dedos más grandes se lo encuentra primero.",
  },
  "consent-blocks-reader": {
    plain: "El aviso de cookies bloquea los lectores de pantalla",
    found: () =>
      `La capa de consentimiento marca como oculta para los lectores de pantalla toda la página que queda detrás, y el foco del teclado nunca llega a la propia capa.`,
    impact:
      "Quien usa un lector de pantalla oye silencio donde debería estar la página. No puede leerla, y tampoco encuentra el aviso para quitarlo.",
  },
  "mobile-sticky-coverage": {
    plain: "Las barras fijas ahogan la pantalla del móvil",
    found: () =>
      `Las cabeceras, avisos o barras de herramientas fijas ocupan más de un tercio de la pantalla en ancho de móvil.`,
    impact:
      "Cada píxel fijo es uno por el que el visitante no puede leer la página. Lo que reciba el foco del teclado puede acabar escondido tras las barras. WCAG 2.2 ya lo exige exactamente así; la ley todavía no lo señala.",
  },
  "mobile-horizontal-scroll": {
    found: (n) => (n === 1 ? "En ancho de móvil, un elemento sobresale del borde de la pantalla. Toda la página se desplaza de lado." : "En ancho de móvil, {n} elementos sobresalen del borde de la pantalla. Toda la página se desplaza de lado.".replace("{n}", String(n))),
    plain: "La página se desplaza de lado en el móvil",
    impact:
      "La mayoría de los visitantes están en el móvil. Deslizar de lado para leer cada línea hace que se vayan.",
  },
  "mobile-tap-target": {
    found: (n) => (n === 1 ? "En ancho de móvil, una zona de pulsación mide menos de 24px de ancho o de alto. Otra está justo a su lado. Un toque que falla por poco cae fácilmente en la vecina." : "En ancho de móvil, {n} zonas de pulsación miden menos de 24px de ancho o de alto. Cada una tiene otra justo al lado. Un toque que falla por poco cae fácilmente en la vecina.".replace("{n}", String(n))),
    plain: "Zonas de pulsación demasiado pequeñas",
    impact:
      "Pulsaciones que fallan, y frustración. Peor con dedos grandes, temblores o pulso inseguro. Le cuesta ventas.",
  },

  "text-spacing-clipped": {
    found: (n) => (n === 1 ? "Al ampliar el espaciado entre líneas y letras, parte del texto de esta página se corta. Las palabras se salen del borde de su caja y desaparecen." : "{n} elementos cortan el texto al ampliar el espaciado entre líneas y letras. Las palabras se salen del borde de su caja y desaparecen.".replace("{n}", String(n))),
    plain: "El texto se corta con más espaciado",
    impact:
      "Mucha gente con dislexia amplía el espaciado solo para poder leer. Aquí las palabras no se reajustan. Desaparecen detrás de una caja fija.",
  },
  "text-zoom-clipped": {
    found: (n) => (n === 1 ? "Con la letra al doble de tamaño, esta página corta parte del texto. Las palabras se salen del borde de su caja y desaparecen." : "{n} elementos cortan el texto con la letra al doble de tamaño. Las palabras se salen del borde de su caja y desaparecen.".replace("{n}", String(n))),
    plain: "El texto se corta a tamaños mayores",
    impact:
      "Agrandar la letra es el remedio más común para la vista débil, mucho más que el lector de pantalla. Sus cajas no se mueven, así que las palabras se esfuman.",
  },
  "text-zoom-horizontal-scroll": {
    found: (n) => (n === 1 ? "Con la letra al doble de tamaño, la página se vuelve más ancha que la ventana. Para leer hay que desplazarse de lado." : "En {n} puntos, la página se sale de la ventana con la letra al doble de tamaño. Para leer hay que desplazarse de lado.".replace("{n}", String(n))),
    plain: "El texto ampliado se desplaza de lado",
    impact:
      "Cada línea le obliga a ir de lado. Eso agota, y la mayoría se rinde.",
  },

  "dark-consent-no-reject": {
    found: (n) => (n === 1 ? "El aviso de cookies tiene un botón para aceptar. Ninguno de sus botones rechaza directamente, ni siquiera como «Solo necesarias»." : "{n} avisos de cookies tienen un botón para aceptar. Ninguno de sus botones rechaza directamente, ni siquiera como «Solo necesarias».".replace("{n}", String(n))),
    plain: "Aviso de cookies sin opción de rechazar",
    impact:
      "Con el RGPD, rechazar tiene que ser tan fácil como aceptar. El consentimiento recogido así puede ser inválido. Los visitantes leen la falta de un botón \"Rechazar\" como una trampa.",
  },
  "dark-consent-asymmetry": {
    found: (n) => (n === 1 ? "En el aviso de cookies, el botón de aceptar tiene un fondo. El de rechazar no tiene fondo." : "En {n} avisos de cookies, el botón de aceptar tiene un fondo. El de rechazar no tiene fondo.".replace("{n}", String(n))),
    plain: "El aviso de cookies esconde el \"rechazar\"",
    impact:
      "Una opción como botón y la otra como texto suelto empuja a la gente a aceptar. Los reguladores buscan justo esto.",
  },
  "dark-preselected-optin": {
    found: (n) => (n === 1 ? "Una casilla de publicidad, boletín o cesión de datos ya viene marcada antes de que el visitante elija." : "{n} casillas de publicidad, boletín o cesión de datos ya vienen marcadas antes de que el visitante elija.".replace("{n}", String(n))),
    plain: "Casilla de publicidad marcada de antemano",
    impact:
      "El RGPD dice que una casilla premarcada no es consentimiento. Quien no se dé cuenta se siente apuntado sin haber aceptado.",
  },
  "dark-confirmshaming": {
    found: (n) => (n === 1 ? "Un botón para rechazar está redactado en primera persona. Así, rechazar puede sonar a confesión." : "{n} botones para rechazar están redactados en primera persona. Así, rechazar puede sonar a confesión.".replace("{n}", String(n))),
    plain: "El \"no, gracias\" redactado para avergonzar",
    impact:
      "\"No, gracias, no quiero ahorrar dinero\" se recuerda por los motivos equivocados. Se lee como manipulación.",
  },
  "dark-fake-scarcity": {
    found: (n) => (n === 1 ? "Un aviso de esta página anuncia pocas existencias o mucha demanda. Quien lo lee no puede comprobar si es cierto." : "{n} avisos de esta página anuncian pocas existencias o mucha demanda. Quien los lee no puede comprobar si son ciertos.".replace("{n}", String(n))),
    plain: "Avisos de pocas existencias como presión",
    impact:
      "Los reguladores persiguen la escasez falsa. Los compradores han aprendido a desconfiar. Los números inventados cuestan más ventas de las que ganan.",
  },
  "dark-fake-urgency": {
    found: (n) => (n === 1 ? "Un mensaje de esta página mete prisa, pero no da ninguna fecha. Quien lo lee no puede comprobar si el plazo es real." : "{n} mensajes de esta página meten prisa, pero no dan ninguna fecha. Quien los lee no puede comprobar si los plazos son reales.".replace("{n}", String(n))),
    plain: "Plazos usados como presión",
    impact:
      "Las cuentas atrás que se reinician al recargar son una práctica engañosa. En cuanto se nota, nada más de lo que usted diga se cree.",
  },

  "dialog-close-unlabeled": {
    found: (n) => (n === 1 ? "En al menos una ventana emergente, el botón de cerrar es solo una cruz, sin nombre en el código. Un lector de pantalla no puede anunciar que cierra." : "En {n} ventanas emergentes, el botón de cerrar es solo una cruz, sin nombre en el código. Un lector de pantalla no puede anunciar que cierra.".replace("{n}", String(n))),
    plain: "Botón de cerrar sin etiqueta",
    impact:
      "Quien usa un lector de pantalla solo oye \"botón\" y no sabe cómo cerrar la ventana emergente. Le deja atrapado, y muchos se irán de su sitio sin más.",
  },
  "dialog-keyboard-trap": {
    found: (n) => (n === 1 ? "Una ventana emergente no deja salir con el teclado. Escape no la cierra, y tras quince pulsaciones del tabulador el foco sigue dentro." : "{n} ventanas emergentes no dejan salir con el teclado. Escape no las cierra, y tras quince pulsaciones del tabulador el foco sigue dentro.".replace("{n}", String(n))),
    plain: "Una ventana emergente atrapa el teclado",
    impact:
      "Quien solo usa el teclado llega a esta ventana y se para. Escape no la cierra, y el tabulador solo da vueltas dentro. Cerrar la pestaña es la única salida. En un aviso de cookies, eso pasa antes de haber visto nada.",
  },
  "dialog-no-escape": {
    found: (n) => (n === 1 ? "Una ventana emergente siguió abierta al pulsar Escape. Con el tabulador sí se puede salir de ella." : "{n} ventanas emergentes siguieron abiertas al pulsar Escape. Con el tabulador sí se puede salir de ellas.".replace("{n}", String(n))),
    plain: "La ventana emergente ignora la tecla Escape",
    impact:
      "Escape es la tecla que todo el mundo prueba primero. Aquí nadie se queda atrapado, porque aún se puede salir con el tabulador. Pero todos los que usan el teclado la prueban, y no pasa nada.",
  },
  "dialog-focus-not-moved": {
    found: (n) => (n === 1 ? "Apareció una ventana emergente, pero el foco del teclado no entró en ella. Se quedó fuera, en la página." : "Aparecieron {n} ventanas emergentes, pero el foco del teclado no entró en ninguna. Se quedó fuera, en la página.".replace("{n}", String(n))),
    plain: "La ventana emergente se abre sin tomar el foco",
    impact:
      "A quien usa un lector de pantalla nunca se le dice que se ha abierto. Quien usa el teclado tiene que recorrer con el tabulador toda la página de debajo antes de llegar a lo que ahora le tapa la pantalla.",
  },
  "dialog-focus-lost-on-close": {
    found: (n) => (n === 1 ? "Una ventana emergente se cerró con Escape, pero después el foco no quedó en ningún elemento. Volvió a la página en su conjunto." : "{n} ventanas emergentes se cerraron con Escape, pero después el foco no quedó en ningún elemento. Volvió a la página en su conjunto.".replace("{n}", String(n))),
    plain: "Cerrar la ventana emergente le pierde el sitio",
    impact:
      "Quien había avanzado con el tabulador hasta la mitad tiene que empezar otra vez desde el principio.",
  },
  "dialog-no-close": {
    found: (n) => (n === 1 ? "Al menos una ventana emergente no tiene un botón de cerrar reconocible. Ningún botón dentro lleva una palabra como «Cerrar» ni una cruz." : "{n} ventanas emergentes no tienen un botón de cerrar reconocible. Ningún botón dentro lleva una palabra como «Cerrar» ni una cruz.".replace("{n}", String(n))),
    plain: "No hay un botón de cerrar claro",
    impact:
      "Si pulsar fuera es la única salida, quien usa el teclado se queda atrapado detrás.",
  },
  "dialog-missing-role": {
    found: (n) => (n === 1 ? "Al menos una capa se superpone a la página como una ventana emergente. El código no la marca como diálogo." : "{n} capas se superponen a la página como ventanas emergentes. El código no las marca como diálogo.".replace("{n}", String(n))),
    plain: "La capa superpuesta no está marcada como diálogo",
    impact:
      "Los lectores de pantalla no anuncian que se ha abierto, y la gente pasa con el tabulador a la página escondida de detrás.",
  },
  "dialog-missing-name": {
    found: (n) => (n === 1 ? "Al menos una ventana emergente no tiene nombre en el código. Por eso un lector de pantalla no tiene ningún título que anunciar." : "{n} ventanas emergentes no tienen nombre en el código. Un lector de pantalla no encuentra ningún título que anunciar.".replace("{n}", String(n))),
    plain: "La ventana emergente no dice para qué es",
    impact:
      "Al abrirse, el lector de pantalla solo dice \"diálogo\". El visitante no tiene ni idea de qué le pide ni por qué.",
  },

  "markup-validation": {
    found: (n) => (n === 1 ? "Un validador indica que el código fuente de esta página no es HTML válido." : "Un validador señala {n} puntos en los que el código fuente de esta página no es HTML válido.".replace("{n}", String(n))),
    plain: "HTML no válido en la página",
    impact:
      "Los navegadores adivinan en silencio cómo arreglarlo, y cada uno adivina distinto. Su página puede no funcionar como usted cree.",
  },

  "motion-marquee": {
    found: (n) => (n === 1 ? "Hay texto en movimiento que cruza la página como un rótulo de noticias. Usa el elemento HTML obsoleto «marquee», que no trae ninguna pausa." : "En {n} lugares hay texto en movimiento que cruza la página como un rótulo de noticias. Usa el elemento HTML obsoleto «marquee», que no trae ninguna pausa.".replace("{n}", String(n))),
    plain: "Texto en movimiento que no se puede parar",
    impact:
      "El texto que se mueve cuesta de leer a cualquiera. Para quien tiene problemas de atención o de equilibrio, es inservible.",
  },
  "motion-autoplay-media": {
    found: (n) => (n === 1 ? "Al menos un vídeo está configurado para reproducirse solo. Tiene desactivada la barra de control integrada para pararlo." : "{n} vídeos están configurados para reproducirse solos. Tienen desactivada la barra de control integrada para pararlos.".replace("{n}", String(n))),
    plain: "El audio o el vídeo se reproducen solos",
    impact:
      "Nadie puede pararlo. Desorienta, y tapa a los lectores de pantalla.",
  },
  "motion-infinite-no-reduced-motion": {
    found: (n) => (n === 1 ? "Al menos una animación se repite sin fin. El diseño de la página no la detiene cuando alguien activa el ajuste de movimiento reducido." : "{n} animaciones se repiten sin fin. El diseño de la página no las detiene cuando alguien activa el ajuste de movimiento reducido.".replace("{n}", String(n))),
    plain: "La animación ignora el ajuste de movimiento reducido",
    impact:
      "El movimiento perpetuo aparta la atención de su contenido. A quien tiene trastornos del equilibrio puede provocarle mareo o náuseas.",
  },

  "typo-caps-letterspacing": {
    found: (n) => (n === 1 ? "Hay texto en mayúsculas con poco o ningún espacio extra entre las letras." : "En {n} lugares hay texto en mayúsculas con poco o ningún espacio extra entre las letras.".replace("{n}", String(n))),
    plain: "Mayúsculas sin espacio entre letras",
    impact:
      "Las mayúsculas forman bloques uniformes; sin un poco de espacio de más entre ellas, los titulares y las etiquetas cuestan de recorrer con la vista.",
  },
  "typo-lowercase-letterspaced": {
    found: (n) => (n === 1 ? "Parte del texto corrido tiene espacio de más forzado entre las minúsculas." : "{n} bloques de texto corrido tienen espacio de más forzado entre las minúsculas.".replace("{n}", String(n))),
    plain: "Espacio forzado entre las letras",
    impact:
      "El espacio de más entre minúsculas rompe la forma de palabra que la gente reconoce, y eso frena a cualquiera.",
  },
  "typo-negative-letterspacing": {
    found: (n) => (n === 1 ? "En esta página hay texto con las letras más juntas de lo que prevé la tipografía. Pueden llegar a tocarse." : "En {n} lugares de esta página hay texto con las letras más juntas de lo que prevé la tipografía. Pueden llegar a tocarse.".replace("{n}", String(n))),
    plain: "Letras apretadas hasta tocarse",
    impact: "Las letras apretadas se emborronan unas con otras. Sobre todo en tamaños pequeños o para quien ve poco.",
  },
  "typo-line-length-long": {
    found: (n) => (n === 1 ? "En esta página hay texto de lectura con líneas de más de 90 caracteres de media." : "En {n} lugares de esta página hay texto de lectura con líneas de más de 90 caracteres de media.".replace("{n}", String(n))),
    plain: "Las líneas son demasiado largas",
    impact:
      "Pasados unos 75 caracteres por línea, el ojo pierde el sitio al volver.",
  },
  "typo-line-length-short": {
    found: (n) => (n === 1 ? "En esta página hay texto de lectura con líneas de menos de 25 caracteres de media." : "En {n} lugares de esta página hay texto de lectura con líneas de menos de 25 caracteres de media.".replace("{n}", String(n))),
    plain: "Las líneas se cortan demasiado",
    impact: "Cuando casi cada frase salta a una línea nueva, el ritmo de lectura se rompe. El contenido parece más difícil de lo que es.",
  },
  "typo-justified-no-hyphens": {
    found: (n) => (n === 1 ? "En esta página hay texto de lectura justificado, sin partición automática de palabras. Para llenar cada línea, el navegador estira los espacios entre palabras." : "En {n} lugares de esta página hay texto de lectura justificado, sin partición automática de palabras. Para llenar cada línea, el navegador estira los espacios entre palabras.".replace("{n}", String(n))),
    plain: "Texto justificado sin partición de palabras",
    impact:
      "El texto justificado estira los espacios entre palabras para llenar cada línea. Los huecos desiguales forman \"ríos\" de blanco que distraen a lo largo de la página.",
  },
  "typo-font-size-small": {
    found: (n) => (n === 1 ? "En esta página hay texto de lectura de menos de 13px." : "En {n} lugares de esta página hay texto de lectura de menos de 13px.".replace("{n}", String(n))),
    plain: "Texto de lectura muy pequeño",
    impact: "El texto pequeño aparta a quien lee en el móvil, con poca luz o con una vista que no es perfecta.",
  },
  "typo-typeface-count": {
    found: (n) => (n === 1 ? "El diseño de esta página usa más de cuatro tipografías distintas para el texto." : "El diseño de esta página usa más de cuatro tipografías distintas para el texto. La comprobación lo ha señalado {n} veces.".replace("{n}", String(n))),
    plain: "Demasiadas tipografías",
    impact: "Más de dos o tres tipografías se ve recargado y hace que la página parezca menos fiable.",
  },

  "typo-underline-nonlink": {
    found: (n) => (n === 1 ? "En esta página hay texto subrayado que no es un enlace." : "En {n} lugares de esta página hay texto subrayado que no es un enlace.".replace("{n}", String(n))),
    plain: "Texto subrayado que no es un enlace",
    impact:
      "El subrayado se lee como enlace, así que la gente pulsa texto que no lleva a ninguna parte.",
  },
  "typo-italic-body": {
    found: (n) => (n === 1 ? "En esta página hay texto de lectura en cursiva por párrafos enteros, no solo en palabras sueltas." : "En {n} lugares hay texto de lectura en cursiva por párrafos enteros, no solo en palabras sueltas.".replace("{n}", String(n))),
    plain: "Pasajes enteros en cursiva",
    impact:
      "Las letras inclinadas cuestan pasadas unas pocas palabras. Una barrera real con dislexia o con la vista débil.",
  },
  "typo-allcaps-block": {
    found: (n) => (n === 1 ? "En esta página hay texto de lectura de 60 caracteres o más, todo en mayúsculas." : "En {n} lugares de esta página hay texto de lectura de 60 caracteres o más, todo en mayúsculas.".replace("{n}", String(n))),
    plain: "Pasajes largos EN MAYÚSCULAS",
    impact:
      "Las mayúsculas borran la forma de palabra con la que leemos. Lento y cansado, y peor para quien tiene dislexia.",
  },
  "typo-thin-weight": {
    found: (n) => (n === 1 ? "En esta página hay texto de lectura en un grosor muy fino: 200 o menos. Lo normal es 400." : "En {n} lugares de esta página hay texto de lectura en un grosor muy fino: 200 o menos. Lo normal es 400.".replace("{n}", String(n))),
    plain: "Texto de lectura en grosor finísimo",
    impact:
      "Los trazos finos se desvanecen en pantallas baratas, al sol y para la vista débil. Aunque el contraste apruebe.",
  },
  "nav-name-inconsistent": {
    plain: "El mismo enlace con nombres distintos",
    impact: "Quien aprendió un nombre tiene que averiguar que el otro es lo mismo. Quien busca la palabra de siempre en la lista de enlaces del lector de pantalla no la encuentra allí.",
    found: (n) => (n === 1 ? "Un enlace del menú cambia de nombre según la página analizada, aunque siempre lleva al mismo destino. No se contaron las diferencias solo de mayúsculas o espacios." : "{n} enlaces del menú cambian de nombre según la página analizada, aunque cada uno lleva al mismo destino. No se contaron las diferencias solo de mayúsculas o espacios.".replace("{n}", String(n))),
  },
  "nav-order-inconsistent": {
    plain: "El menú cambia de orden",
    impact: "Quien se guía por la posición, o contando pulsaciones del tabulador, acaba en la opción equivocada en otra página. Con una lupa de pantalla, que muestra solo un trozo, hay que recorrer el menú entero otra vez.",
    found: (n) => (n === 1 ? "Una página muestra los mismos enlaces del menú en un orden distinto al de la primera página analizada. Solo se compararon los enlaces que están en ambas páginas." : "{n} páginas muestran los mismos enlaces del menú en un orden distinto al de la primera página analizada. En cada caso solo se compararon los enlaces que están en ambas páginas.".replace("{n}", String(n))),
  },
  "keyboard-positive-tabindex-advisory": {
    plain: "Orden de tabulación fijado con números",
    impact: "Cada control que se añada después a la página se pone detrás de los numerados. Quien usa el teclado acaba saltando por la página en un orden que nadie eligió.",
    found: (n) => (n === 1 ? "Al menos un control tiene su lugar en el orden de tabulación fijado con un número. En lo que recorrió el análisis con el tabulador, el foco no saltó hacia atrás." : "{n} controles tienen su lugar en el orden de tabulación fijado con un número. En lo que recorrió el análisis con el tabulador, el foco no saltó hacia atrás.".replace("{n}", String(n))),
  },
  "activation-stale-state": {
    plain: "Un control anuncia el estado anterior",
    impact: "Quien usa un lector de pantalla oye «contraído» con el panel abierto, o «desactivado» con el interruptor encendido. Se le dice lo contrario de lo que hay en pantalla.",
    found: (n) => (n === 1 ? "Al menos un control reaccionó a la vista cuando el análisis lo activó. Pero el lector de pantalla sigue anunciando el estado anterior." : "Varios controles reaccionaron a la vista cuando el análisis los activó. Pero el lector de pantalla sigue anunciando el estado anterior.".replace("{n}", String(n))),
  },
  "control-faint-boundary": {
    plain: "Bordes de los controles demasiado tenues",
    impact: "Con poca vista, o a pleno sol, los bordes de las casillas desaparecen. Con ellos se pierde dónde hay que pulsar y escribir.",
    found: (n) => (n === 1 ? "Al menos un control tiene un borde demasiado tenue frente a lo que lo rodea. El análisis midió un contraste por debajo del mínimo de 3:1." : "Los bordes de {n} controles son demasiado tenues frente a lo que los rodea. El análisis midió un contraste por debajo del mínimo de 3:1.".replace("{n}", String(n))),
  },
};

export const FIXES_ES: Record<string, string | string[]> = {
  "keyboard-mouse-only": [
    "Conviértalo en un botón o un enlace de verdad, para que el teclado llegue a él como a todo lo demás.",
    "Compruébelo apartando el ratón y recorriendo la página con el tabulador.",
  ],
  "keyboard-faint-focus": [
    "Haga el contorno del teclado más oscuro y más grueso, para que destaque sobre la página que tiene detrás.",
    "Compruébelo sobre todos los fondos en los que caiga, no solo sobre los blancos.",
  ],
  "timing-meta-refresh": [
    "Quite la recarga automática de la página.",
    "Si tiene que actualizarse, ponga un botón y deje que la gente elija cuándo.",
  ],
  "aria-prohibited-attr": [
    "Ponga las palabras dentro del propio elemento, donde se van a leer.",
    "Cuando eso no se pueda, use un elemento hecho para llevar un nombre.",
  ],
  "aria-required-parent": [
    "Devuelva cada pieza al control al que pertenece.",
    "Una opción de menú suelta nunca se anuncia como parte de un menú.",
  ],
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
    "Parta los párrafos largos, y use encabezados y listas.",
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
    "Las palabras visibles pueden seguir siendo cortas. Su desarrollador puede añadir el nombre completo de forma invisible, solo para lectores de pantalla.",
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
  "component-input-type": [
    "Diga a la página qué campos llevan un correo y cuáles un teléfono.",
    "Los móviles muestran entonces el teclado adecuado en vez de uno normal.",
  ],
  "component-required-cue": [
    "Marque los campos obligatorios a la vista, no solo en el código.",
    "Con la palabra \"obligatorio\" junto a la etiqueta basta.",
  ],
  "component-submit-clarity":
    "Dé al formulario un solo botón bien etiquetado que diga lo que hace, como \"Enviar consulta\".",
  "component-table-no-headers": [
    "Marque la fila superior como celdas de encabezado, y también la primera columna si las filas tienen nombre.",
    "Si la tabla solo sirve para maquetar, márquela como tabla sin datos.",
  ],
  "component-nav-labels": [
    "Nombre cada menú por lo que contiene, como \"Menú principal\" o \"Enlaces del pie\".",
    "Varios menús sin nombre se anuncian igual, así que nadie los distingue.",
  ],
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
    "Deje que los contenedores crezcan cuando el lector agranda el texto.",
    "Revise la página con el texto al doble de su tamaño normal.",
  ],
  "text-zoom-horizontal-scroll": [
    "Deje que la página se reajuste cuando se agranda el texto, en vez de irse hacia el lado.",
    "Esto evita tener que desplazarse de lado por cada palabra de la línea.",
  ],
  "dark-consent-no-reject": "Ponga una opción de rechazar en el aviso de cookies, tan fácil de encontrar como la de aceptar.",
  "dark-consent-asymmetry": [
    "Dé a aceptar y a rechazar el mismo tamaño, el mismo estilo y la misma presencia.",
    "La elección solo es real cuando las dos opciones se ven igual de disponibles.",
  ],
  "dark-preselected-optin": [
    "Deje sin marcar las casillas de publicidad y de compartir datos.",
    "Deje que la gente se apunte por su cuenta, en vez de tener que darse de baja.",
  ],
  "dark-confirmshaming": "Redacte con claridad la opción de rechazo, como \"No, gracias\", sin nada que regañe.",
  "dark-fake-scarcity": [
    "Muestre cifras de existencias y de demanda solo donde sean ciertas y estén al día.",
    "Retire cualquier número que no salga de datos reales.",
  ],
  "dark-fake-urgency": [
    "Ponga cuentas atrás solo donde el plazo sea real.",
    "Retire cualquier temporizador que se reinicie al recargar la página.",
  ],
  "dialog-close-unlabeled": "Dé un nombre al botón de cerrar, para que se anuncie como \"Cerrar\" y no como una simple cruz.",
  "dialog-keyboard-trap": [
    "Deje que el tabulador dé vueltas dentro de la ventana emergente mientras esté abierta.",
    "Deje que Escape la cierre y devuelva a la página.",
  ],
  "dialog-no-escape": [
    "Deje que la tecla Escape cierre la ventana emergente.",
    "Es la primera tecla que la gente busca.",
  ],
  "dialog-focus-not-moved": "Lleve el cursor a la ventana emergente al abrirse, para que quien usa el teclado empiece dentro.",
  "dialog-focus-lost-on-close": [
    "Devuelva el cursor a lo que abrió la ventana emergente cuando esta se cierre.",
    "Si no, la gente vuelve arriba y tiene que buscar otra vez dónde estaba.",
  ],
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
  "markup-validation": [
    "Pase la página por el validador del W3C y limpie lo que le indique.",
    "El código roto es una adivinanza para los lectores de pantalla, y cada uno adivina distinto.",
  ],
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
  "typo-lowercase-letterspaced": [
    "Quite el espacio de más entre las letras del texto normal.",
    "Separa las palabras y frena la lectura.",
  ],
  "typo-negative-letterspacing": [
    "Deje de apretar las letras unas contra otras.",
    "Las letras que se tocan se leen como una sola forma.",
  ],
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
  "typo-italic-body": [
    "Componga los pasajes largos en redonda, y guarde la cursiva para una frase suelta.",
    "La cursiva cuesta más de leer en textos largos, sobre todo en pantalla.",
  ],
  "typo-allcaps-block": [
    "Componga los pasajes largos en minúsculas normales.",
    "Las mayúsculas quitan la forma de palabra con la que se lee, así que resérvelas para etiquetas cortas.",
  ],
  "typo-thin-weight": [
    "Componga el texto de lectura en un grosor normal.",
    "Los grosores finísimos desaparecen en pantallas corrientes y con luz fuerte.",
  ],

  "aria-allowed-role": [
    "Use un elemento que sea de verdad lo que dice ser.",
    "Un botón para un botón, un bloque de navegación para la navegación.",
  ],
  "aria-allowed-attr": "Quite los ajustes que no corresponden a este tipo de elemento, o cámbielo por uno al que sí correspondan.",
  "aria-required-children": [
    "Ponga dentro los elementos prometidos: una lista necesita elementos de lista, un menú necesita opciones de menú.",
    "Si el contenido no es realmente una lista ni un menú, quite esa marca del contenedor.",
  ],
  "landmark-unique": [
    "Nombre cada zona por lo que contiene, como \"Menú principal\" o \"Enlaces del pie\".",
    "Las zonas con el mismo nombre se anuncian igual, así que nadie las distingue.",
  ],
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
    "El texto normal necesita una proporción de contraste de al menos 4.5:1.",
    "El texto grande, de unos 24px o de 19px en negrita, necesita 3:1.",
  ],
  "image-alt": [
    "Escriba una descripción corta para cada imagen que tenga significado.",
    "Diga qué muestra, no que es una imagen.",
    "Deje la descripción vacía en las imágenes puramente decorativas.",
  ],
  "input-image-alt": "Describa qué hace el botón de imagen, como \"Buscar\", en vez de qué aspecto tiene.",
  "link-name": [
    "Ponga palabras legibles dentro de cada enlace.",
    "En un enlace de icono, añada un nombre que diga adónde lleva, no qué aspecto tiene.",
    "Cuando el enlace ya muestre palabras, conserve esas mismas palabras en el nombre.",
    "Quien maneja el sitio por voz dice lo que ve, así que los dos tienen que coincidir.",
  ],
  "link-text-vague": [
    "Escriba textos de enlace que se entiendan por sí solos.",
    "\"Lea los cambios de tarifas de 2026\" en vez de \"Leer más\".",
    "Para dejar la versión corta en pantalla, añada el texto completo como nombre.",
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
  "html-lang-valid": "Corrija el ajuste de idioma de la página a un código de idioma real, como el español o el alemán.",
  "heading-order": [
    "Use los encabezados en orden, sin saltarse ningún nivel.",
    "No pase de un encabezado de segundo nivel directamente a uno de cuarto.",
  ],
  "page-has-heading-one": "Añada un <h1> cerca de arriba que diga de qué trata la página.",
  "empty-heading": "Ponga texto en el encabezado, o quite la etiqueta de encabezado vacía.",
  "link-in-text-block": "Dé a los enlaces dentro del texto una segunda señal visual además del color, normalmente el subrayado.",
  "meta-viewport": "Quite el ajuste que bloquea la ampliación, para que la página crezca hasta donde el lector necesite.",
  "frame-title": "Dé a cada marco incrustado un nombre que diga qué contiene, como \"Mapa de la ubicación\".",
  "duplicate-id-active": "Haga único cada id de la página. Dos elementos no deben compartir ninguno.",
  list: [
    "Marque como listas las listas de verdad, con cada elemento dentro de la misma lista.",
    "Los lectores de pantalla anuncian entonces cuántos elementos hay.",
  ],
  listitem: "Ponga cada elemento de lista dentro de una lista, en vez de dejarlo suelto.",
  "aria-required-attr": [
    "Dé al control el estado que dice tener.",
    "Indique en el código si está marcado o sin marcar, abierto o cerrado.",
    "Un control que informa de un valor en una escala también debe indicar el valor.",
  ],
  "aria-hidden-focus": [
    "Lo que está oculto a los lectores de pantalla no debería alcanzarse con el teclado.",
    "O deja de esconderlo, o lo saca también del orden de tabulación.",
  ],
  region: [
    "Ponga cada parte de la página dentro de una zona con nombre: cabecera, navegación, contenido principal, pie.",
    "El contenido que queda fuera se lo salta quien va dando saltos de sección en sección.",
  ],
  "landmark-one-main": "Marque el contenido principal de la página como su zona principal, y use solo una por página.",
  tabindex: 'Quite los valores positivos de tabindex (tabindex="1" o mayores) y deje que el orden natural de la página fije el orden del foco.',
  "scrollable-region-focusable": 'Añada tabindex="0" al contenedor desplazable para que quien usa el teclado pueda desplazarlo.',
  "keyboard-positive-tabindex-advisory": "Pida a su desarrollador que quite los números que fijan a mano el orden de tabulación. Así el teclado sigue el orden de la página, también en todo lo que se añada después.",
  "nav-name-inconsistent": "Dé a cada enlace del menú un solo nombre, «Cesta» o «Carrito», y úselo en todas las páginas.",
  "nav-order-inconsistent": "Mantenga los enlaces del menú en el mismo orden en todas las páginas. Una página puede mostrar menos enlaces, pero los que tenga deben conservar su orden.",
  "activation-stale-state": "Haga que cada control anuncie su nuevo estado en cuanto cambie: desplegado o contraído, activado o desactivado. Su desarrollador lo hace en el mismo código que abre o acciona el control.",
  "control-faint-boundary": "Haga más visibles los bordes de campos y botones. Necesitan una proporción de contraste de al menos 3:1 con lo que tienen detrás. Su diseñador suele poder corregirlos todos con un solo cambio en el estilo común.",
};

export const UNDECIDED_ES: Record<string, { what: string; ask: string }> = {
  "color-contrast": {
    what: "Texto sobre una fotografía, un vídeo o un degradado. El comprobador puede leer el color del texto. No hay un solo color detrás con el que medirlo, así que no lo va a suponer.",
    ask: "Pida a su diseñador que mire cada caso sobre la imagen que tiene detrás, en su punto más claro y en el más oscuro. Donde las palabras se pierdan, hacen falta un panel sólido detrás, un velo oscuro sobre la imagen u otra posición.",
  },
  "link-in-text-block": {
    what: "Enlaces dentro de un párrafo que quizá estén marcados solo por su color. El comprobador no puede saber si la diferencia es lo bastante fuerte como para bastarse sola.",
    ask: "Pregunte a su diseñador si estos enlaces se siguen encontrando con el color quitado. Si el color es lo único que los marca, necesitan un subrayado u otra señal visible.",
  },
  "video-caption": {
    what: "Un vídeo que el comprobador ve y no puede mirar. No tiene forma de saber si hay subtítulos, ni si son buenos.",
    ask: "Pregunte a quien hizo el vídeo si lleva subtítulos y si una persona los corrigió. Los subtítulos automáticos por sí solos no cuentan.",
  },
  "media-video-captions": {
    what: "Vídeo en la página sin ningún archivo de subtítulos. Eso no prueba que los necesite: un clip mudo no necesita nada, y los subtítulos incrustados en la imagen cuentan pero no dejan archivo.",
    ask: "Pregunte a quien hizo cada vídeo si alguien habla en él. Donde alguien hable, hacen falta subtítulos corregidos por una persona. Los subtítulos automáticos por sí solos no cuentan.",
  },
  "media-video-descriptions": {
    what: "Vídeo con subtítulos y nada que describa lo que se ve en pantalla. Los subtítulos llevan las palabras; no llevan la imagen.",
    ask: "Pregunte si en estos vídeos algo se muestra en vez de decirse: un gráfico, una demostración, texto en pantalla. Si es así, el propio audio tiene que describirlo. Una versión escrita en la página cubre solo el nivel más bajo de la norma.",
  },
  "form-error-association": {
    what: "Mensajes de error de formulario que no están unidos a su campo en el código. El lector de pantalla anuncia el campo, pero no el error que está al lado.",
    ask: "Pida a su desarrollador que una cada mensaje con su campo mediante aria-describedby. Quien lee oye entonces el problema en el mismo momento en que oye el campo.",
  },
  "media-audio-transcript": {
    what: "Audio en la página. Una transcripción es texto normal de la página, así que el comprobador no tiene forma de saber si hay una.",
    ask: "Compruebe que cada grabación tiene sus palabras escritas en la página, cerca del reproductor, y que lo escrito recoge todo lo que se dice.",
  },
  "media-embedded-player": {
    what: "Vídeo reproducido con el reproductor de otra empresa. El vídeo vive en su sitio, así que el comprobador no puede mirar dentro.",
    ask: "Abra cada uno y active los subtítulos. Si falta la opción, o si los subtítulos están mal, arréglelos donde esté alojado el vídeo.",
  },
  "consent-layer-in-frame": {
    what: "La capa de consentimiento llega desde el sitio web de otra empresa, dentro de un marco. El análisis no puede entrar en ella para juzgar qué encuentra ahí un lector de pantalla.",
    ask: "Que alguien pruebe el aviso con un lector de pantalla. Pregunte si se anuncia, si el foco llega a él y si rechazar es tan fácil como aceptar.",
  },
  "consent-layer-unheralded": {
    what: "Una capa de cookies que nunca se presenta. No lleva rol de diálogo ni nombre, y el foco del teclado nunca llega a ella.",
    ask: "Que alguien pruebe la página con un lector de pantalla. Si la capa no se anuncia nunca, necesita un rol de diálogo, un nombre y que el foco entre en ella al abrirse.",
  },
  "consent-trap-unnamed": {
    what: "El foco del teclado se queda dentro de la capa de cookies, pero la capa nunca dice qué es. Ni rol de diálogo ni nombre.",
    ask: "Pida a su desarrollador que marque la capa como diálogo y le ponga nombre. Una trampa sin etiqueta deja a quien usa un lector de pantalla atrapado en algo sin nombre.",
  },
  "interaction-motion-actuation": {
    what: "La página responde a inclinar o agitar el teléfono. Quien lo tiene en un soporte, o a quien le tiemblan las manos, no puede hacerlo.",
    ask: "Pregunte a su desarrollador si toda acción de inclinar o agitar se puede hacer también pulsando algo en pantalla. Después pregunte si la respuesta al movimiento se puede apagar, para que una mano que tiembla no la dispare sin querer.",
  },
  "interaction-gesture-listeners": {
    what: "La página está atenta a los deslizamientos y los arrastres. Quien tiene temblor, o guía el puntero por voz o con un conmutador, quizá no pueda dibujarlos.",
    ask: "Pregunte a su desarrollador si todo deslizamiento o arrastre se puede hacer también pulsando: flechas junto a un carrusel, un botón junto a un control deslizante.",
  },
  "interaction-key-shortcuts": {
    what: "La página vigila las pulsaciones de teclas en toda la pantalla. Cuando una letra suelta es un atajo, quien habla a su ordenador lo dispara al hablar.",
    ask: "Pregunte a su desarrollador si algún atajo es una sola letra o un solo número. Cada uno tiene que poder apagarse, cambiarse, o funcionar solo mientras el control tenga el foco.",
  },
  "interaction-unmarked-language": {
    what: "Pasajes escritos en un alfabeto distinto del resto de la página, sin nada que marque en qué idioma están. El lector de pantalla los lee con la pronunciación equivocada, y pueden volverse ininteligibles.",
    ask: "Pida a su desarrollador que marque cada pasaje con su idioma. Solo el cambio de alfabeto se detecta solo, así que pregunte también por los pasajes en otro idioma que comparta nuestro alfabeto.",
  },
  "interaction-title-tooltip": {
    what: "Globos de ayuda hechos con el atributo title. Solo aparecen al pasar el ratón, así que quien usa el teclado o una pantalla táctil nunca los ve. Además no se pueden cerrar, y se esfuman si uno se acerca para terminar de leerlos.",
    ask: "Pregunte a su desarrollador si hay algo importante escondido ahí. Si lo hay, póngalo en la página, o haga un globo de ayuda que se quede quieto y se cierre con Escape.",
  },
  "interaction-orientation-lock": {
    what: "Aquí hay una hoja de estilos que gira la página de vuelta, o la esconde, cuando se voltea el teléfono. Esa es la forma de una página atada a una sola orientación. También puede ser una vista apaisada puesta a propósito para algo ancho.",
    ask: "Pregunte a su desarrollador si la página funciona en las dos posiciones. Quien lleva el teléfono fijado a una silla de ruedas o a un soporte no puede girarlo para acomodarse al sitio.",
  },
  "interaction-no-status-region": {
    what: "Las páginas se actualizan sin recargarse: un filtro acorta una lista, un formulario dice que se ha guardado. Nada en esta página está marcado como el sitio donde se dice ese cambio. El lector de pantalla calla mientras la página se mueve.",
    ask: "Pregunte a su desarrollador si aquí algo se actualiza sin recargar la página. Si es así, esa actualización necesita una región activa para que se diga además de verse.",
  },
  "interaction-acts-on-change": {
    what: "Menús o casillas que parecen actuar en cuanto se marcan, en vez de esperar a un botón. Esto lo leemos del código y no lo probamos: tocar los controles de su sitio en marcha podría cursar un pedido de verdad.",
    ask: "Pregunte a su desarrollador si elegir una opción aquí envía el formulario o mueve la página. Si lo hace, añada un botón que lo haga, o avise a la gente antes del control de que va a pasar.",
  },
  "interaction-pointer-cancellation": {
    what: "Controles que actúan en cuanto se pulsan, y no al soltar. Si se pulsa uno por error, no hay forma de deslizar el dedo fuera y soltar.",
    ask: "Pida a su desarrollador que estos actúen al soltar. Quien tenga un resbalón, o quien tarde un momento en apuntar, puede entonces apartarse antes de levantar el dedo.",
  },
  "aria-valid-attr-value": {
    what: "Etiquetas de código que apuntan a otra parte de la página. El comprobador no siempre puede saber si aquello a lo que apuntan está ahí de verdad.",
    ask: "Pida a su desarrollador que confirme que existe en la página cada id al que se refiere un atributo aria. Ninguno debería estar dentro de un bloque que se esconde o se quita.",
  },
  "aria-allowed-role": {
    what: "Partes de la página etiquetadas en el código como algo que quizá no puedan ser. Que esté mal o no depende de cómo se comporte el componente.",
    ask: "Pida a su desarrollador que confirme que cada uno se comporta como promete su rol, teclado incluido. Si no, quite el rol y use el elemento nativo.",
  },
  "aria-prohibited-attr": {
    what: "Un elemento que lleva un nombre que quizá el código no le deje conservar. Que sobreviva depende del rol del elemento.",
    ask: "Pida a su desarrollador que compruebe que cada uno se anuncia con el nombre que usted quería. Donde no sea así, mueva el nombre a un elemento al que se le permita llevarlo.",
  },
  "css-orientation-lock": {
    what: "Estilos que pueden atar la página a vertical o a apaisado. La comprobación que encontró esto es experimental, y por eso es una pregunta y no un hallazgo.",
    ask: "Pregunte a su desarrollador si la página gira con el dispositivo. Hay quien monta el teléfono, o la tableta de su silla de ruedas, en una sola orientación y no puede girarlo.",
  },
  "duplicate-id-aria": {
    what: "Un id que puede estar usado más de una vez. Toda etiqueta de código que apunte a él sigue solo al primero, así que un nombre puede acabar pegado en silencio a lo que no era.",
    ask: "Pida a su desarrollador que haga único cada id de la página, empezando por los que menciona algún atributo aria.",
  },
};

export const PRINCIPLES_ES: Record<string, { principleLabel: string; plainTitle: string; plainDescription: string }> = {
  "1": {
    principleLabel: "Perceptible",
    plainTitle: "¿Se puede ver y oír?",
    plainDescription:
      "Todo lo que la gente no puede ver ni oír: texto demasiado claro para leerlo, imágenes sin nada escrito sobre ellas, vídeo sin subtítulos y audio sin transcripción.",
  },
  "2": {
    principleLabel: "Operable",
    plainTitle: "¿Se puede usar?",
    plainDescription:
      "Si alguien puede recorrer de verdad su sitio, con el teclado en vez del ratón, en el móvil, con la voz, o sin un control fino de las manos.",
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
      "Si su sitio sigue funcionando bien en otros navegadores, en otros dispositivos y con los programas que usan los visitantes ciegos para leerlo en voz alta.",
  },
};

export const LEVEL_FRAMING_ES: Partial<Record<"A" | "AA" | "AAA", string>> = {
  A: "Requisito básico (nivel A)",
  AA: "Exigido por ley en casi todas partes (nivel AA)",
  AAA: "Avanzado (nivel AAA): buena idea, ni obligatorio ni puntuado",
};
