import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useHistory, Link } from 'react-router-dom';
import Button from '@mui/material/Button';

export default function Logout() {
  const { isAuthenticated } = useAuth0();
  const history = useHistory();

  useEffect(() => {
    if (isAuthenticated) {
      // redirect to home page if user is logged in
      history.push('/');
    }
  }, [isAuthenticated]);

  return (
    <div id="logoutContainer">
      <h1>
        You&apos;ve successfully logged out
      </h1>
      <Link
        to="/"
      >
        <Button
          variant="contained"
        >
          Ask a quick question
        </Button>
      </Link>
      <Link
        to="/questions"
      >
        <Button
          variant="contained"
        >
          View public questions
        </Button>
      </Link>
      <Link
        to="/answer"
      >
        <Button
          variant="contained"
        >
          Upload and view an answer
        </Button>
      </Link>
    </div>
  );
}
