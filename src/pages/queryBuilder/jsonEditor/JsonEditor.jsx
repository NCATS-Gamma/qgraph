import React, { useState, useContext, useEffect } from 'react';

import JsonView from 'react18-json-view';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import SaveIcon from '@mui/icons-material/Save';

import trapiUtils from '~/utils/trapi';
import queryGraphUtils from '~/utils/queryGraph';
import usePageStatus from '~/stores/usePageStatus';
import AlertContext from '~/context/alert';
import QueryBuilderContext from '~/context/queryBuilder';
import ClipboardButton from '~/components/shared/ClipboardButton';

/**
 * Query Builder json editor interface
 * @param {bool} show - whether to show the json editor or not
 * @param {func} close - close the json editor
 */
export default function JsonEditor({ show, close }) {
  const queryBuilder = useContext(QueryBuilderContext);
  const [errorMessages, setErrorMessages] = useState('');
  const { message } = queryBuilder.state;
  const [localMessage, updateLocalMessage] = useState(message);
  const pageStatus = usePageStatus(false);
  const displayAlert = useContext(AlertContext);

  function updateJson(e) {
    // updated_src is the updated graph RJV gives back
    const data = e.updated_src;
    setErrorMessages(trapiUtils.validateMessage(data));
    updateLocalMessage(data);
  }

  function onUpload(event) {
    const { files } = event.target;
    files.forEach((file) => {
      const fr = new window.FileReader();
      fr.onloadstart = () => pageStatus.setLoading('Loading Query Graph');
      fr.onloadend = () => pageStatus.setSuccess();
      fr.onload = (e) => {
        const fileContents = e.target.result;
        try {
          const graph = JSON.parse(fileContents);
          // We only need the query graph, so delete any knowledge_graph and results in message
          if (graph.message && graph.message.knowledge_graph) {
            delete graph.message.knowledge_graph;
          }
          if (graph.message && graph.message.results) {
            delete graph.message.results;
          }
          const errors = trapiUtils.validateMessage(graph);
          setErrorMessages(errors);
          if (!errors.length) {
            graph.message.query_graph = queryGraphUtils.toCurrentTRAPI(graph.message.query_graph);
          }
          updateLocalMessage(graph);
        } catch (err) {
          displayAlert('error', 'Failed to read this query graph. Are you sure this is valid JSON?');
        }
      };
      fr.onerror = () => {
        displayAlert('error', 'Sorry but there was a problem uploading the file. The file may be invalid JSON.');
      };
      fr.readAsText(file);
    });
    // This clears out the input value so you can upload a second time
    event.target.value = '';
  }

  useEffect(() => {
    if (show) {
      setErrorMessages(trapiUtils.validateMessage(message));
      updateLocalMessage(message);
    }
  }, [show]);

  function saveGraph() {
    queryBuilder.dispatch({ type: 'saveGraph', payload: localMessage });
  }

  function copyQueryGraph() {
    const prunedQueryGraph = queryGraphUtils.prune(localMessage.message.query_graph);
    return JSON.stringify({
      message: {
        ...localMessage.message,
        query_graph: prunedQueryGraph,
      },
    }, null, 2);
  }

  return (
    (<Dialog
      open={show}
      fullWidth
      maxWidth="lg"
      onClose={() => {
        setErrorMessages('');
        close();
      }}
    >
      <DialogTitle style={{ padding: 0 }}>
        <div id="jsonEditorTitle">
          <div>
            {/* <IconButton
              style={{ fontSize: '18px' }}
              title="Revert"
              disabled={!pageStatus.displayPage}
              onClick={() => {
                setErrorMessages(trapiUtils.validateGraph(initialQueryGraph.current));
                updateInternalQueryGraph(initialQueryGraph.current);
              }}
            >
              <UndoIcon />
            </IconButton> */}
            <label htmlFor="jsonEditorUpload" id="uploadIconLabel">
              <input
                accept=".json"
                style={{ display: 'none' }}
                type="file"
                id="jsonEditorUpload"
                onChange={(e) => onUpload(e)}
                disabled={!pageStatus.displayPage}
              />
              <Button
                component="span"
                variant="contained"
                disabled={!pageStatus.displayPage}
                style={{ margin: '0px 10px' }}
                title="Load Message"
                startIcon={<CloudUploadIcon />}
              >
                Upload
              </Button>
            </label>
            <ClipboardButton
              startIcon={<FileCopyIcon />}
              displayText="Copy"
              clipboardText={copyQueryGraph}
              notificationText="Copied JSON to clipboard!"
              disabled={!pageStatus.displayPage}
            />
          </div>
          <div style={{ color: '#777' }}>
            Query Graph JSON Editor
          </div>
          <IconButton
            style={{
              fontSize: '18px',
            }}
            title="Close Editor"
            onClick={() => {
              setErrorMessages('');
              close();
            }}
            size="large">
            <CloseIcon />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent dividers style={{ padding: 0, height: '10000px' }}>
        <pageStatus.Display />
        {pageStatus.displayPage && (
          <div style={{ display: 'flex', height: '100%' }}>
            <div
              style={{
                overflowY: 'auto',
                paddingBottom: '5px',
                flexGrow: 1,
              }}
            >
              <JsonView
                name={false}
                theme="rjv-default"
                collapseStringsAfterLength={15}
                indentWidth={2}
                iconStyle="triangle"
                enableClipboard={false}
                displayObjectSize={false}
                displayDataTypes={false}
                defaultValue=""
                src={localMessage}
                onEdit={updateJson}
                onAdd={updateJson}
                onDelete={updateJson}
              />
            </div>
            {errorMessages.length > 0 && (
              <div style={{ flexShrink: 1, paddingRight: '20px' }}>
                <h4>
                  This query graph is not valid.
                </h4>
                {errorMessages.map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          startIcon={<SaveIcon />}
          disabled={errorMessages.length > 0 || !pageStatus.displayPage}
          variant="contained"
          title="Save Changes"
          onClick={() => {
            saveGraph();
            close();
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>)
  );
}
