/* global cy:true */

const utterance = 'whatever this is a testing utterance';
const intentName = 'KPI';
const secondEntity = 'ENT2';
const newEntity = 'myNewEntity';

describe('nlu tagging in training data', function() {
    before(function() {});

    beforeEach(function() {
        cy.createProject('bf', 'My Project', 'fr').then(() => {
            cy.login();
            cy.visit('/project/bf/nlu/models');
            cy.dataCy('nlu-menu-settings').click();
            cy.contains('Import').click();
            cy.fixture('nlu_import.json', 'utf8').then((content) => {
                cy.get('.file-dropzone').upload(content, 'data.json');
            });
            cy.contains('Import Training Data').click();
        });
    });

    afterEach(function() {
        cy.deleteProject('bf');
    });

    it('Should add training data', function() {
        cy.visit('/project/bf/nlu/models');
        cy.contains('Insert many').click();
        cy.get('.batch-insert-input').type(utterance);
        cy.dataCy('intent-label')
            .click({ force: true })
            .type(`${intentName}{enter}`);
        cy.get('[data-cy=save-button]').click();
        cy.visit('/project/bf/nlu/models');
        cy.get('.rt-tbody .rt-tr:first').should('contain', utterance);
        cy.get('.rt-tbody .rt-tr:first').should('contain', intentName);
    });

    it('should be able to change the intent with a popup', function() {
        cy.visit('/project/bf/nlu/models');
        cy.get('.rt-tbody .rt-tr:first')
            .contains('chitchat.presentation')
            .click({ force: true });
        cy.get('.intent-dropdown input')
            .click({ force: true })
            .type('chitchat.tell_me_a_joke{enter}');

        cy.get('.rt-tbody .rt-tr:first').contains('chitchat.tell_me_a_joke');
    });

    it('should delete the training data', function() {
        cy.visit('/project/bf/nlu/models');
        cy.get('.rt-tbody .rt-tr:first [data-cy=trash] .viewOnHover').click({
            force: true,
        });
        cy.get('.rt-tbody .rt-tr:first').should('not.contain', utterance);
    });

    it('should be able to change an entity with a popup', function() {
        cy.visit('/project/bf/nlu/models');
        cy.get('.rt-tbody .rt-tr:first')
            .contains('Matthieu')
            .trigger('mouseover');

        cy.get('[data-cy=entity-dropdown]').click();
        cy.get('[data-cy=entity-dropdown]')
            .contains(secondEntity)
            .click();

        cy.get('.rt-tbody .rt-tr:first').contains(secondEntity);

        cy.visit('/project/bf/nlu/models');
        cy.contains('Training Data').click();

        cy.get('.rt-tbody .rt-tr:first').contains(secondEntity);
    });

    it('should be able to change an entity with a popup to a new entity', function() {
        cy.visit('/project/bf/nlu/models');
        cy.get('.rt-tbody .rt-tr:first')
            .contains('Matthieu')
            .trigger('mouseover');

        cy.get('[data-cy=entity-dropdown]').click();
        cy.get('[data-cy=entity-dropdown] input').type(`${newEntity}{enter}`);

        cy.get('.rt-tbody .rt-tr:first').contains(newEntity);

        cy.visit('/project/bf/nlu/models');
        cy.contains('Training Data').click();

        cy.get('.rt-tbody .rt-tr:first').contains(newEntity);
    });
});
