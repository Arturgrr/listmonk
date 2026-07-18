const apiUrl = Cypress.env('apiUrl');

describe('Acceptance', () => {
  it('Creates a new public list', () => {
    cy.resetDB();
    cy.loginAndVisit('/admin/lists');

    cy.get('[data-cy=btn-new]').click();
    cy.get('input[name=name]').type('Newsletter List');
    cy.get('select[name=type]').select('public');
    cy.get('select[name=optin]').select('single');
    cy.get('input[name=tags]').type('trabalho{enter}');
    cy.get('textarea[name=description]').clear().type('List created by the acceptance test');
    cy.get('[data-cy=btn-save]').click();
    cy.wait(250);

    cy.get('tbody td[data-label=Name]').contains('Newsletter List');
  });

  it('Creates a subscriber and finds it via search', () => {
    cy.loginAndVisit('/admin/subscribers');

    const email = 'maria@example.com';
    const name = 'Maria Souza';

    cy.get('[data-cy=btn-new]').click();
    cy.get('input[name=email]').type(email);
    cy.get('input[name=name]').type(name);
    cy.get('.list-selector input').click();
    cy.get('.list-selector .autocomplete a').first().click();
    cy.get('.modal-card-foot button[type=submit]').click();
    cy.wait(250);

    cy.get('[data-cy=search]').clear().type(`${email}{enter}`);
    cy.get('tbody td[data-label=E-mail]').its('length').should('eq', 1);
    cy.get('tbody td[data-label=E-mail]').contains(email);
    cy.get('tbody td[data-label=Name]').contains(name);
    cy.get('[data-cy=search]').clear().type('{enter}');
  });

  it('Shows a public list on the public subscription form', () => {
    cy.request('POST', `${apiUrl}/api/lists`, {
      name: 'Public Trabalho List',
      type: 'public',
      optin: 'double',
    });

    cy.loginAndVisit(`${apiUrl}/subscription/form`);
    cy.get('ul li label').contains('Public Trabalho List');
  });

  it('Shows subscriber counts on the dashboard', () => {
    cy.loginAndVisit('/admin/');

    cy.get('[data-cy=subscribers] .title').invoke('text').then((t) => {
      expect(parseInt(t.trim(), 10)).to.be.gte(3);
    });
    cy.get('[data-cy=lists] .title').invoke('text').then((t) => {
      expect(parseInt(t.trim(), 10)).to.be.gte(2);
    });
  });
});
