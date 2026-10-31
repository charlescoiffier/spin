# SPIN — Document cadre

Date : 31 octobre 2026. Statut : cadrage validé par le créateur du projet dans la conversation du 31 octobre 2026. Les propositions explicitement signalées restent des valeurs initiales à éprouver lors des essais.

## 1. Intention et périmètre

Faire évoluer le prototype en jeu d’arcade mobile et navigateur, jouable seul ou à plusieurs, autour d’une commande unique : changer de pivot et inverser la rotation de deux boules reliées par une barre. Le plaisir recherché combine maîtrise du déplacement, courses rapides et bousculades parfois chaotiques.

Ce document décrit la cible à terme, pas le contenu d’une seule livraison. L’ordre validé est : course multijoueur avec comptes et terrains sauvegardés, puis combat, puis capture de drapeau. Les améliorations de l’éditeur accompagnent ces étapes. Douze terrains de base sont prévus à terme : quatre par mode.

« Validé » désigne une demande ou une réponse explicite du créateur du projet. « Proposition » désigne un choix de cadrage recommandé, ajustable avant réalisation. Les valeurs d’équilibrage proposées ne sont pas des règles déjà approuvées.

## 2. Base existante et contraintes

Le prototype utilise Phaser 3, TypeScript et Vite. Il possède une cinématique sans moteur physique, un pas de simulation fixe, les contacts avec des murs rectangulaires, une caméra indépendante, trois parcours, un podium local, un laboratoire et un éditeur avec sauvegarde locale et import/export JSON.

Les réglages du laboratoire peuvent déjà être enregistrés et appliqués aux parcours en essai sans classement. Le jeu actuel reste sans compte ni serveur. La version publiée est accessible sur GitHub Pages. Le passage au multijoueur nécessitera un service de jeu et un stockage distant ; leur choix et leur coût devront être étudiés dans le plan, sans engagement de service payant à ce stade.

Conserver la séparation entre simulation, rendu, entrées, caméra, règles de mode, données de terrain et édition. Le laboratoire reste distinct de l’interface de jeu. L’adaptation Capacitor reste ultérieure ; navigateur et commandes tactiles restent prioritaires.

Références actuelles : vitesse 5 rad/s, barre 80 px, zoom 0,7, lissage caméra 0,3 s, recul réglable jusqu’à 100 px. Les valeurs physiques de partie devront être partagées par tous ; zoom, suivi et affichage des traînées restent des préférences visuelles.

## 3. Déplacement et collisions

### Commande commune

Un clic, un toucher sur le terrain ou espace échange le pivot et inverse la rotation sans saut de position. Espace fonctionne lorsqu’un contrôle d’interface a le focus, sauf pendant une saisie de texte. La caméra suit progressivement le pivot sans changer les coordonnées du monde.

### Contacts

Validé : boules et barre participent aux contacts. Un choc contre un mur conserve le pivot, inverse la rotation et provoque un recul de l’ensemble. Les chocs entre joueurs repoussent les deux personnages, pivot compris, de façon comparable. Le comportement recherché est vivant et un peu anarchique.

Proposition : obtenir cette variété par la géométrie et le mouvement au contact, sans hasard indépendant sur chaque appareil. La simulation doit traiter les contacts simultanés dans un ordre stable, sans accumulation explosive de recul ni pénétration durable. La formule d’impulsion et les limites de vitesse relèvent d’un prototype de ressenti.

Validé en course : le créateur choisit entre traversée mutuelle sans interaction et contacts avec répulsion. Les murs extérieurs restent infranchissables, même avec le bonus de traversée des murs.

## 4. Comptes, parties et lancement

### Accès

Validé : comptes joueurs, permettant de retrouver ses terrains sur plusieurs appareils. Les invités peuvent rejoindre avec un pseudo ; création de partie et sauvegarde personnelle sont réservées aux comptes. Les terrains personnels restent privés : leur propriétaire peut les utiliser dans ses parties, sans bibliothèque publique pour le moment. Les participants reçoivent nécessairement les données du terrain pour jouer ; « privé » signifie non publié dans un catalogue, sans garantie contre une copie technique.

Le mécanisme de connexion et de récupération de compte reste à proposer dans le plan ; ne pas développer soi-même une gestion cryptographique des mots de passe.

### Salon

