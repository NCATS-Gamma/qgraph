import React, {
  useState, useEffect, useContext, useMemo,
} from 'react';
import axios from 'axios';
import Autocomplete from '@mui/lab/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import FileCopy from '@mui/icons-material/FileCopy';
import Check from '@mui/icons-material/Check';
import Tooltip from '@mui/material/Tooltip';
import { withStyles } from '@mui/core';

import AlertContext from '~/context/alert';
import BiolinkContext from '~/context/biolink';
import strings from '~/utils/strings';
import useDebounce from '~/stores/useDebounce';

import fetchCuries from '~/utils/fetchCuries';
import highlighter from '~/utils/d3/highlighter';

function isValidNode(properties) {
  return (properties.categories && properties.categories.length) ||
    (properties.ids && properties.ids.length);
}

const { CancelToken } = axios;
let cancel;

/**
 * Generic node selector component
 * @param {string} id - node id
 * @param {object} properties - node properties from query graph
 * @param {boolean} isReference - is the node a reference
 * @param {function} setReference - function to set node selector reference
 * @param {function} update - function to update node properties
 * @param {object} nodeOptions
 * @param {boolean} nodeOptions.includeCuries - node selector can include curies for a new node
 * @param {boolean} nodeOptions.includeExistingNodes - node selector can include existing nodes
 * @param {boolean} nodeOptions.includeCategories - node selector can include general categories
 */
export default function NodeSelector({
  id, properties, isReference,
  setReference, update,
  options: nodeOptions = {},
}) {
  const {
    includeCuries = true, includeExistingNodes = true,
    existingNodes = [],
    includeCategories = true, clearable = true,
    includeSets = false,
  } = nodeOptions;
  const [loading, toggleLoading] = useState(false);
  const [inputText, updateInputText] = useState('');
  const [open, toggleOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const displayAlert = useContext(AlertContext);
  const { concepts } = useContext(BiolinkContext);
  const searchTerm = useDebounce(inputText, 500);

  /**
   * Get dropdown options for node selector
   *
   * Uses options:
   * - includeExistingNodes
   * - includeCategories
   * - includeCuries
   *
   * Sets new dropdown options
   */
  async function getOptions() {
    toggleLoading(true);
    const newOptions = isReference ? [{ name: 'New Term', key: null }] : [];
    // allow user to select an existing node
    if (includeExistingNodes) {
      newOptions.push(...existingNodes);
    }
    // add general concepts to options
    if (includeCategories) {
      let includedCategories = concepts.filter(
        (category) => category.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      if (includeSets) {
        includedCategories = includedCategories.flatMap((category) => (
          [
            {
              categories: [category],
              name: strings.displayCategory(category),
            },
            {
              categories: [category],
              name: strings.setify(category),
              is_set: true,
            },
          ]
        ));
      } else {
        includedCategories = includedCategories.map((category) => ({ categories: [category], name: strings.displayCategory(category) }));
      }
      newOptions.push(...includedCategories);
    }
    // fetch matching curies from external services
    if (includeCuries) {
      if (searchTerm.includes(':')) { // user is typing a specific curie
        newOptions.push({ name: searchTerm, ids: [searchTerm] });
      } else {
        if (cancel) {
          cancel.cancel();
        }
        cancel = CancelToken.source();
        const curies = await fetchCuries(searchTerm, displayAlert, cancel.token);
        newOptions.push(...curies);
      }
    }
    toggleLoading(false);
    setOptions(newOptions);
  }

  /**
   * Get node options when dropdown opens or search term changes
   * after debounce
   */
  useEffect(() => {
    if (open && searchTerm.length >= 3) {
      getOptions();
    } else {
      setOptions([]);
    }
  }, [open, searchTerm]);

  /**
   * Cancel any api calls on unmount
   */
  useEffect(() => () => {
    if (cancel) {
      cancel.cancel();
    }
  }, []);

  /**
   * Create a human-readable label for every option
   * @param {object} opt - autocomplete option
   * @returns {string} Label to display
   */
  function getOptionLabel(opt) {
    let label = '';
    if (opt.key) {
      label += `${opt.key}: `;
    }
    if (opt.name) {
      return label + opt.name;
    }
    if (opt.ids && Array.isArray(opt.ids) && opt.ids.length) {
      return label + opt.ids.join(', ');
    }
    if (opt.categories && Array.isArray(opt.categories)) {
      if (opt.categories.length) {
        return label + opt.categories.join(', ');
      }
      return `${label} Something`;
    }
    return '';
  }

  /**
   * Update query graph based on option selected
   * @param {*} e - click event
   * @param {object|null} v - value of selected option
   */
  function handleUpdate(e, v) {
    // reset search term back when user selects something
    updateInputText('');
    if (v && 'key' in v) {
      // key will only be in v when switching to existing node
      setReference(v.key);
    } else {
      // updating a node value
      update(id, v);
    }
  }

  /**
   * Compute current value of selector
   */
  const selectorValue = useMemo(() => {
    if (isValidNode(properties)) {
      return properties;
    }
    return null;
  }, [properties]);

  return (
    <Autocomplete
      options={options}
      loading={loading}
      className={`textEditorSelector${isReference ? ' referenceNode' : ''} highlight-${id}`}
      getOptionLabel={getOptionLabel}
      filterOptions={(x) => x}
      autoComplete
      autoHighlight
      clearOnBlur
      blurOnSelect
      disableClearable={!clearable}
      inputValue={inputText}
      value={selectorValue}
      getOptionSelected={(option, value) => option.name === value.name}
      open={open}
      onChange={handleUpdate}
      onOpen={() => toggleOpen(true)}
      onClose={() => toggleOpen(false)}
      onInputChange={(e, v) => updateInputText(v)}
      renderOption={(props) => <Option {...props} />}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          className="nodeDropdown"
          label={id}
          margin="dense"
          onFocus={() => {
            highlighter.highlightGraphNode(id);
            highlighter.highlightTextEditorNode(id);
          }}
          onBlur={() => {
            highlighter.clearGraphNode(id);
            highlighter.clearTextEditorNode(id);
          }}
          InputProps={{
            ...params.InputProps,
            classes: {
              root: `nodeSelector nodeSelector-${id}`,
            },
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      size="medium"
    />
  );
}

const CustomTooltip = withStyles((theme) => ({
  tooltip: {
    fontSize: theme.typography.pxToRem(14),
  },
}))(Tooltip);

function Option({ name, ids, categories }) {
  return (
    <CustomTooltip
      interactive
      arrow
      title={(
        <div className="node-option-tooltip-wrapper">
          {Array.isArray(ids) && ids.length > 0 && (
            <div>
              <span>{ids[0]}</span>
              <CopyButton textToCopy={ids[0]} />
            </div>
          )}
          {Array.isArray(categories) && categories.length > 0 && (
            <span>{categories[0]}</span>
          )}
        </div>
      )}
      placement="left"
    >
      <div>
        { name }
      </div>
    </CustomTooltip>
  );
}

function CopyButton({ textToCopy }) {
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(textToCopy);
    setHasCopied(true);
  };

  if (
    navigator.clipboard === 'undefined' ||
    typeof navigator.clipboard.writeText !== 'function' ||
    typeof textToCopy !== 'string'
  ) {
    return null;
  }

  return (
    <IconButton color="inherit" size="small" onClick={handleCopy}>
      { hasCopied ? <Check /> : <FileCopy /> }
    </IconButton>
  );
}
