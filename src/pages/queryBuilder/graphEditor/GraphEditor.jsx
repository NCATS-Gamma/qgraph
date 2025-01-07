import React, {
  useContext, useReducer, useEffect,
} from 'react';
import Popover from '@mui/material/Popover';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';

import QueryBuilderContext from '~/context/queryBuilder';
import nodeUtils from '~/utils/d3/nodes';

import QueryGraph from './QueryGraph';
import NodeSelector from '../textEditor/textEditorRow/NodeSelector';
import PredicateSelector from '../textEditor/textEditorRow/PredicateSelector';

import './graphEditor.css';

const width = 600;
const height = 400;

function clickReducer(state, action) {
  switch (action.type) {
    case 'startConnection': {
      const { anchor } = action.payload;
      state.creatingConnection = true;
      state.popoverId = '';
      state.popoverAnchor = anchor;
      state.popoverType = 'newEdge';
      break;
    }
    case 'connectTerm': {
      const { id } = action.payload;
      state.chosenTerms = [...state.chosenTerms, id];
      break;
    }
    case 'connectionMade': {
      state.creatingConnection = false;
      state.chosenTerms = [];
      break;
    }
    case 'click': {
      const { id } = action.payload;
      state.clickedId = id;
      break;
    }
    case 'openEditor': {
      const { id, type, anchor } = action.payload;
      state.popoverId = id;
      state.popoverType = type;
      state.popoverAnchor = anchor;
      break;
    }
    case 'closeEditor': {
      state.popoverId = '';
      state.popoverType = '';
      state.popoverAnchor = null;
      break;
    }
    default: {
      return state;
    }
  }
  return { ...state };
}

/**
 * Query Builder graph editor interface
 */
export default function GraphEditor() {
  const queryBuilder = useContext(QueryBuilderContext);
  const { query_graph } = queryBuilder;

  const [clickState, clickDispatch] = useReducer(clickReducer, {
    creatingConnection: false,
    chosenTerms: [],
    clickedId: '',
    popoverId: '',
    popoverAnchor: null,
    popoverType: '',
  });

  function addEdge() {
    queryBuilder.dispatch({ type: 'addEdge', payload: clickState.chosenTerms });
  }

  function addHop() {
    if (!Object.keys(query_graph.nodes).length) {
      // add a node to an empty graph
      queryBuilder.dispatch({ type: 'addNode', payload: {} });
    } else {
      // add a node and edge
      queryBuilder.dispatch({ type: 'addHop', payload: {} });
    }
  }

  function editNode(id, node) {
    queryBuilder.dispatch({ type: 'editNode', payload: { id, node } });
  }

  function clickNode() {
    const nodeIds = Object.keys(query_graph);
    const lastNodeId = nodeIds[nodeIds.length - 1];
    nodeUtils.clickNode(lastNodeId);
  }

  /**
   * When user selects two nodes while creating an edge, make a new edge
   * and reset click state
   */
  useEffect(() => {
    if (clickState.creatingConnection && clickState.chosenTerms.length >= 2) {
      addEdge();
      clickDispatch({ type: 'connectionMade' });
      // remove border from connected nodes
      nodeUtils.removeBorder();
    }
  }, [clickState]);

  return (
    <div id="queryGraphEditor">
      <div id="graphContainer" style={{ height: height + 50, width }}>
        <QueryGraph
          height={height}
          width={width}
          clickState={clickState}
          updateClickState={clickDispatch}
        />
        <div id="graphBottomButtons">
          <Button
            onClick={() => {
              addHop();
              clickNode();
            }}
          >
            Add New Term
          </Button>
          <Button
            onClick={(e) => {
              clickDispatch({ type: 'startConnection', payload: { anchor: e.currentTarget } });
              // auto close after 5 seconds
              setTimeout(() => {
                clickDispatch({ type: 'closeEditor' });
              }, 5000);
            }}
          >
            Connect Terms
          </Button>
        </div>
        <Popover
          open={Boolean(clickState.popoverAnchor)}
          anchorEl={clickState.popoverAnchor}
          onClose={() => clickDispatch({ type: 'closeEditor' })}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          {(clickState.popoverType === 'editNode' || clickState.popoverType === 'newNode') && (
            <NodeSelector
              properties={query_graph.nodes[clickState.popoverId]}
              id={clickState.popoverId}
              update={editNode}
              isReference={false}
              options={{
                includeExistingNodes: false,
              }}
            />
          )}
          {clickState.popoverType === 'editEdge' && (
            <PredicateSelector
              id={clickState.popoverId}
            />
          )}
          {clickState.popoverType === 'newEdge' && (
            <Paper style={{ padding: '10px' }}>
              <p>Select two terms to connect!</p>
            </Paper>
          )}
        </Popover>
      </div>
    </div>
  );
}
