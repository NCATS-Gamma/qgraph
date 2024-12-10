import React from 'react';
import { Link } from 'react-router-dom';
import { Link as MuiLink } from '@material-ui/core';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';

import './header.css';
import Logo from '../Logo';

export default function Header() {
  return (
    <AppBar position="relative" className="header">
      <Toolbar id="headerToolbar">
        <MuiLink href="/" style={{ cursor: 'pointer', margin: 0 }}><Logo height="48px" width="100%" style={{ paddingTop: '6px' }} /></MuiLink>
        <div className="grow" />
        <Link to="/">Question Builder</Link>
        <Link to="/explore">Explore</Link>
        <Link to="/about">About</Link>
        <Link to="/guide">Guide</Link>
        <Link to="/tutorial">Tutorial</Link>
        {/* This will go to the actual root of the host (robokop.renci.org/#contact), not an internal route in this application */}
        <a href="/#contact">Help</a>
      </Toolbar>
    </AppBar>
  );
}