Validé : liste des parties publiques, bouton de création et parties privées accessibles par code ou lien. Le créateur choisit le mode, le terrain, le nombre de places, les règles disponibles et l’activation des bonus/malus.

L’interface montre les joueurs présents et les places attendues. Aucun bouton « Prêt » : lorsque toutes les places sont occupées, le compte à rebours démarre automatiquement. Proposition : trois secondes, avec annulation et retour à l’attente si une place se libère. Charger le terrain et établir la connexion avant de compter un participant comme présent ; cela ne demande aucune confirmation manuelle.

Course : 1 à 4 places. Combat : 2 à 4. Capture : 2 ou 4, avec deux équipes de deux à quatre joueurs. Proposition : répartition équilibrée des équipes dans le salon, visible avant le lancement.

### Connexion interrompue

Validé : les autres continuent à jouer et un court délai permet de revenir. Proposition : 30 secondes, personnage temporairement retiré, drapeau porté renvoyé à sa base. Retour au départ ou au point de réapparition, sans restauration d’une position avantageuse. Après expiration : abandon, sans bloquer la fin de partie. Le serveur continue la simulation lorsqu’un navigateur se met en arrière-plan.

Proposition : quitter en tant que créateur ne ferme pas une partie déjà lancée ; un serveur en assure la continuité. Dans un salon, transmettre la gestion à un autre compte présent, sinon fermer le salon en informant les invités.

## 5. Modes

### Course — 1 à 4 joueurs

Validé : le premier à atteindre l’arrivée gagne ; à une place, course solo chronométrée. Les morts renvoient au départ. Deux conditions d’arrivée seulement : contact d’une boule ou de la barre, ou personnage entier dans la zone. Le type actuel « pivot seul dans la zone » est supprimé de l’interface future.

Proposition : le chronomètre continue après une mort ; publier un résultat de partie distinct des records de parcours. En cas de franchissement dans le même pas de simulation, départager par le premier instant de contact calculé, puis déclarer une égalité s’il est identique. Les anciens records et terrains locaux ne doivent pas être perdus ; une migration doit traiter explicitement l’ancien type d’arrivée.

### Combat — 2 à 4 joueurs

Validé : faire sortir les adversaires de l’arène ; cinq vies au départ. Une mort coûte une vie. Tant qu’il reste des vies, réapparition au départ avec courte protection contre les chocs. À zéro, élimination.

Validé : l’éjection consiste à pousser l’adversaire dans le vide. La disposition dépend du terrain : le vide peut entourer une plateforme, occuper certaines ouvertures ou former des zones internes. La règle commune du vide s’applique : c’est la présence du pivot dans cette zone qui coûte une vie, pas le simple survol par la boule mobile ou la barre. Aucun mécanisme distinct de franchissement de bord n’est nécessaire pour éliminer un joueur. Les parois solides restent infranchissables avec le bonus de traversée lorsqu’elles constituent les murs extérieurs.

Proposition : dernier survivant vainqueur. Protection de deux secondes, signalée par clignotement, sans pouvoir pousser autrui pendant cette protection. Le cadre conserve ses dimensions et n’est pas déplacé comme un objet de décor ; il délimite le terrain, tandis que les zones de vide et les parois définissent la forme de l’arène.

Le traitement des éliminations simultanées doit être symétrique ; proposition : égalité si aucun survivant. Les arènes de base doivent permettre de pousser dehors sans nécessiter un mur mortel.

### Capture de drapeau — 2 ou 4 joueurs

Validé : deux camps, duel à deux ou deux équipes de deux. Prendre le drapeau adverse et le ramener dans sa base. Son propre drapeau doit être présent pour marquer. Objectif de 1 à 8 captures, choisi à la création.

Un contact avec un adversaire ou une mort renvoie le drapeau à sa base. Un contact avec une paroi ne le fait pas perdre. Durée de possession : proposition acceptée comme valeur à tester, 30 secondes par défaut, réglable à la création. Expiration : retour du drapeau. Le même joueur attend trois secondes avant de pouvoir le reprendre après une perte. Les morts renvoient au départ.

Proposition : un allié ne fait pas perdre le drapeau ; les contacts adverses sont toujours actifs dans ce mode, y compris lorsqu’un joueur est invisible. Le drapeau porté et le temps restant restent lisibles. Après capture, retour du drapeau à sa base, puis poursuite jusqu’au score cible.

