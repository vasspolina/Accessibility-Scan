/* French report copy. Keys are identical to the English dictionaries in
   wcagPlain.ts — only the values are translated. Fallback is per key, so a
   key missing here renders in English rather than vanishing. */
import type { PlainRule } from "./wcagPlain";

export const PLAIN_FR: Record<string, PlainRule> = {
  "timing-meta-refresh": {
    plain: "La page se recharge toute seule",
    impact:
      "Qui est encore en train de lire, ou au milieu du formulaire, est renvoyé au début sans prévenir. Lire lentement n'est pas un défaut, et ceci le punit.",
  },
  "aria-allowed-role": {
    plain: "Des éléments annoncés pour ce qu'ils ne sont pas",
    found: (n) =>
      `${n} ${n === 1 ? "élément est désigné" : "éléments sont désignés"} dans le code comme quelque chose ${n === 1 ? "qu'il ne peut pas être" : "qu'ils ne peuvent pas être"}. Ce rôle n'a pas sa place sur ce type de balise.`,
    impact:
      "Les lecteurs d'écran annoncent la mauvaise chose. On dit aux gens qu'ils ont atteint un bouton alors que c'est un lien, ou un titre alors que c'est une liste.",
  },
  "aria-allowed-attr": {
    plain: "Des réglages de code sur le mauvais élément",
    found: (n) =>
      `${n} ${n === 1 ? "élément porte des réglages que son" : "éléments portent des réglages que leur"} type de balise n'a pas le droit d'avoir. Le navigateur et le lecteur d'écran ne sont pas d'accord sur ce ${n === 1 ? "qu'il est" : "qu'ils sont"}.`,
    impact: "Les lecteurs d'écran peuvent annoncer n'importe quoi, ou sauter l'élément entièrement.",
  },
  "aria-prohibited-attr": {
    plain: "Un libellé que le code jette",
    found: (n) =>
      `${n} ${n === 1 ? "élément porte" : "éléments portent"} un libellé que le code n'autorise pas sur ce type de balise. Le libellé est jeté au lieu d'être lu.`,
    impact:
      "L'élément a l'air nommé dans votre source, donc personne ne remarque le problème. Les lecteurs d'écran ignorent le libellé et annoncent le texte qui se trouve dedans — souvent rien.",
  },
  "aria-required-children": {
    plain: "Des menus ou des listes sans leurs entrées",
    found: (n) =>
      `${n} ${n === 1 ? "contrôle est désigné dans le code comme un menu ou une liste, mais ne contient" : "contrôles sont désignés dans le code comme des menus ou des listes, mais ne contiennent"} aucune des entrées ${n === 1 ? "qu'il exige" : "qu'ils exigent"}. ${n === 1 ? "Il est annoncé" : "Chacun est annoncé"} comme vide.`,
    impact: "Les lecteurs d'écran n'en déduisent pas la structure, donc personne ne peut y naviguer.",
  },
  "aria-required-parent": {
    plain: "Des morceaux séparés de leur contrôle",
    found: (n) =>
      `${n} ${n === 1 ? "élément est désigné comme un morceau" : "éléments sont désignés comme des morceaux"} d'un contrôle plus grand : un onglet, une entrée de menu, une option de liste. ${n === 1 ? "Il ne se trouve pas" : "Aucun ne se trouve"} dans le contrôle ${n === 1 ? "auquel il appartient" : "auquel ils appartiennent"}.`,
    impact:
      "Un onglet hors de sa barre d'onglets n'est l'onglet de rien. Les lecteurs d'écran ne peuvent pas dire lequel il est sur combien. Les flèches du clavier qui servent à parcourir ces contrôles n'ont plus rien à parcourir.",
  },
  "landmark-unique": {
    plain: "Deux zones de page portent le même nom",
    found: (n) =>
      `${n} ${n === 1 ? "région porte le même nom qu'une autre" : "régions portent le même nom que d'autres"}. Une liste de régions se lit comme des répétitions, sans moyen de les distinguer.`,
    impact:
      "Les utilisateurs de lecteurs d'écran obtiennent une liste d'entrées identiques et ne peuvent pas les distinguer.",
  },
  "landmark-no-duplicate-banner": {
    plain: "Plus d'un en-tête de page",
    found: () =>
      `La page marque plus d'une zone comme son en-tête : une liste de régions en propose plusieurs et aucune n'est l'en-tête.`,
    impact: "Les lecteurs d'écran listent plusieurs en-têtes, donc personne ne sait lequel est le vrai.",
  },
  "landmark-no-duplicate-contentinfo": {
    plain: "Plus d'un pied de page",
    found: () =>
      `La page marque plus d'une zone comme son pied de page, donc il n'y a pas un seul endroit où trouver les coordonnées ou les conditions.`,
    impact: "Les lecteurs d'écran listent plusieurs pieds de page, et les gens ne savent pas lequel est lequel.",
  },
  "landmark-no-duplicate-main": {
    plain: "Plus d'une zone de contenu principal",
    found: () =>
      `Plus d'une zone est marquée comme le contenu principal. « Aller au contenu principal » doit en choisir une, sans pouvoir savoir laquelle vous vouliez.`,
    impact: "Les gens atterrissent dans la mauvaise moitié de la page.",
  },
  "landmark-banner-is-top-level": {
    plain: "En-tête imbriqué dans une autre zone",
    found: () =>
      `L'en-tête est glissé dans une autre région au lieu d'être à côté d'elle. Il n'est pas là où quelqu'un qui saute de région en région s'attend à le trouver.`,
    impact: "Les utilisateurs de lecteurs d'écran ne peuvent pas y aller directement comme ils s'y attendent.",
  },
  "landmark-contentinfo-is-top-level": {
    plain: "Pied de page imbriqué dans une autre zone",
    found: () =>
      `Le pied de page est glissé dans une autre région au lieu d'être à côté d'elle. Il n'est pas là où quelqu'un qui saute de région en région s'y attend.`,
    impact: "Les utilisateurs de lecteurs d'écran ne peuvent pas y aller directement comme ils s'y attendent.",
  },
  "skip-link": {
    plain: "Le lien d'évitement ne mène nulle part",
    found: (n) =>
      `${n} ${n === 1 ? "lien d'évitement pointe" : "liens d'évitement pointent"} vers quelque chose qui n'est pas sur la page : ${n === 1 ? "l'activer ne mène" : "les activer ne mène"} personne nulle part.`,
    impact:
      "Les utilisateurs au clavier l'activent et restent exactement où ils étaient, puis parcourent tout le menu quand même.",
  },
  "image-redundant-alt": {
    plain: "La description d'image répète le texte voisin",
    found: (n) =>
      `${n} ${n === 1 ? "image reprend, dans son texte alternatif, les mots déjà écrits à côté d'elle" : "images reprennent, dans leur texte alternatif, les mots déjà écrits à côté d'elles"}. Un lecteur d'écran dit deux fois la même chose.`,
    impact: "Les utilisateurs de lecteurs d'écran entendent deux fois la même chose, ce qui les ralentit pour rien.",
  },
  "color-contrast": {
    research:
      "WebAIM examine chaque année un million de pages d'accueil. Le texte trop peu contrasté est le défaut le plus fréquent qu'il y trouve, année après année. Bien plus de gens voient moins net que ne le supposent les écrans d'une équipe de design.",
    plain: "Texte trop pâle pour être lu",
    found: (n) =>
      `${n} ${n === 1 ? "passage de texte sur cette page est trop proche" : "passages de texte sur cette page sont trop proches"} en couleur du fond qui se trouve derrière ${n === 1 ? "lui" : "eux"}. ${n === 1 ? "Il est listé" : "Chacun est listé"} sous Éléments concernés, et la version technique donne le rapport mesuré.`,
    impact:
      "Difficile à lire en plein soleil, sur un écran bon marché, ou avec une vue imparfaite. Votre message ne passe pas.",
  },
  "image-alt": {
    research:
      "WebAIM examine chaque année un million de pages d'accueil. Les images sans description comptent parmi les défauts les plus fréquents qu'il y trouve, année après année. C'est aussi l'un des plus simples à régler.",
    plain: "Les images n'ont pas de description",
    found: (n) =>
      `${n} ${n === 1 ? "image n'a" : "images n'ont"} aucun texte alternatif — pas même un texte vide pour ${n === 1 ? "la marquer décorative" : "les marquer décoratives"}. Un lecteur d'écran se rabat sur la lecture du nom de fichier, ou ${n === 1 ? "la saute" : "les saute"} en silence.`,
    impact:
      "Les utilisateurs de lecteurs d'écran n'entendent rien pour ces images, et les moteurs de recherche ne savent pas ce qu'elles montrent. Cela vous coûte en accessibilité et en référencement.",
  },
  "svg-img-alt": {
    plain: "Les icônes n'ont pas de description",
    found: (n) =>
      `${n} ${n === 1 ? "icône est marquée" : "icônes sont marquées"} dans le code comme ${n === 1 ? "une image" : "des images"} mais ${n === 1 ? "ne porte" : "ne portent"} aucun mot disant ce ${n === 1 ? "qu'elle montre" : "qu'elles montrent"}.`,
    impact:
      "Souvent l'icône est le seul libellé d'un contrôle : une loupe pour la recherche, un panier pour le panier. Un lecteur d'écran y arrive et n'a rien à annoncer.",
  },
  "input-image-alt": {
    plain: "Le bouton-image n'a pas de description",
    found: (n) =>
      `${n} ${n === 1 ? "image utilisée comme bouton n'a" : "images utilisées comme boutons n'ont"} pas de texte alternatif : il n'y a rien à annoncer et rien à lire.`,
    impact: "Les utilisateurs de lecteurs d'écran ne savent pas ce que fait le bouton, donc ils ne finissent pas.",
  },
  "link-name": {
    research:
      "Les liens vides comptent parmi les défauts les plus fréquents du relevé annuel de WebAIM sur un million de pages d'accueil. Les utilisateurs de lecteurs d'écran naviguent en affichant la liste des liens. Un lien vide apparaît dans cette liste comme le mot « lien » et rien d'autre.",
    plain: "Des liens sans texte lisible",
    found: (n) =>
      `${n} ${n === 1 ? "lien n'a" : "liens n'ont"} aucun texte lisible à l'intérieur : ni mots, ni libellé, rien à annoncer. ${n === 1 ? "C'est le plus souvent une icône, une flèche ou une image servant de lien." : "Ce sont le plus souvent des icônes, des flèches ou des images servant de liens."} L'image porte le sens et le code n'en porte rien.`,
    impact:
      "Les utilisateurs de lecteurs d'écran affichent souvent la liste de tous les liens et y choisissent. Un lien sans texte y apparaît comme le seul mot « lien ». Plusieurs d'entre eux transforment la liste en « lien, lien, lien ».",
  },
  "link-text-vague": {
    plain: "Les liens ne disent que « en savoir plus »",
    impact:
      "Les utilisateurs de lecteurs d'écran peuvent afficher la liste de tous les liens de la page. Quand ils se lisent tous pareil, la liste n'aide en rien.",
  },
  "button-name": {
    research:
      "Les boutons sans libellé sont tout en haut du relevé annuel de WebAIM sur un million de pages d'accueil, année après année. Ce sont en général des contrôles réduits à une icône, évidente pour qui les a dessinés.",
    plain: "Les boutons n'ont pas de libellé",
    found: (n) =>
      `${n} ${n === 1 ? "bouton n'a" : "boutons n'ont"} aucun libellé : pas de mots à l'intérieur et pas de nom dans le code. Presque toujours un bouton-icône, où le symbole porte le sens et le code n'en porte rien.`,
    impact: "Personne ne sait ce qu'il fait avant de cliquer. Une raison fréquente d'abandon.",
  },
  label: {
    research:
      "Les champs de formulaire sans libellé sont tout en haut du relevé annuel de WebAIM sur un million de pages d'accueil. Dans l'étude britannique Click-Away Pound, la plupart des acheteurs qui ont rencontré un tel obstacle sont partis sans un mot. Ils ont dépensé ailleurs.",
    plain: "Les champs de formulaire n'ont pas de libellé",
    found: (n) =>
      `${n} ${n === 1 ? "champ de formulaire n'est pas relié" : "champs de formulaire ne sont pas reliés"} à un libellé dans le code. Les mots ont beau être juste à côté du champ à l'écran, rien ne relie les deux. Un lecteur d'écran annonce le champ sans savoir à quoi il sert.`,
    impact:
      "Les utilisateurs de lecteurs d'écran ne savent pas quoi mettre dans chaque case, donc les formulaires sont abandonnés, le paiement compris.",
  },
  "select-name": {
    plain: "Une liste déroulante sans libellé",
    found: (n) =>
      `${n} ${n === 1 ? "liste déroulante n'a" : "listes déroulantes n'ont"} pas de libellé dans le code. ${n === 1 ? "Elle est annoncée" : "Chacune est annoncée"} comme une liste d'options, sans rien dire de ce qu'on choisit.`,
    impact: "Les gens ne savent pas ce qu'ils choisissent. Les erreurs et les formulaires abandonnés suivent.",
  },
  "document-title": {
    plain: "La page n'a pas de titre",
    found: () =>
      `La page n'a pas de titre : l'onglet du navigateur et le lecteur d'écran se rabattent tous deux sur l'adresse.`,
    impact: "Les onglets, les favoris et les résultats de recherche n'affichent rien d'utile.",
  },
  "html-has-lang": {
    research:
      "La langue du document absente est l'un des rares défauts que WebAIM trouve sur la majorité du web. Il reste fréquent parce qu'il est silencieux : la page a l'air correcte, et seul quelqu'un qui l'entend dans la mauvaise voix rencontre le problème.",
    plain: "La page ne déclare aucune langue",
    found: () => `La page ne déclare pas dans quelle langue elle est écrite.`,
    impact: "Les gens entendent votre contenu avec le mauvais accent, ce qui est difficile à suivre.",
  },
  "html-lang-valid": {
    plain: "La langue déclarée n'est pas valide",
    found: () => `La page déclare une langue, mais pas une que les logiciels reconnaissent.`,
    impact: "Les gens entendent vos mots avec la mauvaise voix, mal prononcés.",
  },
  "heading-order": {
    plain: "Les titres sautent des niveaux",
    found: (n) =>
      `Les niveaux de titre sautent au lieu d'avancer d'un cran. À ${n} ${n === 1 ? "endroit" : "endroits"}, un niveau est sauté : un h2 suivi directement d'un h4, ou l'équivalent.`,
    impact: "La plupart des utilisateurs de lecteurs d'écran naviguent par les titres. Ils perdent le fil.",
  },
  "page-has-heading-one": {
    plain: "Pas de titre principal",
    found: () => `La page n'a pas de titre de premier niveau : rien ne dit de quoi elle parle.`,
    impact: "Personne ne voit d'un coup d'œil de quoi parle la page.",
  },
  "empty-heading": {
    plain: "Un titre vide",
    found: (n) =>
      `${n} ${n === 1 ? "titre est vide" : "titres sont vides"} : la balise est là, les mots non.`,
    impact: "Les gens qui naviguent par les titres tombent sur une entrée qui ne dit rien.",
  },
  "link-in-text-block": {
    plain: "Des liens signalés par la couleur seule",
    found: (n) =>
      `${n} ${n === 1 ? "lien dans le texte courant n'est signalé" : "liens dans le texte courant ne sont signalés"} que par la couleur, sans soulignement. Qui ne distingue pas ces couleurs ne voit aucun lien là.`,
    impact: "Les lecteurs daltoniens ne distinguent pas un lien du texte ordinaire.",
  },
  "meta-viewport": {
    plain: "Le zoom est bloqué",
    found: () => `La page bloque le zoom : qui a besoin de l'agrandir sur un téléphone ne le peut pas.`,
    impact: "Qui a besoin d'un texte plus gros ne l'obtient pas. Sur un téléphone, ils partent.",
  },
  "meta-viewport-large": {
    plain: "Le zoom est plafonné",
    found: () =>
      `Le zoom fonctionne, mais la page le plafonne sous 500%, et les gens qui ont besoin du plus fort grossissement s'arrêtent au plafond.`,
    impact:
      "Moins grave que bloquer le zoom, et cela dessert les mêmes personnes. Qui a besoin d'un très gros texte atteint le plafond et rien de plus.",
  },
  "frame-title": {
    plain: "Un cadre intégré sans titre",
    found: (n) =>
      `${n} ${n === 1 ? "cadre intégré n'a pas de titre, donc il est annoncé" : "cadres intégrés n'ont pas de titre, donc ils sont annoncés"} seulement comme « cadre ».`,
    impact: "Les utilisateurs de lecteurs d'écran ne savent pas ce qu'il contient, ni si cela vaut leur temps.",
  },
  "duplicate-id-active": {
    plain: "Deux contrôles partagent un même id",
    found: (n) =>
      `${n} ${n === 1 ? "id est utilisé" : "id sont utilisés"} plus d'une fois sur des contrôles : les libellés et les renvois peuvent désigner le mauvais élément.`,
    impact: "Les lecteurs d'écran s'embrouillent et ce n'est pas le bon élément qui réagit au clic.",
  },
  list: {
    plain: "Une liste qui n'en est pas une dans le code",
    found: (n) =>
      `${n} ${n === 1 ? "liste est construite" : "listes sont construites"} avec autre chose que des entrées de liste à l'intérieur. Le groupement existe à l'écran et pas dans le code.`,
    impact:
      "Les utilisateurs de lecteurs d'écran ne savent pas combien d'entrées il y a, et ne peuvent pas les parcourir.",
  },
  listitem: {
    plain: "Des entrées de liste hors de toute liste",
    found: (n) =>
      `${n} ${n === 1 ? "entrée de liste se trouve" : "entrées de liste se trouvent"} hors de toute liste. Un lecteur d'écran n'annonce jamais combien il y en a, ni où le groupe commence.`,
    impact: "Les utilisateurs de lecteurs d'écran perdent le groupement, et le contenu cesse d'avoir du sens.",
  },
  "aria-required-attr": {
    plain: "Un contrôle sans son état",
    found: (n) =>
      `${n} ${n === 1 ? "contrôle est désigné" : "contrôles sont désignés"} comme quelque chose qui a un état : coché, déplié, une valeur sur une échelle. ${n === 1 ? "Il ne dit jamais" : "Aucun ne dit"} quel est cet état.`,
    impact: "Les utilisateurs de lecteurs d'écran ne savent pas dans quel état il est, ni comment s'en servir.",
  },
  "aria-hidden-focus": {
    plain: "Des éléments masqués captent quand même le clavier",
    found: (n) =>
      `${n} ${n === 1 ? "élément est masqué" : "éléments sont masqués"} pour les lecteurs d'écran tout en restant ${n === 1 ? "accessible" : "accessibles"} au clavier. Le focus atterrit quelque part qui n'annonce rien.`,
    impact:
      "Quelqu'un qui tabule atterrit sur quelque chose que son lecteur d'écran ne lira pas. La page semble cassée.",
  },
  "aria-dialog-name": {
    plain: "Une fenêtre surgissante sans nom",
    found: (n) =>
      `${n} ${n === 1 ? "fenêtre surgissante n'a rien qui la nomme, donc elle est annoncée" : "fenêtres surgissantes n'ont rien qui les nomme, donc elles sont annoncées"} comme « boîte de dialogue » et rien d'autre.`,
    impact:
      "Elle est annoncée comme « boîte de dialogue » et rien d'autre. Quelque chose a pris tout l'écran et il n'y a aucun moyen d'entendre ce que c'est.",
  },
  "nested-interactive": {
    plain: "Un contrôle à l'intérieur d'un autre",
    found: (n) =>
      `${n} ${n === 1 ? "contrôle en contient un autre" : "contrôles en contiennent chacun un autre"}. Ce qui ressemble à une seule chose à cliquer en fait deux, l'une enroulée autour de l'autre.`,
    impact:
      "Les lecteurs d'écran annoncent celui du dehors et cachent ce qu'il y a dedans, donc le contrôle intérieur est hors d'atteinte. Lequel des deux un clic ou une touche active, personne ne le sait.",
  },
  "presentation-role-conflict": {
    plain: "Un contrôle actif marqué comme décoration",
    found: (n) =>
      `${n} ${n === 1 ? "élément est marqué" : "éléments sont marqués"} comme à ignorer tout en restant ${n === 1 ? "atteignable et utilisable" : "atteignables et utilisables"}. Le code se contredit sur ${n === 1 ? "son existence" : "leur existence"}.`,
    impact:
      "Le code dit de l'ignorer et l'élément dit de s'en servir. Les lecteurs d'écran tranchent chacun à leur façon, donc certaines personnes ne le trouvent jamais.",
  },
  region: {
    plain: "Des zones de page sans nom dans le code",
    found: (n) =>
      `Une partie de cette page est hors de toute zone nommée. ${n} ${n === 1 ? "bloc de contenu n'a" : "blocs de contenu n'ont"} ni en-tête, ni navigation, ni contenu principal, ni pied de page autour ${n === 1 ? "de lui" : "d'eux"}.`,
    impact: "Les utilisateurs de lecteurs d'écran ne peuvent pas passer devant. Ils entendent tout, à chaque fois.",
  },
  "landmark-one-main": {
    plain: "Rien ne marque le contenu principal",
    found: () =>
      `La page n'a pas de région principale indiquant où commence le contenu : il n'y a nulle part où sauter.`,
    impact: "Les utilisateurs de lecteurs d'écran subissent tout le menu sur chaque page.",
  },
  tabindex: {
    plain: "L'ordre de tabulation part dans tous les sens",
    found: (n) =>
      `${n} ${n === 1 ? "élément utilise" : "éléments utilisent"} un tabindex positif. Cela ${n === 1 ? "le force" : "les force"} en tête de l'ordre de tabulation, où qu'${n === 1 ? "il se trouve" : "ils se trouvent"} sur la page.`,
    impact: "Les gens qui ne peuvent pas se servir d'une souris sont ballottés d'un bout à l'autre de la page.",
  },
  "scrollable-region-focusable": {
    plain: "Zone défilante hors d'atteinte au clavier",
    found: (n) =>
      `${n} ${n === 1 ? "zone défile" : "zones défilent"} mais ${n === 1 ? "ne peut pas être atteinte" : "ne peuvent pas être atteintes"} au clavier. Tout ce qui a défilé hors de vue est hors d'atteinte sans souris.`,
    impact: "Sans souris, vous ne pouvez pas faire défiler ce qu'il y a dedans.",
  },

  "keyboard-mouse-only": {
    research:
      "Des décennies de recherche sur l'usage, en grande partie du Nielsen Norman Group, aboutissent toujours à la même conclusion. L'accès au clavier sert autant les utilisateurs aguerris que les gens qui ne peuvent pas tenir une souris.",
    plain: "Un contrôle que le clavier n'atteint pas",
    impact:
      "Il n'y a aucun contournement ici. Qui ne peut pas se servir d'une souris ne peut pas faire ce que fait ce contrôle. Si c'est un bouton d'achat ou une étape de formulaire, la visite s'arrête là.",
  },
  "keyboard-no-visible-focus": {
    plain: "Rien ne montre où est le clavier",
    impact:
      "Beaucoup de gens ne touchent jamais une souris. Sans repère visible, ils naviguent à l'aveugle, et ils abandonnent.",
  },
  "readability-dense-prose": {
    plain: "L'écriture demande un niveau universitaire",
    impact:
      "Ce n'est pas une obligation légale, et c'est le changement qui touche le plus de monde dans ce rapport. Il aide les personnes ayant des troubles cognitifs et tous ceux qui lisent dans une deuxième langue. GOV.UK écrit pour un âge de lecture d'environ neuf ans, et ce n'est pas un site simple.",
  },
  "typo-leading-for-measure": {
    plain: "Lignes trop serrées les unes sur les autres",
    impact:
      "L'œil ne glisse pas le long d'une ligne, il saute. Le saut le plus difficile est le retour au début de la suivante. Plus la ligne est longue, plus il est facile de tomber sur la mauvaise.",
  },
  "reading-order-mismatch": {
    plain: "L'ordre de tabulation contredit l'ordre visible",
    impact:
      "La page a déplacé des choses à l'écran sans les déplacer dans son propre code, et la touche Tab suit le code. Sur un duo comme Annuler et Envoyer, le bouton sous votre curseur n'est pas celui où se trouve le clavier.",
  },

  "forced-colors-focus-lost": {
    plain: "Le repère de focus disparaît en contraste élevé",
    impact:
      "Le mode contraste élevé retire les ombres et les couleurs avec lesquelles la plupart des repères de focus sont dessinés. Les gens qui ont le plus besoin de voir où ils sont ne voient rien, sur une page qui paraît parfaite tant que ce mode est éteint.",
  },
  "forced-colors-icon-lost": {
    plain: "Le bouton-icône disparaît en contraste élevé",
    impact:
      "L'icône est dessinée en image de fond, et ce mode retire les images de fond. Le bouton marche toujours, mais s'affiche comme une case vide : pas d'image, pas de libellé, rien qui indique un bouton.",
  },
  "keyboard-faint-focus": {
    plain: "Repère clavier trop pâle pour être vu",
    impact:
      "Tab déplace un curseur invisible, et le contour est la seule chose qui montre où il est arrivé. Trop pâle, un utilisateur au clavier ne peut pas savoir ce qu'il s'apprête à activer. Cela passe les tests parce qu'il y a bel et bien un contour.",
  },
  "keyboard-focus-trap": {
    plain: "Le focus clavier reste bloqué",
    impact:
      "Un utilisateur au clavier qui arrive ici ne peut pas aller plus loin. L'un des pires défauts qu'un site puisse avoir.",
  },

  "component-form-autocomplete": {
    plain: "Les champs bloquent le remplissage automatique",
    impact:
      "Tout le monde retape son nom, son courriel et son adresse à la main. Lent pour tous, un vrai obstacle pour certains.",
  },
  "component-input-type": {
    plain: "Des cases ordinaires pour courriel et téléphone",
    impact:
      "Sur téléphone, les visiteurs ont le clavier générique au lieu de celui avec le « @ » ou le pavé numérique. Plus de frappes, plus d'erreurs.",
  },
  "component-required-cue": {
    plain: "Champs obligatoires non signalés à l'œil",
    impact:
      "Personne ne sait qu'un champ était obligatoire avant que le formulaire ne le refuse. Les inscriptions échouent.",
  },
  "component-submit-clarity": {
    plain: "Pas de bouton d'envoi clairement libellé",
    impact:
      "Un bouton qui dit seulement « OK », qui n'affiche qu'une icône, ou qui manque tout court, laisse les gens sans savoir comment finir. Alors ils ne finissent pas.",
  },
  "component-nav-labels": {
    plain: "Plusieurs menus, aucun nommé",
    impact:
      "Les utilisateurs de lecteurs d'écran entendent « navigation… navigation… » sans moyen de distinguer le menu principal des liens de pied de page. Se déplacer sur votre site devient une devinette.",
  },
  "component-skip-link": {
    plain: "Pas de lien « aller au contenu »",
    impact:
      "Les utilisateurs au clavier parcourent tout votre menu sur chaque page. Des dizaines d'appuis en plus à chaque visite.",
  },

  "mobile-target-spacing": {
    plain: "Les cibles tactiles sont trop proches",
    found: (n) =>
      `${n} ${n === 1 ? "paire de contrôles se trouve" : "paires de contrôles se trouvent"} à moins de 8px l'une de l'autre en largeur téléphone. Chacun est assez grand tout seul ; ensemble, ils ne laissent aucune marge d'erreur.`,
    impact:
      "Un pouce n'est pas un curseur. Un doigt qui vise un contrôle et tombe sur son voisin appuie ou achète la mauvaise chose. Les personnes qui tremblent ou qui ont de gros doigts le rencontrent en premier.",
  },
  "consent-blocks-reader": {
    plain: "La bannière cookies bloque les lecteurs d'écran",
    found: () =>
      `La couche de consentement marque toute la page derrière elle comme masquée pour les lecteurs d'écran, et le focus clavier n'atteint jamais la couche elle-même.`,
    impact:
      "Un utilisateur de lecteur d'écran entend le silence là où la page devrait être. Il ne peut pas lire la page, et il ne peut pas trouver la bannière pour l'écarter.",
  },
  "mobile-sticky-coverage": {
    plain: "Les barres fixes envahissent l'écran du téléphone",
    found: () =>
      `Les en-têtes, bannières ou barres d'outils fixes occupent plus d'un tiers de l'écran en largeur téléphone.`,
    impact:
      "Chaque pixel fixe est un pixel à travers lequel le visiteur ne peut pas lire la page. Tout ce que le clavier atteint peut finir caché derrière les barres. WCAG 2.2 en fait déjà une exigence ; la loi n'y renvoie simplement pas encore.",
  },
  "mobile-horizontal-scroll": {
    plain: "La page défile de côté sur téléphone",
    impact:
      "La plupart des visiteurs sont sur téléphone. Balayer de côté pour lire chaque ligne les fait partir.",
  },
  "mobile-tap-target": {
    plain: "Cibles tactiles trop petites",
    impact:
      "Des appuis qui ratent, et de l'agacement. Pire avec de gros doigts, des tremblements, ou des mains qui bougent. Cela vous coûte des ventes.",
  },

  "text-spacing-clipped": {
    plain: "Texte coupé quand l'espacement s'élargit",
    impact:
      "Beaucoup de lecteurs dyslexiques élargissent l'espacement juste pour lire. Ici les mots ne se réagencent pas. Ils disparaissent derrière une boîte figée.",
  },
  "text-zoom-clipped": {
    plain: "Texte coupé en plus grande taille",
    impact:
      "Agrandir la police est le remède le plus courant à une vue faible, bien plus courant que les lecteurs d'écran. Vos boîtes ne bougent pas, donc les mots disparaissent.",
  },
  "text-zoom-horizontal-scroll": {
    plain: "Le texte agrandi défile de côté",
    impact:
      "Chaque ligne vous oblige à partir de côté. C'est épuisant, et la plupart des gens abandonnent.",
  },

  "dark-consent-no-reject": {
    plain: "Bannière cookies sans option de refus",
    impact:
      "Le RGPD exige que refuser soit aussi simple qu'accepter. Un consentement recueilli ainsi peut être invalide. Les visiteurs lisent l'absence de bouton « Refuser » comme une ruse.",
  },
  "dark-consent-asymmetry": {
    plain: "La bannière cookies minimise le refus",
    impact:
      "Une option en bouton et l'autre en simple texte pousse les gens à accepter. Les autorités cherchent exactement cela.",
  },
  "dark-preselected-optin": {
    plain: "Case marketing cochée d'avance",
    impact:
      "Le RGPD dit qu'une case pré-cochée n'est pas un consentement. Ceux qui ne la voient pas se retrouvent inscrits sans avoir accepté.",
  },
  "dark-confirmshaming": {
    plain: "Un « non merci » qui culpabilise",
    impact:
      "« Non merci, je ne veux pas économiser » marque les esprits pour de mauvaises raisons. Cela se lit comme de la manipulation.",
  },
  "dark-fake-scarcity": {
    plain: "Rareté annoncée à vérifier",
    impact:
      "Les autorités poursuivent la fausse rareté. Les acheteurs ont appris à s'en méfier. Les chiffres inventés coûtent plus de ventes qu'ils n'en rapportent.",
  },
  "dark-fake-urgency": {
    plain: "Pression du temps à vérifier",
    impact:
      "Un compte à rebours qui repart au rechargement est une pratique trompeuse. Une fois repéré, plus rien de ce que vous annoncez n'est cru.",
  },

  "dialog-close-unlabeled": {
    plain: "Bouton de fermeture sans libellé",
    impact:
      "Les utilisateurs de lecteurs d'écran n'entendent que « bouton » et ne savent pas comment fermer la fenêtre. Cela les piège, et beaucoup quitteront simplement votre site.",
  },
  "dialog-keyboard-trap": {
    plain: "Une fenêtre qui piège le clavier",
    impact:
      "Quelqu'un qui n'a que le clavier arrive à cette fenêtre et s'arrête. Échap ne la ferme pas, et Tab ne fait que tourner dedans. Fermer l'onglet est la seule issue. Sur une bannière cookies, cela arrive avant qu'il n'ait rien vu du tout.",
  },
  "dialog-no-escape": {
    plain: "La fenêtre ignore la touche Échap",
    impact:
      "Échap est la touche que tout le monde essaie en premier. Personne n'est bloqué ici, puisqu'on peut encore tabuler ailleurs. Mais chaque utilisateur au clavier l'essaie, et rien ne se passe.",
  },
  "dialog-focus-not-moved": {
    plain: "La fenêtre ne reçoit jamais le curseur",
    impact:
      "Quelqu'un qui se sert d'un lecteur d'écran n'apprend jamais qu'elle s'est ouverte. Un utilisateur au clavier doit parcourir toute la page en dessous avant d'atteindre ce qui couvre son écran.",
  },
  "dialog-focus-lost-on-close": {
    plain: "Fermer la fenêtre fait perdre sa place",
    impact: "Qui avait tabulé jusqu'à mi-page doit tout recommencer depuis le début.",
  },
  "dialog-no-close": {
    plain: "Pas de bouton de fermeture visible",
    impact: "Si cliquer à côté est la seule sortie, les utilisateurs au clavier restent coincés derrière.",
  },
  "dialog-missing-role": {
    plain: "Surcouche non signalée comme boîte de dialogue",
    impact:
      "Les lecteurs d'écran n'annoncent pas son ouverture, et les gens tabulent droit dans la page cachée derrière.",
  },
  "dialog-missing-name": {
    plain: "La fenêtre ne dit pas à quoi elle sert",
    impact:
      "À son ouverture, un lecteur d'écran dit seulement « boîte de dialogue ». Le visiteur n'a aucune idée de ce qu'elle demande ni pourquoi.",
  },

  "markup-validation": {
    plain: "Des erreurs dans le code de la page",
    impact:
      "Les navigateurs devinent en silence comment corriger, et chacun devine autrement. Votre page peut ne pas marcher comme vous le croyez.",
  },

  "motion-marquee": {
    plain: "Texte défilant impossible à arrêter",
    impact:
      "Un texte qui bouge est difficile à lire pour tout le monde. Pour qui a des troubles de l'attention ou de l'équilibre, il est inutilisable.",
  },
  "motion-autoplay-media": {
    plain: "Un média se lance tout seul",
    impact: "Personne ne peut l'arrêter. C'est déroutant, et cela couvre la voix des lecteurs d'écran.",
  },
  "motion-infinite-no-reduced-motion": {
    plain: "L'animation ignore le réglage « moins d'animations »",
    impact:
      "Un mouvement perpétuel détourne l'attention de votre contenu. Pour les personnes ayant des troubles de l'équilibre, il peut donner des vertiges ou des nausées.",
  },

  "typo-caps-letterspacing": {
    plain: "Capitales sans espacement des lettres",
    impact:
      "Les capitales forment des blocs uniformes ; sans un peu d'espace en plus entre elles, les titres et les libellés deviennent difficiles à parcourir.",
  },
  "typo-lowercase-letterspaced": {
    plain: "Espace forcé entre les lettres",
    impact:
      "Un espace ajouté entre les minuscules casse les formes de mots que les gens reconnaissent, et cela ralentit tout le monde.",
  },
  "typo-negative-letterspacing": {
    plain: "Lettres serrées jusqu'à se toucher",
    impact:
      "Des lettres à l'étroit se confondent entre elles. Surtout en petit corps ou pour les lecteurs malvoyants.",
  },
  "typo-line-length-long": {
    plain: "Les lignes sont trop longues",
    impact: "Passé environ 75 caractères par ligne, l'œil perd sa place en revenant au début.",
  },
  "typo-line-length-short": {
    plain: "Lignes coupées trop court",
    impact:
      "Quand presque chaque expression passe à la ligne, le rythme de lecture s'effondre. Le contenu paraît plus difficile qu'il n'est.",
  },
  "typo-justified-no-hyphens": {
    plain: "Texte justifié sans césure",
    impact:
      "Le texte justifié étire les espaces entre les mots pour remplir chaque ligne. Ces écarts irréguliers forment des « rivières » de blanc qui distraient le long de la page.",
  },
  "typo-font-size-small": {
    plain: "Texte courant très petit",
    impact:
      "Un petit texte écarte quiconque lit sur un téléphone, dans une lumière faible, ou avec une vue imparfaite.",
  },
  "typo-typeface-count": {
    plain: "Trop de polices de caractères",
    impact:
      "Plus de deux ou trois polices donne un air brouillon et rend la page moins digne de confiance.",
  },

  "typo-underline-nonlink": {
    plain: "Texte souligné qui n'est pas un lien",
    impact: "Un soulignement se lit comme un lien, donc les gens cliquent sur du texte qui ne mène nulle part.",
  },
  "typo-italic-body": {
    plain: "Des passages entiers en italique",
    impact:
      "Les lettres penchées deviennent difficiles au-delà de quelques mots. Un vrai obstacle en cas de dyslexie ou de vue faible.",
  },
  "typo-allcaps-block": {
    plain: "Longs passages EN CAPITALES",
    impact:
      "Les capitales effacent les formes de mots qui nous servent à lire. Lent et fatigant, pire pour les lecteurs dyslexiques.",
  },
  "typo-thin-weight": {
    plain: "Texte courant en graisse fine",
    impact:
      "Les traits fins s'effacent sur les écrans bon marché, au soleil, et pour une vue faible. Même quand le contraste est suffisant.",
  },
};

