describe('parcours E2E complet des recettes', () => {
  const user = {
    name: 'Alice E2E',
    email: `e2e-${Date.now()}@example.test`,
    password: 'motdepasse123',
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
      cy.task('seedRecipe', { userId, recipeName: 'Gratin E2E', ingredientName: 'Courgette E2E', tagName: 'test' })
    })
  })

  beforeEach(login)

  it('gère les dictionnaires', () => {
    cy.get('[data-testid="SettingsIcon"]').click()
    cy.contains('Dictionnaires').should('be.visible')

    cy.get('[role="dialog"]').within(() => {
      cy.get('input').first().type('Courgette E2E')
      cy.contains('button', 'Ajouter').click()
    })

    cy.contains('[role="dialog"]', 'Courgette E2E').scrollIntoView().should('be.visible')
    cy.contains('[role="dialog"] [role="tab"]', 'Unités').click()

    cy.get('[role="dialog"]').within(() => {
      cy.get('input').first().type('verre E2E')
      cy.get('input').eq(1).type('ve2e')
      cy.contains('button', 'Ajouter').click()
    })

    cy.contains('[role="dialog"]', 'verre E2E').scrollIntoView().should('be.visible')
  })

  it('consulte une recette seedée et vérifie le détail', () => {
    cy.contains('Gratin E2E').click()
    cy.contains('Gratin E2E').should('be.visible')
    cy.contains('2 g — Courgette E2E').should('be.visible')
    cy.contains('1. Cuire au four').should('be.visible')
  })

  it('ajoute aux favoris, journalise l’historique et édite', () => {
    cy.contains('Gratin E2E').click()
    cy.get('[data-testid="FavoriteBorderIcon"]').click()
    cy.contains('button', 'Favoris').click()
    cy.contains('Gratin E2E').should('be.visible')
    cy.contains('button', 'Historique').click()
    cy.contains('Gratin E2E').should('be.visible')
    cy.contains('Gratin E2E').click()
    cy.get('[data-testid="EditIcon"]').click()
    cy.contains('Modifier la recette').should('be.visible')
    cy.contains('label', 'Nom de la recette').parents('.MuiFormControl-root').find('input').clear().type('Gratin E2E modifié')
    cy.contains('button', 'Prévisualiser').click()
    cy.contains('button', 'Enregistrer').click()
    cy.contains('Gratin E2E modifié').should('be.visible')
  })

  it('déconnecte l’utilisateur', () => {
    cy.contains('button', 'Alice E2E').click()
    cy.contains('Connecte-toi pour accéder à tes recettes.').should('be.visible')
  })
})
