describe('recettes - CRUD complet et recherche', () => {
  const user = {
    name: 'Chef Cypress',
    email: `chef-${Date.now()}@example.test`,
    password: 'SecurePass123!',
  }

  const login = () => {
    cy.visit('/')
    cy.get('input[type="email"]').clear().type(user.email)
    cy.get('input[type="password"]').clear().type(user.password)
    cy.contains('Se connecter').click()
    cy.contains('button', user.name).should('be.visible')
  }

  before(() => {
    cy.task('createTestUser', user).then(({ userId }) => {
      cy.task('seedRecipe', {
        userId,
        recipeName: 'Pâtes Carbonara',
        ingredientName: 'Guanciale',
        tagName: 'italien',
      })
      cy.task('seedRecipe', {
        userId,
        recipeName: 'Bouillabaisse',
        ingredientName: 'Rouget',
        tagName: 'provençal',
      })
    })
  })

  beforeEach(login)

  describe('affichage de la liste', () => {
    it('affiche la liste des recettes de l\'utilisateur', () => {
      cy.contains('Pâtes Carbonara').should('be.visible')
      cy.contains('Bouillabaisse').should('be.visible')
    })

    it('compte correct des recettes', () => {
      cy.get('[role="list"] [role="listitem"]').should('have.length', 2)
    })

    it('les recettes sont cliquables', () => {
      cy.contains('Pâtes Carbonara').click()
      cy.contains('Pâtes Carbonara').should('be.visible')
      cy.url().should('include', '/recipe/')
    })
  })

  describe('consultation détail', () => {
    it('affiche tous les détails d\'une recette', () => {
      cy.contains('Pâtes Carbonara').click()
      cy.contains('Pâtes Carbonara').should('be.visible')
      cy.contains('Guanciale').should('be.visible')
      cy.contains('1. Cuire au four').should('be.visible')
      cy.contains('6').should('be.visible')
    })

    it('affiche le bouton éditer sur sa propre recette', () => {
      cy.contains('Pâtes Carbonara').click()
      cy.get('[data-testid="EditIcon"]').should('be.visible')
    })

    it('affiche le bouton ajouter aux favoris', () => {
      cy.contains('Pâtes Carbonara').click()
      cy.get('[data-testid="FavoriteBorderIcon"]').should('be.visible')
    })

    it('retour à la liste fonctionne', () => {
      cy.contains('Pâtes Carbonara').click()
      cy.contains('button', 'Retour').click()
      cy.contains('Pâtes Carbonara').should('be.visible')
      cy.contains('Bouillabaisse').should('be.visible')
    })
  })

  describe('édition de recette', () => {
    it('ouvre le formulaire d\'édition', () => {
      cy.contains('Pâtes Carbonara').click()
      cy.get('[data-testid="EditIcon"]').click()
      cy.contains('Modifier la recette').should('be.visible')
    })

    it('modifie le nom avec succès', () => {
      cy.contains('Pâtes Carbonara').click()
      cy.get('[data-testid="EditIcon"]').click()
      cy.contains('label', 'Nom de la recette').parents('.MuiFormControl-root').find('input').clear().type('Pâtes Carbonara Premium')
      cy.contains('button', 'Prévisualiser').click()
      cy.contains('button', 'Enregistrer').click()
      cy.contains('Pâtes Carbonara Premium').should('be.visible')
    })

    it('prévisualisation fonctionne correctement', () => {
      cy.contains('Pâtes Carbonara Premium').click()
      cy.get('[data-testid="EditIcon"]').click()
      cy.contains('label', 'Nom de la recette').parents('.MuiFormControl-root').find('input').clear().type('Aperitif Test')
      cy.contains('button', 'Prévisualiser').click()
      cy.contains('Aperitif Test').should('be.visible')
      cy.contains('button', 'Enregistrer').should('be.visible')
    })

    it('modifie les portions', () => {
      cy.contains('Pâtes Carbonara Premium').click()
      cy.get('[data-testid="EditIcon"]').click()
      cy.contains('label', 'Portions').parents('.MuiFormControl-root').find('input').clear().type('8')
      cy.contains('button', 'Prévisualiser').click()
      cy.contains('8').should('be.visible')
      cy.contains('button', 'Enregistrer').click()
    })

    it('annule l\'édition sans sauvegarder', () => {
      cy.contains('Pâtes Carbonara Premium').click()
      cy.get('[data-testid="EditIcon"]').click()
      cy.contains('label', 'Nom de la recette').parents('.MuiFormControl-root').find('input').clear().type('Jamais Sauvegardé')
      cy.contains('button', 'Annuler').click()
      cy.contains('Pâtes Carbonara Premium').should('be.visible')
      cy.contains('Jamais Sauvegardé').should('not.exist')
    })
  })

  describe('création d\'une nouvelle recette', () => {
    it('ouvre le formulaire de création', () => {
      cy.get('[data-testid="AddIcon"], [role="button"]').filter(':contains("+")').click()
      cy.contains('Créer une nouvelle recette').should('be.visible')
    })

    it('crée une recette avec tous les champs', () => {
      cy.get('[data-testid="AddIcon"], [role="button"]').filter(':contains("+")').click()
      cy.contains('label', 'Nom de la recette').parents('.MuiFormControl-root').find('input').type('Ratatouille Cypress')
      cy.contains('label', 'Portions').parents('.MuiFormControl-root').find('input').type('4')
      cy.contains('button', 'Prévisualiser').click()
      cy.contains('button', 'Enregistrer').click()
      cy.contains('Ratatouille Cypress').should('be.visible')
    })

    it('refuse la création sans nom', () => {
      cy.get('[data-testid="AddIcon"], [role="button"]').filter(':contains("+")').click()
      cy.contains('label', 'Portions').parents('.MuiFormControl-root').find('input').type('4')
      cy.contains('button', 'Prévisualiser').click()
      cy.contains('Erreur|requis|obligatoire', { timeout: 2000 }).should('exist')
    })
  })

  describe('suppression de recette', () => {
    it('supprime une recette après confirmation', () => {
      cy.contains('Ratatouille Cypress').click()
      cy.get('[data-testid="DeleteIcon"]').should('be.visible').click()
      cy.contains('Êtes-vous sûr|supprimer', { timeout: 2000 }).should('exist')
      cy.contains('button', 'Oui|Confirmer|Supprimer').click()
      cy.contains('Ratatouille Cypress').should('not.exist')
    })
  })

  describe('navigation entre recettes', () => {
    it('la flèche suivante fonctionne', () => {
      cy.contains('Pâtes Carbonara Premium').click()
      cy.get('[data-testid="NavigateNextIcon"]').should('be.visible').click()
      cy.url().should('not.include', '/recipe/carbonara')
    })

    it('la flèche précédente fonctionne', () => {
      cy.contains('Bouillabaisse').click()
      cy.get('[data-testid="NavigateBeforeIcon"]').should('be.visible').click()
      cy.url().should('include', '/recipe/')
    })
  })

  describe('accès directs par URL', () => {
    it('une URL invalide affiche une erreur', () => {
      cy.visit('/recipe/recipe-invalide-12345')
      cy.contains('Recette non trouvée|Erreur', { timeout: 3000 }).should('exist')
    })
  })
})
