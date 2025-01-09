import React, {
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { Link as MuiLink } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import AccountCircle from '@mui/icons-material/AccountCircle';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import { useAuth0 } from '@auth0/auth0-react';

import './header.css';
import Logo from '../Logo';

export default function Header() {
  const [anchorEl, setAnchorEl] = useState(null);

  const {
    logout, isAuthenticated, loginWithPopup,
  } = useAuth0();

  return (
    (<AppBar position="relative" className="header">
      <Toolbar id="headerToolbar">
        <MuiLink href="/" style={{ cursor: 'pointer', margin: 0 }}><Logo height="48px" width="100%" style={{ paddingTop: '6px' }} /></MuiLink>
        <div className="grow" />
        <Link to="/">Question Builder</Link>
        <Link to="/about">About</Link>
        <Link to="/guide">Guide</Link>
        <Link to="/tutorial">Tutorial</Link>
        {/* This will go to the actual root of the host (robokop.renci.org/#contact), not an internal route in this application */}
        <a href="/#contact">Help</a>
        <Divider orientation="vertical" variant="middle" flexItem />
        <IconButton
          onClick={(e) => (
            isAuthenticated ? setAnchorEl(e.currentTarget) : loginWithPopup()
          )}
          fontSize="large"
          aria-label="signinButton"
          size="large">
          {isAuthenticated ? (
            <AccountCircle id="signedInIcon" fontSize="large" />
          ) : (
            <AccountCircleOutlinedIcon id="signedOutIcon" fontSize="large" />
          )}
        </IconButton>
        <Popover
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Button onClick={() => logout({ returnTo: `${window.location.origin}/logout` })}>Sign Out</Button>
        </Popover>
      </Toolbar>
    </AppBar>)
  );
}
