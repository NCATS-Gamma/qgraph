import React, { useState, useContext } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';

import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

import { green, red } from '@mui/material/colors';

import API from '~/API';
import { useVisibility, formatDateTimeNicely } from '~/utils/cache';
import AlertContext from '~/context/alert';

import ConfirmDialog from '~/components/ConfirmDialog';

export default function QuestionTableRow({ question, onQuestionUpdated }) {
  const history = useHistory();
  const visibility = useVisibility();
  const displayAlert = useContext(AlertContext);
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [confirmOpen, setConfirmOpen] = useState(false);

  /**
   * Update question visibility on Robokache
   * @param {boolean} checked - is the 'public' switch on
   */
  async function setVisibility(checked) {
    let accessToken;
    if (isAuthenticated) {
      try {
        accessToken = await getAccessTokenSilently();
      } catch (err) {
        displayAlert('error', `Failed to authenticate user: ${err}`);
      }
    }
    question.visibility = checked ? visibility.toInt('Public') : visibility.toInt('Shareable');
    const response = await API.cache.updateQuestion(question, accessToken);
    if (response.status === 'error') {
      displayAlert('error', `Failed to set question visibility: ${response.message}`);
      return;
    }
    onQuestionUpdated();
  }

  /**
   * Handle row click and redirect to most recent answer
   */
  async function getAnswers() {
    let accessToken;
    if (isAuthenticated) {
      try {
        accessToken = await getAccessTokenSilently();
      } catch (err) {
        displayAlert('error', `Failed to authenticate user: ${err}`);
      }
    }
    if (question.metadata.answerOnly) {
      // This is an answer with no parent, send to
      // answer page
      history.push(`/answer/${question.id}`);
    } else {
      // Get all answers for selected parent question
      const response = await API.cache.getAnswers(question.id, accessToken);
      if (response.status === 'error') {
        displayAlert('error', `Failed to load answers: ${response.message}`);
        return;
      }

      if (response.length) {
        // redirect to first answer
        const answerId = response[0].id;
        history.push(`/answer/${answerId}`);
      } else {
        displayAlert('warning', 'There are no answers for this question.');
      }
    }
  }

  async function deleteQuestion() {
    let accessToken;
    if (isAuthenticated) {
      try {
        accessToken = await getAccessTokenSilently();
      } catch (err) {
        displayAlert('error', `Failed to authenticate user: ${err}`);
      }
    }
    let response = await API.cache.getAnswers(question.id, accessToken);
    if (response.status === 'error') {
      displayAlert('error', `Failed to load answers: ${response.message}`);
      return;
    }
    const answerErrors = [];
    response.forEach(async (answer) => {
      const res = await API.cache.deleteAnswer(answer.id, accessToken);
      if (res.status === 'error') {
        answerErrors.push(answer.id);
      }
    });
    if (answerErrors.length) {
      displayAlert('error', `Failed to delete answers: ${answerErrors.join(', ')}`);
    } else {
      response = await API.cache.deleteQuestion(question.id, accessToken);
      if (response.status === 'error') {
        displayAlert('error', `Failed to delete this question: ${response.message}`);
      } else {
        displayAlert('success', 'Question and answers deleted successfully!');
        onQuestionUpdated();
      }
    }
  }

  return (
    (<TableRow
      key={question.id}
      onClick={getAnswers}
      hover
      style={{ cursor: 'pointer' }}
    >
      <TableCell>
        {question.metadata.name}
      </TableCell>
      <TableCell>
        {question.metadata.hasAnswers ? (
          <CheckIcon style={{ color: green[500] }} />
        ) : (
          <ClearIcon style={{ color: red[500] }} />
        )}
      </TableCell>
      {question.owned && (
        <TableCell>
          <FormControlLabel
            onClick={(e) => {
              // stop from going to answer page
              e.stopPropagation();
              setVisibility(e.target.checked);
            }}
            control={(
              <Switch
                checked={question.visibility >= visibility.toInt('Public')}
                color="primary"
              />
            )}
          />
        </TableCell>
      )}
      <TableCell>
        { formatDateTimeNicely(question.created_at) }
      </TableCell>
      {question.owned && (
        <TableCell>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              setConfirmOpen(true);
            }}
            size="large">
            <DeleteForeverIcon />
          </IconButton>
        </TableCell>
      )}
      <ConfirmDialog
        open={confirmOpen}
        handleOk={(e) => {
          e.stopPropagation();
          deleteQuestion();
        }}
        handleCancel={(e) => {
          e.stopPropagation();
          setConfirmOpen(false);
        }}
        content="Are you sure you want to delete this question? All associated answers will also be deleted. This action cannot be undone."
        title="Confirm Question Deletion"
        confirmText="Delete Question"
      />
    </TableRow>)
  );
}
