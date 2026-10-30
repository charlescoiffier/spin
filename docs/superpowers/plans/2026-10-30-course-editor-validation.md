# Éditeur intégré — validation de livraison

Fonctions livrées : éditeur souris/tactile avec grille et historique, stockage local
versionné et JSON, palettes, contours de l’union des blocs, trois conditions
d’arrivée, podium local nommé, interface française compacte et panneau repliable,
recul de laboratoire jusqu’à 100 px.

## Vérifications

- 51 tests passent : cinématique et collisions, contours jointifs/partiels/chevauchants,
  trous, arrivées, document d’édition, sauvegarde/version, podium, contrôles et parcours.
- TypeScript et build Vite réussissent ; l’avertissement habituel de taille du bundle Phaser subsiste.
- Navigateur : dessin de murs jointifs, sélection, annuler/rétablir, titre, couleurs,
  sauvegarde et présence dans la liste, trois arrivées en essai, retour conservant
  l’édition, trois noms dans le podium et persistance après rechargement.
- Export réel du JSON puis réimportation par le sélecteur de fichier réussis.
- Repli/réouverture, redimensionnement et interface en 390×844 et 1280×800 contrôlés.
- Relecture indépendante du changement complet, puis correction des trois problèmes importants
  avec tests de régression ayant échoué avant correction : clic de sélection qui réalignait
  des éléments ; API UUID absente en HTTP local ; IDs de murs importés confondus avec départ/arrivée.
- Vérification navigateur après correction : sélection n’ajoute pas d’historique,
  podium masqué dans les essais et libellé « Essai sans classement ».

## Interprétations et limites

- « Une boule arrêtée » signifie le pivot entièrement dans la zone et immobile,
  sans recul ; « taper » signifie contact physique d’une boule ou de la barre.
- Palette commune par parcours : les blocs partagent leur remplissage et leur contour.
- Podium et parcours sont locaux à ce navigateur. Aucun serveur ou classement public ajouté.
- La grille de 20 px et les tailles minimales sont des choix de réalisation ; la
  validation ne prouve pas la traversabilité, qui se contrôle en jouant.
- Le surlignage orange de sélection représente un outil d’édition ; il n’apparaît pas en course.
- Essais physiques sur téléphone et confort tactile réel non effectués. L’API absente
  en HTTP local est couverte par une simulation de capacité du navigateur dans les tests.
