/* eslint-disable indent, no-use-before-define, func-names, no-return-assign */
import React, {
  useState, useEffect, useRef, useContext, useMemo,
} from 'react';
import * as d3 from 'd3';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';

import { List, ListItem, ListItemIcon } from '@mui/material';
import { Brightness1 as Circle } from '@mui/icons-material';
import stringUtils from '~/utils/strings';
import BiolinkContext from '~/context/biolink';
import kgUtils from '~/utils/knowledgeGraph';
import dragUtils from '~/utils/d3/drag';
import graphUtils from '~/utils/d3/graph';
import Loading from '~/components/loading/Loading';
import useDebounce from '~/stores/useDebounce';

import './kgBubble.css';
import Popover from '~/components/Popover';
import NodeAttributesTable from './NodeAttributesTable';

const nodePadding = 2;
const defaultTrimNum = 25;

/**
 * Knowledge Graph Bubble Graph
 * @param {array} nodes - list of node objects
 * @param {integer} numQgNodes - number of nodes in query graph
 * @param {integer} numResults - number of results in message
 */
export default function KgBubble({
  nodes, numQgNodes, numResults,
}) {
  const svgRef = useRef();
  const { colorMap } = useContext(BiolinkContext);
  const [drawing, setDrawing] = useState(false);
  const [numTrimmedNodes, setNumTrimmedNodes] = useState(Math.min(nodes.length, defaultTrimNum));
  const debouncedTrimmedNodes = useDebounce(numTrimmedNodes, 500);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverData, setPopoverData] = useState({});

  const trimmedNodes = useMemo(() => nodes.slice(0, debouncedTrimmedNodes), [debouncedTrimmedNodes, nodes]);

  // computes an array of [category, color], without duplicates, sorted by
  // the number of occurences of the category in the `nodes` list
  const categoryColorList = useMemo(() => {
    const map = new Map();
    trimmedNodes.forEach((node) => {
      const [category, color] = colorMap(node.categories);
      if (!map.has(category)) {
        map.set(category, { color, occurrences: 1 });
      } else {
        map.get(category).occurrences += 1;
      }
    });

    return Array.from(map)
      .sort((a, b) => a.occurrences - b.occurrences)
      .map(([category, { color }]) => [category, color]);
  }, [trimmedNodes, colorMap]);

  const handleClickNode = (data) => {
    const { top, left } = svgRef.current.getBoundingClientRect();
    setPopoverPosition({
      x: left + data.x,
      y: top + data.y,
    });

    setPopoverData({
      name: data.name,
      id: data.id,
      categories: data.categories,
      count: data.count,
    });
    setPopoverOpen(true);
  };

  /**
   * Initialize the svg size
   */
  function setSvgSize() {
    if (nodes.length) {
      const svg = d3.select(svgRef.current);
      const { width, height } = svg.node().parentNode.getBoundingClientRect();
      svg
        .attr('width', width)
        .attr('height', height)
        .attr('preserveAspectRatio', 'xMinYMin meet')
        .attr('viewBox', [0, 0, width, height]);
    }
  }

  useEffect(() => {
    setSvgSize();
  }, [nodes]);

  function drawBubbleGraph() {
    const svg = d3.select(svgRef.current);
    const { width, height } = svg.node().parentNode.getBoundingClientRect();
    // clear the graph
    svg.selectAll('*').remove();
    const getNodeRadius = kgUtils.getNodeRadius(width, height, numQgNodes, numResults);
    const converted_nodes = trimmedNodes.map((d) => ({ ...d, x: Math.random() * width, y: Math.random() * height }));
    const simulation = d3.forceSimulation(converted_nodes)
      .force('x', d3.forceX(width / 2).strength(0.02)) // pull all nodes horizontally towards middle of box
      .force('y', d3.forceY(height / 2).strength(0.2)) // pull all nodes vertically towards middle of box
      .force('collide', d3.forceCollide().radius( // prevent collisions
        (d) => getNodeRadius(d.count) + nodePadding,
      ).iterations(3)) // run the collide constraint multiple times to strongly enforce collision prevention
      .on('tick', () => {
        node
          .attr('transform', (d) => {
            let padding = getNodeRadius(d.count);
            // 70% of node radius so a dragged node can push into the graph bounds a little
            if (d.fx !== null && d.fx !== undefined) {
              padding *= 0.5;
            }
            d.x = graphUtils.getBoundedValue(d.x, width - padding, padding);
            d.y = graphUtils.getBoundedValue(d.y, height - padding, padding);
            return `translate(${d.x}, ${d.y})`;
          });
      });
    const node = svg.selectAll('g')
      .data(converted_nodes)
      .enter()
        .append('g')
          .attr('class', 'node')
          .call(dragUtils.dragNode(simulation))
          .call((n) => n.append('circle')
            .attr('r', (d) => getNodeRadius(d.count))
            .attr('fill', (d) => colorMap(d.categories)[1])
            .call((nCircle) => nCircle.append('title')
              .text((d) => d.name))
            .style('transition', 'stroke-width 200ms ease-in-out, stroke 200ms ease-in-out, filter 200ms ease-in-out')
            .style('cursor', 'pointer')
            .on('mouseover', function () {
              d3.select(this)
                .attr('stroke', '#239cff')
                .style('filter', 'brightness(1.1)')
                .attr('stroke-width', 3);
              })
              .on('mouseout', function () {
                d3.select(this)
                .attr('stroke', 'none')
                .style('filter', 'initial')
                .attr('stroke-width', 0);
            })
            .on('click', function () {
              handleClickNode(d3.select(this).datum());
            }))
          .call((n) => n.append('text')
            .attr('class', 'nodeLabel')
            .style('pointer-events', 'none')
            .attr('text-anchor', 'middle')
            .style('font-weight', 600)
            .attr('alignment-baseline', 'middle')
            .text((d) => {
              if (getNodeRadius(d.count) < 15) {
                return '';
              }
              const { name, id } = d;
              return name || id || 'Something';
            })
            .each(graphUtils.ellipsisOverflow));

    simulation.alpha(1).restart();
  }

  useEffect(() => {
    if (nodes.length) {
      drawBubbleGraph();
    }
  }, [nodes, debouncedTrimmedNodes, colorMap]);

  useEffect(() => {
    let timer;
    function handleResize() {
      const svg = d3.select(svgRef.current);
      // clear the graph
      svg.selectAll('*').remove();
      setDrawing(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setSvgSize();
        drawBubbleGraph();
        setDrawing(false);
      }, 1000);
    }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [nodes]);

  return (
    <>
      {nodes.length > 0 && (
        <div style={{
          display: 'flex',
          width: '100%',
          gap: '10px',
          margin: '10px',
        }}
        >
          <Paper id="kgBubbleContainer" elevation={3}>
            <h5 className="cardLabel">Knowledge Graph Bubble</h5>
            {nodes.length > defaultTrimNum && (
              <Box width={300} id="nodeNumSlider">
                <Slider
                  value={numTrimmedNodes}
                  valueLabelDisplay="auto"
                  min={2}
                  max={nodes.length}
                  onChange={(e, v) => setNumTrimmedNodes(v)}
                />
              </Box>
            )}
            {drawing && (
              <Loading positionStatic message="Redrawing knowledge graph..." />
            )}
            <svg ref={svgRef} />
          </Paper>
          <Paper id="legendContainer" elevation={3}>
            <h5 className="legendHeader">Legend</h5>
            <List style={{ paddingTop: '0.5rem' }}>
              {
                categoryColorList.map(([category, color], i) => (
                  <ListItem key={i}>
                    <ListItemIcon style={{ minWidth: '32px' }}>
                      <Circle style={{ color }} />
                    </ListItemIcon>
                    {stringUtils.displayCategory(category)}
                  </ListItem>
                ))
              }
            </List>
          </Paper>
        </div>
      )}

      <Popover
        open={popoverOpen}
        onClose={() => setPopoverOpen(false)}
        anchorPosition={{ top: popoverPosition.y, left: popoverPosition.x }}
      >
        <NodeAttributesTable nodeData={popoverData} />
      </Popover>
    </>
  );
}
