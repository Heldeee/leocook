const cakeName = 'Gâteau au yaourt et à la vanille'
const openCake = () => cy.get(`[aria-label="${cakeName}"]`).click()
const noHorizontalOverflow = () => cy.document().then(document => expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth + 1))

describe('Usage mobile et tablette', () => {
  beforeEach(() => {
    cy.viewport(390, 844)
    cy.visit('/#/', { onBeforeLoad(win) { win.localStorage.clear(); win.sessionStorage.clear() } })
  })

  it('affiche 31 recettes, filtre les cinq catégories et recherche sans accents', () => {
    cy.contains('31 recettes').should('be.visible')
    for (const category of ['Airfryer', 'Compotes', 'Plats simples', 'Pâtisseries', 'Salades']) {
      cy.get('nav[aria-label="Catégories de recettes"]').contains(category).click()
      cy.contains('6 recettes').should('be.visible')
    }
    cy.get('nav[aria-label="Catégories de recettes"]').contains('Toutes').click()
    cy.get('[aria-label="Rechercher une recette ou un ingrédient"]').type('pates thon')
    cy.contains('1 recette').should('be.visible')
    cy.get('[aria-label="Salade de pâtes au thon et maïs"]').should('be.visible')
    cy.get('[aria-label="Effacer la recherche"]').click()
    cy.contains('31 recettes').should('be.visible')
    cy.screenshot('mobile-catalogue', { capture: 'viewport' })
  })

  it('ajuste les portions, coche les ingrédients et conserve la recherche au retour', () => {
    cy.get('[aria-label="Rechercher une recette ou un ingrédient"]').type('yaourt vanille')
    openCake()
    cy.get('[aria-label="Augmenter les portions"]').click()
    cy.contains('5 portions').should('be.visible')
    cy.contains('156,25').should('be.visible')
    cy.get('#ingredients-heading').parent().find('input[type="checkbox"]').first().check()
    cy.contains('1 / 7 préparés').should('be.visible')
    cy.screenshot('mobile-recette', { capture: 'viewport' })
    cy.get('button').contains('Recettes').click()
    cy.get('[aria-label="Rechercher une recette ou un ingrédient"]').should('have.value', 'yaourt vanille')
  })

  it('ne lance aucun minuteur automatiquement, gère pause, reprise et réinitialisation', () => {
    openCake()
    cy.contains('button', 'Mode cuisine').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('button', 'Suivante').click()
      cy.contains('button', 'Suivante').click()
      cy.contains('button', 'Suivante').click()
      cy.get('[data-testid="timer"]').should('have.text', '25:00')
    })
    cy.clock(Date.now(), ['Date', 'setInterval', 'clearInterval'])
    cy.tick(3000)
    cy.get('[data-testid="timer"]').should('have.text', '25:00')
    cy.contains('button', 'Démarrer').click()
    cy.tick(2000)
    cy.get('[data-testid="timer"]').should('have.text', '24:58')
    cy.contains('button', 'Pause').click()
    cy.tick(5000)
    cy.get('[data-testid="timer"]').should('have.text', '24:58')
    cy.contains('button', 'Reprendre').click()
    cy.tick(1000)
    cy.get('[data-testid="timer"]').should('have.text', '24:57')
    cy.get('[aria-label="Réinitialiser le minuteur"]').click()
    cy.get('[data-testid="timer"]').should('have.text', '25:00')
    cy.clock().invoke('restore')
    cy.screenshot('mobile-mode-cuisine', { capture: 'viewport' })
    cy.get('[aria-label="Quitter le mode cuisine"]').click()
    cy.get('[role="dialog"]').should('not.exist')
  })

  for (const [width, height] of [[320, 740], [768, 1024], [1024, 768]]) {
    it(`reste lisible sans débordement à ${width} × ${height}`, () => {
      cy.viewport(width, height)
      cy.contains('31 recettes').should('be.visible')
      noHorizontalOverflow()
      openCake()
      cy.get('h1').should('contain', cakeName)
      noHorizontalOverflow()
      if (width >= 768) {
        cy.get('#ingredients-heading').parent().then($ingredients => {
          cy.get('#steps-heading').parent().then($steps => {
            expect($ingredients[0].getBoundingClientRect().left).to.be.lessThan($steps[0].getBoundingClientRect().left)
          })
        })
        cy.screenshot(`ipad-${width}-recette`, { capture: 'viewport' })
      }
      cy.contains('button', 'Mode cuisine').click()
      cy.get('[role="dialog"]').should('be.visible')
      noHorizontalOverflow()
    })
  }

  it('conserve catégorie et conseils lors de l’édition et prévient une ligne incomplète', () => {
    cy.contains('button', 'Catalogue').click()
    cy.contains('Activer le mode édition').click()
    cy.contains('button', 'Recettes').click()
    openCake()
    cy.get('[aria-label="Modifier la recette"]').click()
    cy.contains('label', 'Ingrédient').first().parent().find('input').clear()
    cy.contains('button', 'Prévisualiser').click()
    cy.contains('Complète le nom').should('be.visible')
    cy.contains('label', 'Ingrédient').first().parent().find('input').type('yaourt nature')
    cy.contains('button', 'Prévisualiser').click()
    cy.contains('button', 'Enregistrer').click()
    cy.get('h1').should('contain', cakeName)
    cy.window().then(win => {
      const saved = JSON.parse(win.localStorage.getItem('leocook.catalogue-draft.v1'))
      const recipe = saved.catalogue.recipes.find(row => row.name === cakeName)
      expect(recipe.category).to.equal('airfryer')
      expect(recipe.notes).to.contain('moule de 14 à 16 cm')
    })
    noHorizontalOverflow()
  })
})