export const FIXES_FR: Record<string, string | string[]> = {
  "keyboard-mouse-only": [
    "Faites-en un vrai bouton ou un vrai lien, pour que le clavier l'atteigne comme le reste.",
    "Testez-le en posant la souris et en parcourant la page avec Tab.",
  ],
  "keyboard-faint-focus": [
    "Rendez le contour du clavier plus foncé et plus épais, pour qu'il ressorte sur la page derrière.",
    "Vérifiez-le sur chaque fond où il atterrit, pas seulement sur les blancs.",
  ],
  "timing-meta-refresh": [
    "Retirez le rechargement automatique de la page.",
    "S'il faut rafraîchir, donnez un bouton aux gens et laissez-les choisir le moment.",
  ],
  "aria-prohibited-attr": [
    "Mettez les mots dans l'élément lui-même, là où ils seront lus.",
    "Quand ce n'est pas possible, utilisez un élément fait pour porter un libellé.",
  ],
  "aria-required-parent": [
    "Remettez chaque morceau dans le contrôle auquel il appartient.",
    "Une entrée de menu toute seule n'est jamais annoncée comme faisant partie d'un menu.",
  ],
  "landmark-no-duplicate-main": [
    "Gardez une seule zone de contenu principal par page.",
    "Marquez les autres comme des sections ordinaires.",
  ],
  "landmark-banner-is-top-level":
    "Sortez l'en-tête du site au premier niveau, à côté du contenu principal plutôt que dedans.",
  "svg-img-alt": [
    "Écrivez une courte description pour chaque icône qui porte du sens.",
    "Masquez plutôt aux lecteurs d'écran celles qui sont purement décoratives.",
  ],
  "meta-viewport-large": [
    "Retirez le réglage qui bride le zoom.",
    "Laissez la page s'agrandir à au moins cinq fois sa taille normale.",
  ],
  "aria-dialog-name":
    "Donnez à la fenêtre un nom qui dit à quoi elle sert, pour qu'il soit annoncé à son ouverture.",
  "nested-interactive": [
    "Sortez le contrôle intérieur, pour qu'une seule chose soit cliquable plutôt que deux.",
    "Quand les deux sont nécessaires, mettez-les côte à côte au lieu de l'un dans l'autre.",
  ],
  "presentation-role-conflict": [
    "Retirez le marquage qui présente ceci comme une décoration.",
    "C'est un contrôle qui fonctionne, alors laissez-le s'annoncer comme tel.",
  ],
  "keyboard-no-visible-focus": [
    "Montrez un contour net autour de ce sur quoi le clavier se trouve.",
    "Faites-le assez épais et assez vif pour être trouvé sur une page chargée.",
    "Ne retirez jamais un contour sans en mettre un plus fort à sa place.",
  ],
  "readability-dense-prose": [
    "Ramenez les phrases à quinze ou vingt mots environ.",
    "Remplacez les mots techniques par des mots de tous les jours.",
    "Découpez les longs paragraphes, et servez-vous de titres et de listes.",
  ],
  "reading-order-mismatch": [
    "Remettez l'ordre du code en phase avec ce que les gens voient.",
    "Déplacez le contenu lui-même plutôt que de retoucher l'ordre de tabulation pour compenser.",
  ],
  "forced-colors-focus-lost": [
    "Testez la page en mode contraste élevé de Windows.",
    "Laissez le contour de focus prendre la couleur du système plutôt qu'une couleur figée.",
  ],
  "forced-colors-icon-lost": [
    "Testez la page en mode contraste élevé de Windows.",
    "Donnez aux boutons réduits à une icône une vraie bordure ou du texte, pour qu'ils y survivent.",
  ],
  "keyboard-focus-trap": [
    "Assurez-vous que Tab peut toujours avancer, et qu'Échap sort toujours.",
    "Testez-le en posant la souris et en n'utilisant que le clavier.",
  ],
  "component-form-autocomplete":
    "Indiquez pour chaque champ ce qu'il recueille, pour que navigateurs et gestionnaires de mots de passe le remplissent.",
  "component-input-type": [
    "Dites à la page quels champs contiennent un courriel, un numéro de téléphone ou une date.",
    "Les téléphones affichent alors le bon clavier au lieu d'un clavier ordinaire.",
  ],
  "component-required-cue": [
    "Signalez les champs obligatoires à l'œil, pas seulement dans le code.",
    "Le mot « obligatoire » à côté du libellé suffit.",
  ],
  "component-submit-clarity":
    "Donnez au formulaire un seul bouton clairement libellé qui dit ce qu'il fait, comme « Envoyer la demande ».",
  "component-nav-labels": [
    "Nommez chaque menu d'après ce qu'il contient, comme « Menu principal » ou « Liens du pied de page ».",
    "Plusieurs menus sans nom sont annoncés à l'identique, donc personne ne les distingue.",
  ],
  "component-skip-link": [
    "Ajoutez tout en haut un lien qui saute directement au contenu principal.",
    "Faites-le apparaître quand le clavier l'atteint, pour que les gens sachent qu'il existe.",
  ],
  "mobile-target-spacing":
    "Mettez un peu d'espace entre les boutons et les liens, pour qu'un pouce ne puisse pas en toucher deux à la fois.",
  "consent-blocks-reader": [
    "Amenez le focus clavier dans la bannière dès qu'elle s'ouvre.",
    "Gardez-le là jusqu'à ce qu'un choix soit fait — c'est ce qui rend correct le masquage de la page derrière.",
    "Ou cessez de masquer la page : une bannière posée en bas n'a besoin de rien de tout cela.",
  ],
  "mobile-sticky-coverage": [
    "Réduisez les barres fixées en haut et en bas sur téléphone.",
    "Laissez l'essentiel de l'écran au contenu que les gens sont venus lire.",
  ],
  "mobile-horizontal-scroll": [
    "Laissez le contenu se réagencer à la largeur de l'écran.",
    "Cherchez une largeur figée ou une image trop grande qui élargit la page.",
  ],
  "mobile-tap-target":
    "Faites les boutons et les liens au moins aussi grands qu'un bout de doigt, et laissez de la place autour.",
  "text-spacing-clipped": [
    "Laissez les boîtes grandir avec le texte qu'elles contiennent.",
    "C'est en général une hauteur figée qui coupe les mots.",
  ],
  "text-zoom-clipped": [
    "Laissez les conteneurs grandir quand le lecteur agrandit le texte.",
    "Vérifiez la page avec un texte deux fois plus grand que la normale.",
  ],
  "text-zoom-horizontal-scroll": [
    "Laissez la page se réagencer quand le texte est agrandi, au lieu de déborder sur le côté.",
    "C'est ce qui évite de lire une ligne en faisant défiler de côté à chaque mot.",
  ],
  "dark-consent-no-reject":
    "Mettez une option de refus sur la bannière cookies, aussi facile à trouver que celle qui accepte.",
  "dark-consent-asymmetry": [
    "Donnez à accepter et à refuser la même taille, le même style et la même place.",
    "Le choix n'est réel que si les deux options ont l'air également disponibles.",
  ],
  "dark-preselected-optin": [
    "Laissez décochées les cases de marketing et de partage.",
    "Laissez les gens s'inscrire eux-mêmes plutôt que d'avoir à se désinscrire.",
  ],
  "dark-confirmshaming":
    "Formulez le refus simplement, comme « Non merci », sans rien qui fasse la leçon.",
  "dark-fake-scarcity": [
    "N'affichez des chiffres de stock et de demande que là où ils sont vrais et à jour.",
    "Retirez tout chiffre qui n'est pas lu depuis de vraies données.",
  ],
  "dark-fake-urgency": [
    "Ne lancez un compte à rebours que là où la date limite est réelle.",
    "Retirez tout minuteur qui repart de zéro au rechargement de la page.",
  ],
  "dialog-close-unlabeled":
    "Donnez un nom au bouton de fermeture, pour qu'il soit annoncé « Fermer » et pas seulement comme une croix.",
  "dialog-keyboard-trap": [
    "Laissez Tab tourner dans la fenêtre tant qu'elle est ouverte.",
    "Laissez Échap la fermer et rendre la main à la page.",
  ],
  "dialog-no-escape": [
    "Laissez la touche Échap fermer la fenêtre.",
    "C'est la première touche vers laquelle les gens vont.",
  ],
  "dialog-focus-not-moved":
    "Amenez le curseur dans la fenêtre à son ouverture, pour que les utilisateurs au clavier démarrent dedans.",
  "dialog-focus-lost-on-close": [
    "Remettez le curseur sur ce qui a ouvert la fenêtre quand elle se ferme.",
    "Sinon les gens sont renvoyés en haut et doivent retrouver leur place.",
  ],
  "dialog-no-close": [
    "Donnez à chaque fenêtre un bouton de fermeture visible.",
    "Laissez Échap la fermer aussi.",
  ],
  "dialog-missing-role": [
    "Marquez la surcouche comme une boîte de dialogue, pour qu'elle soit annoncée à son ouverture.",
    "Donnez-lui un nom qui dit à quoi elle sert.",
    "Gardez le clavier dedans tant qu'elle est ouverte, et rendez-le à la fermeture.",
  ],
  "dialog-missing-name": "Donnez à la fenêtre un titre ou un nom qui dit à quoi elle sert.",
  "markup-validation": [
    "Passez la page au validateur du W3C et corrigez ce qu'il signale.",
    "Un code cassé, c'est de la devinette pour les lecteurs d'écran, et ils devinent différemment.",
  ],
  "motion-marquee": [
    "Remplacez le bandeau défilant par un texte qui reste immobile.",
    "S'il doit bouger, donnez aux gens un moyen de le mettre en pause.",
  ],
  "motion-autoplay-media": [
    "Empêchez le son et la vidéo de démarrer tout seuls.",
    "Si quelque chose doit se lancer, gardez-le sous trois secondes ou ajoutez un bouton d'arrêt.",
  ],
  "motion-infinite-no-reduced-motion": [
    "Respectez le réglage par lequel les gens demandent moins d'animations.",
    "Les animations doivent s'arrêter, ou devenir un simple fondu, quand il est activé.",
  ],
  "typo-caps-letterspacing":
    "Ajoutez un peu d'espace entre les lettres des titres en capitales, pour que les mots gardent leur forme.",
  "typo-lowercase-letterspaced": [
    "Retirez l'espacement des lettres ajouté au texte ordinaire.",
    "Il écarte les mots et ralentit la lecture.",
  ],
  "typo-negative-letterspacing": [
    "Cessez de serrer les lettres les unes contre les autres.",
    "Des lettres qui se touchent sont lues comme une seule forme.",
  ],
  "typo-justified-no-hyphens": [
    "Alignez le texte à gauche plutôt que de le justifier.",
    "S'il doit être justifié, activez la césure pour que les espaces entre les mots restent réguliers.",
  ],
  "typo-typeface-count": [
    "Tenez-vous-en à deux polices, trois au plus.",
    "Variez par la graisse et la taille plutôt que par une police de plus.",
  ],
  "typo-underline-nonlink": [
    "Gardez le soulignement pour les liens seulement.",
    "Servez-vous du gras ou de l'italique pour mettre en valeur.",
  ],
  "typo-italic-body": [
    "Composez les longs passages en romain, et gardez l'italique pour une expression à la fois.",
    "L'italique est plus difficile à lire sur la longueur, surtout à l'écran.",
  ],
  "typo-allcaps-block": [
    "Composez les longs passages en minuscules ordinaires.",
    "Les capitales effacent les formes de mots qui nous servent à lire, alors gardez-les pour de courts libellés.",
  ],
  "typo-thin-weight": [
    "Composez le texte courant dans une graisse normale.",
    "Les graisses très fines disparaissent sur les écrans ordinaires et en pleine lumière.",
  ],

  "aria-allowed-role": [
    "Utilisez un élément qui est vraiment ce qu'il prétend être.",
    "Un bouton pour un bouton, un bloc de navigation pour la navigation.",
  ],
  "aria-allowed-attr":
    "Retirez les réglages qui n'ont pas leur place sur ce type d'élément, ou changez-le pour un élément qui les accepte.",
  "aria-required-children": [
    "Donnez au composant les parties que son propre type exige.",
    "Une liste a besoin d'entrées de liste à l'intérieur, pas de texte en vrac.",
  ],
  "landmark-unique": [
    "Nommez chaque zone d'après ce qu'elle contient, comme « Menu principal » ou « Liens du pied de page ».",
    "Des zones qui portent le même nom sont annoncées à l'identique, donc personne ne les distingue.",
  ],
  "landmark-no-duplicate-banner": [
    "Gardez un seul en-tête de site, au premier niveau de la page.",
    "Transformez les autres en conteneurs ordinaires.",
  ],
  "landmark-no-duplicate-contentinfo": [
    "Gardez un seul pied de page, au premier niveau de la page.",
    "Transformez les autres en conteneurs ordinaires.",
  ],
  "landmark-contentinfo-is-top-level":
    "Sortez le pied de page pour qu'il soit au premier niveau de la page, et non dans une autre zone.",
  "skip-link": [
    "Pointez le lien d'évitement vers le contenu principal, et vérifiez que cette cible existe.",
    "Assurez-vous que le clavier y atterrit quand le lien est utilisé.",
  ],
  "image-redundant-alt":
    "Donnez à l'image un texte alternatif vide (alt=\"\") quand le texte à côté dit déjà la même chose.",
  "color-contrast": [
    "Foncez le texte, ou éclaircissez ce qui se trouve derrière.",
    "Un texte ordinaire demande un rapport de contraste d'au moins 4.5:1.",
    "Un grand texte, environ 24px ou 19px en gras, demande 3:1.",
  ],
  "image-alt": [
    "Écrivez une courte description pour chaque image qui porte du sens.",
    "Dites ce qu'elle montre, pas que c'est une image.",
    "Laissez la description vide pour les images purement décoratives.",
  ],
  "input-image-alt":
    "Décrivez ce que fait le bouton-image, comme « Rechercher », plutôt que ce à quoi il ressemble.",
  "link-name": [
    "Mettez des mots lisibles dans chaque lien.",
    "Pour un lien-icône, ajoutez un libellé qui dit où il mène, pas à quoi il ressemble.",
    "Quand le lien affiche déjà des mots, gardez ces mots exacts dans le libellé.",
    "Les utilisateurs de commande vocale disent ce qu'ils voient, donc les deux doivent correspondre.",
  ],
  "link-text-vague": [
    "Écrivez un texte de lien qui a du sens lu tout seul.",
    "« Lire les changements de tarifs 2026 » plutôt que « En savoir plus ».",
    "Pour garder la version courte à l'écran, ajoutez la formulation complète en libellé.",
  ],
  "button-name": [
    "Donnez à chaque bouton des mots qui disent ce qu'il fait.",
    "Pour un bouton-icône, ajoutez un libellé qui décrit l'action.",
    "Quand le bouton affiche déjà des mots, gardez ces mots exacts dans le libellé.",
    "Les utilisateurs de commande vocale disent ce qu'ils voient, donc les deux doivent correspondre.",
  ],
  label: [
    "Donnez à chaque champ un libellé visible qui dit ce qu'on y met.",
    "Vérifiez qu'un clic sur le libellé place le curseur dans son champ.",
  ],
  "select-name": [
    "Donnez à la liste déroulante un libellé visible qui dit ce qu'elle sert à choisir.",
    "Quand il n'y a pas la place, ajoutez plutôt un nom pour les lecteurs d'écran.",
  ],
  "document-title":
    "Donnez à la page un titre qui la décrit. C'est ce qui s'affiche dans l'onglet du navigateur et dans les résultats de recherche.",
  "html-has-lang":
    "Indiquez à la page dans quelle langue elle est écrite, pour que les lecteurs d'écran prennent la bonne voix.",
  "html-lang-valid":
    "Corrigez le réglage de langue de la page avec un vrai code de langue, comme le français ou l'allemand.",
  "heading-order": [
    "Employez les titres dans l'ordre, sans sauter de niveau.",
    "Ne passez pas d'un titre de deuxième niveau directement à un quatrième.",
  ],
  "page-has-heading-one": "Ajoutez un <h1> près du haut qui dit de quoi parle la page.",
  "empty-heading": "Mettez du texte dans le titre, ou retirez la balise de titre vide.",
  "link-in-text-block":
    "Donnez aux liens dans le texte un second repère visuel en plus de la couleur, en général un soulignement.",
  "meta-viewport":
    "Retirez le réglage qui bloque le zoom, pour que la page puisse grandir autant qu'un lecteur en a besoin.",
  "frame-title":
    "Donnez à chaque cadre intégré un nom qui dit ce qu'il contient, comme « Plan d'accès ».",
  "duplicate-id-active": "Rendez chaque id de la page unique. Deux éléments ne doivent jamais en partager un.",
  list: [
    "Codez les vraies listes comme des listes, chaque entrée dans la même liste.",
    "Les lecteurs d'écran annoncent alors combien il y a d'entrées.",
  ],
  listitem: "Mettez chaque entrée de liste dans une liste, plutôt que de la laisser toute seule.",
  "aria-required-attr": [
    "Ajoutez les attributs que le type de ce composant exige.",
    "Le lien En savoir plus en donne la liste exacte.",
  ],
  "aria-hidden-focus": [
    "Ce qui est masqué aux lecteurs d'écran ne doit pas être atteignable au clavier.",
    "Soit vous le démasquez, soit vous le sortez aussi de l'ordre de tabulation.",
  ],
  region: [
    "Mettez chaque partie de la page dans une zone nommée : en-tête, navigation, contenu principal, pied de page.",
    "Le contenu qui reste dehors est sauté par ceux qui passent d'une section à l'autre.",
  ],
  "landmark-one-main":
    "Marquez le contenu principal de la page comme sa zone principale, et n'en mettez qu'une par page.",
  tabindex:
    'Retirez les valeurs de tabindex positives (tabindex="1" ou plus) et laissez l\'ordre naturel de la page fixer l\'ordre du focus.',
  "scrollable-region-focusable":
    'Ajoutez tabindex="0" au conteneur défilant pour que les utilisateurs au clavier puissent le faire défiler.',
};

