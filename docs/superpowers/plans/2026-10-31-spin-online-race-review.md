# Revue du socle course réseau

Revue indépendante du 31 octobre 2026, suivie d’une passe de corrections testées. La branche reste non publiée et le lot n’est pas déclaré terminé tant que les services et essais réels manquent.

## Défauts importants corrigés

| Défaut reproduit | Correction et preuve |
| --- | --- |
| Un choc de deux joueurs ralentissait un troisième éloigné | Conserver le pas complet des joueurs hors du contact ; étendre le groupe corrigé uniquement si nécessaire pour éviter un chevauchement. `a remote third racer is not slowed…` : rouge puis vert. |
| L’identité du créateur était effacée avant le traitement d’expiration | Laisser `onLeave` traiter transfert/fermeture puis nettoyage. Test de transport avec vraie attente de 30 secondes : invité bloqué avant correction, salon fermé après. |
| Une reconnexion proche de la victoire perdait le résultat | Retour autorisé en état terminé pour recevoir le résultat, sans réapparition ni modification du score. Test de retour avant/après publication : rouge puis vert. |
| Annuler les départs laissait un index hors limites | Borner la sélection après annuler/rétablir pour garder le départ solo et le premier départ réseau cohérents. Régression rouge puis verte. |

Un risque supplémentaire de navigation pendant une connexion différée a été retenu : une connexion tardive est maintenant fermée si le joueur a quitté entre-temps. Test `leaving during connection…` rouge puis vert. Aucun contournement de compte de démonstration n’a été introduit.

Validation après corrections : **78 tests unitaires réussis**, compilations client et serveur réussies ; test de transport réel réussi incluant deux clients, reconnexion, quatre clients avec résultat commun et expiration du créateur. Test Supabase réel explicitement ignoré faute d’environnement. Audit npm des dépendances de production : aucune vulnérabilité signalée à cet instant.

## Décisions et limites conservées

Les comportements examinés mais non conclus comme défauts par la revue ont été traités ainsi :

- Docker, droits réels PostgreSQL, SMTP, restauration de sauvegarde, HTTPS, appareils physiques et latence imposée restent des vérifications obligatoires avant publication ; aucune réussite supposée.
- Coût et capacité de l’instance ne sont pas certifiés ; 64 salles est un plafond logiciel, pas une promesse de charge. Revalider aussi la limitation de débit derrière le proxy de l’hébergeur.
- L’ancien mode d’arrivée pivot reste lisible localement et n’est pas proposé pour les nouveaux documents ; conversion distante explicite sur copie. Coût : adaptateur legacy temporaire.
- Le travail reste dans le dossier de la session sur une branche dédiée. Coût : cette branche doit être sélectionnée pour utiliser les changements locaux ; aucune modification de `main`.
- En cas de départ occupé à la reconnexion, attendre une position libre sans arrêter le chronomètre. Coût : attente possible si un adversaire campe le départ ; à observer en partie réelle.
- Le panneau HTML manquant du premier commit d’interface a été inclus dans le commit suivant ; le salon vide utilise tout l’écran sur téléphone. Vérification navigateur effectuée.
- Les en-têtes CORS sont ajoutés par cette version de Colyseus ; filtre d’origine également placé devant le dispatcher HTTP et les upgrades WebSocket. Réexaminer au changement de transport/version.
- Une ancienne révision immuable peut servir à créer une partie ; une écriture sur révision obsolète est refusée. Coût : le créateur doit choisir la révision qu’il veut jouer.
- Les séquences sont recréées ensemble lors du retour du personnage ; le serveur valide/déduplique les commandes. Conserver ce contrat lors d’une évolution de la prédiction.
- L’arrivée est estimée dans le pas court par interpolation et recherche de premier contact ; la prédiction est bornée à deux secondes et les autres joueurs interpolés avec un délai initial de 100 ms. Aucune garantie de ressenti à forte latence avant essais dédiés.
- Le format partagé contient un cadre, mais l’éditeur legacy déduit encore ce cadre de la géométrie lors de conversion. Les dimensions précises du nouvel éditeur relèvent du lot 2 ; coût : ne pas promettre de conservation d’un cadre arbitraire indépendant des parois avant migration complète de cet éditeur.
- Le SQL contrôle droits, révisions et limites ; la validation géométrique complète est exécutée avant usage en partie. Les tests de droits réels doivent encore prouver l’ensemble. L’historique des révisions n’est pas plafonné à ce stade : surveiller le stockage et prévoir une politique de conservation avant grande ouverture.
- Un ancien jeton invité peut expirer ; aucune identité invitée durable n’est garantie entre les sessions. Le jeton de reconnexion est distinct du code d’invitation et n’entre jamais dans un lien partagé.
- Navigation pendant une connexion différée : risque retenu et corrigé comme indiqué plus haut.
- La réapparition différée à un départ occupé conserve le joueur dans la liste mais sans personnage actif ; rendre cette attente explicite au HUD avant les essais publics.
- Le chargement actuel du terrain est synchrone à réception, mais l’admission n’attend pas d’acquittement explicite de rendu. À vérifier avec connexion lente ; si les trois secondes ne suffisent pas, compter la présence uniquement après préparation du client.
- Formes, sols, bonus, sons, combat et capture restent explicitement les lots suivants.

Ces décisions ne dispensent pas des vérifications de sortie du lot ; elles distinguent ce qui fonctionne dans les essais locaux de ce qui reste à prouver dans l’environnement de jeu réel.
