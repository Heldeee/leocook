describe('auth locale stable', () => {
  it('connecte un utilisateur créé par service role sans mail de confirmation', () => {
    const user = {
      name: 'Alice Local',
      email: `alice-local-${Date.now()}@example.test`,
      password: 'motdepasse123',
    }
    cy.task('createTestUser', user).then(({ email, password }) => {
      cy.visit('/')
      cy.get('input[type="email"]').type(email)
      cy.get('input[type="password"]').type(password)
      cy.contains('Se connecter').click()
      cy.contains('Aucune recette trouvée.').should('be.visible')
      cy.contains('button', user.name).should('be.visible')
    })
  })
})
