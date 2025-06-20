import type { Edge, Node } from "@xyflow/react";

export type CustomNodeData = {
  label: string;
  description: string;
  image: string;
  code: string;
};

export type FlowData = {
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
};