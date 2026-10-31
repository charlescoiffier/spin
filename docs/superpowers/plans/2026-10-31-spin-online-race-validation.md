# Lot course réseau — journal de validation

Date : 31 octobre 2026. Branche : `feat/online-race`. **Travail en cours, non publié.**

Dernier point vérifié : 78 tests unitaires réussis, compilations client/serveur réussies, intégration transport réussie (dont expiration réelle à 30 secondes). [Revue et corrections](2026-10-31-spin-online-race-review.md).

Mise à jour après configuration Supabase : **80 tests unitaires**, trois tests réels supplémentaires sur Supabase local (droits, confirmation email, compte réel + terrain privé + invité dans une course réseau). Mode natif officiel utilisé sans moteur Docker. Connexion par lien email et copie privée d’un terrain également vérifiées dans le navigateur local. Le projet hébergé existe maintenant ; migration appliquée, droits SQL contrôlés, URL de retour configurée et API anonyme refusée. SMTP dédié reporté par choix utilisateur ; serveur Render gratuit en cours de préparation. Ces résultats remplacent les blocages locaux cités ci-dessous, conservés comme historique du premier point de contrôle.

## Vérifié localement

- Référence avant changement : 58 tests, compilation client réussie.
- Nouveau format de terrain, migration indépendante de l’original et confirmation pour ancien type d’arrivée ; départs multiples et historique de document.
- Monde partagé sans Phaser, déduplication des commandes, répulsion réciproque, contacts de barre, sauvegarde/restauration de recul et cadre solide.
- Compte à rebours de trois secondes, annulation sur place libérée, reconnexion, résultat figé et précision de franchissement à l’intérieur d’un pas.
- Transport réel Colyseus sur l’interface locale : invités interdits de création, mauvais code privé refusé, origine HTTP non autorisée refusée, deux clients synchronisés avec spin accepté, coupure réelle et reconnexion, quatre clients recevant un même résultat de fin.
- Compilation TypeScript du client et du serveur, build Vite. Avertissement de taille du bundle toujours présent ; aucun échec de compilation.
- Navigateur : accès « En ligne », message comptes non configurés, création désactivée, liste publique vide, règles et réglages du laboratoire visibles. Éditeur : quatre départs disponibles après saisie, sélection du quatrième, seulement deux arrivées proposées pour un nouveau document. Aucun terrain d’essai sauvegardé par ces actions.

## Mesures indicatives

`npm run benchmark`, Node v23.5.0 sur la machine locale : quatre joueurs avec contacts et sérialisation de snapshots à 20 Hz, 60 secondes simulées, médiane de trois mesures après préchauffage : 3690 ms, soit 0,256 ms par tick et environ 6,15 % d’un cœur rapporté au temps simulé. Tas en fin de mesure : 12,44 Mio. Cela exclut transport, comptes et coût complet de la salle ; aucune capacité d’hébergement garantie.

## Non vérifié / prérequis manquants

- Docker est installé mais son daemon n’est pas joignable ; l’image serveur n’a pas été construite.
- Supabase non configuré : le test réel de droits est **ignoré**, pas réussi. Les tests unitaires du client de stockage ne prouvent pas l’isolation RLS.
- Connexion par email, récupération sur un second appareil, concurrence d’écriture réelle et import distant ne sont pas encore testés avec les services.
- Deux appareils physiques, réseau avec latence/jitter imposés, HTTPS externe, sauvegarde/restauration et envoi SMTP restent à vérifier avant publication.
- Serveur et comptes ne sont pas déployés ; la page publique existante reste inchangée.

## Suite

Terminer la revue indépendante et ses corrections. Configurer un environnement Supabase local ou dédié, exécuter les droits réels, puis les scénarios utilisateurs sur plusieurs appareils. La configuration proposée et les coûts indicatifs sont dans `docs/operations/online-race.md` ; aucun service payant n’a été ouvert.
