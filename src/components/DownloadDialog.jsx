import React from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import TextField from '@material-ui/core/TextField';
import csv from 'csv-stringify';

const jsonToCsvString = (json) => new Promise((res, rej) => {
  csv.stringify(json, (err, output) => {
    if (err) rej(err);
    else res(output);
  });
});

export default function DownloadDialog({
  open, setOpen, message,
}) {
  const [type, setType] = React.useState('json');
  const [fileName, setFileName] = React.useState('ROBOKOP_message');

  const handleClose = () => {
    setOpen(false);
  };

  const handleClickDownload = async () => {
    let blob;
    if (type === 'json') {
      blob = new Blob([JSON.stringify({ message }, null, 2)], { type: 'application/json' });
    }
    if (type === 'csv') {
      const subsetMessage = message.results.map((r) => [
        ...Object.values(r.node_bindings).map((nb) => {
          const node = message.knowledge_graph.nodes[nb[0].id];
          return node.name || node.categories[0];
        }), r.score]);
      const csvString = await jsonToCsvString(subsetMessage);
      blob = new Blob([csvString], { type: 'text/csv' });
    }

    const a = document.createElement('a');
    a.download = `${fileName}.${type}`;
    a.href = window.URL.createObjectURL(blob);
    document.body.appendChild(a);
    a.click();
    a.remove();

    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
    >
      <DialogTitle id="alert-dialog-title">Download Answer</DialogTitle>
      <DialogContent style={{ width: 600 }}>
        <TextField
          label="File name"
          fullWidth
          variant="outlined"
          style={{ marginBottom: '2rem' }}
          value={fileName}
          onChange={(e) => { setFileName(e.target.value); }}
        />

        <FormControl component="fieldset">
          <RadioGroup aria-label="gender" name="gender1" value={type} onChange={(e) => { setType(e.target.value); }}>
            <FormControlLabel value="json" control={<Radio />} label="JSON" />
            <FormControlLabel value="csv" control={<Radio />} label="CSV" />
          </RadioGroup>
        </FormControl>

        {
          type === 'csv' && (
            <DialogContentText style={{ fontSize: '1em' }}>
              The CSV download contains a smaller subset of the answer information. To analyze the complete properties of the answer graphs, consider using JSON.
            </DialogContentText>
          )
        }
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleClickDownload} color="primary" variant="contained">
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
}
