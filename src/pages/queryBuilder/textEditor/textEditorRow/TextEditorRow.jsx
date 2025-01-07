import React, { useContext } from 'react';
import IconButton from '@mui/material/IconButton';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import IndeterminateCheckBoxOutlinedIcon from '@mui/icons-material/IndeterminateCheckBoxOutlined';

import QueryBuilderContext from '~/context/queryBuilder';
import NodeSelector from './NodeSelector';
import PredicateSelector from './PredicateSelector';

import './textEditorRow.css';

export default function TextEditorRow({ row, index }) {
  const queryBuilder = useContext(QueryBuilderContext);
  const { query_graph } = queryBuilder;
  const edge = query_graph.edges[row.edgeId];
  const { edgeId, subjectIsReference, objectIsReference } = row;

  function deleteEdge() {
    queryBuilder.dispatch({ type: 'deleteEdge', payload: { id: edgeId } });
  }

  function setReference(edgeEnd, nodeId) {
    queryBuilder.dispatch({ type: 'editEdge', payload: { edgeId, endpoint: edgeEnd, nodeId } });
  }

  function editNode(id, node) {
    queryBuilder.dispatch({ type: 'editNode', payload: { id, node } });
  }

  function addHop() {
    queryBuilder.dispatch({ type: 'addHop', payload: { nodeId: edge.object } });
  }

  return (
    <div
      className="textEditorRow"
    >
      <IconButton
        onClick={deleteEdge}
        className="textEditorIconButton"
        disabled={queryBuilder.textEditorRows.length < 2}
      >
        <IndeterminateCheckBoxOutlinedIcon />
      </IconButton>
      <p>
        {index === 0 && 'Find'}
        {index === 1 && 'where'}
        {index > 1 && 'and where'}
      </p>
      <NodeSelector
        id={edge.subject}
        properties={query_graph.nodes[edge.subject]}
        setReference={(nodeId) => setReference('subject', nodeId)}
        update={subjectIsReference ? (
          () => setReference('subject', null)
        ) : (
          editNode
        )}
        isReference={subjectIsReference}
        options={{
          includeCuries: !subjectIsReference,
          includeCategories: !subjectIsReference,
          includeExistingNodes: index !== 0,
          existingNodes: Object.keys(query_graph.nodes).filter(
            (key) => key !== edge.object,
          ).map((key) => ({ ...query_graph.nodes[key], key })),
        }}
      />
      <PredicateSelector
        id={edgeId}
      />
      <NodeSelector
        id={edge.object}
        properties={query_graph.nodes[edge.object]}
        setReference={(nodeId) => setReference('object', nodeId)}
        update={objectIsReference ? (
          () => setReference('object', null)
        ) : (
          editNode
        )}
        isReference={objectIsReference}
        options={{
          includeCuries: !objectIsReference,
          includeCategories: !objectIsReference,
          includeExistingNodes: index !== 0,
          existingNodes: Object.keys(query_graph.nodes).filter(
            (key) => key !== edge.subject,
          ).map((key) => ({ ...query_graph.nodes[key], key })),
        }}
      />
      <IconButton
        onClick={addHop}
        className="textEditorIconButton"
      >
        <AddBoxOutlinedIcon />
      </IconButton>
    </div>
  );
}
