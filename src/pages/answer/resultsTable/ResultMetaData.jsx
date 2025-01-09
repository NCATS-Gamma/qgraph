import React, {
  useState, useReducer, useEffect, useMemo,
} from 'react';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import shortid from 'shortid';

function expansionReducer(state, action) {
  switch (action.type) {
    case 'toggle':
      state[action.key] = !state[action.key];
      break;
    case 'clear':
      return {};
    default:
      break;
  }
  return { ...state };
}

/**
 * Show meta data of a selected result
 * @param {object} metaData - selected result edge metadata
 * @param {object} result - full node and edge result json from knowledge graph
 */
export default function ResultMetaData({ metaData, result }) {
  const [expanded, updateExpanded] = useReducer(expansionReducer, {});
  const [showJSON, toggleJSONVisibility] = useState(false);

  useEffect(() => {
    // Whenever the user selects a new row, close all expanded rows
    updateExpanded({ type: 'clear' });
  }, [metaData]);

  const hasSupportPublications = useMemo(() => !!Object.values(metaData).find((pubs) => pubs.length), [metaData]);

  return (
    (<Paper
      id="resultMetaData"
      elevation={3}
    >
      <div>
        <h4>Supporting Publications</h4>
        {hasSupportPublications ? (
          <List>
            {Object.entries(metaData).map(([key, publications]) => (
              <React.Fragment key={shortid.generate()}>
                {publications.length > 0 && (
                  <>
                    <ListItem
                      button
                      onClick={() => updateExpanded({ type: 'toggle', key })}
                    >
                      <ListItemText primary={key} />
                      {expanded[key] ? <ExpandLess /> : <ExpandMore />}
                    </ListItem>
                    <Collapse in={expanded[key]} timeout="auto" unmountOnExit>
                      <List component="div">
                        {publications.map((publication) => (
                          <ListItem
                            button
                            component="a"
                            key={shortid.generate()}
                            href={publication}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ListItemText
                              primary={publication}
                              inset
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Collapse>
                  </>
                )}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <List>
            <ListItem>
              <ListItemText primary="No Supporting Publications Found" />
            </ListItem>
          </List>
        )}
      </div>
      <div>
        <h4>
          Result JSON
          &nbsp;
          <IconButton onClick={() => toggleJSONVisibility(!showJSON)} size="large">
            {!showJSON ? (
              <ExpandMore />
            ) : (
              <ExpandLess />
            )}
          </IconButton>
        </h4>
        {showJSON && (
          <pre id="resultJSONContainer">{JSON.stringify(result, null, 2)}</pre>
        )}
      </div>
    </Paper>)
  );
}
