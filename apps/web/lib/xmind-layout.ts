import type { XmindSheet, XmindTopic } from "@parsy/file-parser";

export interface PositionedTopic { topic: XmindTopic; x: number; y: number; parentId?: string; childCount: number }
export interface MindMapLayout { nodes: PositionedTopic[]; width: number; height: number }

const NODE_WIDTH = 220;
const NODE_HEIGHT = 62;
const COLUMN_GAP = 90;
const ROW_GAP = 30;
const PADDING = 48;

export function layoutMindMap(root: XmindTopic, collapsed: ReadonlySet<string>): MindMapLayout {
  const nodes: PositionedTopic[] = [];
  let row = 0;
  let maxDepth = 0;

  function visit(topic: XmindTopic, depth: number, parentId?: string): number {
    maxDepth = Math.max(maxDepth, depth);
    const visibleChildren = collapsed.has(topic.id) ? [] : topic.children;
    const childYs = visibleChildren.map((child) => visit(child, depth + 1, topic.id));
    const y = childYs.length ? (childYs[0] + childYs[childYs.length - 1]) / 2 : PADDING + row++ * (NODE_HEIGHT + ROW_GAP);
    nodes.push({ topic, x: PADDING + depth * (NODE_WIDTH + COLUMN_GAP), y, parentId, childCount: topic.children.length });
    return y;
  }

  visit(root, 0);
  return {
    nodes,
    width: PADDING * 2 + (maxDepth + 1) * NODE_WIDTH + maxDepth * COLUMN_GAP,
    height: PADDING * 2 + Math.max(1, row) * NODE_HEIGHT + Math.max(0, row - 1) * ROW_GAP,
  };
}

export function layoutXmindSheet(sheet: XmindSheet, collapsed: ReadonlySet<string>): MindMapLayout {
  const maps = [sheet.root, ...sheet.floating].map((topic) => layoutMindMap(topic, collapsed));
  let offsetY = 0;
  const nodes = maps.flatMap((map) => {
    const positioned = map.nodes.map((node) => ({ ...node, y: node.y + offsetY }));
    offsetY += map.height + 30;
    return positioned;
  });
  return { nodes, width: Math.max(...maps.map((map) => map.width)), height: offsetY - 30 };
}
