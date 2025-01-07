/* eslint-disable indent, no-use-before-define, func-names, no-return-assign */
import React, {
  useEffect, useContext, useRef, useState,
} from 'react';
import * as d3 from 'd3';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';

import BiolinkContext from '~/context/biolink';
import dragUtils from '~/utils/d3/drag';
import graphUtils from '~/utils/d3/graph';
import edgeUtils from '~/utils/d3/edges';
import stringUtils from '~/utils/strings';
import useDebounce from '~/stores/useDebounce';
import ResultMetaData from './ResultMetaData';
import AttributesTable from './AttributesTable';
import Popover from '~/components/Popover';
import NodeAttributesTable from '../kgBubble/NodeAttributesTable';

const nodeRadius = 40;

/**
 * Selected result graph
 * @param {object} answerStore - answer store hook
 */
export default function ResultExplorer({ answerStore }) {
  const svgRef = useRef();
  const svg = useRef();
  const width = useRef();
  const height = useRef();
  const node = useRef({});
  const edge = useRef({});
  const simulation = useRef();
  const { colorMap } = useContext(BiolinkContext);
  const [numTrimmedNodes, setNumTrimmedNodes] = useState(answerStore.numQgNodes);
  const debouncedTrimmedNodes = useDebounce(numTrimmedNodes, 500);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  // const [attributesPopoverOpen, setAttributesPopoverOpen] = useState(false);
  // const [currentEdgeAttributes, setCurrentEdgeAttributes] = useState({});
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverData, setPopoverData] = useState({});

  /**
   * Initialize svg object
   */
  useEffect(() => {
    svg.current = d3.select(svgRef.current);
    const { width: fullWidth, height: fullHeight } = svg.current.node().parentNode.getBoundingClientRect();
    width.current = fullWidth;
    height.current = fullHeight / 2;
    svg.current
      .attr('width', width.current)
      .attr('height', height.current)
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .attr('viewBox', [0, 0, width.current, height.current]);
    if (svg.current.select('defs').empty()) {
      const defs = svg.current.append('defs');
      defs.append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', [0, 0, 20, 13])
        .attr('refX', 20)
        .attr('refY', 6.5)
        .attr('markerWidth', 6.5)
        .attr('markerHeight', 25)
        .attr('orient', 'auto-start-reverse')
        .append('path')
          .attr('d', d3.line()([[0, 0], [0, 13], [25, 6.5]]))
          .attr('fill', '#999');
    }
    if (svg.current.select('#nodeContainer').empty()) {
      svg.current.append('g')
        .attr('id', 'nodeContainer');
      node.current = svg.current.select('#nodeContainer').selectAll('g');
    }
    if (svg.current.select('#edgeContainer').empty()) {
      svg.current.append('g')
        .attr('id', 'edgeContainer');
      edge.current = svg.current.select('#edgeContainer').selectAll('g');
    }
  }, []);

  /**
   * Move nodes and edges one 'tick' during simulation
   */
  function ticked() {
    node.current
      .attr('transform', (d) => {
        let padding = nodeRadius;
        // 70% of node radius so a dragged node can push into the graph bounds a little
        if (d.fx !== null && d.fx !== undefined) {
          padding *= 0.5;
        }
        // assign d.x and d.y so edges know the bounded positions
        d.x = graphUtils.getBoundedValue(d.x, width.current - padding, padding);
        d.y = graphUtils.getBoundedValue(d.y, height.current - padding, padding);
        return `translate(${d.x}, ${d.y})`;
      });

    edge.current
      .select('.result_edge')
        .attr('d', (d) => {
          const {
            x1, y1, qx, qy, x2, y2,
          } = graphUtils.getCurvedEdgePos(d.source.x, d.source.y, d.target.x, d.target.y, d.numEdges, d.index, nodeRadius);
          return `M${x1},${y1}Q${qx},${qy} ${x2},${y2}`;
        });

    edge.current
      .select('.result_edge_transparent')
        .attr('d', (d) => {
          const {
            x1, y1, qx, qy, x2, y2,
          } = graphUtils.getCurvedEdgePos(d.source.x, d.source.y, d.target.x, d.target.y, d.numEdges, d.index, nodeRadius);
          // if necessary, flip transparent path so text is always right side up
          const leftNode = x1 > x2 ? `${x2},${y2}` : `${x1},${y1}`;
          const rightNode = x1 > x2 ? `${x1},${y1}` : `${x2},${y2}`;
          return `M${leftNode}Q${qx},${qy} ${rightNode}`;
        });
  }

  /**
   * Initialize simulation object
   */
  useEffect(() => {
    simulation.current = d3.forceSimulation()
      .force('collide', d3.forceCollide().radius(nodeRadius * 2))
      .force('link', d3.forceLink().id((d) => d.id).distance(175).strength(1))
      .on('tick', ticked);
  }, []);

  /**
   * Draw the answer graph
   */
  function drawAnswerGraph() {
    const { width: fullWidth, height: fullHeight } = svg.current.node().parentNode.getBoundingClientRect();
    width.current = fullWidth;
    height.current = fullHeight / 2;
    // set the svg size
    svg.current
      .attr('width', width.current)
      .attr('height', height.current)
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .attr('viewBox', [0, 0, width.current, height.current]);
    // set the simulation gravity middle
    simulation.current
      .force('center', d3.forceCenter(width.current / 2, height.current / 2).strength(0.5))
      .force('forceY', d3.forceY(height.current / 2).strength(0.2));

    // keep positions of kept nodes
    const oldNodes = new Map(node.current.data().map((d) => [d.id, { x: d.x, y: d.y }]));
    const sortedNodes = Object.values(answerStore.selectedResult.nodes).sort((a, b) => b.score - a.score);
    const trimmedNodes = sortedNodes.slice(0, answerStore.showNodePruneSlider ? debouncedTrimmedNodes : undefined);
    const nodes = trimmedNodes.map((d) => (
      Object.assign(oldNodes.get(d.id) || { x: Math.random() * width.current, y: Math.random() * height.current }, d)
    ));
    const trimmedNodeIds = trimmedNodes.map((n) => n.id);
    const trimmedEdges = Object.keys(answerStore.selectedResult.edges)
      .filter((key) => {
        const e = answerStore.selectedResult.edges[key];
        return trimmedNodeIds.includes(e.source) && trimmedNodeIds.includes(e.target);
      })
      .map((key) => ({
        ...answerStore.selectedResult.edges[key],
        attributes: answerStore.resultJSON.knowledge_graph.edges[key].attributes,
        sources: answerStore.resultJSON.knowledge_graph.edges[key].sources,
      }));
    // this is weird, but stops the simulation from throwing a
    // `d3 cannot create property 'vx' on string` error when trying to move edges
    const edges = trimmedEdges.map((d) => ({ ...d }));
    simulation.current.nodes(nodes);
    simulation.current.force('link').links(edges);

    node.current = node.current.data(nodes, (d) => d.id)
      .join(
        (enter) => enter
          .append('g')
            .attr('class', 'result_node')
            .call(dragUtils.dragNode(simulation.current))
            .call((n) => n.append('circle')
              .attr('r', nodeRadius)
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
              .attr('class', 'result_node_label')
              .style('pointer-events', 'none')
              .attr('text-anchor', 'middle')
              .style('font-weight', 600)
              .attr('alignment-baseline', 'middle')
              .text((d) => d.name)
              .each(graphUtils.ellipsisOverflow)),
        (update) => update,
        (exit) => exit
          .transition()
          .ease(d3.easeCircle)
          .duration(1000)
          .attr('transform', (d) => `translate(${d.x},-40)`)
          .call((e) => e.select('circle')
            .attr('fill', 'red'))
          .remove(),
      );

    const edgesWithCurves = edgeUtils.addEdgeCurveProperties(edges);
    edge.current = edge.current.data(edgesWithCurves, (d) => d.id)
      .join(
        (enter) => enter
          .append('g')
            .call((e) => e.append('path')
              .attr('stroke', 'transparent')
              .attr('fill', 'none')
              .attr('stroke-width', 10)
              .attr('class', 'result_edge_transparent')
              .attr('id', (d) => `result_explorer_edge${d.id}`)
              .call(() => e.append('text')
                .attr('stroke', 'none')
                .attr('class', 'edgeText')
                .attr('pointer-events', 'none')
                .style('text-anchor', 'middle')
                .attr('dy', (d) => -d.strokeWidth)
                .append('textPath')
                  .attr('pointer-events', 'none')
                  .attr('xlink:href', (d) => `#result_explorer_edge${d.id}`)
                  .attr('startOffset', '50%')
                  .text((d) => stringUtils.displayPredicate(d.predicate)))
              .call((eLabel) => eLabel.append('title')
                .text((d) => (stringUtils.displayPredicate(d.predicate)))))
            .call((e) => e.append('path')
              .attr('stroke', 'inherit')
              .attr('fill', 'none')
              .attr('stroke-width', (d) => d.strokeWidth)
              .attr('class', 'result_edge')
              .attr('marker-end', (d) => (graphUtils.shouldShowArrow(d) ? 'url(#arrow)' : '')))
            .attr('fill', 'black')
            .attr('stroke', '#999')
            .style('transition', 'stroke 100ms ease-in-out, fill 100ms ease-in-out')
            .style('cursor', 'pointer')
            .on('mouseover', function () {
              d3.select(this)
                .attr('fill', '#239cff')
                .attr('stroke', '#239cff');
            })
            .on('mouseout', function () {
              d3.select(this)
                .attr('fill', 'black')
                .attr('stroke', '#999');
            })
            .on('click', function (e) {
              handleClickEdge(e, d3.select(this).datum());
            }),
        (update) => update
          .call((e) => e.select('title')
            .text((d) => stringUtils.displayPredicate(d.predicate)))
          .call((e) => e.select('text')
            .select('textPath')
              .text((d) => stringUtils.displayPredicate(d.predicate))),
        (exit) => exit
          .remove(),
      );

    simulation.current.alpha(1).restart();
  }

  /**
   * Grow or shrink the answer explorer
   * and then draw the graph
   */
  function resize() {
    const container = d3.select('#resultExplorer');
    const fullWidth = 50;
    if (answerStore.selectedRowId !== '') {
      // get current width
      const currentWidth = parseInt(container.style('width'), 10);
      // find the difference in width
      const widthDifference = fullWidth - (currentWidth % (fullWidth + 1)); // plus one width for already full width cases
      // calculate transition duration
      const duration = 1000 * (widthDifference / fullWidth);
      // resize explorer and then draw the graph
      container
        .transition()
        .ease(d3.easeCircle)
        .duration(duration)
        .style('width', `${fullWidth}%`)
        .style('margin-left', '10px')
        .on('end', drawAnswerGraph)
        .style('overflow-y', 'unset');
    } else {
      // hide graph
      container
        .style('overflow-y', 'auto')
        .transition()
        .ease(d3.easeCircle)
        .duration(1000)
        .style('width', '0%');
      d3.select(svgRef.current)
        .attr('width', '0');
    }
  }

  const handleClickEdge = (event, data) => {
    setPopoverPosition({ x: event.clientX, y: event.clientY });

    setPopoverData(data);
    setPopoverOpen('edge');
  };

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
    });
    setPopoverOpen('node');
  };

  useEffect(() => {
    resize();
  }, [
    answerStore.selectedResult,
    answerStore.selectedRowId,
    debouncedTrimmedNodes,
    colorMap,
  ]);

  return (
    <Paper
      id="resultExplorer"
      elevation={3}
    >
      <h5 className="cardLabel">Answer Explorer</h5>
      { Boolean(answerStore.showNodePruneSlider) && (
        <Box width={200} id="nodeNumSlider">
          <Slider
            value={numTrimmedNodes}
            valueLabelDisplay="auto"
            min={answerStore.numQgNodes}
            max={answerStore.selectedResult.nodes ? (
              Object.keys(answerStore.selectedResult.nodes).length
            ) : (
              answerStore.numQgNodes
            )}
            onChange={(e, v) => setNumTrimmedNodes(v)}
          />
        </Box>
      )}
      <svg ref={svgRef} />
      {answerStore.metaData && (
        <ResultMetaData
          metaData={answerStore.metaData}
          result={answerStore.resultJSON}
        />
      )}

      <Popover
        open={popoverOpen === 'edge'}
        onClose={() => setPopoverOpen(null)}
        anchorPosition={{ top: popoverPosition.y, left: popoverPosition.x }}
        above
      >
        <AttributesTable attributes={popoverData.attributes} sources={popoverData.sources} />
      </Popover>

      <Popover
        open={popoverOpen === 'node'}
        onClose={() => setPopoverOpen(null)}
        anchorPosition={{ top: popoverPosition.y, left: popoverPosition.x }}
        above
      >
        <NodeAttributesTable nodeData={popoverData} />
      </Popover>
    </Paper>
  );
}
