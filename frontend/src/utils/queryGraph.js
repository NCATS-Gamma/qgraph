import _ from 'lodash';

/**
 * Create a new query graph object
 */
function getEmptyGraph() {
  return {
    nodes: {},
    edges: {},
  };
}

/**
 * Convert a list of objects with an "id" property
 * to a dictionary
 * @param {array} list a list of node or edge objects that each have an ID property
 */
function listWithIdsToDict(list) {
  const ret = {};

  list.forEach((node) => {
    ret[node.id] = { ...node };
    delete ret[node.id].id;
  });

  return ret;
}

/**
 * Convert a dictionary of key-value pairs to a list of objects
 * with an internal "id" property
 * @param {object} dict dictionary with keys and values
 */
function dictToListWithIds(dict) {
  return Object.entries(dict).map(
    ([id, node]) => ({ ...node, id }),
  );
}

/**
 * Remove internal label property
 * @param {object} n a query graph node
 */
// function removeLabel(n) {
//   if (n.label) {
//     delete n.label;
//   }
// }

/**
 * Convert curie to array if not given as array
 * @param {object} n node object with a curie property
 */
function standardizeCuries(n) {
  if (n.curie && !_.isArray(n.curie)) {
    n.curie = [n.curie];
  }
}

/**
 * Convert category to array if not given as array
 * @param {object} e edge object with a category property
 */
function standardizeCategory(e) {
  // Convert category to array if not given as array
  if (e.category && !_.isArray(e.category)) {
    e.category = [e.category];
  }
}

/**
 * Remove empty curie arrays
 * @param {object} n node object with a curie property
*/
function pruneCuries(n) {
  if (n.curie && _.isArray(n.curie) &&
      n.curie.length === 0) {
    delete n.curie;
  }
}

/**
 * Remove empty category arrays
 * @param {object} e edge object with a category property
*/
function pruneCategories(e) {
  if (e.category && _.isArray(e.category) &&
      e.category.length === 0) {
    delete e.category;
  }
}

/*
 * Quick question validity checks (not bullet proof, just to help you out a little)
*/
function validateQueryGraph(graph) {
  const errMessage = [];

  // Check for nodes
  if (!graph.nodes) {
    errMessage.push('A query graph requires a "nodes" property.');
  } else {
    if (Array.isArray(graph.nodes)) {
      errMessage.push('Nodes should be an object.');
    }
    // Since every node has an id we can check if they are unique
    const nodeIds = new Set(Object.keys(graph.nodes));
    const hasUniqueNodeIds = nodeIds.size === Object.keys(graph.nodes).length;
    if (!hasUniqueNodeIds) {
      errMessage.push('There are multiple nodes with the same ID.');
    }
  }

  // Check for edges
  if (!graph.edges) {
    errMessage.push('A query graph requires an "edges" property.');
  } else {
    if (Array.isArray(graph.edges)) {
      errMessage.push('Edges should be an object.');
    }
    // each edge should have a valid source and target id
    const edgesHaveIds = Object.keys(graph.edges).reduce((val, e) => val && graph.edges[e] && graph.edges[e].subject && graph.edges[e].object, true);
    if (!edgesHaveIds) {
      errMessage.push('Each edge must have a valid "subject" and a "object" property.');
    }
  }

  return errMessage;
}

/**
 * Conversion utilities between
 * different query graph representations
 */
const convert = {
  /**
   * Convert an old Reasoner standard query graph to a newer internal representation
   * @param {object} q a query graph containing lists of nodes and edges
   * @returns {object} a query graph containing objects of nodes and edges
   */
  reasonerToInternal(q) {
    const internalRepresentation = {};
    internalRepresentation.nodes = listWithIdsToDict(q.nodes);
    internalRepresentation.edges = listWithIdsToDict(q.edges);

    Object.values(internalRepresentation.nodes).forEach(standardizeCuries);
    Object.values(internalRepresentation.nodes).forEach(standardizeCategory);

    Object.values(internalRepresentation.edges).forEach(standardizeCategory);
    return internalRepresentation;
  },
  /**
   * Convert a newer internal representation to the older Reasoner standard query graph
   * @param {object} q a query graph containing objects of nodes and edges
   * @returns {object} a query graph containing a list of nodes and edges
   */
  internalToReasoner(q) {
    const reasonerRepresentation = {};
    reasonerRepresentation.nodes = dictToListWithIds(q.nodes);
    reasonerRepresentation.edges = dictToListWithIds(q.edges);

    reasonerRepresentation.nodes.forEach(pruneCuries);
    reasonerRepresentation.nodes.forEach(pruneCategories);

    // reasonerRepresentation.nodes.forEach(removeLabel);
    reasonerRepresentation.edges.forEach(pruneCategories);
    return reasonerRepresentation;
  },
};

export default {
  getEmptyGraph,
  validateQueryGraph,
  convert,
  standardizeType,
};
