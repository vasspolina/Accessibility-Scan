/* French conformance rows. Keyed by criterion id; a row missing here falls
   back to the English text. `plain` stays a question, `failing` stays a
   statement with no closing full stop. */
export const CRITERIA_FR: Record<string, { plain: string; failing: string }> = {
  // ---- Perceptible ------------------------------------------------------
  "1.1.1": {
    plain: "Les images ont-elles une description pour ceux qui ne les voient pas ?",
    failing: "Des images n'ont pas de description pour ceux qui ne les voient pas",
  },
  "1.2.1": {
    plain: "Les fichiers audio et vidéo ont-ils une version texte ?",
    failing: "Les fichiers audio et vidéo n'ont aucune version texte",
  },
  "1.2.2": {
    plain: "Vos vidéos ont-elles des sous-titres ?",
    failing: "Les vidéos se lisent sans sous-titres",
  },
  "1.2.3": {
    plain: "Les vidéos disent-elles à voix haute ce qui est montré à l'écran ?",
    failing: "Les vidéos ne disent jamais à voix haute ce qui est à l'écran",
  },
  "1.2.4": {
    plain: "La vidéo en direct a-t-elle des sous-titres en direct ?",
    failing: "La vidéo en direct passe sans sous-titres",
  },
  "1.2.5": {
    plain: "Les vidéos ont-elles une description parlée de ce qui est à l'écran ?",
    failing: "Les vidéos n'ont aucune description parlée de ce qui est à l'écran",
  },
  "1.3.1": {
    plain: "Vos listes et vos titres existent-ils dans le code, et pas seulement dans le design ?",
    failing: "Les listes et les titres ont l'air corrects à l'écran mais le code ne dit pas ce qu'ils sont",
  },
  "1.3.2": {
    plain: "Les lecteurs d'écran lisent-ils la page dans un ordre sensé ?",
    failing: "Les lecteurs d'écran lisent des parties de la page dans le désordre",
  },
  "1.3.3": {
    plain: "Les consignes marchent-elles sans voir la forme, la taille ou la position ?",
    failing: "Les consignes obligent à voir la forme, la taille ou la position",
  },
  "1.3.4": {
    plain: "La page marche-t-elle téléphone tenu de côté ?",
    failing: "La page ne marche pas quand le téléphone est tenu de côté",
  },
  "1.3.5": {
    plain: "Les champs de formulaire disent-ils à quoi ils servent, pour que les navigateurs les remplissent ?",
    failing:
      "Les champs de formulaire ne disent pas à quoi ils servent, donc les navigateurs ne peuvent pas les remplir",
  },
  "1.4.1": {
    plain: "Quelque chose est-il indiqué par la couleur seule ?",
    failing: "La couleur seule porte le sens, donc les visiteurs daltoniens le manquent",
  },
  "1.4.2": {
    plain: "Le son qui démarre tout seul peut-il être coupé ?",
    failing: "Le son démarre tout seul et ne peut pas être coupé",
  },
  "1.4.3": {
    plain: "Le texte est-il assez foncé pour se lire sur son fond ?",
    failing: "Le texte est trop pâle pour se lire sur son fond",
  },
  "1.4.4": {
    plain: "Le texte reste-t-il lisible quand on l'agrandit ?",
    failing: "Le texte est coupé quand on l'agrandit",
  },
  "1.4.5": {
    plain: "Le texte est-il du vrai texte, plutôt qu'une image de texte ?",
    failing: "Les images de texte deviennent floues quand on les agrandit",
  },
  "1.4.10": {
    plain: "La page tient-elle dans un écran de téléphone sans défiler de côté ?",
    failing: "La page défile de côté sur un téléphone",
  },
  "1.4.11": {
    plain: "Les boutons et les icônes sont-ils assez foncés pour se distinguer ?",
    failing: "Les boutons et les icônes sont trop pâles pour se distinguer",
  },
  "1.4.12": {
    plain: "La page tient-elle quand on espace le texte pour le lire ?",
    failing: "Le texte se chevauche et s'emmêle quand on l'espace pour le lire",
  },
  "1.4.13": {
    plain: "Les fenêtres surgissantes peuvent-elles être fermées, et restent-elles à l'écart ?",
    failing: "Les fenêtres surgissantes ne peuvent pas être fermées, ou couvrent ce que vous lisiez",
  },

  // ---- Utilisable -------------------------------------------------------
  "2.1.1": {
    plain: "Est-ce que tout marche sans souris ?",
    failing: "Des parties de la page ne marchent qu'à la souris",
  },
  "2.1.2": {
    plain: "Les utilisateurs au clavier peuvent-ils toujours ressortir avec Tab ?",
    failing: "Les utilisateurs au clavier restent coincés et ne peuvent pas ressortir avec Tab",
  },
  "2.1.4": {
    plain: "Les raccourcis à une seule touche peuvent-ils être désactivés ?",
    failing:
      "Les raccourcis à une seule touche ne peuvent pas être désactivés, donc les utilisateurs vocaux les déclenchent par accident",
  },
  "2.2.1": {
    plain: "Une limite de temps peut-elle être prolongée ou supprimée ?",
    failing: "Une limite de temps ne peut être ni prolongée ni supprimée",
  },
  "2.2.2": {
    plain: "Le contenu en mouvement peut-il être arrêté ?",
    failing: "Le contenu en mouvement ne peut pas être arrêté",
  },
  "2.3.1": {
    plain: "Quelque chose clignote-t-il assez vite pour déclencher une crise ?",
    failing: "Quelque chose clignote assez vite pour déclencher une crise",
  },
  "2.4.1": {
    plain: "Existe-t-il un moyen de sauter le menu pour aller au contenu principal ?",
    failing: "Il n'y a aucun moyen de sauter le menu pour aller au contenu principal",
  },
  "2.4.2": {
    plain: "L'onglet du navigateur dit-il ce qu'est cette page ?",
    failing: "L'onglet du navigateur ne dit pas ce qu'est cette page",
  },
  "2.4.3": {
    plain: "La tabulation parcourt-elle la page dans l'ordre où elle se lit ?",
    failing: "La tabulation saute d'un endroit à l'autre dans un ordre déroutant",
  },
  "2.4.4": {
    plain: "Chaque lien dit-il où il mène ?",
    failing: "Les liens ne disent pas où ils mènent",
  },
  "2.4.5": {
    plain: "Y a-t-il plus d'un chemin pour atteindre une page ?",
    failing: "Les pages ne s'atteignent que d'une seule façon",
  },
  "2.4.6": {
    plain: "Les titres et les libellés décrivent-ils ce qu'il y a en dessous ?",
    failing: "Les titres et les libellés ne décrivent pas ce qu'il y a en dessous",
  },
  "2.4.7": {
    plain: "Voyez-vous où vous êtes pendant la tabulation ?",
    failing: "On ne voit pas où l'on est pendant la tabulation",
  },
  "2.5.1": {
    plain: "Y a-t-il un moyen plus simple pour tout ce qui demande un balayage ou un pincement ?",
    failing: "Un balayage ou un pincement est le seul moyen de faire quelque chose",
  },
  "2.5.2": {
    plain: "Qui touche la mauvaise chose peut-il glisser le doigt à côté pour l'annuler ?",
    failing: "Toucher la mauvaise chose ne s'annule pas en glissant le doigt à côté",
  },
  "2.5.3": {
    plain: "Le nom lu d'un bouton correspond-il aux mots écrits dessus ?",
    failing: "Le nom lu d'un bouton ne correspond pas aux mots écrits dessus",
  },
  "2.5.4": {
    plain: "Y a-t-il un contrôle normal pour tout ce qui marche en secouant ou en penchant ?",
    failing: "Une action ne marche qu'en secouant ou en penchant l'appareil",
  },

  // ---- Compréhensible ---------------------------------------------------
  "3.1.1": {
    plain: "La page dit-elle en quelle langue elle est écrite ?",
    failing: "La page ne dit pas en quelle langue elle est écrite, donc les lecteurs d'écran la prononcent mal",
  },
  "3.1.2": {
    plain: "Les mots dans une autre langue sont-ils marqués comme tels ?",
    failing: "Les mots dans une autre langue ne sont pas marqués, donc ils sont lus de travers",
  },
  "3.2.1": {
    plain: "Quelque chose change-t-il rien qu'en tabulant dessus ?",
    failing: "Tabuler sur quelque chose change la page",
  },
  "3.2.2": {
    plain: "Remplir un champ change-t-il la page de façon inattendue ?",
    failing: "Remplir un champ change la page de façon inattendue",
  },
  "3.2.3": {
    plain: "Le menu reste-t-il à la même place sur chaque page ?",
    failing: "Le menu se déplace d'une page à l'autre",
  },
  "3.2.4": {
    plain: "La même chose porte-t-elle le même nom partout ?",
    failing: "La même chose porte des noms différents à différents endroits",
  },
  "3.3.1": {
    plain: "Les erreurs de formulaire disent-elles quel champ est en faute ?",
    failing: "Les erreurs de formulaire ne disent pas quel champ est en faute",
  },
  "3.3.2": {
    plain: "Les champs de formulaire disent-ils quoi saisir ?",
    failing: "Les champs de formulaire ne disent pas quoi saisir",
  },
  "3.3.3": {
    plain: "Les messages d'erreur disent-ils comment régler le problème ?",
    failing: "Les messages d'erreur ne disent pas comment régler le problème",
  },
  "3.3.4": {
    plain: "Les envois importants peuvent-ils être vérifiés ou annulés ?",
    failing: "Les envois importants ne peuvent être ni vérifiés ni annulés",
  },

  // ---- Robuste ----------------------------------------------------------
  "4.1.1": {
    plain: "Le code de la page est-il exempt d'erreurs qui embrouillent les lecteurs d'écran ?",
    failing: "Le code de la page contient des erreurs qui peuvent embrouiller les lecteurs d'écran",
  },
  "4.1.2": {
    plain: "Les boutons et les menus disent-ils aux lecteurs d'écran ce qu'ils sont ?",
    failing: "Les boutons et les menus ne disent pas aux lecteurs d'écran ce qu'ils sont",
  },
  "4.1.3": {
    plain: "Les mises à jour comme « ajouté au panier » sont-elles annoncées à voix haute ?",
    failing: "Les mises à jour comme « ajouté au panier » ne sont pas annoncées à voix haute",
  },
};
