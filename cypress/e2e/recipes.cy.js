const email = `e2e-${Date.now()}@example.test`
const password = 'motdepasse-e2e'

const login = () => {
  cy.visit('/')
  cy.get('input[type="email"]').type(email)
  cy.get('input[type="password"]').type(password)
  cy.contains('Se connecter').click()
  cy.contains('Aucune recette trouvée.').should('be.visible')
}

describe('parcours E2E des recettes', () => {
  before(() => {
    cy.visit('/')
    cy.contains('Créer un compte').click()
    cy.get('input').eq(0).type('Alice E2E')
    cy.get('input[type="email"]').type(email)
    cy.get('input[type="password"]').type(password)
    cy.contains('Créer mon compte').click()
    cy.contains('Aucune recette trouvée.').should('be.visible')
    cy.contains('button', 'Alice E2E').click()
  })

  beforeEach(login)

  it('gère les dictionnaires', () => {
    cy.get('[data-testid="SettingsIcon"]').click()
    cy.contains('Dictionnaires').should('be.visible')
    cy.get('[role="dialog"]').within(() => {
      cy.get('input').first().type('Courgette E2E')
      cy.contains('button', 'Ajouter').click()
    })
    cy.contains('Courgette E2E').should('be.visible')
    cy.contains('Unités').click()
    cy.get('[role="dialog"]').within(() => {
      cy.get('input').eq(0).type('verre E2E')
      cy.get('input').eq(1).type('ve2e')
      cy.contains('button', 'Ajouter').click()
    })
    cy.contains('verre E2E').should('be.visible')
  })

  it('crée, prévisualise et consulte une recette', () => {
    cy.contains('button', 'Ajouter').click()
    cy.contains('Nouvelle recette').should('be.visible')
    cy.get('input').eq(0).clear().type('Gratin E2E')
    cy.get('input').eq(1).clear().type('6')
    cy.get('input').eq(2).type('Courgette E2E')
    cy.get('input').eq(3).type('2')
    cy.get('input').eq(4).click()
    cy.contains('g').click()
    cy.get('textarea').first().type('Cuire au four')
    cy.get('input').filter('[type="number"]').last().type('1')
    cy.contains('button', 'Prévisualiser').click()
    cy.contains('Gratin E2E').should('be.visible')
    cy.contains('button', 'Confirmer la recette').click()
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
    cy.get('input').eq(0).clear().type('Gratin E2E modifié')
    cy.contains('button', 'Prévisualiser').click()
    cy.contains('button', 'Enregistrer').click()
    cy.contains('Gratin E2E modifié').should('be.visible')
  })

  it('déconnecte l’utilisateur', () => {
    cy.contains('button', 'Alice E2E').click()
    cy.contains('Connecte-toi pour accéder à tes recettes.').should('be.visible')
  })
})
