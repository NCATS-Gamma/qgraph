import { IconButton, Modal } from '@mui/material';
import { Close } from '@mui/icons-material';
import React, { useState } from 'react';

const Figure = ({
  image, imageAlt, children, figureStyle,
}) => {
  const [open, setOpen] = useState(false);

  return (<>
    <figure style={figureStyle}>
      <button
        style={{ all: 'unset', cursor: 'pointer' }}
        type="button"
        onClick={() => setOpen(true)}
      >
        <img src={image} alt={imageAlt} />
      </button>
      {children && <figcaption>{children}</figcaption>}
    </figure>
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      aria-labelledby="Make image fullscreen"
      aria-describedby={imageAlt}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      BackdropProps={{
        style: {
          backgroundColor: 'rgba(0 0 0 / 0.75)',
        },
      }}
    >
      <div
        style={{
          maxWidth: '80vw',
          height: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
        }}
      >
        <IconButton
          onClick={() => setOpen(false)}
          style={{ alignSelf: 'flex-end', color: 'white' }}
          size="large">
          <Close />
        </IconButton>
        <img src={image} alt={imageAlt} style={{ width: '100%' }} />
        {children && (
          <figcaption
            style={{
              alignSelf: 'center',
              color: 'white',
              fontStyle: 'italic',
              fontSize: '2rem',
              textAlign: 'center',
            }}
          >
            {children}
          </figcaption>
        )}
      </div>
    </Modal>
  </>);
};

export default Figure;
