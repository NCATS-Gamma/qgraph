/* eslint-disable no-restricted-syntax */
import React, { useContext, useState } from 'react';
import IconButton from '@material-ui/core/IconButton';
import AddBoxOutlinedIcon from '@material-ui/icons/AddBoxOutlined';
import IndeterminateCheckBoxOutlinedIcon from '@material-ui/icons/IndeterminateCheckBoxOutlined';

import { Collapse } from '@material-ui/core';
import BiolinkContext from '~/context/biolink';
import QueryBuilderContext from '~/context/queryBuilder';
import NodeSelector from './NodeSelector';
import PredicateSelector from './PredicateSelector';
import QualifiersSelector from './QualifiersSelector';

import './textEditorRow.css';

function getValidAssociations(s, p, o, model) {
  const validAssociations = [];

  const subject = model.classes.lookup.get(s);
  const predicate = model.slots.lookup.get(p);
  const object = model.classes.lookup.get(o);

  const isInRange = (
    n,
    range,
  ) => {
    const traverse = (nodes, search) => {
      for (const node of nodes) {
        if (node === search) return true;
        if (node.parent) {
          if (traverse([node.parent], search)) return true;
        }
        if (node.mixinParents) {
          if (traverse(node.mixinParents, search)) return true;
        }
      }
      return false;
    };
    return traverse([n], range);
  };

  // Returns true if `n` is an ancestor of `domain`
  const isInDomain = (
    n,
    domain,
  ) => {
    const traverse = (nodes, search) => {
      for (const node of nodes) {
        if (node === search) return true;
        if (node.parent) {
          if (traverse([node.parent], search)) return true;
        }
        if (node.mixinParents) {
          if (traverse(node.mixinParents, search)) return true;
        }
      }
      return false;
    };
    return traverse([domain], n);
  };

  /**
   * Get the inherited subject/predicate/object ranges for an association
   */
  const getInheritedSPORanges = (
    association,
  ) => {
    const namedThing = model.classes.lookup.get('named thing');
    const relatedTo = model.slots.lookup.get('related to');

    const traverse = (
      nodes,
      part,
    ) => {
      for (const node of nodes) {
        if (node.slotUsage && node.slotUsage[part]) return node.slotUsage[part];
        if (node.parent) {
          const discoveredType = traverse([node.parent], part);
          if (discoveredType !== null) return discoveredType;
        }
        if (node.mixinParents) {
          const discoveredType = traverse(node.mixinParents, part);
          if (discoveredType !== null) return discoveredType;
        }
      }

      return null;
    };

    const sub = traverse([association], 'subject') || namedThing;
    const pred = traverse([association], 'predicate') || relatedTo;
    const obj = traverse([association], 'object') || namedThing;

    return { subject: sub, predicate: pred, object: obj };
  };

  // DFS over associations
  const traverse = (nodes, level = 0) => {
    for (const association of nodes) {
      if (association.slotUsage && !association.abstract) {
        const inherited = getInheritedSPORanges(association);

        const validSubject = isInRange(subject, inherited.subject) || isInDomain(subject, inherited.subject);
        const validObject = isInRange(object, inherited.object) || isInDomain(object, inherited.object);
        const validPredicate = isInRange(predicate, inherited.predicate) || isInDomain(predicate, inherited.predicate);

        const qualifiers = Object.entries(association.slotUsage)
          .map(([qualifierName, properties]) => {
            if (properties === null) return null;
            const qualifier = model.slots.lookup.get(qualifierName);
            if (!qualifier || !isInRange(qualifier, model.qualifiers)) return null;

            let range;
            if (properties.range) {
              const potentialEnum =
                model.enums[properties.range];
              const potentialClassNode =
                model.classes.lookup.get(properties.range);

              if (potentialEnum) range = potentialEnum;
              if (potentialClassNode) range = potentialClassNode;
            }

            let subpropertyOf;
            if (
              properties.subproperty_of &&
              model.slots.lookup.has(properties.subproperty_of)
            ) {
              subpropertyOf = model.slots.lookup.get(
                properties.subproperty_of,
              );
            }

            return {
              qualifier,
              range,
              subpropertyOf,
            };
          })
          .filter((q) => q !== null);

        if (validSubject && validObject && validPredicate) {
          validAssociations.push({
            association,
            inheritedRanges: inherited,
            level,
            qualifiers,
          });
        }
      }
      traverse(association.children, level + 1);
    }
  };
  traverse([model.associations]);

  validAssociations.sort((a, b) => b.level - a.level);

  return validAssociations;
}

export default function TextEditorRow({ row, index }) {
  const queryBuilder = useContext(QueryBuilderContext);
  const { model } = useContext(BiolinkContext);
  const [isOpen, setIsOpen] = useState(false);
  if (!model) return 'Loading...';
  const { query_graph } = queryBuilder;
  const edge = query_graph.edges[row.edgeId];
  const hasQualifiers = Array.isArray(edge.qualifier_constraints) &&
    edge.qualifier_constraints.length > 0 &&
    Array.isArray(edge.qualifier_constraints[0].qualifier_set) &&
    edge.qualifier_constraints[0].qualifier_set.length > 0;
  const { edgeId, subjectIsReference, objectIsReference } = row;

  const subject = ((query_graph.nodes[edge.subject].categories && query_graph.nodes[edge.subject].categories[0]) || 'biolink:NamedThing')
    .replace('biolink:', '')
    .match(/[A-Z][a-z]+/g)
    .join(' ')
    .toLowerCase();
  const predicate = ((query_graph.nodes[edge.subject].categories && edge.predicates[0]) || 'biolink:related_to')
    .replace('biolink:', '')
    .replace(/_/g, ' ');
  const object = ((query_graph.nodes[edge.object].categories && query_graph.nodes[edge.object].categories[0]) || 'biolink:NamedThing')
    .replace('biolink:', '')
    .match(/[A-Z][a-z]+/g)
    .join(' ')
    .toLowerCase();

  const validAssociations = getValidAssociations(subject, predicate, object, model);

  // console.log(
  //   `\
  //     S: ${subjectCategory}\n\
  //     P: ${predicate}\n\
  //     O: ${objectCategory}\
  //   `
  // )

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
      className="editor-row-wrapper"
    >
      <div className="textEditorRow">
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

      <Collapse in={isOpen}>
        <div className="qualifiers-wrapper">
          <QualifiersSelector
            id={edgeId}
            associations={validAssociations}
          />
        </div>
      </Collapse>

      <button
        type="button"
        className="dropdown-toggle"
        onClick={() => { setIsOpen((p) => !p); }}
        style={{ color: '#333' }}
      >
        <span style={{ fontSize: '0.8em' }}>
          {isOpen ? '▲' : '▼'}
        </span>
        <span
          style={hasQualifiers ? {
            fontWeight: 'bold',
            fontStyle: 'italic',
          } : undefined}
        >
          {' Qualifiers'}
          {hasQualifiers && '*'}
        </span>
      </button>
    </div>
  );
}
