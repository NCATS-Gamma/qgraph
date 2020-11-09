import React, { useContext } from 'react';
import {
  Grid, Row,
} from 'react-bootstrap';
import { useHistory } from 'react-router-dom';

import UserContext from '@/context/user';
import AlertContext from '@/context/alert';

import API from '@/API';

import Button from '@material-ui/core/Button';

import './newQuestion.css';

import queryGraphUtils from '@/utils/queryGraph';
import { useVisibility } from '@/utils/cache';

import QuestionBuilder from './questionBuilder/QuestionBuilder';

import useQuestionStore from './useQuestionStore';

export default function QuestionNew() {
  const history = useHistory();
  const visibility = useVisibility();
  const user = useContext(UserContext);
  const questionStore = useQuestionStore();
  const displayAlert = useContext(AlertContext);

  function onDownloadQuestion() {
    const query_graph = queryGraphUtils.convert.internalToReasoner(
      questionStore.query_graph,
    );
    const data = { query_graph };

    // Transform the data into a json blob and give it a url
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create a link with that URL and click it.
    const a = document.createElement('a');
    a.download = 'robokopMachineQuestion.json';
    a.href = url;
    a.click();
    a.remove();
  }

  function onResetQuestion() {
    questionStore.resetQuestion();
  }

  async function getAnswerAndDisplayAlert(questionId) {
    let response = await API.queryDispatcher.getAnswer(questionId, user.id_token);
    if (response.status === 'error') {
      displayAlert('error', response.message);
      return;
    }
    const newAnswerId = response.id;

    response = await API.cache.getQuestion(questionId, user.id_token);
    if (response.status === 'error') {
      displayAlert('error', response.message);
      return;
    }
    const questionMeta = response;
    questionMeta.metadata.hasAnswers = true;
    response = await API.cache.updateQuestion(questionMeta, user.id_token);
    if (response.status === 'error') {
      displayAlert('error', response.message);
      return;
    }

    displayAlert(
      'success',
      <>
        <h4>An answer is ready!</h4>
        <Button
          onClick={() => {
            history.push(`/question/${questionId}/answer/${newAnswerId}`);
          }}
          variant="contained"
        >
          View new answer
        </Button>
      </>,
    );
  }

  async function onSubmit() {
    const defaultQuestion = {
      parent: '',
      visibility: visibility.toInt('Private'),
      metadata: { name: questionStore.question_name || 'New Question' },
    };
    let response;

    response = await API.cache.createQuestion(defaultQuestion, user.id_token);
    if (response.status === 'error') {
      displayAlert('error', response.message);
      return;
    }
    const questionId = response.id;

    // Convert to reasoner representation
    const query_graph = queryGraphUtils.convert.internalToReasoner(
      questionStore.query_graph,
    );
    // Upload question data
    const questionData = JSON.stringify({ query_graph }, null, 2);
    response = await API.cache.setQuestionData(questionId, questionData, user.id_token);
    if (response.status === 'error') {
      displayAlert('error', response.message);
      return;
    }

    // Redirect to created question
    history.push(`/question/${questionId}`);
    displayAlert('info', "Fetching answer, we will let you know when it's ready.");

    // Start the process of getting an answer and display to user when done
    getAnswerAndDisplayAlert(questionId);
  }

  return (
    <>
      <Grid>
        <Row>
          <h1 className="robokopApp">
            Ask a Question
            <br />
          </h1>
          <QuestionBuilder
            questionStore={questionStore}
            download={onDownloadQuestion}
            reset={onResetQuestion}
            submit={onSubmit}
          />
        </Row>
      </Grid>
    </>
  );
}
