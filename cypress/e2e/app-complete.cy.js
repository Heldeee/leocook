describe('batterie complète de tests Cypress', () => {
  const createUser = (name) => {
    const safeName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'user'

    return {
      name,
      email: `${safeName}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@example.test`,
      password: 'motdepasse123',
    }
  }

  const login = (user) => {
    cy.visit('/')
    cy.get('input[type="email"]').clear().type(user.email)
    cy.get('input[type="password"]').clear().type(user.password)
    cy.contains('button', 'Se connecter').click()
    cy.contains('button', user.name).should('be.visible')
  }

  const createAndLogin = (name) => {
    const user = createUser(name)
    cy.task('createTestUser', user)
    login(user)
    return user
  }

  const openNewRecipeForm = (user) => {
    login(user)
    cy.contains('button', 'Ajouter').click({ force: true })
    cy.contains('Nouvelle recette').should('be.visible')
  }

  it('affiche le formulaire d’authentification et bascule vers l’inscription', () => {
    cy.visit('/')

    cy.contains('Connecte-toi pour accéder à tes recettes.').should('be.visible')
    cy.contains('button', 'Créer un compte').click()
    cy.contains('Crée ton espace familial.').should('be.visible')
    cy.contains('label', 'Prénom').should('be.visible')
    cy.contains('button', 'Créer mon compte').should('be.visible')
  })

  it('connecte un utilisateur créé via service role sans confirmer son e-mail', () => {
    const user = createUser('Alice Local')

    cy.task('createTestUser', user).then(() => {
      login(user)
      cy.contains('Aucune recette trouvée.').should('be.visible')
      cy.contains('button', user.name).should('be.visible')
    })
  })

  it('affiche l’état vide quand un compte n’a aucune recette', () => {
    const user = createUser('Compte Vide')

    cy.task('createTestUser', user).then(() => {
      login(user)
      cy.contains('Aucune recette trouvée.').should('be.visible')
    })
  })

  it('ajoute un ingrédient et une unité depuis le dictionnaire', () => {
    const user = createUser('Dictionnaire')
    const ingredientName = `Carotte E2E ${Date.now()}`
    const unitName = `verre E2E ${Date.now()}`
    const unitAbbrev = `ve${Date.now().toString().slice(-3)}`

    cy.task('createTestUser', user).then(() => {
      login(user)

      cy.get('[data-testid="SettingsIcon"]').click()
      cy.contains('Dictionnaires').should('be.visible')

      cy.get('[role="dialog"]').within(() => {
        cy.get('input').first().type(ingredientName)
        cy.contains('button', 'Ajouter').click()
      })

      cy.contains('[role="dialog"]', ingredientName).should('be.visible')
      cy.contains('[role="dialog"] [role="tab"]', 'Unités').click()

      cy.get('[role="dialog"]').within(() => {
        cy.get('input').first().type(unitName)
        cy.get('input').eq(1).type(unitAbbrev)
        cy.contains('button', 'Ajouter').click()
      })

      cy.contains('[role="dialog"]', unitName).should('be.visible')
    })
  })

  it('ouvre une recette seedée et vérifie ses détails', () => {
    const user = createUser('Recette Detail')
    const recipeName = `Gratin ${Date.now()}`

    cy.task('createTestUser', user).then(({ userId }) => {
      cy.task('seedRecipe', {
        userId,
        recipeName,
        ingredientName: `Courgette ${Date.now()}`,
        tagName: `tag-${Date.now()}`,
      }).then(() => {
        login(user)

        cy.contains(recipeName).click()
        cy.contains(recipeName).should('be.visible')
        cy.contains('Ingrédients').should('be.visible')
        cy.contains('Étapes').should('be.visible')
      })
    })
  })

  it('ajoute une recette en favori, vérifie l’historique et modifie la recette', () => {
    const user = createUser('Favoris Edit')
    const recipeName = `Tarte ${Date.now()}`

    cy.task('createTestUser', user).then(({ userId }) => {
      cy.task('seedRecipe', {
        userId,
        recipeName,
        ingredientName: `Poireau ${Date.now()}`,
        tagName: `favori-${Date.now()}`,
      }).then(() => {
        login(user)

        cy.contains(recipeName).click()
        cy.get('[data-testid="FavoriteBorderIcon"]').click()

        cy.contains('button', 'Favoris').click()
        cy.contains(recipeName).should('be.visible')

        cy.contains('button', 'Historique').click()
        cy.contains(recipeName).should('be.visible')

        cy.contains(recipeName).click()
        cy.get('[data-testid="EditIcon"]').click()
        cy.contains('Modifier la recette').should('be.visible')

        cy.contains('label', 'Nom de la recette').parents('.MuiFormControl-root').find('input')
          .clear()
          .type(`${recipeName} modifié`)

        cy.contains('button', 'Prévisualiser').click()
        cy.contains('button', 'Enregistrer').click()
        cy.contains(`${recipeName} modifié`).should('be.visible')
      })
    })
  })

  it('bloque la prévisualisation d’une recette sans nom', () => {
    const user = createUser('Sans Nom')

    cy.task('createTestUser', user).then(() => {
      openNewRecipeForm(user)
      cy.contains('label', 'Nom de la recette').parents('.MuiFormControl-root').find('input').should('have.attr', 'required')
      cy.contains('button', 'Prévisualiser').click({ force: true })
      cy.contains('label', 'Nom de la recette').parents('.MuiFormControl-root').find('input').then(($input) => {
        expect($input[0].validity.valueMissing).to.eq(true)
      })
    })
  })

  it('crée une recette complète, la prévisualise puis la confirme', () => {
    const user = createUser('Création Complète')
    const recipeName = `Velouté ${Date.now()}`

    cy.task('createTestUser', user).then(() => {
      openNewRecipeForm(user)

      cy.contains('label', 'Nom de la recette').parents('.MuiFormControl-root').find('input').first().clear({ force: true }).type(recipeName, { force: true })
      cy.contains('label', 'Portions').parents('.MuiFormControl-root').find('input').first().clear({ force: true }).type('4', { force: true })

      cy.contains('label', 'Ingrédient').parents('.MuiFormControl-root').find('input').first().type('Carotte', { force: true })
      cy.contains('[role="option"]', 'Carotte').click({ force: true })
      cy.contains('label', 'Quantité').parents('.MuiFormControl-root').find('input').first().clear({ force: true }).type('2', { force: true })
      cy.contains('label', 'Unité').parents('.MuiFormControl-root').find('input').first().click({ force: true }).type('g{downarrow}{enter}', { force: true })

      cy.get('textarea').first().type('Éplucher et couper les carottes', { force: true })
      cy.get('input[type="number"]').eq(2).clear({ force: true }).type('20', { force: true })

      cy.contains('button', 'Ajouter une étape').click({ force: true })
      cy.get('textarea').eq(1).type('Faire revenir 5 minutes', { force: true })
      cy.get('input[type="number"]').eq(3).clear({ force: true }).type('5', { force: true })

      cy.contains('button', 'Prévisualiser').click({ force: true })
      cy.contains('button', 'Confirmer la recette').click({ force: true })

      cy.contains(recipeName).should('be.visible')
      cy.contains('Carotte').should('be.visible')
      cy.contains('Éplucher et couper les carottes').should('be.visible')
    })
  })

  it('ignore les lignes vides et sauvegarde une recette avec tags libres', () => {
    const user = createUser('Tags Libres')
    const recipeName = `Soupe ${Date.now()}`

    cy.task('createTestUser', user).then(() => {
      openNewRecipeForm(user)

      cy.contains('Nom de la recette').parent().find('input').first().clear({ force: true }).type(recipeName, { force: true })
      cy.contains('button', 'Ajouter un ingrédient').click({ force: true })
      cy.contains('Ingrédient').parent().find('input').first().type('Poireau', { force: true })
      cy.contains('[role="option"]', 'Poireau').click({ force: true })
      cy.contains('Quantité').parent().find('input').first().clear({ force: true }).type('1', { force: true })
      cy.contains('Unité').parent().find('input').first().click({ force: true }).type('g{downarrow}{enter}', { force: true })

      cy.contains('Instruction').parent().find('textarea').first().type('Faire fondre le poireau', { force: true })
      cy.contains('Min.').parent().find('input').first().clear({ force: true }).type('10', { force: true })

      cy.contains('Tags').parent().find('input').first().type('rapide{enter}', { force: true })
      cy.contains('button', 'Prévisualiser').click({ force: true })
      cy.contains('button', 'Confirmer la recette').click({ force: true })

      cy.contains(recipeName).should('be.visible')
      cy.contains('Poireau').should('be.visible')
      cy.contains('rapide').should('be.visible')
    })
  })

  it('déconnecte l’utilisateur depuis le profil', () => {
    const user = createAndLogin('Alice Logout')
    cy.contains('button', user.name).click()
    cy.contains('Connecte-toi pour accéder à tes recettes.').should('be.visible')
  })
})
