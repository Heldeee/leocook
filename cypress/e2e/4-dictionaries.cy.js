describe('dictionnaires - gestion des ingrédients, unités, tags', () => {
  const user = {
    name: 'Chef Dictionnaire',
    email: `chef-dict-${Date.now()}@example.test`,
    password: 'SecurePass123!',
  }

  const login = () => {
    cy.visit('/')
    cy.get('input[type="email"]').clear().type(user.email)
    cy.get('input[type="password"]').clear().type(user.password)
    cy.contains('Se connecter').click()
    cy.contains('button', user.name).should('be.visible')
  }

  const openDictionaries = () => {
    cy.get('[data-testid="SettingsIcon"]').click()
    cy.contains('Dictionnaires').click()
  }

  before(() => {
    cy.task('createTestUser', user)
  })

  beforeEach(login)

  describe('ouverture et fermeture', () => {
    it('ouvre le menu paramètres', () => {
      cy.get('[data-testid="SettingsIcon"]').should('be.visible').click()
      cy.contains('Paramètres|Dictionnaires').should('be.visible')
    })

    it('ferme le menu paramètres', () => {
      cy.get('[data-testid="SettingsIcon"]').click()
      cy.contains('Paramètres|Dictionnaires').click()
      cy.get('[role="dialog"]').should('not.exist')
    })
  })

  describe('onglet ingrédients', () => {
    beforeEach(openDictionaries)

    it('affiche l\'onglet ingrédients par défaut', () => {
      cy.contains('Ingrédients').should('be.visible')
    })

    it('ajoute un ingrédient valide', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.get('input').first().type('Paprika')
        cy.contains('button', 'Ajouter').click()
      })
      cy.contains('[role="dialog"]', 'Paprika').should('be.visible')
    })

    it('affiche la liste des ingrédients existants', () => {
      cy.contains('[role="dialog"]', 'Paprika').should('be.visible')
    })

    it('refuse d\'ajouter un ingrédient vide', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.contains('button', 'Ajouter').click()
      })
      cy.contains('Erreur|champ requis|doit être rempli', { timeout: 2000 }).should('exist')
    })

    it('refuse d\'ajouter un ingrédient en doublon', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.get('input').first().type('Paprika')
        cy.contains('button', 'Ajouter').click()
      })
      cy.contains('existe déjà|doublon|Paprika existe', { timeout: 2000 }).should('exist')
    })

    it('accepte des ingrédients avec des caractères spéciaux', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.get('input').first().type('Œuf de poule')
        cy.contains('button', 'Ajouter').click()
      })
      cy.contains('[role="dialog"]', 'Œuf de poule').should('be.visible')
    })

    it('accepte des ingrédients avec des accents', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.get('input').first().type('Crème fraîche')
        cy.contains('button', 'Ajouter').click()
      })
      cy.contains('[role="dialog"]', 'Crème fraîche').should('be.visible')
    })

    it('accepte un ingrédient avec nom très long', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.get('input').first().type('Extrait de vanille de Madagascar pur')
        cy.contains('button', 'Ajouter').click()
      })
      cy.contains('[role="dialog"]', 'Extrait de vanille').should('be.visible')
    })

    it('supprime un ingrédient', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.contains('Paprika').parents('li, [role="listitem"]').find('[data-testid="DeleteIcon"], button[aria-label*="upp"]').click()
      })
      cy.contains('[role="dialog"]', 'Paprika').should('not.exist')
    })
  })

  describe('onglet unités', () => {
    beforeEach(() => {
      openDictionaries()
      cy.contains('[role="tab"]', 'Unités').click()
    })

    it('affiche l\'onglet unités', () => {
      cy.contains('[role="tab"]', 'Unités').should('have.attr', 'aria-selected', 'true')
    })

    it('ajoute une unité avec nom et abréviation', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.get('input').eq(0).type('cuillerée')
        cy.get('input').eq(1).type('cc')
        cy.contains('button', 'Ajouter').click()
      })
      cy.contains('[role="dialog"]', 'cuillerée').should('be.visible')
      cy.contains('[role="dialog"]', 'cc').should('be.visible')
    })

    it('refuse une unité sans nom', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.get('input').eq(1).type('cc')
        cy.contains('button', 'Ajouter').click()
      })
      cy.contains('Erreur|champ requis|doit être rempli', { timeout: 2000 }).should('exist')
    })

    it('refuse une unité sans abréviation', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.get('input').eq(0).type('cuillerée')
        cy.contains('button', 'Ajouter').click()
      })
      cy.contains('Erreur|champ requis|doit être rempli', { timeout: 2000 }).should('exist')
    })

    it('supprime une unité', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.contains('cuillerée').parents('li, [role="listitem"]').find('[data-testid="DeleteIcon"], button[aria-label*="upp"]').click()
      })
      cy.contains('[role="dialog"]', 'cuillerée').should('not.exist')
    })
  })

  describe('onglet tags', () => {
    beforeEach(() => {
      openDictionaries()
      cy.contains('[role="tab"]', 'Tags').click()
    })

    it('affiche l\'onglet tags', () => {
      cy.contains('[role="tab"]', 'Tags').should('have.attr', 'aria-selected', 'true')
    })

    it('ajoute un tag', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.get('input').first().type('Rapide')
        cy.contains('button', 'Ajouter').click()
      })
      cy.contains('[role="dialog"]', 'Rapide').should('be.visible')
    })

    it('refuse un tag vide', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.contains('button', 'Ajouter').click()
      })
      cy.contains('Erreur|champ requis|doit être rempli', { timeout: 2000 }).should('exist')
    })

    it('refuse un tag en doublon', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.get('input').first().type('Rapide')
        cy.contains('button', 'Ajouter').click()
      })
      cy.get('[role="dialog"]').within(() => {
        cy.get('input').first().type('Rapide')
        cy.contains('button', 'Ajouter').click()
      })
      cy.contains('existe déjà|doublon|Rapide existe', { timeout: 2000 }).should('exist')
    })

    it('supprime un tag', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.contains('Rapide').parents('li, [role="listitem"]').find('[data-testid="DeleteIcon"], button[aria-label*="upp"]').click()
      })
      cy.contains('[role="dialog"]', 'Rapide').should('not.exist')
    })
  })

  describe('navigation entre onglets', () => {
    beforeEach(openDictionaries)

    it('navigue entre tous les onglets', () => {
      cy.contains('[role="tab"]', 'Ingrédients').should('have.attr', 'aria-selected', 'true')
      cy.contains('[role="tab"]', 'Unités').click()
      cy.contains('[role="tab"]', 'Unités').should('have.attr', 'aria-selected', 'true')
      cy.contains('[role="tab"]', 'Tags').click()
      cy.contains('[role="tab"]', 'Tags').should('have.attr', 'aria-selected', 'true')
      cy.contains('[role="tab"]', 'Ingrédients').click()
      cy.contains('[role="tab"]', 'Ingrédients').should('have.attr', 'aria-selected', 'true')
    })
  })

  describe('persistance des données', () => {
    it('les ingrédients persisted après fermeture et réouverture', () => {
      openDictionaries()
      cy.get('[role="dialog"]').within(() => {
        cy.get('input').first().type('Sel Marin')
        cy.contains('button', 'Ajouter').click()
      })
      cy.contains('[role="dialog"]', 'Sel Marin').should('be.visible')
      cy.get('[role="dialog"]').within(() => {
        cy.contains('button', 'Fermer|Annuler').click()
      })
      openDictionaries()
      cy.contains('[role="dialog"]', 'Sel Marin').should('be.visible')
    })
  })
})
