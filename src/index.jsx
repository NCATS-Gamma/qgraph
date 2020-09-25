import 'core-js/stable';
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';

// Import static css, image, and font assets so that they can be found by webpack.
import 'bootstrap/dist/css/bootstrap.css';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-material.css';
import 'react-widgets/dist/css/react-widgets.css';

import App from './App';

// Our actual CSS and other images etc.
import './app.css';
import './components/shared/shared.css';

ReactDOM.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
  document.getElementById('root'),
);
