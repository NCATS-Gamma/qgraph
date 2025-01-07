import React, { useState, useContext } from 'react';
import { useHistory } from 'react-router-dom';
import Button from '@mui/material/Button';
import { withStyles } from '@mui/core';
import { blue } from '@mui/material/colors';
import { set as idbSet } from 'idb-keyval';
import { useAuth0 } from '@auth0/auth0-react';

import API from '~/API';
import ARAs from '~/API/services';
import QueryBuilderContext from '~/context/queryBuilder';
import AlertContext from '~/context/alert';
import queryGraphUtils from '~/utils/queryGraph';
import { defaultQuestion } from '~/utils/cache';
import usePageStatus from '~/stores/usePageStatus';
import useQueryBuilder from './useQueryBuilder';
import GraphEditor from './graphEditor/GraphEditor';
import TextEditor from './textEditor/TextEditor';
import JsonEditor from './jsonEditor/JsonEditor';

import './queryBuilder.css';
import SampleQueryLoader from './SampleQueryLoader';

const SubmitButton = withStyles((theme) => ({
  root: {
    marginLeft: 'auto',
    color: theme.palette.getContrastText(blue[600]),
    backgroundColor: blue[600],
    '&:hover': {
      backgroundColor: blue[700],
    },
  },
}))(Button);

/**
 * Query Builder parent component
 *
 * Displays the text, graph, and json editors
 */
export default function QueryBuilder() {
  const queryBuilder = useQueryBuilder();
  const pageStatus = usePageStatus(false);
  const [showJson, toggleJson] = useState(false);
  const [ara] = useState(ARAs[0]);
  const displayAlert = useContext(AlertContext);
  const history = useHistory();
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();

  /**
   * Submit this query directly to an ARA and then navigate to the answer page
   */
  async function onQuickSubmit() {
    pageStatus.setLoading('Fetching answer, this may take a while');
    const prunedQueryGraph = queryGraphUtils.prune(queryBuilder.query_graph);
    const response = await API.ara.getQuickAnswer(ara, { message: { query_graph: prunedQueryGraph } });

    if (response.status === 'error') {
      const failedToAnswer = 'Please try asking this question later.';
      displayAlert('error', `${response.message}. ${failedToAnswer}`);
      // go back to rendering query builder
      pageStatus.setSuccess();
    } else {
      // stringify to stay consistent with answer page json parsing
      idbSet('quick_message', JSON.stringify(response))
        .then(() => {
          displayAlert('success', 'Your answer is ready!');
          // once message is stored, navigate to answer page to load and display
          history.push('/answer');
        })
        .catch((err) => {
          displayAlert('error', `Failed to locally store this answer. Please try again later. Error: ${err}`);
          pageStatus.setSuccess();
        });
    }
  }

  /**
   * Get new answer for stored question id
   * @param {string} questionId - question id
   * @returns {object} response
   */
  async function fetchAnswer(questionId, accessToken) {
    let response = await API.ara.getAnswer(ara, questionId, accessToken);
    if (response.status === 'error') {
      return response;
    }
    const answerId = response.id;

    response = await API.cache.getQuestion(questionId, accessToken);
    if (response.status === 'error') {
      return response;
    }

    // Set hasAnswers in metadata to true
    const questionMeta = response;
    questionMeta.metadata.hasAnswers = true;
    response = await API.cache.updateQuestion(questionMeta, accessToken);
    if (response.status === 'error') {
      return response;
    }

    return { status: 'success', answerId };
  }

  /**
   * Handle user question submission
   *
   * - Uploads a question to Robokache
   * - Fetches an answer from an ARA and stores in Robokache
   * - Notifies the user when the answer is ready
   */
  async function onSubmit() {
    let accessToken;
    if (isAuthenticated) {
      try {
        accessToken = await getAccessTokenSilently();
      } catch (err) {
        displayAlert('error', `Failed to authenticate user: ${err}`);
        return;
      }
    }
    let response;

    response = await API.cache.createQuestion(defaultQuestion, accessToken);
    if (response.status === 'error') {
      displayAlert('error', response.message);
      return;
    }
    const questionId = response.id;

    // Strip labels from nodes
    const prunedQueryGraph = queryGraphUtils.prune(queryBuilder.query_graph);

    // Upload question data
    const questionData = JSON.stringify({ message: { query_graph: prunedQueryGraph } }, null, 2);
    response = await API.cache.setQuestionData(questionId, questionData, accessToken);
    if (response.status === 'error') {
      displayAlert('error', response.message);
      return;
    }

    pageStatus.setLoading('Fetching answer, this may take a while');

    // Start the process of getting an answer and display to user when done
    response = await fetchAnswer(questionId, accessToken);

    if (response.status === 'error') {
      const failedToAnswer = 'Please try asking this question later.';
      displayAlert('error', `${response.message}. ${failedToAnswer}`);
      // go back to rendering query builder
      pageStatus.setSuccess();
    } else {
      const alertText = 'Your answer is ready!';
      const { answerId } = response;
      // User has navigated away, display a button to go to the answer
      if (history.location.pathname !== '/') {
        displayAlert(
          response.status,
          <>
            <h4>{alertText}</h4>
            {answerId && (
              <Button
                onClick={() => history.push(`/answer/${answerId}`)}
                variant="contained"
              >
                View Answer
              </Button>
            )}
          </>,
        );
      } else {
        displayAlert(response.status, alertText);
        // Redirect to answer
        history.push(`/answer/${answerId}`);
      }
    }
  }

  return (
    <>
      <pageStatus.Display />

      {pageStatus.displayPage && (
        <div id="queryBuilderContainer">
          <div id="queryEditorContainer">
            <QueryBuilderContext.Provider value={queryBuilder}>
              <TextEditor
                rows={queryBuilder.textEditorRows}
              />
              <div>
                <GraphEditor />
                <div id="queryBuilderButtons">
                  <SampleQueryLoader />
                  <Button
                    onClick={() => toggleJson(true)}
                    variant="outlined"
                  >
                    Edit JSON
                  </Button>
                  <SubmitButton
                    onClick={onQuickSubmit}
                    variant="contained"
                  >
                    Submit
                  </SubmitButton>
                  {isAuthenticated && (
                    <Button
                      onClick={onSubmit}
                      variant="contained"
                      color="primary"
                    >
                      Submit Query
                    </Button>
                  )}
                </div>
              </div>
              <JsonEditor
                show={showJson}
                close={() => toggleJson(false)}
              />
            </QueryBuilderContext.Provider>
          </div>
        </div>
      )}
    </>
  );
}
