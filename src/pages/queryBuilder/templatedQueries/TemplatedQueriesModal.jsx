import {
  Button,
  Chip, Divider, IconButton, List, ListItem, ListItemText, ListSubheader, Modal, makeStyles,
} from '@material-ui/core';
import React, { useContext, useState } from 'react';
import { Close } from '@material-ui/icons';
import QueryBuilderContext from '~/context/queryBuilder';
import examples from './templates.json';

const useStyles = makeStyles((theme) => ({
  modal: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paper: {
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    display: 'flex',
    flexDirection: 'row',
    width: 1200,
    height: 900,
    borderRadius: '8px',
  },
}));

function createTemplateDisplay(template) {
  return (
    <span>
      {template.map((part, i) => {
        if (part.type === 'text') {
          return <span key={i}>{part.text}</span>;
        }
        if (part.type === 'node') {
          return <code key={i}>{part.name}</code>;
        }
        return null;
      })}
    </span>
  );
}

function PleaseSelectAnExampleText() {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '2.5rem',
      fontStyle: 'italic',
      color: '#acacac',
    }}
    >
      Please select an example from the list
    </div>
  );
}

function exampleToTrapiFormat(example) {
  const templateNodes = example.template
    .filter((part) => part.type === 'node')
    .reduce((obj, { id }) => ({ ...obj, [id]: { categories: [] } }), {});

  const structureNodes = Object.entries(example.structure.nodes)
    .reduce((obj, [id, n]) => ({ ...obj, [id]: { categories: [n.category], name: n.name } }), {});

  const nodesSortedById = Object.entries({ ...templateNodes, ...structureNodes })
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((obj, [id, n]) => ({ ...obj, [id]: n }), {});

  const edges = Object.entries(example.structure.edges)
    .reduce((obj, [id, e]) => ({ ...obj, [id]: { subject: e.subject, object: e.object, predicates: [e.predicate] } }), {});

  return {
    message: {
      query_graph: {
        nodes: nodesSortedById,
        edges,
      },
    },
  };
}

export default function TemplatedQueriesModal({
  open,
  setOpen,
}) {
  const classes = useStyles();
  const queryBuilder = useContext(QueryBuilderContext);

  const [selectedExample, setSelectedExample] = useState(null);

  const handleClose = () => {
    setOpen(false);
    setSelectedExample(null);
  };

  const handleSelectExample = (example) => {
    setSelectedExample(example);
    const payload = exampleToTrapiFormat(example);
    queryBuilder.dispatch({ type: 'saveGraph', payload });
  };

  return (
    <Modal open={open} onClose={handleClose} className={classes.modal}>
      <div className={classes.paper}>
        <List
          style={{ flexBasis: 350, overflowY: 'auto' }}
          subheader={(
            <ListSubheader
              component="div"
              style={{
                background: 'white',
                borderBottom: '2px solid rgba(0, 0, 0, 0.12)',
              }}
            >
              Please select an example below
            </ListSubheader>
          )}
        >
          {examples.map((example, i) => (
            <ListItem
              button
              divider
              key={i}
              onClick={() => {
                handleSelectExample(example);
              }}
            >
              <ListItemText
                primary={(
                  <>
                    <Chip size="small" label={example.tags} />{' '}
                    {createTemplateDisplay(example.template)}
                  </>
                )}
              />
            </ListItem>
          ))}
        </List>
        <Divider orientation="vertical" flexItem />
        <div
          style={{
            display: 'flex',
            flex: '1',
            padding: '1rem',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <IconButton size="small" onClick={handleClose}>
              <Close />
            </IconButton>
          </div>
          <div style={{ flex: '1' }}>
            {
              selectedExample === null
                ? <PleaseSelectAnExampleText />
                : selectedExample.template.map((part, i) => {
                  if (part.type === 'text') {
                    return <span key={i}>{part.text}</span>;
                  }
                  if (part.type === 'node') {
                    return <code key={i}>{part.name}</code>;
                  }
                  return null;
                })
            }
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Button variant="contained" color="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
