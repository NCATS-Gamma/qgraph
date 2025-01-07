import React, { useState } from 'react';
import Button from '@mui/material/Button';

import Alert from '@mui/lab/Alert';
import Snackbar from '@mui/material/Snackbar';

/**
 * Generic copy-to-clipboard button
 * @param {*} startIcon - icon to show in button
 * @param {string} displayText - text of copy button
 * @param {string} clipboardText - text to copy to clipboard
 * @param {string} notificationText - text of snackbar notification
 * @param {boolean} disabled - is button disabled
 */
export default function ClipboardButton({
  startIcon, displayText, clipboardText, notificationText, disabled,
}) {
  const [snackbarNotification, updateSnackbarNotification] = useState('');

  /**
   * Copy text into user clipboard on button click, and then show
   * successful notification
   */
  function copyToClipboard() {
    // Using textarea to keep newlines in JSON
    const textarea = document.createElement('textarea');
    textarea.innerHTML = clipboardText();
    document.body.appendChild(textarea);
    textarea.select();
    // focus is needed in case copying is done from modal
    // also needs to come after select for unknown reason
    textarea.focus();
    if (typeof navigator.clipboard !== 'undefined' && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(textarea.innerHTML);
    } else {
      document.execCommand('copy');
    }
    textarea.remove();
    updateSnackbarNotification(notificationText);
  }

  return (
    <>
      <Button
        startIcon={startIcon}
        variant="contained"
        onClick={copyToClipboard}
        disabled={disabled}
      >
        {displayText}
      </Button>

      <Snackbar
        open={!!snackbarNotification}
        autoHideDuration={6000}
        onClose={() => updateSnackbarNotification('')}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Alert severity="success">
          {snackbarNotification}
        </Alert>
      </Snackbar>
    </>
  );
}
