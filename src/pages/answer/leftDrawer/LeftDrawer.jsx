import React, { useState } from 'react';
import Drawer from '@material-ui/core/Drawer';
import Toolbar from '@material-ui/core/Toolbar';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Checkbox from '@material-ui/core/Checkbox';
import IconButton from '@material-ui/core/IconButton';

import PublishIcon from '@material-ui/icons/Publish';
import GetAppIcon from '@material-ui/icons/GetApp';

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
  onUpload, displayState, updateDisplayState, message, deleteAnswer,
}) {
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
