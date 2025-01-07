/* eslint-disable indent, no-use-before-define, func-names, no-return-assign */
import React, {
  useState, useContext, useEffect, useRef,
} from 'react';
import * as d3 from 'd3';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

import BiolinkContext from '~/context/biolink';
import kgUtils from '~/utils/knowledgeGraph';

import Worker from './simulation.worker';

import './kgFull.css';

const height = 400;
const width = 400;
// const maxNodes = 40;
// const maxEdges = 100;

/**
 * Full Knowledge Graph display
 * @param {object} message - TRAPI message
 */
export default function KgFull({ message }) {
  const canvasRef = useRef();
  const [loading, toggleLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { colorMap, hierarchies } = useContext(BiolinkContext);

  function displayCanvas(data) {
    const canvas = d3.select(canvasRef.current)
      .attr('width', width)
      .attr('height', height);
    const context = canvas.node().getContext('2d');
    const { nodes, edges } = data;
    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(width / 2, height / 2);

    function drawEdge(d) {
      context.moveTo(d.source.x, d.source.y);
      context.lineTo(d.target.x, d.target.y);
    }

    function drawNode(d) {
      context.beginPath();
      context.moveTo(d.x + 5, d.y);
      context.arc(d.x, d.y, 5, 0, 2 * Math.PI);
      if (d.categories && Array.isArray(d.categories)) {
        d.categories = kgUtils.getRankedCategories(hierarchies, d.categories);
      }
      const color = colorMap(d.categories)[1];
      context.strokeStyle = color;
      context.fillStyle = color;
      context.fill();
      context.stroke();
    }

    context.beginPath();
    edges.forEach(drawEdge);
    context.strokeStyle = '#aaa';
    context.stroke();

    nodes.forEach(drawNode);

    context.restore();
  }

  function getGraphFromWorker() {
    const simulationWorker = new Worker();
    const kgLists = kgUtils.getFullDisplay(message);
    toggleLoading(true);
    simulationWorker.onmessage = (e) => {
      switch (e.data.type) {
        case 'display': {
          displayCanvas(e.data);
          // TODO: if graph is small enough, display as svg
          // if (e.data.nodes.length > maxNodes || e.data.edges.length > maxEdges) {
          //   displayCanvas(e.data);
          // } else {
          //   displaySvg(e.data);
          // }
          toggleLoading(false);
          // we've gotten the graph, no need for the worker to stay open.
          simulationWorker.terminate();
          break;
        }
        case 'tick': {
          setProgress(e.data.progress);
          break;
        }
        default:
          // eslint-disable-next-line no-console
          console.log('unhandled worker message');
      }
    };
    simulationWorker.postMessage(kgLists);
  }

  useEffect(() => {
    d3.select(canvasRef.current)
      .attr('width', 0)
      .attr('height', 0);
    if (Object.keys(message).length) {
      getGraphFromWorker();
    }
  }, [message]);

  return (
    <>
      <div id="kgFullContainer" style={{ height, width, display: 'inline-block' }}>
        {loading && (
          <Box position="relative" display="inline-flex">
            <CircularProgress variant="determinate" value={progress} size={150} />
            <Box
              top={0}
              left={0}
              bottom={0}
              right={0}
              position="absolute"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {`${Math.round(progress)}%`}
            </Box>
          </Box>
        )}
        <canvas ref={canvasRef} />
      </div>
    </>
  );
}
