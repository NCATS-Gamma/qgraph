import * as d3 from 'd3';

/**
 * Get the opposite edge end name
 * @param {string} edgeEnd - edge end, either source or target
 * @returns other edge end
 */
function getOtherEdgeEnd(edgeEnd) {
  return edgeEnd === 'target' ? 'source' : 'target';
}

/**
 * Get angle of line connecting points, in radians
 * @param {int} x1 x of first point
 * @param {int} y1 y of first point
 * @param {int} x2 x of second point
 * @param {int} y2 y of second point
 */
function getAngle(x1, y1, x2, y2) {
  const delta_x = x2 - x1;
  const delta_y = y2 - y1;
  const theta_radians = Math.atan2(delta_y, delta_x);
  return theta_radians;
}

/**
 * Calculate the x and y of both edge ends as well as the quadratic curve point
 * to make the edge curve
 * @param {int} sourceX x of source node
 * @param {int} sourceY y of source node
 * @param {int} targetX x of target node
 * @param {int} targetY y of target node
 * @param {int} numEdges number of total edges
 * @param {int} index index of edge to find its curve position
 * @param {int} nodeRadius node radius
 * @returns {obj} all the necessary points to make a curvy edge
 */
function getCurvedEdgePos(sourceX, sourceY, targetX, targetY, numEdges, index, nodeRadius) {
  const arcWidth = Math.PI / 3;
  const edgeStep = arcWidth / 5;
  // get angle between nodes
  const theta = getAngle(sourceX, sourceY, targetX, targetY);
  // get adjusted angle based on edge index
  const arc_p1 = theta + (edgeStep * index);
  const arc_p2 = theta + Math.PI - (edgeStep * index);
  // compute x's and y's
  const x1 = sourceX + Math.cos(arc_p1) * nodeRadius;
  const y1 = sourceY + Math.sin(arc_p1) * nodeRadius;
  const x2 = targetX + Math.cos(arc_p2) * nodeRadius;
  const y2 = targetY + Math.sin(arc_p2) * nodeRadius;
  const alpha = 50; // tuning param
  let l = (index * 0.1) + (index * 0.3); // num of edge
  // move first arced edges out just a smidge
  if (index === 1 || index === -1) {
    l += (index * 0.4);
  }
  const bx = ((x1 + x2) / 2);
  const by = (y1 + y2) / 2;
  const vx = x2 - x1;
  const vy = y2 - y1;

  const norm_v = Math.sqrt(vx ** 2 + vy ** 2);
  const vx_norm = vx / norm_v;
  const vy_norm = vy / norm_v;
  const vx_perp = -vy_norm;
  const vy_perp = vx_norm;
  const qx = bx + alpha * l * vx_perp;
  const qy = by + alpha * l * vy_perp;
  return {
    x1, y1, qx, qy, x2, y2,
  };
}

/**
 * Get x and y positions of shortened line end
 *
 * Given a line, we will find the new line end according
 * to the line angle and offset
 * @param {int} x1 - line start x
 * @param {int} y1 - line start y
 * @param {int} x2 - line end x
 * @param {int} y2 - line end y
 * @param {int} offset - offset for current line end
 * @returns {obj} x and y postions of new line end
 */
function getShortenedLineEnd(x1, y1, x2, y2, offset) {
  const angle = getAngle(x1, y1, x2, y2);
  const x = x1 + Math.cos(angle) * offset;
  const y = y1 + Math.sin(angle) * offset;
  return { x, y };
}

/**
 * Find bounded value within a lower and upper bound
 * @param {int} value - value to bound
 * @param {int} upperBound - upper bound of value
 * @param {int} lowerBound - lower bound of value; default: 0
 * @returns {int} bounded value
 */
function getBoundedValue(value, upperBound, lowerBound = 0) {
  return Math.max(lowerBound, Math.min(value, upperBound));
}

/**
 * Trim and add an ellipsis to the end of long node labels
 */
function ellipsisOverflow() {
  const el = d3.select(this);
  let textLength = el.node().getComputedTextLength();
  let text = el.text();
  // grab the parent g tag
  const parent = el.node().parentNode;
  // grab the corresponding circle
  const circle = d3.select(parent)
    .select('circle');
  // get circle radius
  const nodeRadius = circle.attr('r');
  const diameter = nodeRadius * 2;
  // give the text a little padding
  const targetLength = diameter * 0.9;
  while (textLength > targetLength && text.length > 0) {
    text = text.slice(0, -1);
    el.text(`${text}...`);
    textLength = el.node().getComputedTextLength();
  }
}

/**
 * Get the middle of two points
 * @param {obj} edge edge object
 * @returns {obj} the x and y of the middle of two points
 */
function getEdgeMidpoint(edge) {
  const { source, target } = edge;
  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;
  return { x: midX, y: midY };
}

/**
 * Determine if point is within a circle
 * @param {int} x x position of point
 * @param {int} y y position of point
 * @param {int} cx center x of circle
 * @param {int} cy center y of circle
 * @param {int} r radius of circle
 * @returns {bool} Is point within circle
 */
function isInside(x, y, cx, cy, r) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2;
}

/**
 * Should an edge have an arrow
 * @param {obj} edge edge object
 * @returns {str} url(#arrow) or empty string
 */
function shouldShowArrow(edge) {
  return (edge.predicates && edge.predicates.findIndex((p) => p !== 'biolink:related_to') > -1) || (edge.predicate && edge.predicate !== 'biolink:related_to');
}

/**
 * Fade a DOM element in to view
 */
function showElement() {
  d3.select(this)
    .transition()
    .duration(500)
    .style('opacity', 1);
}

/**
 * Fade a DOM element out of view
 */
function hideElement() {
  d3.select(this)
    .transition()
    .duration(1000)
    .style('opacity', 0);
}

export default {
  getOtherEdgeEnd,

  getCurvedEdgePos,
  getShortenedLineEnd,
  getBoundedValue,

  ellipsisOverflow,
  getEdgeMidpoint,

  isInside,
  shouldShowArrow,

  showElement,
  hideElement,
};
