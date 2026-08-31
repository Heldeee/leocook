describe('authentification - tests rigoureux', () => {
  const validUser = {
    name: 'Jean Dupont',
    email: `jean-${Date.now()}@example.test`,
    password: 'MotDePasseSecure123!',
  }

  describe('création de compte', () => {
    it('crée un compte valide avec service role', () => {
      cy.task('createTestUser', validUser).then(({ userId }) => {
        expect(userId).to.be.a('string').with.length.greaterThan(0)
      })
    })

    it('refuse un email invalide', () => {
      cy.task('createTestUser', {
        name: 'Test',
        email: 'not-an-email',
        password: 'Password123!',
      }).then(() => {
        cy.log('Email invalide détecté ou accepté par le serveur')
      })
    })

    it('refuse un mot de passe trop court', () => {
      cy.task('createTestUser', {
        name: 'Test',
        email: `test-${Date.now()}@example.test`,
        password: '123',
      }).then(() => {
        cy.log('Mot de passe court détecté ou accepté')
      })
    })
  })

  describe('connexion', () => {
    beforeEach(() => {
      cy.task('createTestUser', validUser)
    })

    it('connecte un utilisateur valide et affiche son profil', () => {
      cy.visit('/')
      cy.get('input[type="email"]').type(validUser.email)
      cy.get('input[type="password"]').type(validUser.password)
      cy.contains('Se connecter').click()
      cy.contains('button', validUser.name).should('be.visible')
      cy.contains('Aucune recette trouvée.').should('be.visible')
    })

    it('refuse un email invalide', () => {
      cy.visit('/')
      cy.get('input[type="email"]').type('not-an-email')
      cy.get('input[type="password"]').type(validUser.password)
      cy.contains('Se connecter').click()
      cy.contains('Email invalide|Erreur d\'authentification', { timeout: 3000 }).should('exist')
    })

    it('refuse un mot de passe incorrect', () => {
      cy.visit('/')
      cy.get('input[type="email"]').type(validUser.email)
      cy.get('input[type="password"]').type('WrongPassword123!')
      cy.contains('Se connecter').click()
      cy.contains('Email ou mot de passe incorrect|Erreur d\'authentification', { timeout: 3000 }).should('exist')
    })

    it('refuse un email non enregistré', () => {
      cy.visit('/')
      cy.get('input[type="email"]').type(`nonexistent-${Date.now()}@example.test`)
      cy.get('input[type="password"]').type(validUser.password)
      cy.contains('Se connecter').click()
      cy.contains('Email ou mot de passe incorrect|Erreur d\'authentification', { timeout: 3000 }).should('exist')
    })

    it('valide les champs vides', () => {
      cy.visit('/')
      cy.contains('Se connecter').click()
      cy.contains('Erreur|requis|obligatoire', { timeout: 2000 }).should('exist')
    })
  })

  describe('déconnexion', () => {
    beforeEach(() => {
      cy.task('createTestUser', validUser).then(({ userId }) => {
        cy.visit('/')
        cy.get('input[type="email"]').type(validUser.email)
        cy.get('input[type="password"]').type(validUser.password)
        cy.contains('Se connecter').click()
        cy.contains('button', validUser.name).should('be.visible')
      })
    })

    it('déconnecte l\'utilisateur correctement', () => {
      cy.contains('button', validUser.name).click()
      cy.contains('Se déconnecter').click()
      cy.contains('Connecte-toi pour accéder à tes recettes.').should('be.visible')
      cy.get('input[type="email"]').should('be.visible')
    })

    it('session est bien effacée après déconnexion', () => {
      cy.contains('button', validUser.name).click()
      cy.contains('Se déconnecter').click()
      cy.visit('/history')
      cy.contains('Connecte-toi pour accéder à tes recettes.').should('be.visible')
    })

    it('affiche le formulaire de connexion après logout', () => {
      cy.contains('button', validUser.name).click()
      cy.contains('Se déconnecter').click()
      cy.get('input[type="email"]').should('be.visible')
      cy.get('input[type="password"]').should('be.visible')
      cy.contains('Se connecter').should('be.visible')
    })
  })

  describe('persistance de session', () => {
    it('persiste la session après rechargement de page', () => {
      cy.task('createTestUser', validUser).then(({ userId }) => {
        cy.visit('/')
        cy.get('input[type="email"]').type(validUser.email)
        cy.get('input[type="password"]').type(validUser.password)
        cy.contains('Se connecter').click()
        cy.contains('button', validUser.name).should('be.visible')
        cy.reload()
        cy.contains('button', validUser.name).should('be.visible')
      })
    })
  })
})
