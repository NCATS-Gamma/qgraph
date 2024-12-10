import React, { useState, useEffect } from 'react';
import {
  BrowserRouter, Switch, Route,
} from 'react-router-dom';
import { ThemeProvider, StylesProvider } from '@material-ui/core/styles';
import { Auth0Provider } from '@auth0/auth0-react';

import Logout from '~/pages/Logout';
import About from '~/pages/About';
import Guide from '~/pages/Guide';
import Tutorial from '~/pages/Tutorial';
import TermsofService from '~/pages/TermsofService';
import QueryBuilder from '~/pages/queryBuilder/QueryBuilder';
import Explore from '~/pages/explore/Explore';
import Answer from '~/pages/answer/Answer';

import QuestionList from '~/pages/questionList/QuestionList';

import Header from '~/components/header/Header';
import Footer from '~/components/footer/Footer';
import AlertWrapper from '~/components/AlertWrapper';

import theme from '~/theme';
import API from '~/API';

import AlertContext from '~/context/alert';
import BiolinkContext from '~/context/biolink';

import useBiolinkModel from '~/stores/useBiolinkModel';

export default function App() {
  const [alert, setAlert] = useState({});
  const biolink = useBiolinkModel();

  function simpleSetAlert(severity, msg) {
    setAlert({ severity, msg });
  }

  // Load biolink on page load
  async function fetchBiolink() {
    const response = await API.biolink.getModelSpecification();
    if (response.status === 'error') {
      simpleSetAlert('error',
        'Failed to contact server to download biolink model. You will not be able to select general nodes or predicates. Please try again later.');
      return;
    }
    biolink.setBiolinkModel(response);
  }
  useEffect(() => {
    fetchBiolink();
  }, []);

  return (
    <div id="pageContainer">
      <BrowserRouter basename={process.env.BASE_URL}>
        <Auth0Provider
          domain="qgraph.us.auth0.com"
          clientId="sgJrK1gGAbzrXwUp0WG7jAV0ivCIF6jr"
          redirectUri={window.location.origin}
          audience="https://qgraph.org/api"
        >
          <AlertContext.Provider value={simpleSetAlert}>
            <BiolinkContext.Provider value={biolink}>
              <ThemeProvider theme={theme}>
                <StylesProvider injectFirst>
                  <AlertWrapper
                    alert={alert}
                    onClose={() => simpleSetAlert(alert.severity, '')}
                  />
                  <Header />
                  <div id="contentContainer">
                    <Switch>
                      <Route path="/about">
                        <About />
                      </Route>
                      <Route path="/explore">
                        <Explore />
                      </Route>
                      <Route path="/guide">
                        <Guide />
                      </Route>
                      <Route path="/questions">
                        <QuestionList />
                      </Route>
                      <Route path="/termsofservice">
                        <TermsofService />
                      </Route>
                      <Route path="/logout">
                        <Logout />
                      </Route>
                      <Route path="/answer/:answer_id?">
                        <Answer />
                      </Route>
                      <Route path="/tutorial">
                        <Tutorial />
                      </Route>
                      <Route path="/">
                        <QueryBuilder />
                      </Route>
                    </Switch>
                  </div>
                  <Footer />
                </StylesProvider>
              </ThemeProvider>
            </BiolinkContext.Provider>
          </AlertContext.Provider>
        </Auth0Provider>
      </BrowserRouter>
    </div>
  );
}
