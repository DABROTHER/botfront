import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { saveAs } from 'file-saver';
import {
    Dropdown, Button, Message, Icon, Checkbox, List,
} from 'semantic-ui-react';

import { Projects } from '../../../api/project/project.collection';

import { getNluModelLanguages } from '../../../api/nlu_model/nlu_model.utils';

const ExportProject = ({
    projectId, projectLanguages, setLoading, apiHost,
}) => {
    const [exportType, setExportType] = useState({});
    const [exportLanguage, setExportLanguage] = useState('');
    const [ExportSuccessful, setExportSuccessful] = useState(undefined);
    const [errorMessage, setErrorMessage] = useState({
        header: 'Export Failed',
        text: 'There was an unexpected error in the api request.',
    });
    const toggles = {
        projectData: [...useState(true), 'Export Project Data'],
        conversations: [...useState(false), 'Export Conversations'],
        credentials: [...useState(false), 'Export Credentials'],
        endpoints: [...useState(false), 'Export Endpoints'],
        instances: [...useState(false), 'Export Instances'],
    };

    const projectDataCols = [
        'models',
        'activity',
        'evaluations',
        'storyGroups',
        'stories',
        'slots',
        'corePolicies',
        'botResponses',
    ];

    const getExportTypeOptions = () => [
        {
            key: 'botfront',
            text: 'Export for Botfront',
            value: 'botfront',
            successText: 'Your project has been successfully exported for Botfront!',
        },
        {
            key: 'rasa',
            text: 'Export for Rasa/Rasa X',
            value: 'rasa',
            successText: 'Your project has been successfully exported for Rasa/Rasa X!',
        },
    ];

    const generateParamString = () => {
        let params = '';
        Object.keys(toggles).forEach((t) => {
            if (t === 'projectData' && !toggles.projectData[0]) {
                params += projectDataCols.map(c => `&${c}=0`).join('');
                params += '&thinProject=1';
            } else if (!toggles[t][0]) params += `&${t}=0`;
        });
        return params;
    };

    const paramsFromString = paramString => paramString.split('&').reduce((acc, curr) => {
        const [param, value] = curr.split('=');
        return {
            ...acc,
            ...(param && value ? { [param]: value } : {}),
        };
    }, {});

    const getSuccessMessageContent = () => {
        if (exportType.value === 'botfront') {
            return (
                <p>
                    If your download does not start within 5 seconds click{' '}
                    <a
                        href={`${apiHost}/project/${projectId}/export?output=json${generateParamString()}`}
                        data-cy='export-link'
                    >
                        here{' '}
                    </a>
                    to retry.
                </p>
            );
        }
        return <></>;
    };

    const getLanguageOptions = () => projectLanguages.map(({ value, text }) => ({
        key: value,
        text,
        value,
    }));

    const validateLanguage = () => getLanguageOptions().some(({ value }) => value === exportLanguage);

    const validateExportType = () => {
        if (exportType.value === 'rasa' && validateLanguage()) {
            return true;
        }
        return false;
    };

    const exportForBotfront = () => {
        setLoading(true);
        const exportOptions = paramsFromString(generateParamString());
        Meteor.call(
            'exportProject',
            apiHost,
            projectId,
            exportOptions,
            (err, { data, error }) => {
                if (data) {
                    const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
                    const filename = `BotfrontProject_${projectId}.json`;
                    if (window.Cypress) {
                        setExportSuccessful(true);
                        setLoading(false);
                        return;
                    }
                    saveAs(blob, filename);
                    setExportSuccessful(true);
                    setLoading(false);
                    return;
                }
                if (error) {
                    setErrorMessage(error);
                    setExportSuccessful(false);
                    setLoading(false);
                    return;
                }
                setLoading(false);
                setExportSuccessful(false);
            },
        );
    };

    const exportForRasa = () => {
        setLoading(true);
        Meteor.call('exportRasa', projectId, exportLanguage, (err, rasaData) => {
            if (err) {
                setErrorMessage({ header: 'Rasa Export Failed!', text: err.message });
                setExportSuccessful(false);
                setLoading(false);
                return;
            }
            import('../utils/ZipFolder').then(({ ZipFolder }) => {
                const rasaZip = new ZipFolder();
                rasaZip.addFile(rasaData.config, 'config.yml');
                rasaZip.addFile(rasaData.nlu, 'data/nlu.md');
                rasaZip.addFile(rasaData.stories, 'data/stories.md');
                rasaZip.addFile(rasaData.endpoints, 'endpoints.yml');
                rasaZip.addFile(rasaData.credentials, 'credentials.yml');
                rasaZip.addFile(rasaData.domain, 'domain.yml');

                // prevents the file from being downloaded durring cypress tests
                if (window.Cypress) {
                    setExportSuccessful(true);
                    setLoading(false);
                    return;
                }
                rasaZip.downloadAs(`${projectId}_RasaExport`, () => {
                    setExportSuccessful(true);
                    setLoading(false);
                });
            });
        });
    };

    const exportProject = () => {
        if (exportType.value === 'botfront') exportForBotfront();
        if (exportType.value === 'rasa') exportForRasa();
    };

    const handleDropdownOnChange = (x, { value }) => {
        setExportType(
            getExportTypeOptions().find(option => option.value === value) || {},
        );
    };

    const renderToggle = t => (
        <Checkbox
            toggle
            checked={toggles[t][0]}
            onChange={() => toggles[t][1](!toggles[t][0])}
            label={toggles[t][2]}
            className='export-option'
            key={t}
        />
    );

    if (ExportSuccessful === true) {
        return (
            <Message
                data-cy='export-success-message'
                positive
                icon='check circle'
                header={exportType.successText}
                content={getSuccessMessageContent()}
            />
        );
    }
    if (ExportSuccessful === false) {
        return (
            <Message
                data-cy='export-failure-message'
                error
                icon='times circle'
                header={errorMessage.header}
                content={<>{errorMessage.text}</>}
            />
        );
    }
    return (
        <>
            <Dropdown
                data-cy='export-type-dropdown'
                key='format'
                className='export-option'
                options={getExportTypeOptions().map(({ value, text, key }) => ({
                    value, text, key,
                }))}
                placeholder='Select a format'
                selection
                onChange={handleDropdownOnChange}
            />
            <br />
            {exportType.value === 'botfront'
                && Object.keys(toggles).map(t => renderToggle(t))}
            {exportType.value === 'rasa' && (
                <>
                    <Message
                        info
                        header='A few things to keep in mind when exporting for Rasa'
                        content={(
                            <>
                                <h5>NLU pipeline</h5>
                                <p>
                                    Consider removing Botfront specific NLU components,
                                    such as:
                                    <List as='ul'>
                                        <List.Item as='li'>
                                            rasa_addons.nlu.components.gazette.Gazette
                                        </List.Item>
                                    </List>
                                </p>
                                <h5>Responses</h5>
                                <p>
                                    Responses (templates) are lists. Rasa treats them as{' '}
                                    <strong>variants</strong> that should be randomly
                                    displayed, Botfront treats them as sequence (each item
                                    is uttered). If you used the sequence feature in
                                    Botfront, you will need to rework your stories
                                    accordingly.
                                </p>
                                <h5>Credentials and endpoints</h5>
                                <p>
                                    In most cases, you do not need to change credentials
                                    or endpoints. If you need to keep credentials from
                                    Botfront, be sure to keep the <b>rasa</b> and{' '}
                                    <b>rest</b> fields from the <b>credentials.yml</b>{' '}
                                    provided by Rasa X.
                                </p>
                            </>
                        )}
                    />
                    <Dropdown
                        data-cy='export-language-dropdown'
                        key='language'
                        className='export-option'
                        options={getLanguageOptions()}
                        placeholder='Select a language'
                        selection
                        onChange={(x, { value }) => {
                            setExportLanguage(value);
                        }}
                    />
                    <br />
                </>
            )}
            <br />
            {validateExportType() && (
                <Button
                    onClick={exportProject}
                    className='export-option'
                    data-cy='export-button'
                >
                    <Icon name='download' />
                    Export project for Rasa/Rasa X
                </Button>
            )}
            {exportType.value === 'botfront' && (
                <Button
                    onClick={exportProject}
                    className='export-option'
                    data-cy='export-button'
                >
                    <Icon name='download' />
                    Export project for Botfront
                </Button>
            )}
        </>
    );
};

ExportProject.propTypes = {
    projectId: PropTypes.string.isRequired,
    projectLanguages: PropTypes.array.isRequired,
    setLoading: PropTypes.func.isRequired,
    apiHost: PropTypes.string.isRequired,
};

const ExportProjectContainer = withTracker(({ projectId }) => {
    const project = Projects.findOne({ _id: projectId });
    const projectLanguages = getNluModelLanguages(
        project.nlu_models,
        true,
    ).map(({ value, text }) => ({ key: value, text, value }));
    return { projectLanguages };
})(ExportProject);

const mapStateToProps = state => ({
    projectId: state.settings.get('projectId'),
});

export default connect(mapStateToProps)(ExportProjectContainer);
