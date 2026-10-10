import { defineConfig } from "cypress";

export default defineConfig({
  allowCypressEnv: false,

  e2e: {
    specPattern: ['cypress/e2e/catalogue.cy.js', 'cypress/e2e/mobile-ux.cy.js', 'cypress/e2e/google-sheets.cy.js'],
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://127.0.0.1:4173',
  },
});
