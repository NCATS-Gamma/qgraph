import React, { useContext } from 'react';
import {
  Button, ClickAwayListener, Grow, MenuItem, MenuList, Paper, Popper,
} from '@mui/material';
import { ArrowDropDown } from '@mui/icons-material';

import QueryBuilderContext from '~/context/queryBuilder';

const samples = [
  {
    name: 'Chemicals that might ameliorate Huntington\'s Disease',
    query: {
      message: {
        query_graph: {
          nodes: {
            n0: {
              categories: [
                'biolink:ChemicalEntity',
              ],
              name: 'Chemical Entity',
            },
            n1: {
              name: 'Huntington disease',
              categories: [
                'biolink:Disease',
              ],
              ids: [
                'MONDO:0007739',
              ],
            },
          },
          edges: {
            e0: {
              subject: 'n0',
              object: 'n1',
              predicates: [
                'biolink:ameliorates',
              ],
            },
          },
        },
      },
    },
  },
  {
    name: 'Chemicals that interact with a gene related to Castleman disease',
    query: {
      message: {
        query_graph: {
          nodes: {
            n0: {
              categories: [
                'biolink:ChemicalEntity',
              ],
              name: 'Chemical Entity',
            },
            n1: {
              categories: [
                'biolink:Gene',
              ],
              name: 'Gene',
            },
            n2: {
              name: 'Castleman disease',
              categories: [
                'biolink:DiseaseOrPhenotypicFeature',
                'biolink:BiologicalEntity',
                'biolink:NamedThing',
                'biolink:Entity',
                'biolink:ThingWithTaxon',
                'biolink:Disease',
              ],
              ids: [
                'MONDO:0015564',
              ],
            },
          },
          edges: {
            e0: {
              subject: 'n0',
              object: 'n1',
              predicates: [
                'biolink:interacts_with',
              ],
            },
            e1: {
              subject: 'n1',
              object: 'n2',
              predicates: [
                'biolink:related_to',
              ],
            },
          },
        },
      },
    },
  },
  {
    name: 'Genes involved in histone H3 deacetylation',
    query: {
      message: {
        query_graph: {
          nodes: {
            n0: {
              name: 'histone H3 deacetylation',
              categories: [
                'biolink:BiologicalProcessOrActivity',
                'biolink:BiologicalEntity',
                'biolink:NamedThing',
                'biolink:Entity',
                'biolink:Occurrent',
                'biolink:OntologyClass',
                'biolink:ThingWithTaxon',
                'biolink:PhysicalEssenceOrOccurrent',
                'biolink:BiologicalProcess',
              ],
              ids: [
                'GO:0070932',
              ],
            },
            n1: {
              categories: [
                'biolink:Gene',
              ],
              name: 'Gene',
            },
          },
          edges: {
            e0: {
              subject: 'n0',
              object: 'n1',
              predicates: [
                'biolink:related_to',
              ],
            },
          },
        },
      },
    },
  },
  {
    name: 'Genes and chemicals related to GLUT 1 deficiency, and to each other',
    query: {
      message: {
        query_graph: {
          nodes: {
            n0: {
              categories: [
                'biolink:ChemicalEntity',
              ],
              name: 'Chemical Entity',
            },
            n1: {
              categories: [
                'biolink:Gene',
              ],
              name: 'Gene',
            },
            n2: {
              name: 'GLUT1 deficiency syndrome',
              categories: [
                'biolink:DiseaseOrPhenotypicFeature',
                'biolink:BiologicalEntity',
                'biolink:NamedThing',
                'biolink:Entity',
                'biolink:ThingWithTaxon',
                'biolink:Disease',
              ],
              ids: [
                'MONDO:0000188',
              ],
            },
          },
          edges: {
            e0: {
              subject: 'n0',
              object: 'n1',
              predicates: [
                'biolink:related_to',
              ],
            },
            e1: {
              subject: 'n1',
              object: 'n2',
              predicates: [
                'biolink:related_to',
              ],
            },
            e2: {
              subject: 'n2',
              object: 'n0',
              predicates: [
                'biolink:related_to',
              ],
            },
          },
        },
      },
    },
  },
  {
    name: 'Diseases associated with 2,3,7,8-tetrochlorodibenzo-p-dioxin',
    query: {
      message: {
        query_graph: {
          nodes: {
            n0: {
              name: '2,3,7,8-Tetrachlorodibenzo-P-dioxin',
              categories: [
                'biolink:MolecularEntity',
                'biolink:ChemicalEntity',
                'biolink:NamedThing',
                'biolink:Entity',
                'biolink:PhysicalEssence',
                'biolink:ChemicalOrDrugOrTreatment',
                'biolink:ChemicalEntityOrGeneOrGeneProduct',
                'biolink:ChemicalEntityOrProteinOrPolypeptide',
                'biolink:PhysicalEssenceOrOccurrent',
                'biolink:SmallMolecule',
              ],
              ids: [
                'PUBCHEM.COMPOUND:15625',
              ],
            },
            n1: {
              categories: [
                'biolink:Disease',
              ],
              name: 'Disease',
            },
          },
          edges: {
            e0: {
              subject: 'n0',
              object: 'n1',
              predicates: [
                'biolink:associated_with',
              ],
            },
          },
        },
      },
    },
  },
];

export default function SampleQueryLoader() {
  const queryBuilder = useContext(QueryBuilderContext);
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef(null);

  const handleMenuItemClick = (_, index) => {
    queryBuilder.dispatch({ type: 'saveGraph', payload: samples[index].query });
    setOpen(false);
  };

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) {
      return;
    }

    setOpen(false);
  };

  return (
    <>
      <Button
        ref={anchorRef}
        endIcon={<ArrowDropDown />}
        onClick={handleToggle}
        variant="outlined"
        aria-controls={open ? 'sample-query-menu' : undefined}
        aria-expanded={open ? 'true' : undefined}
        aria-haspopup="menu"
      >
        Load Sample Query
      </Button>
      <Popper
        sx={{
          zIndex: 1,
        }}
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
      >
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin:
                placement === 'bottom' ? 'center top' : 'right bottom',
            }}
          >
            <Paper elevation={4}>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList id="sample-query-menu" autoFocusItem>
                  {samples.map((sample, index) => (
                    <MenuItem
                      key={sample.name}
                      onClick={(event) => handleMenuItemClick(event, index)}
                    >
                      {sample.name}
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  );
}
