import {
  Button,
  Chip, Divider, List, ListItem, ListItemText, ListSubheader, Modal, makeStyles,
} from '@material-ui/core';
import React from 'react';

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

export default function TemplatedQueriesModal({
  open,
  setOpen,
}) {
  const classes = useStyles();

  return (
    <Modal open={open} onClose={() => setOpen(false)} className={classes.modal}>
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
                console.log(example);
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
            gap: '1rem',
          }}
        >
          <div style={{ flex: '1' }}>
            <h3>Template query!</h3>
            <p>Template query extra details</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Button variant="contained" color="primary" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
