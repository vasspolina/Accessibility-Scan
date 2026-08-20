/* Spanish report copy. Fallback is per KEY, not per language: a rule missing
   here renders in English rather than vanishing. Keys stay exactly as in the
   English source — only the values are translated. */
import type { PlainRule } from "./wcagPlain";

export const PLAIN_ES: Record<string, PlainRule> = {
  "timing-meta-refresh": {
    plain: "La página se recarga sola",
    impact:
      "Quien siga leyendo, o esté a mitad del formulario, vuelve al principio sin aviso. Leer despacio no es un defecto, y esto lo castiga.",
  },
  "aria-allowed-role": {
    plain: "Elementos etiquetados como lo que no son",
    found: (n) =>
      `${n} ${n === 1 ? "elemento está etiquetado" : "elementos están etiquetados"} en el código como algo que no ${n === 1 ? "puede" : "pueden"} ser. Ese rol no corresponde a ese tipo de elemento.`,
    impact:
      "Los lectores de pantalla anuncian algo equivocado. A la gente se le dice que llegó a un botón cuando es un enlace, o a un encabezado cuando es una lista.",
  },
  "aria-allowed-attr": {
    plain: "Ajustes de código en el elemento equivocado",
    found: (n) =>
      `${n} ${n === 1 ? "elemento lleva ajustes" : "elementos llevan ajustes"} que su tipo de elemento no puede tener. El navegador y el lector de pantalla no coinciden en qué ${n === 1 ? "es" : "son"}.`,
    impact: "Los lectores de pantalla pueden anunciar disparates, o saltarse el elemento entero.",
  },
  "aria-prohibited-attr": {
    plain: "Un nombre que el código descarta",
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
    plain: "Piezas separadas de su control",
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
    plain: "La ampliación está limitada",
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
    plain: "Un control sin su estado",
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
    plain: "Un control dentro de otro",
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
    research:
      "Décadas de investigación sobre usabilidad, buena parte del Nielsen Norman Group, llegan siempre a la misma conclusión. El acceso por teclado sirve tanto a quien domina el sistema como a quien no puede sostener un ratón.",
    plain: "Un control que el teclado no alcanza",
    impact:
      "Aquí no hay apaño que valga. Quien no puede usar el ratón no puede hacer lo que hace este control. Si es un botón de compra o un paso del formulario, la visita se acaba ahí.",
  },
  "keyboard-no-visible-focus": {
    plain: "Nada muestra dónde está el teclado",
    impact:
      "Mucha gente no toca nunca un ratón. Sin un resalte visible navegan a ciegas, y acaban rindiéndose.",
  },
  "readability-dense-prose": {
    plain: "El texto exige nivel universitario",
    impact:
      "No es una exigencia legal, y es el cambio de mayor alcance de este informe. Ayuda a las personas con discapacidad cognitiva y a quien lee en un segundo idioma. GOV.UK escribe para una edad lectora de unos nueve años, y no es un sitio sencillo.",
  },
  "typo-leading-for-measure": {
    plain: "Líneas demasiado juntas",
    impact:
      "El ojo no se desliza por la línea, salta. El salto más difícil es volver al principio de la siguiente. Cuanto más larga la línea, más fácil es caer en la equivocada.",
  },
  "reading-order-mismatch": {
    plain: "El orden de tabulación contradice el visible",
    impact:
      "La página movió cosas en pantalla sin moverlas en su propio código, y la tecla Tab sigue al código. En un par como Cancelar y Enviar, el botón que hay bajo el cursor no es aquel en el que está el teclado.",
  },

  "forced-colors-focus-lost": {
    plain: "La marca del foco desaparece en Alto contraste",
    impact:
      "El modo de alto contraste quita las sombras y los colores con los que se dibuja la mayoría de los resaltes de foco. Quien más necesita ver dónde está no ve nada, en una página que parece perfecta hasta que ese modo se enciende.",
  },
  "forced-colors-icon-lost": {
    plain: "El botón de icono desaparece en Alto contraste",
    impact:
      "El icono está dibujado como imagen de fondo, y ese modo quita las imágenes de fondo. El botón sigue funcionando, pero se dibuja como una caja vacía: sin dibujo, sin etiqueta, sin nada que indique que es un botón.",
  },
  "keyboard-faint-focus": {
    plain: "La marca del teclado apenas se ve",
    impact:
      "El tabulador mueve un cursor invisible, y el contorno es lo único que muestra hasta dónde ha llegado. Si es demasiado tenue, quien usa el teclado no sabe qué está a punto de activar. Se cuela en las pruebas porque contorno sí que hay.",
  },
  "keyboard-focus-trap": {
    plain: "El foco del teclado se queda atrapado",
    impact:
      "Quien llega hasta aquí con el teclado no puede seguir. Uno de los peores fallos que puede tener un sitio.",
  },

  "component-form-autocomplete": {
    plain: "Los campos impiden el autorrelleno",
    impact:
      "Todo el mundo vuelve a escribir a mano su nombre, su correo y su dirección. Lento para todos, y una barrera real para algunos.",
  },
  "component-input-type": {
    plain: "Casillas normales para el correo y el teléfono",
    impact:
      "En el móvil, la gente recibe el teclado genérico en vez de uno con \"@\" o con teclas numéricas. Más toques y más errores.",
  },
  "component-required-cue": {
    plain: "Los campos obligatorios no se ven marcados",
    impact:
      "Nadie sabe que un campo era obligatorio hasta que el formulario lo rechaza. Los registros fallan.",
  },
  "component-submit-clarity": {
    plain: "Ningún botón de envío bien etiquetado",
    impact:
      "Un botón que solo dice \"Ir\", que muestra solo un icono o que ni siquiera está deja a la gente sin saber cómo terminar. Así que no terminan.",
  },
  "component-nav-labels": {
    plain: "Varios menús, ninguno con nombre",
    impact:
      "Quien usa un lector de pantalla oye \"navegación… navegación…\" sin forma de separar el menú principal de los enlaces del pie. Moverse por su sitio se vuelve una adivinanza.",
  },
  "component-skip-link": {
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
    plain: "La página se desplaza de lado en el móvil",
    impact:
      "La mayoría de los visitantes están en el móvil. Deslizar de lado para leer cada línea hace que se vayan.",
  },
  "mobile-tap-target": {
    plain: "Zonas de pulsación demasiado pequeñas",
    impact:
      "Pulsaciones que fallan, y frustración. Peor con dedos grandes, temblores o pulso inseguro. Le cuesta ventas.",
  },

  "text-spacing-clipped": {
    plain: "El texto se corta con más espaciado",
    impact:
      "Mucha gente con dislexia amplía el espaciado solo para poder leer. Aquí las palabras no se reajustan. Desaparecen detrás de una caja fija.",
  },
  "text-zoom-clipped": {
    plain: "El texto se corta a tamaños mayores",
    impact:
      "Agrandar la letra es el remedio más común para la vista débil, mucho más que el lector de pantalla. Sus cajas no se mueven, así que las palabras se esfuman.",
  },
  "text-zoom-horizontal-scroll": {
    plain: "El texto ampliado se desplaza de lado",
    impact:
      "Cada línea le obliga a ir de lado. Eso agota, y la mayoría se rinde.",
  },

  "dark-consent-no-reject": {
    plain: "Aviso de cookies sin opción de rechazar",
    impact:
      "Con el RGPD, rechazar tiene que ser tan fácil como aceptar. El consentimiento recogido así puede ser inválido. Los visitantes leen la falta de un botón \"Rechazar\" como una trampa.",
  },
  "dark-consent-asymmetry": {
    plain: "El aviso de cookies esconde el \"rechazar\"",
    impact:
      "Una opción como botón y la otra como texto suelto empuja a la gente a aceptar. Los reguladores buscan justo esto.",
  },
  "dark-preselected-optin": {
    plain: "Casilla de publicidad marcada de antemano",
    impact:
      "El RGPD dice que una casilla premarcada no es consentimiento. Quien no se dé cuenta se siente apuntado sin haber aceptado.",
  },
  "dark-confirmshaming": {
    plain: "El \"no, gracias\" redactado para avergonzar",
    impact:
      "\"No, gracias, no quiero ahorrar dinero\" se recuerda por los motivos equivocados. Se lee como manipulación.",
  },
  "dark-fake-scarcity": {
    plain: "Afirmaciones de escasez que conviene verificar",
    impact:
      "Los reguladores persiguen la escasez falsa. Los compradores han aprendido a desconfiar. Los números inventados cuestan más ventas de las que ganan.",
  },
  "dark-fake-urgency": {
    plain: "Presión de tiempo que conviene verificar",
    impact:
      "Las cuentas atrás que se reinician al recargar son una práctica engañosa. En cuanto se nota, nada más de lo que usted diga se cree.",
  },

  "dialog-close-unlabeled": {
    plain: "Botón de cerrar sin etiqueta",
    impact:
      "Quien usa un lector de pantalla solo oye \"botón\" y no sabe cómo cerrar la ventana emergente. Le deja atrapado, y muchos se irán de su sitio sin más.",
  },
  "dialog-keyboard-trap": {
    plain: "Una ventana emergente atrapa el teclado",
    impact:
      "Quien solo usa el teclado llega a esta ventana y se para. Escape no la cierra, y el tabulador solo da vueltas dentro. Cerrar la pestaña es la única salida. En un aviso de cookies, eso pasa antes de haber visto nada.",
  },
  "dialog-no-escape": {
    plain: "La ventana emergente ignora la tecla Escape",
    impact:
      "Escape es la tecla que todo el mundo prueba primero. Aquí nadie se queda atrapado, porque aún se puede salir con el tabulador. Pero todos los que usan el teclado la prueban, y no pasa nada.",
  },
  "dialog-focus-not-moved": {
    plain: "La ventana emergente nunca recibe el cursor",
    impact:
      "A quien usa un lector de pantalla nunca se le dice que se ha abierto. Quien usa el teclado tiene que recorrer con el tabulador toda la página de debajo antes de llegar a lo que ahora le tapa la pantalla.",
  },
  "dialog-focus-lost-on-close": {
    plain: "Cerrar la ventana emergente le pierde el sitio",
    impact:
      "Quien había avanzado con el tabulador hasta la mitad tiene que empezar otra vez desde el principio.",
  },
  "dialog-no-close": {
    plain: "No hay un botón de cerrar claro",
    impact:
      "Si pulsar fuera es la única salida, quien usa el teclado se queda atrapado detrás.",
  },
  "dialog-missing-role": {
    plain: "La capa superpuesta no está marcada como diálogo",
    impact:
      "Los lectores de pantalla no anuncian que se ha abierto, y la gente pasa con el tabulador a la página escondida de detrás.",
  },
  "dialog-missing-name": {
    plain: "La ventana emergente no dice para qué es",
    impact:
      "Al abrirse, el lector de pantalla solo dice \"diálogo\". El visitante no tiene ni idea de qué le pide ni por qué.",
  },

  "markup-validation": {
    plain: "Errores en el código de la página",
    impact:
      "Los navegadores adivinan en silencio cómo arreglarlo, y cada uno adivina distinto. Su página puede no funcionar como usted cree.",
  },

  "motion-marquee": {
    plain: "Texto en movimiento que no se puede parar",
    impact:
      "El texto que se mueve cuesta de leer a cualquiera. Para quien tiene problemas de atención o de equilibrio, es inservible.",
  },
  "motion-autoplay-media": {
    plain: "El audio o el vídeo se reproducen solos",
    impact:
      "Nadie puede pararlo. Desorienta, y tapa a los lectores de pantalla.",
  },
  "motion-infinite-no-reduced-motion": {
    plain: "La animación ignora el ajuste de movimiento reducido",
    impact:
      "El movimiento perpetuo aparta la atención de su contenido. A quien tiene trastornos del equilibrio puede provocarle mareo o náuseas.",
  },

  "typo-caps-letterspacing": {
    plain: "Mayúsculas sin espacio entre letras",
    impact:
      "Las mayúsculas forman bloques uniformes; sin un poco de espacio de más entre ellas, los titulares y las etiquetas cuestan de recorrer con la vista.",
  },
  "typo-lowercase-letterspaced": {
    plain: "Espacio forzado entre las letras",
    impact:
      "El espacio de más entre minúsculas rompe la forma de palabra que la gente reconoce, y eso frena a cualquiera.",
  },
  "typo-negative-letterspacing": {
    plain: "Letras apretadas hasta tocarse",
    impact: "Las letras apretadas se emborronan unas con otras. Sobre todo en tamaños pequeños o para quien ve poco.",
  },
  "typo-line-length-long": {
    plain: "Las líneas son demasiado largas",
    impact:
      "Pasados unos 75 caracteres por línea, el ojo pierde el sitio al volver.",
  },
  "typo-line-length-short": {
    plain: "Las líneas se cortan demasiado",
    impact: "Cuando casi cada frase salta a una línea nueva, el ritmo de lectura se rompe. El contenido parece más difícil de lo que es.",
  },
  "typo-justified-no-hyphens": {
    plain: "Texto justificado sin partición de palabras",
    impact:
      "El texto justificado estira los espacios entre palabras para llenar cada línea. Los huecos desiguales forman \"ríos\" de blanco que distraen a lo largo de la página.",
  },
  "typo-font-size-small": {
    plain: "Texto de lectura muy pequeño",
    impact: "El texto pequeño aparta a quien lee en el móvil, con poca luz o con una vista que no es perfecta.",
  },
  "typo-typeface-count": {
    plain: "Demasiadas tipografías",
    impact: "Más de dos o tres tipografías se ve recargado y hace que la página parezca menos fiable.",
  },

  "typo-underline-nonlink": {
    plain: "Texto subrayado que no es un enlace",
    impact:
      "El subrayado se lee como enlace, así que la gente pulsa texto que no lleva a ninguna parte.",
  },
  "typo-italic-body": {
    plain: "Pasajes enteros en cursiva",
    impact:
      "Las letras inclinadas cuestan pasadas unas pocas palabras. Una barrera real con dislexia o con la vista débil.",
  },
  "typo-allcaps-block": {
    plain: "Pasajes largos EN MAYÚSCULAS",
    impact:
      "Las mayúsculas borran la forma de palabra con la que leemos. Lento y cansado, y peor para quien tiene dislexia.",
  },
  "typo-thin-weight": {
    plain: "Texto de lectura en grosor finísimo",
    impact:
      "Los trazos finos se desvanecen en pantallas baratas, al sol y para la vista débil. Aunque el contraste apruebe.",
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
  "component-form-autocomplete":
    "Indique en cada campo qué recoge, para que los navegadores y los gestores de contraseñas puedan rellenarlo.",
  "component-input-type": [
    "Diga a la página qué campos llevan un correo, un teléfono o una fecha.",
    "Los móviles muestran entonces el teclado adecuado en vez de uno normal.",
  ],
  "component-required-cue": [
    "Marque los campos obligatorios a la vista, no solo en el código.",
    "Con la palabra \"obligatorio\" junto a la etiqueta basta.",
  ],
  "component-submit-clarity":
    "Dé al formulario un solo botón bien etiquetado que diga lo que hace, como \"Enviar consulta\".",
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
    "Manténgalo ahí hasta que se elija — eso es lo que hace correcto esconder la página de detrás.",
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
    "Dé al componente las partes que exige su propio tipo.",
    "Una lista necesita elementos de lista dentro, no texto suelto.",
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
    "Añada los atributos que exige el tipo de este componente.",
    "El enlace Saber más enumera el conjunto exacto.",
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
      "Todo lo que la gente no puede ver ni oír: texto demasiado claro para leerlo, imágenes sin nada escrito sobre ellas y vídeo sin subtítulos.",
  },
  "2": {
    principleLabel: "Operable",
    plainTitle: "¿Se puede usar?",
    plainDescription:
      "Si alguien puede recorrer de verdad su sitio, con el teclado en vez del ratón, en el móvil, o sin un control fino de las manos.",
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
