# Bilan UX — Kousine, 29 septembre 2026

## Méthode et portée

Audit du code, exécution des parcours réels dans Chromium/Electron, mesures de débordement et examen des captures. Formats testés : 320 × 740, 390 × 844, 768 × 1024 et 1024 × 768. Les captures Cypress peuvent être recadrées à la hauteur disponible de sa fenêtre ; les assertions utilisent les dimensions du viewport configuré.

Ce bilan est une évaluation heuristique et technique, **pas une étude avec des utilisateurs**, une certification d’accessibilité ou une validation sur Safari/iOS réel. Il ne prétend pas démontrer une UX « parfaite ».

## Défauts observés et corrections

| Priorité | Constat avant correction | Impact pour cuisiner | Correction réalisée et vérification |
|---|---|---|---|
| P0 | Le minuteur démarrait depuis un effet au changement d’étape, même avec le dialogue fermé. Il utilisait un décrément par intervalle. | Temps consommé avant de commencer, risque de dérive lorsque le navigateur ralentit les onglets. | Démarrage manuel, pause, reprise, réinitialisation ; calcul à partir d’une échéance. Test navigateur du non-démarrage et de la pause, test de calcul après un délai simulant l’arrière-plan. |
| P1 | Recherche limitée au nom exact avec accents ; tous les tags occupaient l’espace supérieur. | Difficile de retrouver une recette avec un ingrédient disponible. | Recherche combinant nom, description, ingrédients et tags, sans accents ; cinq catégories toujours visibles sur mobile. Tests des cinq filtres et de « pates thon ». |
| P1 | Titres tronqués sur les cartes et grille fondée sur un minimum de largeur fixe. | Confusion entre variantes et mauvaise exploitation d’un écran étroit. | Titres complets ; 2 colonnes sur téléphone, 3 sur tablette portrait, 4 à partir de 900 px. Vérification visuelle et absence de débordement à 320, 768 et 1024 px. |
| P1 | Quantités fixes et ingrédients uniquement en texte. | Calcul mental, oublis et retours fréquents dans la liste. | Portions de 1 à 24, calcul des quantités, ingrédients cochables, remise à zéro des coches lors d’un changement de portions. Tests de 125 g → 156,25 g pour 4 → 5 portions. |
| P1 | Lecture linéaire longue, mode guidé sans commandes explicites de minuteur. | Beaucoup de défilement et d’actions imprécises pendant la cuisson. | Ingrédients et étapes côte à côte dès 600 px ; ingrédients fixes lors du défilement sur tablette. Mode cuisine plein écran sur téléphone, texte agrandi, progression, boutons Précédente/Suivante, accès aux ingrédients. Captures mobile et iPad examinées. |
| P1 | L’édition pouvait masquer une ligne d’ingrédient incomplète en la filtrant avant enregistrement ; des informations nouvelles pouvaient disparaître. | Perte silencieuse d’un ingrédient ou des conseils d’une recette. | Message explicite pour une ligne incomplète ; conservation des catégories, descriptions, durées et conseils après édition et aperçu. Test navigateur de la validation et de la conservation. |
| P2 | Réorganisation des étapes par glisser-déposer uniquement. | Peu fiable au doigt, inaccessible au clavier. | Boutons Monter/Descendre/Supprimer, champs d’instruction sur toute la largeur et minuteur facultatif séparé. |
| P2 | Retour au catalogue sans restaurer les critères de recherche. | Nécessité de recommencer une recherche. | Conservation des filtres, du mot recherché et de la position de liste dans la session. Recherche conservée vérifiée au retour. |
| P2 | Commandes de tailles hétérogènes, labels absents sur plusieurs icônes, sélection de navigation incorrecte sur une fiche. | Petites cibles tactiles, orientation et lecture assistée moins faciles. | Icônes ≥ 44 px, boutons ≥ 48 px, lignes d’ingrédients ≥ 56 px, labels et états explicites ; onglet Recettes actif dans une fiche. Safe areas iOS prises en compte et champs de 16 px. |
| P2 | Chargement initial des écrans de gestion et dépendance à des polices externes. | Ressources inutiles avant de voir le catalogue, dépendance au réseau pour la typographie. | Écrans chargés à la demande, polices disponibles sur l’appareil, illustrations vectorielles légères et chargement différé des photos. Build sans alerte de chunk > 500 Ko. |

## Catalogue et confiance dans les informations

30 recettes originales ajoutées, soit 6 par catégorie, en conservant la recette importée. Toutes ont des ingrédients reliés, au moins quatre étapes et une description. Des notes précisent les poids égouttés, les portions correspondant à des muffins/biscuits, les moules et les repos.

Les temps sont des repères culinaires, pas des mesures faites en cuisine. Préparation et cuisson sont séparées des minuteurs d’étape : additionner les minuteurs ne mesure pas le temps total quand des opérations sont parallèles. Les repos éventuels sont indiqués dans les étapes et les notes.

Le modèle exact du cuiseur à soupe Tefal reste à confirmer. Les six compotes demandent un programme autorisé par la notice et le respect de MIN/MAX ; aucun cycle exact n’est inventé. Elles proposent une alternative à la casserole. Leur durée s’affiche comme « 10 min + cycle » et elles sont exclues du filtre « 30 min ou moins ». Les gâteaux airfryer précisent un moule de 14 à 16 cm, un contrôle de cuisson et des ajustements selon l’appareil.

## Validation obtenue

- 12 tests automatisés du catalogue, de l’import, des relations, des erreurs, des conflits GitHub, de la recherche et du calcul de minuteur.
- 10 parcours navigateur : consultation, favoris, historique, création, édition, brouillons, publication GitHub simulée, filtres, portions, cuisson et formats mobile/tablette.
- Compilation de production et lint exécutés ; le lint conserve quelques avertissements concernant les effets React de chargement/restauration et Fast Refresh, sans erreur bloquante.
- Captures de catalogue mobile, ingrédients mobile, mode cuisine mobile et fiche iPad portrait/paysage examinées. Les captures restent locales et sont ignorées par Git.

## Limites et prochaines validations utiles

1. Faire un essai réel sur Safari iPhone et iPad : clavier, zoom, rotation, VoiceOver, safe areas et comportement du maintien d’écran allumé. Wake Lock reste une amélioration conditionnelle ; le mode cuisine explique quoi faire lorsqu’il est indisponible.
2. Tester une recette de chaque catégorie en cuisine. Ajuster ensuite les températures et durées à l’airfryer utilisé et compléter les compotes après identification du Tefal.
3. Le minuteur annonce visuellement la fin. Il n’exécute pas de notification système hors navigateur ni d’alarme sonore garantie lorsque l’écran est verrouillé. Le changement d’étape ou la sortie pendant un minuteur actif demande confirmation.
4. Les portions recalculent les ingrédients, pas les températures, les temps, le diamètre du moule ni les limites du bol. L’interface le dit explicitement ; les œufs fractionnés demandent une adaptation.
5. Le catalogue est public. Favoris et historique restent propres au navigateur ; ils ne se synchronisent pas entre iPhone et iPad. L’édition produit un brouillon local : la publication exige les droits GitHub.
6. La lecture n’est pas garantie hors connexion : les polices et illustrations sont locales, mais aucun service worker ni cache hors ligne n’a été ajouté.
