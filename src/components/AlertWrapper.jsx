import React from 'react';

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/lab/Alert';

export default function AlertWrapper({ alert, onClose }) {
  return (
    <Snackbar
      autoHideDuration={6000}
      open={!!alert.msg}
      anchorOrigin={
        { vertical: 'top', horizontal: 'center' }
      }
      onClose={onClose}
    >
      <Alert
        variant="filled"
        severity={alert.severity}
      >
        {alert.msg}
      </Alert>
    </Snackbar>

  );
}
