import React, { useState } from 'react';
import { useRouteMatch } from 'react-router-dom';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';

import { useAuth0 } from '@auth0/auth0-react';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PublishIcon from '@mui/icons-material/Publish';
import GetAppIcon from '@mui/icons-material/GetApp';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

import ConfirmDialog from '~/components/ConfirmDialog';

import './leftDrawer.css';

/**
 * Main Drawer component on answer page
 * @param {function} onUpload - function to call when user uploads their own message
 * @param {object} displayState - state of card components
 * @param {function} updateDisplayState - dispatch function for changing which cards are shown
 * @param {object} message - full TRAPI message
 * @param {function} saveAnswer - save an answer to Robokache
 * @param {function} deleteAnswer - delete an answer from Robokache
 * @param {boolean} owned - does the user own this answer
 */
export default function LeftDrawer({
  onUpload, displayState, updateDisplayState, message,
  saveAnswer, deleteAnswer, owned,
}) {
  const { isAuthenticated } = useAuth0();
  const urlHasAnswerId = useRouteMatch('/answer/:answer_id');
  const [confirmOpen, setConfirmOpen] = useState(false);

  function toggleDisplay(component, show) {
    updateDisplayState({ type: 'toggle', payload: { component, show } });
  }

  /**
   * Download the current message
   */
  async function download() {
    const blob = new Blob([JSON.stringify({ message }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.download = 'ROBOKOP_message.json';
    a.href = window.URL.createObjectURL(blob);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <Drawer
      container={document.getElementById('contentContainer')}
      variant="permanent"
      open
      classes={{
        paper: 'leftDrawer',
      }}
    >
      <Toolbar />
      <List>
        {Object.entries(displayState).map(([key, val]) => (
          <ListItem
            key={key}
            button
            onClick={() => toggleDisplay(key, !val.show)}
            disabled={val.disabled}
          >
            <ListItemIcon>
              <Checkbox
                checked={val.show}
                disableRipple
              />
            </ListItemIcon>
            <ListItemText primary={val.label} />
          </ListItem>
        ))}
        <ListItem
          component="label"
          button
          disabled={!Object.keys(message).length}
          onClick={download}
        >
          <ListItemIcon>
            <IconButton
              component="span"
              style={{ fontSize: '18px' }}
              title="Download"
              disableRipple
            >
              <GetAppIcon />
            </IconButton>
          </ListItemIcon>
          <ListItemText primary="Download Answer" />
        </ListItem>
        <ListItem
          component="label"
          button
        >
          <ListItemIcon>
            <IconButton
              component="span"
              style={{ fontSize: '18px' }}
              title="Upload Answer"
              disableRipple
            >
              <PublishIcon />
            </IconButton>
          </ListItemIcon>
          <ListItemText primary="Upload Answer" />
          <input
            accept=".json"
            hidden
            style={{ display: 'none' }}
            type="file"
            onChange={(e) => onUpload(e)}
          />
        </ListItem>
        <ListItem
          component="label"
          button
          disabled={!Object.keys(message).length || !!urlHasAnswerId || !isAuthenticated}
          onClick={saveAnswer}
        >
          <ListItemIcon>
            <IconButton
              component="span"
              style={{ fontSize: '18px' }}
              title="Save Answer"
              disableRipple
            >
              <CloudUploadIcon />
            </IconButton>
          </ListItemIcon>
          <ListItemText primary="Save To Library" />
        </ListItem>
        <ListItem
          component="label"
          button
          disabled={!urlHasAnswerId || !isAuthenticated || !owned}
          onClick={() => setConfirmOpen(true)}
        >
          <ListItemIcon>
            <IconButton
              component="span"
              style={{ fontSize: '18px' }}
              title="Delete Answer"
              disableRipple
            >
              <HighlightOffIcon />
            </IconButton>
          </ListItemIcon>
          <ListItemText primary="Delete Answer" />
        </ListItem>
      </List>
      <ConfirmDialog
        open={confirmOpen}
        handleOk={() => {
          setConfirmOpen(false);
          deleteAnswer();
        }}
        handleCancel={() => setConfirmOpen(false)}
        content="Are you sure you want to delete this answer? This action cannot be undone."
        title="Confirm Answer Deletion"
        confirmText="Delete Answer"
      />
    </Drawer>
  );
}
