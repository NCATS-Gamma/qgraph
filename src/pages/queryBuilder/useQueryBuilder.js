import {
  useEffect, useContext, useReducer, useMemo,
} from 'react';

import _ from 'lodash';
import AlertContext from '~/context/alert';
import queryBuilderUtils from '~/utils/queryBuilder';
import queryGraphUtils from '~/utils/queryGraph';

function getDefaultNode() {
  return {
    categories: [],
    ids: [],
  };
}
function getDefaultEdge(subject, object) {
  return {
    subject: subject || '',
    object: object || '',
    predicates: ['biolink:related_to'],
  };
}

const defaultQueryGraph = {
  nodes: {
    n0: getDefaultNode(),
    n1: getDefaultNode(),
  },
  edges: {
    e0: getDefaultEdge('n0', 'n1'),
  },
};

const initialState = {
  message: {
    message: {
      query_graph: defaultQueryGraph,
    },
  },
  rootNode: 'n0',
  isValid: true,
  errMessage: '',
};

function reducer(state, action) {
  switch (action.type) {
    case 'addEdge': {
      const [subjectId, objectId] = action.payload;
      const newEdgeId = queryBuilderUtils.getNextEdgeID(state.message.message.query_graph);
      state.message.message.query_graph.edges[newEdgeId] = getDefaultEdge(subjectId, objectId);
      break;
    }
    case 'editEdge': {
      const { edgeId, endpoint, nodeId } = action.payload;
      if (!nodeId) {
        const newNodeId = queryBuilderUtils.getNextNodeID(state.message.message.query_graph);
        state.message.message.query_graph.nodes[newNodeId] = getDefaultNode();
        state.message.message.query_graph.edges[edgeId][endpoint] = newNodeId;
      } else {
        state.message.message.query_graph.edges[edgeId][endpoint] = nodeId;
      }
      state.rootNode = queryBuilderUtils.getRootNode(state.message.message.query_graph, state.rootNode);
      state.message.message.query_graph = queryBuilderUtils.removeDetachedFromRoot(state.message.message.query_graph, state.rootNode);
      break;
    }
    case 'editPredicate': {
      const { id, predicates } = action.payload;
      state.message.message.query_graph.edges[id].predicates = predicates;
      break;
    }
    case 'editQualifiers': {
      const { id, qualifiers } = action.payload;
      if (qualifiers.length !== 0) {
        const qualifier_set = Object.entries(qualifiers).map(([name, value]) => ({
          qualifier_type_id: `biolink:${_.snakeCase(name)}`,
          qualifier_value: name === 'qualified predicate' ? `biolink:${_.snakeCase(value)}` : _.snakeCase(value),
        }));
        state.message.message.query_graph.edges[id].qualifier_constraints = [{ qualifier_set }];
      }
      break;
    }
    case 'deleteEdge': {
      const { id } = action.payload;
      delete state.message.message.query_graph.edges[id];
      state.rootNode = queryBuilderUtils.getRootNode(state.message.message.query_graph, state.rootNode);
      state.message.message.query_graph = queryBuilderUtils.removeDetachedFromRoot(state.message.message.query_graph, state.rootNode);
      break;
    }
    case 'addHop': {
      const { nodeId } = action.payload;
      const newNodeId = queryBuilderUtils.getNextNodeID(state.message.message.query_graph);
      const newEdgeId = queryBuilderUtils.getNextEdgeID(state.message.message.query_graph);
      let subjectId = nodeId;
      if (nodeId === undefined) {
        const nodeKeys = Object.keys(state.message.message.query_graph.nodes);
        subjectId = nodeKeys[nodeKeys.length - 1];
      }
      state.message.message.query_graph.edges[newEdgeId] = getDefaultEdge(subjectId, newNodeId);
      state.message.message.query_graph.nodes[newNodeId] = getDefaultNode();
      break;
    }
    case 'addNode': {
      const newNodeId = queryBuilderUtils.getNextNodeID(state.message.message.query_graph);
      state.message.message.query_graph.nodes[newNodeId] = getDefaultNode();
      break;
    }
    case 'editNode': {
      const { id, node } = action.payload;
      state.message.message.query_graph.nodes[id] = node || getDefaultNode();
      break;
    }
    case 'deleteNode': {
      const { id } = action.payload;
      delete state.message.message.query_graph.nodes[id];
      const trimmedQueryGraph = queryBuilderUtils.removeAttachedEdges(state.message.message.query_graph, id);
      state.rootNode = queryBuilderUtils.getRootNode(trimmedQueryGraph, state.rootNode);
      state.message.message.query_graph = queryBuilderUtils.removeDetachedFromRoot(trimmedQueryGraph, state.rootNode);
      break;
    }
    case 'saveGraph': {
      state.message.message.query_graph = queryGraphUtils.toCurrentTRAPI(action.payload.message.query_graph);
      state.rootNode = queryBuilderUtils.getRootNode(state.message.message.query_graph);
      break;
    }
    default: {
      return state;
    }
  }
  const { isValid, errMsg } = queryBuilderUtils.isValidGraph(state.message.message.query_graph);
  state.isValid = isValid;
  state.errMessage = errMsg;
  return { ...state };
}

/**
 * Query builder main store
 *
 * **The main source for the query graph**
 * - Handles all adding, deleting, modifying of nodes and edges
 */
export default function useQueryBuilder() {
  const displayAlert = useContext(AlertContext);

  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!state.isValid && state.errMessage) {
      displayAlert('error', state.errMessage);
    }
  }, [state.isValid, state.errMessage]);

  /**
   * Any time the query graph changes, recompute the text editor rows
   *
   * Sets rows as: [ { subject: boolean, object: boolean } ]
   */
  const textEditorRows = useMemo(() => {
    if (!state.isValid) {
      return [];
    }
    // rows are an array of objects
    const rows = [];
    const { message, rootNode } = state;
    const { query_graph } = message.message;
    const nodeList = new Set();
    const edgeIds = Object.keys(query_graph.edges);
    const firstEdgeIndex = edgeIds.findIndex((eId) => query_graph.edges[eId].subject === rootNode);
    if (firstEdgeIndex !== -1) {
      const [firstEdgeId] = edgeIds.splice(firstEdgeIndex, 1);
      edgeIds.unshift(firstEdgeId);
    }
    edgeIds.forEach((edgeId) => {
      const row = {};
      const edge = query_graph.edges[edgeId];
      row.edgeId = edgeId;
      row.subjectIsReference = nodeList.has(edge.subject);
      nodeList.add(edge.subject);
      row.objectIsReference = nodeList.has(edge.object);
      nodeList.add(edge.object);
      rows.push(row);
    });
    return rows;
  }, [state]);

  return {
    state,
    query_graph: state.message.message.query_graph,
    textEditorRows,
    dispatch,
  };
}