export const UNDECIDED_FR: Record<string, { what: string; ask: string }> = {
  "color-contrast": {
    what: "Du texte posé sur une photo, une vidéo ou un dégradé. Le vérificateur lit bien la couleur du texte. Il n'y a pas une seule couleur derrière pour la mesurer, alors il ne devine pas.",
    ask: "Demandez à votre designer de regarder chacun sur l'image qui est derrière, au plus clair et au plus foncé de cette image. Là où les mots se perdent, il leur faut un panneau plein derrière, un voile foncé sur l'image, ou une autre position.",
  },
  "link-in-text-block": {
    what: "Des liens dans un paragraphe qui ne sont peut-être signalés que par leur couleur. Le vérificateur ne peut pas dire si la différence est assez forte pour tenir toute seule.",
    ask: "Demandez à votre designer si ces liens restent repérables une fois la couleur retirée. Si la couleur est la seule chose qui les marque, il leur faut un soulignement ou un autre repère visible.",
  },
  "video-caption": {
    what: "Une vidéo que le vérificateur voit et ne peut pas regarder. Il n'a aucun moyen de savoir si des sous-titres existent, ni s'ils sont bons.",
    ask: "Demandez à qui a fait la vidéo si elle porte des sous-titres et si une personne les a corrigés. Des sous-titres générés automatiquement ne suffisent pas.",
  },
  "media-video-captions": {
    what: "Une vidéo sur la page sans fichier de sous-titres. Ce n'est pas une preuve qu'il en faut : un extrait muet n'a besoin de rien, et des sous-titres incrustés dans l'image comptent mais ne laissent aucun fichier.",
    ask: "Demandez à qui a fait chaque vidéo si quelqu'un y parle. Là où c'est le cas, il faut des sous-titres, corrigés par une personne. Des sous-titres générés automatiquement ne suffisent pas.",
  },
  "media-video-descriptions": {
    what: "Une vidéo sous-titrée sans rien qui décrive ce qui est à l'écran. Les sous-titres portent les paroles ; ils ne portent pas l'image.",
    ask: "Demandez si quelque chose dans ces vidéos est montré plutôt que dit — un graphique, une démonstration, du texte à l'écran. Si oui, la bande son doit le décrire. Une version écrite sur la page ne couvre que le niveau le plus bas de la norme.",
  },
  "form-error-association": {
    what: "Des messages d'erreur de formulaire qui ne sont pas rattachés à leur champ dans le code. Un lecteur d'écran annonce le champ, mais pas l'erreur posée à côté.",
    ask: "Demandez à votre développeur de relier chaque message à son champ avec aria-describedby. Le lecteur entend alors le problème au moment où il entend le champ.",
  },
  "media-audio-transcript": {
    what: "Du son sur la page. Une transcription est du texte de page ordinaire, donc le vérificateur n'a aucun moyen de savoir s'il y en a une.",
    ask: "Vérifiez que chaque enregistrement a ses paroles écrites sur la page près du lecteur, et que ce texte couvre tout ce qui est dit.",
  },
  "media-embedded-player": {
    what: "Une vidéo diffusée par le lecteur d'une autre société. La vidéo vit chez eux, donc le vérificateur ne peut pas regarder dedans.",
    ask: "Ouvrez chacune et activez les sous-titres. Si l'option manque ou si les sous-titres sont faux, corrigez-les là où la vidéo est hébergée.",
  },
  "consent-layer-in-frame": {
    what: "La couche de consentement arrive du site d'une autre société, dans un cadre. L'analyse ne peut pas entrer dedans pour juger ce qu'un lecteur d'écran y rencontre.",
    ask: "Faites essayer la bannière à quelqu'un avec un lecteur d'écran. Demandez si elle est annoncée, si le focus l'atteint, et si refuser est aussi simple qu'accepter.",
  },
  "consent-layer-unheralded": {
    what: "Une couche cookies qui ne se présente jamais. Elle ne porte ni rôle de dialogue ni nom, et le focus clavier ne l'atteint jamais.",
    ask: "Faites essayer la page à quelqu'un avec un lecteur d'écran. Si la couche n'est jamais annoncée, il lui faut un rôle de dialogue, un nom, et le focus amené dedans à son ouverture.",
  },
  "consent-trap-unnamed": {
    what: "Le focus clavier reste dans la couche cookies, mais la couche ne dit jamais ce qu'elle est. Ni rôle de dialogue, ni nom.",
    ask: "Demandez à votre développeur de marquer la couche comme une boîte de dialogue et de la nommer. Un piège sans libellé laisse un utilisateur de lecteur d'écran coincé dans quelque chose d'anonyme.",
  },
  "interaction-motion-actuation": {
    what: "La page réagit au téléphone qu'on penche ou qu'on secoue. Quelqu'un qui garde son téléphone sur un support, ou dont les mains tremblent, ne peut pas faire cela.",
    ask: "Demandez à votre développeur si chaque action par inclinaison ou secousse peut aussi se faire en touchant quelque chose à l'écran. Demandez ensuite si la réaction au mouvement peut être désactivée, pour qu'une main qui tremble ne la déclenche pas par accident.",
  },
  "interaction-gesture-listeners": {
    what: "La page guette les balayages ou les glissements. Quelqu'un qui tremble, ou qui pilote un pointeur à la voix ou par contacteur, ne peut peut-être pas en tracer un.",
    ask: "Demandez à votre développeur si chaque balayage ou glissement peut aussi se faire en touchant : des flèches à côté d'un carrousel, un bouton à côté d'un curseur de réglage.",
  },
  "interaction-key-shortcuts": {
    what: "La page guette les appuis de touches sur tout l'écran. Quand une simple lettre est un raccourci, quiconque parle à son ordinateur le déclenche en parlant.",
    ask: "Demandez à votre développeur si un raccourci est une lettre ou un chiffre tout seul. Chacun doit pouvoir être désactivé, modifié, ou n'être actif que pendant que le contrôle a le focus.",
  },
  "interaction-unmarked-language": {
    what: "Des passages écrits dans un autre alphabet que le reste de la page, sans rien qui dise de quelle langue il s'agit. Un lecteur d'écran les lit avec la mauvaise prononciation, ce qui peut les rendre incompréhensibles.",
    ask: "Demandez à votre développeur de marquer chaque passage avec sa langue. Seul un changement d'alphabet se repère automatiquement, alors demandez aussi pour les passages dans une autre langue qui partage le nôtre.",
  },
  "interaction-title-tooltip": {
    what: "Des infobulles construites avec l'attribut title. Elles n'apparaissent qu'au survol, donc un visiteur au clavier ou sur écran tactile ne les voit jamais. On ne peut pas non plus les écarter, et elles disparaissent si vous allez vers elles pour finir de lire.",
    ask: "Demandez à votre développeur si quelque chose d'important s'y cache. Si oui, mettez-le sur la page, ou construisez une infobulle qui reste en place et se ferme avec Échap.",
  },
  "interaction-orientation-lock": {
    what: "Une feuille de style fait ici pivoter la page en arrière, ou la masque, quand le téléphone est tourné. C'est la forme d'une page bloquée dans un seul sens. Ce peut aussi être un affichage paysage voulu pour quelque chose de large.",
    ask: "Demandez à votre développeur si la page marche dans les deux sens. Quelqu'un dont le téléphone est fixé à un fauteuil roulant ou à un support ne peut pas le tourner pour s'adapter au site.",
  },
  "interaction-no-status-region": {
    what: "Les pages se mettent à jour sans recharger — un filtre réduit une liste, un formulaire dit qu'il a enregistré. Rien sur cette page n'est marqué comme l'endroit où un tel changement est dit à voix haute. Un lecteur d'écran reste muet pendant que la page bouge.",
    ask: "Demandez à votre développeur si quelque chose se met à jour ici sans chargement de page. Si oui, cette mise à jour a besoin d'une région vivante pour être dite autant que montrée.",
  },
  "interaction-acts-on-change": {
    what: "Des menus ou des cases à cocher qui semblent agir dès qu'on les règle, au lieu d'attendre un bouton. Nous l'avons lu dans le code sans l'essayer : régler des contrôles sur votre site en ligne pourrait passer une vraie commande.",
    ask: "Demandez à votre développeur si choisir une option ici envoie le formulaire ou change de page. Si oui, ajoutez un bouton qui le fait à la place, ou prévenez les gens avant le contrôle.",
  },
  "interaction-pointer-cancellation": {
    what: "Des contrôles qui agissent dès qu'on appuie plutôt qu'au relâchement. Appuyez sur l'un par erreur et il n'y a aucun moyen de glisser à côté avant de lâcher.",
    ask: "Demandez à votre développeur de les faire agir au relâchement. Quiconque a la main qui glisse, ou met un instant à viser, peut alors s'écarter avant de lever le doigt.",
  },
  "aria-valid-attr-value": {
    what: "Des libellés de code qui renvoient à une autre partie de la page. Le vérificateur ne peut pas toujours dire si ce qu'ils désignent est vraiment là.",
    ask: "Demandez à votre développeur de confirmer que chaque id désigné par un attribut aria existe sur la page. Aucun ne doit se trouver dans un bloc qui est masqué ou retiré.",
  },
  "aria-allowed-role": {
    what: "Des parties de la page désignées dans le code comme quelque chose qu'elles ne peuvent peut-être pas être. Que ce soit faux dépend du comportement du composant.",
    ask: "Demandez à votre développeur de confirmer que chacune se comporte comme son rôle le promet, clavier compris. Sinon, abandonnez le rôle et prenez l'élément natif.",
  },
  "aria-prohibited-attr": {
    what: "Un élément portant un nom que le code ne le laisse peut-être pas garder. Qu'il survive dépend du rôle de l'élément.",
    ask: "Demandez à votre développeur de vérifier que chacun est annoncé avec le nom que vous vouliez. Là où ce n'est pas le cas, déplacez le nom sur un élément autorisé à en porter un.",
  },
  "css-orientation-lock": {
    what: "Des styles qui bloquent peut-être la page en portrait ou en paysage. La vérification qui a trouvé cela est expérimentale, d'où une question plutôt qu'un constat.",
    ask: "Demandez à votre développeur si la page pivote avec l'appareil. Certaines personnes fixent un téléphone ou une tablette de fauteuil roulant dans un seul sens et ne peuvent pas le tourner.",
  },
  "duplicate-id-aria": {
    what: "Un id peut-être utilisé plus d'une fois. Chaque libellé de code qui le désigne ne suit que le premier, donc un nom peut s'attacher en silence au mauvais élément.",
    ask: "Demandez à votre développeur de rendre chaque id de la page unique, en commençant par ceux auxquels un attribut aria renvoie.",
  },
};