Remarque : le délai borne une possession, mais ne garantit pas à lui seul la fin d’une partie. Un éventuel temps maximal et le départage des matchs restent des évolutions à tester.

## 6. Terrains

### Parois

Validé : rebond plus ou moins fort ; parois destructibles après plusieurs coups ; parois mortelles au toucher. Une boule ou la barre peut toucher une paroi mortelle. Proposition : un contact continu ne compte que pour un coup sur une paroi destructible ; attendre une séparation avant de compter un nouvel impact. Le nombre de coups et la force de rebond sont des propriétés éditables.

### Sols

Validé : l’effet est déterminé par la position du pivot. Le vide tue lorsque le pivot s’y trouve ; la boule mobile et la barre peuvent le survoler. Changer de pivot au-dessus du vide provoque la mort. Un tapis roulant déplace tout le personnage dans sa direction ; un sol collant ralentit la rotation.

Proposition : zones aux bords clairement visibles ; propriétés éditables pour direction et vitesse du tapis, facteur de ralentissement. Pour des zones superposées, priorité déterministe du vide, puis combinaison bornée des autres effets. Pas de nouvelles caractéristiques ajoutées au seul motif de « etc. » : le format sera extensible.

### Catalogue initial

Quatre courses, quatre arènes, quatre terrains de capture à terme. Introduire progressivement les mécanismes, offrir des trajets et passages adaptés à la taille normale du personnage, éviter les départs dangereux et les boucles de mort. Tester chaque terrain avec tous les nombres de joueurs autorisés. La validation géométrique ne remplace pas les essais de jouabilité.

## 7. Éditeur

Validé : rectangles légèrement arrondis et ovales ; Maj contraint le dessin à un carré ou un cercle. Déplacement, rotation et dimensions par souris et champs précis. Poignées et boîte de redimensionnement. Propriétés de paroi, dessin des zones de sol, départs et arrivées adaptés au mode.

Le cadre extérieur n’est pas un objet librement modifiable ; largeur et hauteur sont réglées dans les paramètres du terrain. En combat, dessiner les zones de vide et les parois permet de choisir où les joueurs peuvent être éjectés. Le vide reste à l’intérieur du cadre ; une limite solide du cadre n’est pas une zone d’élimination implicite.

Conserver annuler/rétablir, zoom, déplacement de vue, test avec retour au document, import/export et choix des couleurs. Sauvegarde privée liée au compte, avec version de terrain figée pour chaque partie : éditer l’original ne modifie pas une partie en cours.

Validé : les éléments qui se touchent ne montrent pas d’arêtes internes ; seuls les contours généraux continus sont tracés. Cela doit aussi fonctionner avec les formes pivotées et arrondies. Proposition : calculer l’union graphique séparément des objets et de leurs propriétés de collision. Des matériaux différents restent identifiables par leurs motifs ou couleurs ; une paroi destructible supprimée oblige à recalculer le contour. Les trous internes réels restent visibles.

Proposition : sur téléphone, prévoir des contrôles équivalents aux raccourcis clavier. La création au pointeur est prioritaire, mais les parties doivent rester jouables au toucher.

## 8. Bonus et malus

Validé : activation facultative par le créateur. Apparitions aléatoires, fréquence pondérée selon l’effet et sa valeur. Bonus et malus reconnaissables avant ramassage, avec couleur et symbole. Effets différents cumulables ; reprendre le même renouvelle sa durée sans augmenter sa puissance.

Effets demandés : personnage petit, barre courte, rotation lente, traversée des murs intérieurs, poussée renforcée contre les joueurs, invisibilité avec visibilité fugace lors des interactions. Proposition : ramassage par contact d’une boule ou de la barre ; durées limitées et indicateurs d’effets actifs. La durée, l’amplitude et la rareté de chaque effet restent à équilibrer au laboratoire, pas à figer arbitrairement dans ce cadrage.

Les apparitions sont décidées par la simulation commune : mêmes objets et mêmes événements pour tous. N’apparaître que dans des zones accessibles et sûres, avec un nombre maximal d’objets présents. Le plan précisera fréquence globale, poids par effet et délai de disparition.

