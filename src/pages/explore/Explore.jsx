import React from 'react';
import {
  Grid, Row, Col,
} from 'react-bootstrap';
import {
  Switch, Route, Link, useRouteMatch,
} from 'react-router-dom';
import DrugChemicalPairs from './DrugDiseasePairs';

export default function Explore() {
  const match = useRouteMatch();

  return (
    <Switch>
      <Route path={`${match.path}/drug-chemical`}>
        <DrugChemicalPairs />
      </Route>
      <Route path={match.path}>
        <Index />
      </Route>
    </Switch>
  );
}

function Index() {
  const match = useRouteMatch();

  return (
    <Grid style={{ marginBottom: '50px', marginTop: '50px' }}>
      <Row>
        <Col md={12}>
          <h1>Explore</h1>
          <p style={{ fontSize: '1.6rem' }}>
            Click a link below to view a curated dataset that can be further explored in the ROBOKOP query builder or answer explorer.
          </p>

          <hr />

          <Link to={`${match.url}/drug-chemical`} style={{ fontSize: '1.6rem' }}>
            Drug to Disease Pairs
          </Link>
          <p style={{ fontSize: '1.6rem', marginTop: '0.5rem' }}>
            These drug-disease pairs were generated using a machine learning model to align with the nodes
            in the ROBOKOP knowledge graph. They highlight potential associations between various drugs and
            a broad range of diseases, suggesting possible avenues for further research. These connections
            can serve as a starting point for a new query by hovering over a pair and clicking &ldquo;Start a Query&rdquo;.
          </p>
        </Col>
      </Row>
    </Grid>
  );
}
