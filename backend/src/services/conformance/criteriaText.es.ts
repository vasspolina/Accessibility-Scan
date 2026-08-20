/* Spanish criterion text. Rows fall back to English per id, so a missing
   entry renders the English question and statement rather than nothing. */
export const CRITERIA_ES: Record<string, { plain: string; failing: string }> = {
  // ---- Perceptible ------------------------------------------------------
  "1.1.1": {
    plain: "¿Tienen las imágenes una descripción para quien no puede verlas?",
    failing: "A las imágenes les falta una descripción para quien no puede verlas",
  },
  "1.2.1": {
    plain: "¿Tienen el audio y el vídeo una versión en texto?",
    failing: "El audio y el vídeo no tienen versión en texto",
  },
  "1.2.2": {
    plain: "¿Tienen subtítulos sus vídeos?",
    failing: "Los vídeos se reproducen sin subtítulos",
  },
  "1.2.3": {
    plain: "¿Dicen los vídeos en voz alta lo que se muestra en pantalla?",
    failing: "Los vídeos nunca dicen en voz alta lo que hay en pantalla",
  },
  "1.2.4": {
    plain: "¿Tiene el vídeo en directo subtítulos en directo?",
    failing: "El vídeo en directo va sin subtítulos",
  },
  "1.2.5": {
    plain: "¿Tienen los vídeos una descripción hablada de lo que hay en pantalla?",
    failing: "Los vídeos no tienen una descripción hablada de lo que hay en pantalla",
  },
  "1.3.1": {
    plain: "¿Existen sus listas y encabezados en el código, y no solo en el diseño?",
    failing: "Las listas y los encabezados se ven bien en pantalla, pero el código no dice qué son",
  },
  "1.3.2": {
    plain: "¿Leen los lectores de pantalla la página en un orden sensato?",
    failing: "Los lectores de pantalla leen partes de la página en desorden",
  },
  "1.3.3": {
    plain: "¿Funcionan las instrucciones sin ver la forma, el tamaño ni la posición?",
    failing: "Las instrucciones dependen de ver la forma, el tamaño o la posición",
  },
  "1.3.4": {
    plain: "¿Funciona la página con el móvil de lado?",
    failing: "La página no funciona con el móvil de lado",
  },
  "1.3.5": {
    plain: "¿Dicen los campos para qué son, de modo que el navegador pueda rellenarlos?",
    failing: "Los campos no dicen para qué son, así que el navegador no puede rellenarlos",
  },
  "1.4.1": {
    plain: "¿Hay algo que se indique solo con el color?",
    failing: "El color por sí solo lleva el significado, así que los visitantes daltónicos se lo pierden",
  },
  "1.4.2": {
    plain: "¿Se puede apagar el sonido que empieza solo?",
    failing: "El sonido empieza solo y no se puede apagar",
  },
  "1.4.3": {
    plain: "¿Es el texto lo bastante oscuro para leerlo sobre su fondo?",
    failing: "El texto es demasiado claro para leerlo sobre su fondo",
  },
  "1.4.4": {
    plain: "¿Sigue el texto legible cuando alguien lo agranda?",
    failing: "El texto se corta cuando alguien lo agranda",
  },
  "1.4.5": {
    plain: "¿Es el texto texto de verdad, y no una imagen de texto?",
    failing: "Las imágenes de texto se ven borrosas cuando alguien las amplía",
  },
  "1.4.10": {
    plain: "¿Cabe la página en la pantalla del móvil sin desplazarse de lado?",
    failing: "La página se desplaza de lado en el móvil",
  },
  "1.4.11": {
    plain: "¿Son los botones y los iconos lo bastante oscuros para distinguirlos?",
    failing: "Los botones y los iconos son demasiado claros para distinguirlos",
  },
  "1.4.12": {
    plain: "¿Aguanta la página que alguien separe el texto para leerlo?",
    failing: "El texto se solapa y se junta cuando alguien lo separa para leerlo",
  },
  "1.4.13": {
    plain: "¿Se pueden cerrar las ventanas emergentes, y se quedan fuera del paso?",
    failing: "Las ventanas emergentes no se pueden cerrar, o tapan lo que estaba leyendo",
  },

  // ---- Operable ---------------------------------------------------------
  "2.1.1": {
    plain: "¿Funciona todo sin ratón?",
    failing: "Partes de la página solo funcionan con ratón",
  },
  "2.1.2": {
    plain: "¿Puede quien usa el teclado salir siempre con el tabulador?",
    failing: "Quien usa el teclado se queda atrapado y no puede salir con el tabulador",
  },
  "2.1.4": {
    plain: "¿Se pueden apagar los atajos de una sola tecla?",
    failing: "Los atajos de una sola tecla no se pueden apagar, así que quien dicta los dispara sin querer",
  },
  "2.2.1": {
    plain: "¿Se puede ampliar o quitar un límite de tiempo?",
    failing: "Un límite de tiempo no se puede ampliar ni quitar",
  },
  "2.2.2": {
    plain: "¿Se puede parar el contenido en movimiento?",
    failing: "El contenido en movimiento no se puede parar",
  },
  "2.3.1": {
    plain: "¿Parpadea algo lo bastante rápido para provocar una crisis?",
    failing: "Algo parpadea lo bastante rápido para provocar una crisis",
  },
  "2.4.1": {
    plain: "¿Hay forma de saltarse el menú e ir al contenido principal?",
    failing: "No hay forma de saltarse el menú e ir al contenido principal",
  },
  "2.4.2": {
    plain: "¿Dice la pestaña del navegador qué página es esta?",
    failing: "La pestaña del navegador no dice qué página es esta",
  },
  "2.4.3": {
    plain: "¿Avanza el tabulador por la página en el orden en que se lee?",
    failing: "El tabulador da saltos por la página en un orden confuso",
  },
  "2.4.4": {
    plain: "¿Dice cada enlace adónde lleva?",
    failing: "Los enlaces no dicen adónde llevan",
  },
  "2.4.5": {
    plain: "¿Hay más de una forma de llegar a una página?",
    failing: "A las páginas solo se puede llegar de una forma",
  },
  "2.4.6": {
    plain: "¿Describen los encabezados y las etiquetas lo que hay debajo?",
    failing: "Los encabezados y las etiquetas no describen lo que hay debajo",
  },
  "2.4.7": {
    plain: "¿Se ve dónde está usted mientras avanza con el tabulador?",
    failing: "No se ve dónde está usted mientras avanza con el tabulador",
  },
  "2.5.1": {
    plain: "¿Hay una forma más sencilla de hacer lo que pide deslizar o pellizcar?",
    failing: "Deslizar o pellizcar es la única forma de hacer algo",
  },
  "2.5.2": {
    plain: "¿Puede quien pulsa lo que no era deslizar el dedo fuera para deshacerlo?",
    failing: "Pulsar lo que no era no se puede deshacer deslizando el dedo fuera",
  },
  "2.5.3": {
    plain: "¿Coincide el nombre hablado de un botón con las palabras que lleva escritas?",
    failing: "El nombre hablado de un botón no coincide con las palabras que lleva escritas",
  },
  "2.5.4": {
    plain: "¿Hay un control normal para lo que se acciona agitando o inclinando?",
    failing: "Una acción solo funciona agitando o inclinando el dispositivo",
  },

  // ---- Comprensible -----------------------------------------------------
  "3.1.1": {
    plain: "¿Dice la página en qué idioma está?",
    failing: "La página no dice en qué idioma está, así que los lectores de pantalla la pronuncian mal",
  },
  "3.1.2": {
    plain: "¿Están marcadas como tales las palabras en otro idioma?",
    failing: "Las palabras en otro idioma no están marcadas, así que se leen mal",
  },
  "3.2.1": {
    plain: "¿Cambia algo con solo llegar a ello con el tabulador?",
    failing: "Llegar a algo con el tabulador cambia la página",
  },
  "3.2.2": {
    plain: "¿Cambia la página de forma inesperada al rellenar un campo?",
    failing: "Rellenar un campo cambia la página de forma inesperada",
  },
  "3.2.3": {
    plain: "¿Está el menú en el mismo sitio en todas las páginas?",
    failing: "El menú cambia de sitio de una página a otra",
  },
  "3.2.4": {
    plain: "¿Se llama igual a lo mismo en todas partes?",
    failing: "A lo mismo se le llama de formas distintas en sitios distintos",
  },
  "3.3.1": {
    plain: "¿Dicen los errores del formulario qué campo está mal?",
    failing: "Los errores del formulario no dicen qué campo está mal",
  },
  "3.3.2": {
    plain: "¿Dicen los campos qué hay que escribir?",
    failing: "Los campos no dicen qué hay que escribir",
  },
  "3.3.3": {
    plain: "¿Dicen los mensajes de error cómo resolver el problema?",
    failing: "Los mensajes de error no dicen cómo resolver el problema",
  },
  "3.3.4": {
    plain: "¿Se pueden revisar o deshacer los envíos importantes?",
    failing: "Los envíos importantes no se pueden revisar ni deshacer",
  },

  // ---- Robusto ----------------------------------------------------------
  "4.1.1": {
    plain: "¿Está el código de la página libre de errores que confunden a los lectores de pantalla?",
    failing: "El código de la página tiene errores que pueden confundir a los lectores de pantalla",
  },
  "4.1.2": {
    plain: "¿Dicen los botones y los menús a los lectores de pantalla qué son?",
    failing: "Los botones y los menús no dicen a los lectores de pantalla qué son",
  },
  "4.1.3": {
    plain: "¿Se anuncian en voz alta los avisos del tipo 'añadido a la cesta'?",
    failing: "Los avisos del tipo 'añadido a la cesta' no se anuncian en voz alta",
  },
};