Points techniques à traiter : retour à taille normale près d’une paroi ; fin de traversée alors qu’on est dans un mur ; bonus de poussée lors d’un choc réciproque ; représentation du drapeau porté par un invisible. Proposition : reporter une restauration impossible jusqu’à une position libre, avec limite de temps et retour à un point sûr si nécessaire. Une mort supprime les effets temporaires ; ce choix reste une proposition d’équilibrage.

## 9. Direction graphique, interface et son

Validé : aucune lettre A/B. Deux boules de même couleur pour chaque personnage. Couleur distincte par joueur en course et combat ; couleur commune par équipe en capture. Contours noirs épais, couleurs pâles, motifs légers dans les surfaces, traînée plus courte. Proposition : distinguer les coéquipiers par pseudo ou petit signe, et le pivot par un détail discret sans lettre.

Conserver un titre compact et un panneau rabattable. Ne pas réintroduire « Deux boules. Un seul geste. », « Maze » ni la phrase de commande en bas d’écran. Les contrôles de laboratoire restent séparés de l’interface destinée aux joueurs. Le salon doit montrer mode, terrain, règles, places et attente ; en jeu, ne montrer que les informations utiles au mode et aux effets.

Validé : sons légers de changement de pivot, d’impact et de victoire. Proposition : volume général et sourdine, aucun son essentiel à la compréhension. Déclencher l’audio après une interaction compatible avec les contraintes des navigateurs mobiles.

## 10. Architecture cible et fiabilité

Orientation proposée : simulation TypeScript indépendante de Phaser ; serveur faisant autorité pour début, chronomètre, collisions, morts, apparitions et victoire ; affichage client réactif et corrections progressives. Ne pas considérer le simple partage d’une graine aléatoire comme une garantie de synchronisation.

Découper les responsabilités : cinématique et contacts ; règles des trois modes ; terrains versionnés et matériaux ; effets temporaires ; session/salon/réseau ; comptes et sauvegarde ; rendu et sons ; éditeur ; laboratoire. Le plan comparera les solutions de serveur et d’authentification appropriées avant sélection.

Le serveur valide les commandes et les terrains reçus, limite les tailles et la fréquence des demandes, et ne fait pas confiance aux temps ou scores envoyés par le navigateur. Un compte ne peut éditer les terrains d’un autre. Aucun secret de serveur n’est livré dans le site statique.

Proposition : conserver les données locales existantes et proposer leur import dans le compte, sans effacement automatique. Distinguer records locaux existants, essais avec réglages libres et résultats multijoueurs. Aucun classement mondial, publication de terrains, chat, monétisation ou jeu hors ligne synchronisé n’est requis ici.

## 11. Validation et étapes de portée

Ce cadrage n’est pas encore le plan technique. Les étapes de portée recommandées sont :

1. Consolider les formats de terrain, règles de contact et paramètres physiques communs ; vérifier les contours des nouvelles formes et les migrations.
2. Livrer une course en réseau de bout en bout : comptes, invités, terrains privés, salons publics/privés, départ commun, arrivée fiable et reconnexion.
3. Enrichir terrains, éditeur, matériaux et effets, avec les quatre courses de base et la direction visuelle/sonore.
4. Ajouter combat et ses quatre arènes, puis capture et ses quatre terrains, en réutilisant les mêmes systèmes.

La frontière entre les étapes 2 et 3 sera précisée dans le plan pour limiter la première livraison sans masquer la cible complète. Tester les collisions et résultats simultanés, les délais réseau, les déconnexions, les imports anciens, les contours unifiés, les dimensions extrêmes et les contrôles souris/tactiles. Faire des essais réels sur plusieurs appareils ; un redimensionnement de navigateur ne suffit pas.

## 12. Décisions restant à confirmer ou à expérimenter

Les règles produit principales ci-dessus sont issues des échanges. Restent des propositions explicites : compte à rebours de trois secondes ; reconnexion sous 30 secondes et retrait du personnage ; protection de deux secondes au retour en combat ; suppression des effets temporaires après mort ; traitement des égalités et des abandons. Elles pourront être approuvées ensemble ou ajustées avant le plan.

Les choix de fournisseur, budgets, connexion de compte, contraintes d’hébergement et stockage seront présentés avant toute ouverture de service. Les valeurs de recul, rebond, durée et puissance des effets seront testées plutôt que présumées équilibrées. La priorité actuelle est une première course multijoueur stable, pas l’implémentation immédiate de toute la liste.
