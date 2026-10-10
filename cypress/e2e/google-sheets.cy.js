const endpoint = 'https://script.google.com/macros/s/test-deployment/exec'
const visitClean = () => cy.visit('/#/', { onBeforeLoad(win) { win.localStorage.clear(); win.sessionStorage.clear() } })

describe('Connexion Google Sheets', () => {
  it('lit la source configurée et désactive la publication GitHub en mode Sheets', () => {
    cy.request('/data/catalogue.json').then(({ body }) => {
      const live = structuredClone(body)
      live.recipes[0].name = 'Recette du tableur'
      cy.intercept('GET', '**/data/source.json', { body: { googleSheetsUrl: endpoint } })
      cy.intercept('GET', endpoint, { body: live }).as('sheets')
    })
    visitClean()
    cy.wait('@sheets')
    cy.get('[aria-label="Recette du tableur"]').should('exist')
    cy.contains('button', 'Catalogue').click()
    cy.contains('Google Sheets connecté').should('be.visible')
    cy.contains('Activer le mode édition').click()
    cy.contains('button', 'Publier sur GitHub').should('not.exist')
    cy.contains('L’app n’écrit pas dans le tableur.').should('be.visible')
  })

  it('affiche explicitement la copie de secours si le service Google échoue', () => {
    cy.intercept('GET', '**/data/source.json', { body: { googleSheetsUrl: endpoint } })
    cy.intercept('GET', endpoint, { statusCode: 503, body: {} })
    visitClean()
    cy.contains('La copie JSON de secours est affichée').should('be.visible')
    cy.contains('31 recettes').should('be.visible')
  })

  it('teste une URL sans sauvegarder une réponse invalide, puis connecte cet appareil', () => {
    cy.intercept('GET', '**/data/source.json', { body: { googleSheetsUrl: '' } })
    visitClean()
    cy.contains('button', 'Catalogue').click()
    cy.contains('label', 'URL publique Apps Script (/exec)').parent().find('input').type(endpoint)
    cy.intercept('GET', endpoint, { body: { error: 'Catalogue invalide simulé' } })
    cy.contains('button', 'Tester et connecter Google Sheets').click()
    cy.contains('Connexion impossible').should('be.visible')
    cy.window().then(win => expect(win.localStorage.getItem('leocook.sheets-url.v1')).to.equal(null))
    cy.request('/data/catalogue.json').then(({ body }) => cy.intercept('GET', endpoint, { body }).as('validSheets'))
    cy.contains('button', 'Tester et connecter Google Sheets').click()
    cy.wait('@validSheets')
    cy.contains('31 recettes reçues').should('be.visible')
    cy.window().then(win => expect(win.localStorage.getItem('leocook.sheets-url.v1')).to.equal(endpoint))
    cy.contains('button', 'Recharger l’app').click()
    cy.contains('Google Sheets connecté').should('be.visible')
  })
})
