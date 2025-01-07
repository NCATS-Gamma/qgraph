import React, { useMemo, useContext, useEffect } from 'react';
import Autocomplete from '@mui/lab/Autocomplete';
import TextField from '@mui/material/TextField';

import BiolinkContext from '~/context/biolink';
import QueryBuilderContext from '~/context/queryBuilder';
import strings from '~/utils/strings';
import highlighter from '~/utils/d3/highlighter';

/**
 * Get a list of categories
 * @param {array|undefined} categories - array of node categories
 * @returns list of categories or biolink:NamedThing
 */
function getCategories(categories) {
  return (Array.isArray(categories) && categories.length && categories) || ['biolink:NamedThing'];
}

export default function PredicateSelector({ id }) {
  const biolink = useContext(BiolinkContext);
  const queryBuilder = useContext(QueryBuilderContext);
  const { query_graph } = queryBuilder;
  const edge = query_graph.edges[id];

  /**
   * Get list of valid predicates from selected node categories
   * @returns {string[]|null} list of valid predicates
   */
  function getFilteredPredicateList() {
    if (!biolink || !biolink.predicates.length) {
      return null;
    }
    const subjectNode = query_graph.nodes[edge.subject];
    const objectNode = query_graph.nodes[edge.object];

    // get list of categories from each node
    const subjectCategories = getCategories(subjectNode.categories);
    const objectCategories = getCategories(objectNode.categories);

    // get hierarchies of all involved node categories
    const subjectNodeCategoryHierarchy = subjectCategories.flatMap((subjectCategory) => biolink.ancestorsMap[subjectCategory]);
    const objectNodeCategoryHierarchy = objectCategories.flatMap((objectCategory) => biolink.ancestorsMap[objectCategory]);

    // if we get categories back that aren't in the biolink model
    if (!subjectNodeCategoryHierarchy || !objectNodeCategoryHierarchy) {
      return null;
    }

    return biolink.predicates.filter(
      (p) => subjectNodeCategoryHierarchy.includes(p.domain) &&
             objectNodeCategoryHierarchy.includes(p.range),
    ).map((p) => p.predicate);
  }

  const filteredPredicateList = useMemo(
    getFilteredPredicateList,
    [
      // recompute if node categories change
      JSON.stringify(query_graph.nodes[edge.subject].categories),
      JSON.stringify(query_graph.nodes[edge.object].categories),
      biolink,
    ],
  ) || [];

  function editPredicates(predicates) {
    queryBuilder.dispatch({ type: 'editPredicate', payload: { id, predicates } });
  }

  useEffect(() => {
    if (filteredPredicateList.length) {
      const keptPredicates = (edge.predicates && edge.predicates.filter((p) => filteredPredicateList.indexOf(p) > -1)) || [];
      editPredicates(keptPredicates);
    }
  }, [filteredPredicateList]);

  return (
    <Autocomplete
      options={filteredPredicateList}
      className={`textEditorSelector highlight-${id}`}
      value={edge.predicates || []}
      onChange={(e, value) => editPredicates(value)}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Predicate"
          variant="outlined"
          className="edgeDropdown"
          margin="dense"
          onFocus={() => {
            highlighter.highlightGraphEdge(id);
            highlighter.highlightTextEditorEdge(id);
          }}
          onBlur={() => {
            highlighter.clearGraphEdge(id);
            highlighter.clearTextEditorEdge(id);
          }}
          InputProps={{
            ...params.InputProps,
            classes: {
              root: `edgeSelector edgeSelector-${id}`,
            },
          }}
        />
      )}
      getOptionLabel={(opt) => strings.displayPredicate(opt)}
      clearOnBlur={false}
      multiple
      limitTags={1}
      disableCloseOnSelect
      size="small"
    />
  );
}
