import {
  Box,
  styled,
  Table, TableBody, TableCell, TableHead, TableRow, withStyles,
} from '@material-ui/core';
import React from 'react';
import Button from '@material-ui/core/Button';
import { blue } from '@material-ui/core/colors';
import resultsUtils from '~/utils/results';

const headerStyles = { fontWeight: 'bold', backgroundColor: '#eee' };

const GPTSummaryButton = withStyles((theme) => ({
  root: {
    marginLeft: 'auto',
    color: theme.palette.getContrastText(blue[600]),
    backgroundColor: blue[600],
    '&:hover': {
      backgroundColor: blue[700],
    },
  },
}))(Button);

async function onGPTSummary(aiJSON) {
  const publicationsArr = resultsUtils.getPublications(aiJSON.edge);
  const sentenceRes = resultsUtils.getSentences(aiJSON.edge);
  console.log('FROM GPT SUMMARY FUNC, publications: ', publicationsArr);
  console.log('FROM GPT SUMMARY FUNC, sentence: ', sentenceRes);
  const toSendData = {
    edge: {
      nodes: aiJSON.nodes,
      edge: {
        subject: aiJSON.edge.subject,
        object: aiJSON.edge.object,
        predicate: aiJSON.edge.predicate,
        publications: publicationsArr,
        sentences: sentenceRes,
      },
    },
    parameters: {
      llm: {
        gpt_model: 'gpt-3.5-turbo',
        temperature: 0,
        system_prompt: '',
      },
    },
  };
  console.log('CLICKED FROM GPU SUMMARY FUNC');
  // console.log(JSON.stringify(edge, null, 2));
  // console.log(JSON.stringify(nodes, null, 2));
  console.log(JSON.stringify(toSendData, null, 2));
  const options = {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
    },
    body: JSON.stringify(toSendData),
  };
  const kgsummarizerurl = 'https://kg-summarizer.apps.renci.org/summarize/edge';
  fetch(kgsummarizerurl, options)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json(); // Parse the JSON in the response ? Or is it a text?
    })
    .then(data => {
      console.log('KG SUMMARIZER Success:', data);
      // = data;
      // Do something with the response data
    })
    .catch(error => {
      console.error('KG SUMMARIZER Error:', error);
      // Handle errors
    });
}

const StyledTableBody = styled(TableBody)(() => ({
  '& .MuiTableRow-root:last-of-type .MuiTableCell-root': {
    borderBottom: 'none',
  },
}));

const ValueCell = ({ value }) => (
  <TableCell>
    <ul style={{ padding: 0, margin: 0, listStyleType: 'none' }}>
      {Array.isArray(value) ? (
        value.map((valueItem, valueItemIndex) => (
          <li key={valueItemIndex}>{valueItem}</li>
        ))
      ) : (
        <li>{value}</li>
      )}
    </ul>
  </TableCell>
);

const PublicationLinkCell = ({ value, aiJSON }) => {
  const getLinkFromValue = (pmidValue) => {
    const pmid = pmidValue.split(':');
    if (pmid.length < 2) return null;
    return `https://pubmed.ncbi.nlm.nih.gov/${pmid[1]}/`;
  };

  return (
    <TableCell>
      <ul style={{ padding: 0, margin: 0, listStyleType: 'none' }}>
        {Array.isArray(value) ? (
          value.map((valueItem, valueItemIndex) => {
            const link = getLinkFromValue(valueItem);
            return (
              <li key={valueItemIndex}>
                {link === null ? (
                  valueItem
                ) : (
                  <a href={link} target="_blank" rel="noreferrer">
                    {valueItem}
                  </a>
                )}
              </li>
            );
          })
        ) : (
          <li>
            {getLinkFromValue(value) === null ? (
              value
            ) : (
              <a
                href={getLinkFromValue(value)}
                target="_blank"
                rel="noreferrer"
              >
                {value}
              </a>
            )}
          </li>
        )}
      </ul>
      <GPTSummaryButton
        onClick={() => onGPTSummary(aiJSON)}
        variant="outlined"
      >
        Get AI Summary
      </GPTSummaryButton>
    </TableCell>
  );
};

const AttributesTable = ({ aiJSON, attributes, sources }) => (
  <Box style={{ maxHeight: 500, overflow: 'auto' }}>
    <Table size="small" aria-label="edge attributes table">
      <TableHead style={{ position: 'sticky', top: 0 }}>
        <TableRow>
          <TableCell style={headerStyles}>
            attribute_type_id
          </TableCell>
          <TableCell style={headerStyles}>
            value
          </TableCell>
        </TableRow>
      </TableHead>
      <StyledTableBody>
        {attributes.map((attribute, index) => (
          <TableRow key={index}>
            <TableCell style={{ verticalAlign: 'top' }}>{attribute.attribute_type_id}</TableCell>
            {
              attribute.attribute_type_id === 'biolink:publications'
                ? <PublicationLinkCell value={attribute.value} aiJSON={aiJSON} />
                : <ValueCell value={attribute.value} />
            }
          </TableRow>
        ))}
        <TableRow>
          <TableCell>
            Sources
          </TableCell>
          <TableCell>
            {Array.isArray(sources) && sources.map((source, i) => (
              <section key={i}>
                <p style={{ marginBottom: '0px', fontStyle: 'italic' }}>{source.resource_id}</p>
                <p style={{ filter: 'opacity(0.75)', fontSize: '0.8em' }}>{source.resource_role}</p>
                {Boolean(source.upstream_resource_ids) && Array.isArray(source.upstream_resource_ids) && (
                  <>
                    <p style={{ marginBottom: '0px' }}>Upstream resource ids:</p>
                    <ul>
                      {source.upstream_resource_ids.map((urid, j) => (
                        <li key={j}>
                          {urid}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {i === sources.length - 1 ? null : <hr />}
              </section>
            ))}
          </TableCell>
        </TableRow>
      </StyledTableBody>
    </Table>
  </Box>
);

export default AttributesTable;
