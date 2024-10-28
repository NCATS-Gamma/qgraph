/* eslint-disable no-restricted-syntax */
import React, { useContext } from 'react';
import { TextField } from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import QueryBuilderContext from '~/context/queryBuilder';

const flattenTree = (root, includeMixins) => {
  const items = [root];
  if (root.children) {
    for (const child of root.children) {
      items.push(...flattenTree(child, includeMixins));
    }
  }
  if (root.mixinChildren && includeMixins === true) {
    for (const mixinChild of root.mixinChildren) {
      items.push(...flattenTree(mixinChild, includeMixins));
    }
  }
  return items;
};

const getQualifierOptions = ({ range, subpropertyOf }) => {
  const options = [];

  if (range) {
    if (range.permissible_values) {
      options.push(...Object.keys(range.permissible_values));
    } else {
      options.push(...flattenTree(range).map(({ name }) => name));
    }
  }

  if (subpropertyOf) {
    options.push(...flattenTree(subpropertyOf).map(({ name }) => name));
  }

  return options;
};

// const getBestAssociationOption = (associationOptions) => {
//   let best = null;
//   for (const opt of associationOptions) {
//     if (opt.qualifiers.length > (best.length || 0)) best = opt;
//   }
//   return best;
// };

export default function QualifiersSelector({ id, associations }) {
  const queryBuilder = useContext(QueryBuilderContext);

  const associationOptions = associations
    .filter((a) => a.qualifiers.length > 0)
    .map(({ association, qualifiers }) => ({
      name: association.name,
      uuid: association.uuid,
      qualifiers: qualifiers.map((q) => ({
        name: q.qualifier.name,
        options: getQualifierOptions(q),
      })),
    }));

  const [value, setValue] = React.useState(associationOptions[0] || null);
  const [qualifiers, setQualifiers] = React.useState({});
  React.useEffect(() => {
    queryBuilder.dispatch({ type: 'editQualifiers', payload: { id, qualifiers } });
  }, [qualifiers]);

  if (associationOptions.length === 0) return null;
  if (associationOptions.length === 1 && associationOptions[0].name === 'association') return null;

  const subjectQualfiers = value.qualifiers.filter(({ name }) => name.includes('subject'));
  const predicateQualifiers = value.qualifiers.filter(({ name }) => name.includes('predicate'));
  const objectQualifiers = value.qualifiers.filter(({ name }) => name.includes('object'));
  const otherQualifiers = value.qualifiers.filter((q) => (
    !subjectQualfiers.includes(q) &&
    !predicateQualifiers.includes(q) &&
    !objectQualifiers.includes(q)
  ));

  return (
    <div className="qualifiers-dropdown">
      <div style={{ marginRight: '2rem' }}>
        <Autocomplete
          value={value}
          onChange={(_, newValue) => {
            setValue(newValue);
          }}
          disableClearable
          size="small"
          options={associationOptions}
          getOptionLabel={(option) => option.name}
          getOptionSelected={(opt, val) => opt.uuid === val.uuid}
          style={{ width: 300 }}
          renderInput={(params) => <TextField {...params} label="Association" variant="outlined" />}
        />

        {otherQualifiers.length > 0 && <hr />}

        <QualifiersList
          value={otherQualifiers}
          qualifiers={qualifiers}
          setQualifiers={setQualifiers}
        />
      </div>

      <QualifiersList
        value={subjectQualfiers}
        qualifiers={qualifiers}
        setQualifiers={setQualifiers}
      />
      <QualifiersList
        value={predicateQualifiers}
        qualifiers={qualifiers}
        setQualifiers={setQualifiers}
      />
      <QualifiersList
        value={objectQualifiers}
        qualifiers={qualifiers}
        setQualifiers={setQualifiers}
      />
    </div>
  );
}

function QualifiersList({ value, qualifiers, setQualifiers }) {
  if (value.length === 0) return null;
  return (
    <div className="qualifiers-list">
      {value.map(({ name, options }) => (
        <Autocomplete
          key={name}
          value={qualifiers[name] || null}
          onChange={(_, newValue) => {
            if (newValue === null) {
              setQualifiers((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
              });
            } else { setQualifiers((prev) => ({ ...prev, [name]: newValue || null })); }
          }}
          options={options}
          renderInput={(params) => <TextField {...params} label={name} variant="outlined" />}
          size="small"
        />
      ))}
    </div>
  );
}