export const PRINCIPLES_FR: Record<
  string,
  { principleLabel: string; plainTitle: string; plainDescription: string }
> = {
  "1": {
    principleLabel: "Perceptible",
    plainTitle: "Peut-on le voir et l'entendre ?",
    plainDescription:
      "Tout ce que les gens ne peuvent ni voir ni entendre : du texte trop pâle pour être lu, des images dont rien ne dit ce qu'elles montrent, et des vidéos sans sous-titres.",
  },
  "2": {
    principleLabel: "Utilisable",
    plainTitle: "Peut-on s'en servir ?",
    plainDescription:
      "Savoir si quelqu'un peut vraiment traverser votre site, au clavier plutôt qu'à la souris, sur un téléphone, ou sans contrôle fin de ses mains.",
  },
  "3": {
    principleLabel: "Compréhensible",
    plainTitle: "Peut-on le suivre ?",
    plainDescription:
      "Savoir si vos mots et votre mise en page ont du sens, et si le site se comporte comme les gens s'y attendent.",
  },
  "4": {
    principleLabel: "Robuste",
    plainTitle: "Est-ce que cela continuera de marcher ?",
    plainDescription:
      "Savoir si votre site marche encore correctement dans d'autres navigateurs, sur d'autres appareils, et avec les logiciels qui le lisent à voix haute aux visiteurs aveugles.",
  },
};

export const LEVEL_FRAMING_FR: Partial<Record<"A" | "AA" | "AAA", string>> = {
  A: "Exigence de base (niveau A)",
  AA: "Exigé par la loi dans la plupart des pays (niveau AA)",
  AAA: "Avancé (niveau AAA) : une bonne idée, ni obligatoire ni comptée",
};
