import {
  debounce,
  FormControl, InputLabel, ListSubheader, MenuItem, Select,
  TextField,
} from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import React from 'react';
import { api } from '../../../API/baseUrlProxy';

const templates = [
  {
    type: 'AOP',
    template: [
      'What adverse outcome pathways (AOPs) may explain the relationship between ',
      {
        name: 'chemical exposure',
        filterType: 'biolink:ChemicalEntity',
      },
      ' and ',
      {
        name: 'disease',
        filterType: 'biolink:Disease',
      },
      '?',
    ],
  },
  {
    type: 'COP',
    template: [
      'What clinical outcome pathways (COPs) may explain the relationship between ',
      {
        name: 'drug',
        filterType: 'biolink:Drug',
      },
      ' and ',
      {
        name: 'disease',
        filterType: 'biolink:Disease',
      },
      '?',
    ],
  },
  {
    type: 'AOP',
    template: [
      'What genes may relate ',
      {
        name: 'chemical exposure',
        filterType: 'biolink:ChemicalEntity',
      },
      ' and ',
      {
        name: 'disease',
        filterType: 'biolink:Disease',
      },
      '?',
    ],
  },
  {
    type: 'COP',
    template: [
      'What genes may relate ',
      {
        name: 'drug',
        filterType: 'biolink:Drug',
      },
      ' and ',
      {
        name: 'disease',
        filterType: 'biolink:Disease',
      },
      '?',
    ],
  },
];

const createTemplateString = (template) => template.reduce((str, curr) => (
  str + (typeof curr === 'string' ? curr : `[${curr.name}]`)
), '');

export default function TemplatedQueries() {
  const [selectedTemplate, setSelectedTemplate] = React.useState('');

  return (
    <div style={{ padding: '20px' }}>
      <FormControl variant="outlined" style={{ minWidth: '250px' }}>
        <InputLabel htmlFor="template-select">Select a template</InputLabel>
        <Select
          onChange={(e) => setSelectedTemplate(e.target.value)}
          value={selectedTemplate}
          defaultValue={null}
          id="template-select"
          label="Select a template"
        >
          <ListSubheader>AOPs</ListSubheader>
          {
            templates
              .filter((t) => t.type === 'AOP')
              .map((t, i) => (<MenuItem key={i} value={t}>{createTemplateString(t.template)}</MenuItem>))
          }
          <ListSubheader>COPs</ListSubheader>
          {
            templates
              .filter((t) => t.type === 'COP')
              .map((t, i) => (<MenuItem key={i} value={t}>{createTemplateString(t.template)}</MenuItem>))
          }
        </Select>
      </FormControl>

      {selectedTemplate !== '' && (
        <TemplateQuery template={selectedTemplate} />
      )}
    </div>
  );
}

function TemplateQuery({ template }) {
  if (!template || !template.template) return null;

  return (
    <div style={{ marginTop: '2rem', fontSize: '1.1em' }}>
      {
        template.template.map((part, i) => (
          typeof part === 'string'
            ? <span key={i}>{part}</span>
            : <SearchBox name={part.name} biolinkFilter={part.filterType} key={i} />
        ))
      }
    </div>
  );
}

function SearchBox({ name, biolinkFilter }) {
  const [value, setValue] = React.useState(null);
  const [inputValue, setInputValue] = React.useState('');
  const [options, setOptions] = React.useState([]);

  const handleSearchNameRes = async (string, type, limit = 25) => {
    const response = await api.post('/api/name_resolver', {}, { params: { string, type, limit } });
    return response.data.map((d) => ({ name: d.label, curie: d.curie }));
  };

  const fetch = React.useMemo(
    () => debounce(() => handleSearchNameRes(inputValue, biolinkFilter), 200),
    [inputValue],
  );

  React.useEffect(() => {
    let active = true;

    if (inputValue === '') {
      setOptions(value ? [value] : []);
      return undefined;
    }

    fetch({ input: inputValue }, (results) => {
      if (active) {
        let newOptions = [];

        if (value) {
          newOptions = [value];
        }

        if (results) {
          newOptions = [...newOptions, ...results];
        }

        setOptions(newOptions);
      }
    });

    return () => {
      active = false;
    };
  }, [value, inputValue, fetch]);

  return (
    <Autocomplete
      id="name-resolver-search"
      style={{ display: 'inline-flex', width: '200px' }}
      size="small"
      getOptionLabel={(option) => option.name}
      options={options}
      autoComplete
      filterSelectedOptions
      value={value}
      onChange={(_, newValue) => {
        setOptions(newValue ? [newValue, ...options] : options);
        setValue(newValue);
      }}
      onInputChange={(_, newInputValue) => {
        setInputValue(newInputValue);
      }}
      renderInput={(params) => (
        <TextField {...params} label={name} variant="outlined" fullWidth />
      )}
    />
  );
}
