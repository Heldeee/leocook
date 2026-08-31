describe('favoris et historique - suivi utilisateur', () => {
  const user = {
    name: 'Tester Favoris',
    email: `tester-fav-${Date.now()}@example.test`,
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
        recipeName: 'Coq au Vin',
        ingredientName: 'Vin Rouge',
        tagName: 'français',
      })
      cy.task('seedRecipe', {
        userId,
        recipeName: 'Boeuf Bourguignon',
        ingredientName: 'Boeuf',
        tagName: 'français',
      })
    })
  })

  beforeEach(login)

  describe('favoris - ajout et suppression', () => {
    it('ajoute une recette aux favoris', () => {
      cy.contains('Coq au Vin').click()
      cy.get('[data-testid="FavoriteBorderIcon"]').click()
      cy.get('[data-testid="FavoriteIcon"]').should('be.visible')
    })

    it('la recette apparaît dans l\'onglet Favoris', () => {
      cy.contains('Coq au Vin').click()
      cy.get('[data-testid="FavoriteBorderIcon"]').click()
      cy.contains('button', 'Retour').click()
      cy.contains('button', 'Favoris').click()
      cy.contains('Coq au Vin').should('be.visible')
    })

    it('ajoute plusieurs favoris', () => {
      cy.contains('Coq au Vin').click()
      cy.get('[data-testid="FavoriteBorderIcon"]').click()
      cy.contains('button', 'Retour').click()
      cy.contains('Boeuf Bourguignon').click()
      cy.get('[data-testid="FavoriteBorderIcon"]').click()
      cy.contains('button', 'Favoris').click()
      cy.contains('Coq au Vin').should('be.visible')
      cy.contains('Boeuf Bourguignon').should('be.visible')
    })

    it('retire une recette des favoris', () => {
      cy.contains('Coq au Vin').click()
      cy.get('[data-testid="FavoriteBorderIcon"]').click()
      cy.contains('button', 'Retour').click()
      cy.contains('Coq au Vin').click()
      cy.get('[data-testid="FavoriteIcon"]').click()
      cy.get('[data-testid="FavoriteBorderIcon"]').should('be.visible')
    })

    it('retire depuis l\'onglet Favoris', () => {
      cy.contains('Coq au Vin').click()
      cy.get('[data-testid="FavoriteBorderIcon"]').click()
      cy.contains('button', 'Retour').click()
      cy.contains('button', 'Favoris').click()
      cy.contains('Coq au Vin').click()
      cy.get('[data-testid="FavoriteIcon"]').click()
      cy.contains('button', 'Retour').click()
      cy.contains('Coq au Vin').should('not.exist')
    })

    it('affiche message quand aucun favori', () => {
      cy.contains('button', 'Favoris').click()
      cy.contains('Aucune recette trouvée.|Vous n\'avez pas encore de favoris').should('exist')
    })
  })

  describe('historique - suivi des consultations', () => {
    it('enregistre une consultation dans l\'historique', () => {
      cy.contains('Coq au Vin').click()
      cy.contains('button', 'Retour').click()
      cy.contains('button', 'Historique').click()
      cy.contains('Coq au Vin').should('be.visible')
    })

    it('enregistre plusieurs consultations', () => {
      cy.contains('Coq au Vin').click()
      cy.contains('button', 'Retour').click()
      cy.contains('Boeuf Bourguignon').click()
      cy.contains('button', 'Retour').click()
      cy.contains('button', 'Historique').click()
      cy.contains('Coq au Vin').should('be.visible')
      cy.contains('Boeuf Bourguignon').should('be.visible')
    })

    it('la recette la plus récemment consultée est en haut', () => {
      cy.contains('Coq au Vin').click()
      cy.contains('button', 'Retour').click()
      cy.contains('Boeuf Bourguignon').click()
      cy.contains('button', 'Retour').click()
      cy.contains('button', 'Historique').click()
      cy.get('[role="list"] [role="listitem"]').first().should('contain', 'Boeuf Bourguignon')
    })

    it('consulter une recette la remet en haut de l\'historique', () => {
      cy.contains('Coq au Vin').click()
      cy.contains('button', 'Retour').click()
      cy.contains('Boeuf Bourguignon').click()
      cy.contains('button', 'Retour').click()
      cy.contains('Coq au Vin').click()
      cy.contains('button', 'Retour').click()
      cy.contains('button', 'Historique').click()
      cy.get('[role="list"] [role="listitem"]').first().should('contain', 'Coq au Vin')
    })

    it('affiche message quand l\'historique est vide', () => {
      cy.contains('button', 'Historique').click()
      cy.contains('Aucune recette trouvée.|Vous n\'avez pas encore consulté de recettes').should('exist')
    })
  })

  describe('historique et favoris ensemble', () => {
    it('une recette dans favoris et historique s\'affiche dans les deux', () => {
      cy.contains('Coq au Vin').click()
      cy.get('[data-testid="FavoriteBorderIcon"]').click()
      cy.contains('button', 'Retour').click()
      cy.contains('Boeuf Bourguignon').click()
      cy.contains('button', 'Retour').click()
      cy.contains('button', 'Favoris').click()
      cy.contains('Coq au Vin').should('be.visible')
      cy.contains('Boeuf Bourguignon').should('not.exist')
      cy.contains('button', 'Historique').click()
      cy.contains('Coq au Vin').should('be.visible')
      cy.contains('Boeuf Bourguignon').should('be.visible')
    })

    it('retirer une recette des favoris la garde dans l\'historique', () => {
      cy.contains('Coq au Vin').click()
      cy.get('[data-testid="FavoriteBorderIcon"]').click()
      cy.contains('button', 'Retour').click()
      cy.contains('Coq au Vin').click()
      cy.get('[data-testid="FavoriteIcon"]').click()
      cy.contains('button', 'Retour').click()
      cy.contains('button', 'Historique').click()
      cy.contains('Coq au Vin').should('be.visible')
    })
  })

  describe('navette favoris/historique', () => {
    it('navigue entre les onglets sans perdre les données', () => {
      cy.contains('Coq au Vin').click()
      cy.get('[data-testid="FavoriteBorderIcon"]').click()
      cy.contains('button', 'Retour').click()
      cy.contains('button', 'Favoris').click()
      cy.contains('Coq au Vin').should('be.visible')
      cy.contains('button', 'Historique').click()
      cy.contains('Coq au Vin').should('be.visible')
      cy.contains('button', 'Favoris').click()
      cy.contains('Coq au Vin').should('be.visible')
    })
  })
})
