import { createMuiTheme, adaptV4Theme } from '@mui/material/styles';

export default createMuiTheme(adaptV4Theme({
  typography: {
    // Tell Material UI what's the font-size on the html element is.
    htmlFontSize: 10,
  },
}));
