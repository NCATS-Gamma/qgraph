import React, { useState, useContext } from 'react';

import { Row, Col } from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import { FaCloudUploadAlt } from 'react-icons/fa';
import Button from '@material-ui/core/Button';

import API from '@/API';
import { useVisibility } from '@/utils/cache';
import AlertContext from '@/context/alert';
import UserContext from '@/context/user';
import usePageStatus from '@/utils/usePageStatus';
import useMessageStore from '@/stores/useMessageStore';
import trapiUtils from '@/utils/trapiUtils';

import AnswersetView from '@/components/shared/answersetView/AnswersetView';

export default function SimpleViewer() {
  const [messageSaved, setMessageSaved] = useState(false);
  const messageStore = useMessageStore();
  const pageStatus = usePageStatus(false);
  const visibility = useVisibility();
  const displayAlert = useContext(AlertContext);
  const user = useContext(UserContext);

  async function askQuestion() {
    const defaultQuestion = {
      parent: '',
      visibility: visibility.toInt('Private'),
      metadata: { name: 'Simple Viewer Question' },
    };
    let response;

    response = await API.cache.createQuestion(defaultQuestion, user.id_token);
    if (response.status === 'error') {
      displayAlert('error', response.message);
      return;
    }

    const questionId = response.id;
    // Upload question data
    const questionData = JSON.stringify({ query_graph: messageStore.message.query_graph }, null, 2);
    response = await API.cache.setQuestionData(questionId, questionData, user.id_token);
    if (response.status === 'error') {
      displayAlert('error', response.message);
      return;
    }
    response = await API.queryDispatcher.getAnswer(questionId, user.id_token);
    if (response.status === 'error') {
      displayAlert('error', response.message);
      return;
    }
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
    displayAlert('success', 'A new ARA answer has been saved.');
  }

  async function uploadMessage() {
    const defaultQuestion = {
      parent: '',
      visibility: visibility.toInt('Private'),
      metadata: { name: 'Simple Viewer Question' },
    };

    let response;

    // Create question
    response = await API.cache.createQuestion(defaultQuestion, user.id_token);
    if (response.status === 'error') {
      displayAlert('error', response.message);
      return;
    }
    const questionId = response.id;

    // Upload question data
    const questionData = JSON.stringify({ query_graph: messageStore.message.query_graph }, null, 2);
    response = await API.cache.setQuestionData(questionId, questionData, user.id_token);
    if (response.status === 'error') {
      displayAlert('error', response.message);
      return;
    }

    // Create Answer
    response = await API.cache.createAnswer({ parent: questionId, visibility: 1 }, user.id_token);
    if (response.status === 'error') {
      displayAlert('error', response.message);
      return;
    }
    const answerId = response.id;
    // Upload answer data
    const answerData = JSON.stringify({
      knowledge_graph: messageStore.message.knowledge_graph,
      results: messageStore.message.results,
    }, null, 2);
    // Upload answer data
    response = await API.cache.setAnswerData(answerId, answerData, user.id_token);
    if (response.status === 'error') {
      displayAlert('error', response.message);
      return;
    }
    displayAlert('success', 'Message saved successfully!');
  }

  function showErrorAndReset(err) {
    pageStatus.setFailure(
      <>
        {err}
        <Button
          variant="contained"
          onClick={() => {
            setMessageSaved(false);
            pageStatus.setSuccess();
          }}
          className="resetButton"
        >
          Reset
        </Button>
      </>,
    );
  }

  function onDrop(acceptedFiles) {
    acceptedFiles.forEach((file) => {
      const fr = new window.FileReader();
      fr.onloadstart = () => {
        pageStatus.setLoading('Loading message...');
        setMessageSaved(false);
      };
      fr.onload = (e) => {
        const fileContents = e.target.result;
        let message;
        try {
          message = JSON.parse(fileContents);
        } catch (err) {
          showErrorAndReset('There was the problem parsing the file. Is this valid JSON?');
          return;
        }

        const validationErrors = trapiUtils.validateMessage(message);
        if (validationErrors) {
          showErrorAndReset(
            `Found errors while parsing message: ${validationErrors.join(', ')}`,
          );
          return;
        }

        try {
          messageStore.initializeMessage(message);
          setMessageSaved(true);
          pageStatus.setSuccess();
        } catch (err) {
          showErrorAndReset(err.message);
        }
      };
      fr.onerror = () => {
        showErrorAndReset('There was the problem loading the file. Is this valid JSON?');
      };
      fr.readAsText(file);
    });
  }

  return (
    <>
      <pageStatus.Display />

      {pageStatus.displayPage && (
        <>
          {messageSaved ? (
            <>
              <AnswersetView
                messageStore={messageStore}
                omitHeader
              />
              {user && (
                <>
                  <Button
                    onClick={uploadMessage}
                    variant="contained"
                    style={{ marginRight: 10 }}
                  >
                    Upload
                  </Button>
                  <Button
                    onClick={askQuestion}
                    variant="contained"
                    style={{ marginRight: 10 }}
                  >
                    Ask ARA
                  </Button>
                </>
              )}
              <Button
                variant="contained"
                onClick={() => {
                  setMessageSaved(false);
                  pageStatus.setSuccess();
                }}
              >
                Reset
              </Button>
            </>
          ) : (
            <Row>
              <Col md={12}>
                <h1>
                  Answer Set Explorer
                  <br />
                  <small>
                    Explore answers and visualize knowledge graphs.
                  </small>
                </h1>
                <Dropzone
                  onDrop={(acceptedFiles, rejectedFiles) => onDrop(acceptedFiles, rejectedFiles)}
                  multiple={false}
                  accept="application/json"
                >
                  {({ getRootProps, getInputProps }) => (
                    <section id="dropzoneContainer">
                      <div id="dropzone" {...getRootProps()} style={{ backgroundColor: '#f5f7fa' }}>
                        <input {...getInputProps()} />
                        <div style={{ display: 'table-cell', verticalAlign: 'middle' }}>
                          <h1 style={{ fontSize: '48px' }}>
                            <FaCloudUploadAlt />
                          </h1>
                          <h3>
                            Drag and drop an answerset file, or click to browse.
                          </h3>
                        </div>
                      </div>
                    </section>
                  )}
                </Dropzone>
              </Col>
            </Row>
          )}
        </>
      )}
    </>
  );
}
