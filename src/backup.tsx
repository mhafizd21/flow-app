import { useCallback, useRef, useState, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  useStoreApi,
  type Node,
  type Edge,
  type Connection,
  reconnectEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];
const nodeTypes = ["A", "B", "C"];

function FlowCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);
  const edgeIdCounter = useRef(0);
  const store = useStoreApi();
  const { setViewport } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showRightSidebar, setShowRightSidebar] = useState(false);

  const getId = useCallback(() => {
    let newId = `node_${idCounter.current++}`;
    while (nodes.some(n => n.id === newId)) {
      newId = `node_${idCounter.current++}`;
    }
    return newId;
  }, [nodes]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [selectedNodeId, nodes]
  );

  const connectedNodes = useMemo(() => {
    if (!selectedNodeId) return { from: [], to: [] };

    const from = edges
      .filter((e) => e.source === selectedNodeId)
      .map((e) => nodes.find((n) => n.id === e.target)?.data?.label || e.target);

    const to = edges
      .filter((e) => e.target === selectedNodeId)
      .map((e) => nodes.find((n) => n.id === e.source)?.data?.label || e.source);

    return { from, to };
  }, [selectedNodeId, nodes, edges]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `edge_${edgeIdCounter.current++}`,
            animated: true,
            style: { stroke: "#555" },
            reconnectable: true,
          },
          eds
        )
      ),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const bounds = wrapperRef.current?.getBoundingClientRect();
      if (!bounds) return;

      const { transform } = store.getState();
      const position = {
        x: (event.clientX - bounds.left - transform[0]) / transform[2],
        y: (event.clientY - bounds.top - transform[1]) / transform[2],
      };

      const newNode: Node = {
        id: getId(),
        type: "default",
        position,
        data: { label: `Node ${type}` },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, store, getId]
  );

  const handleExport = () => {
    const flow = store.getState();
    const json = JSON.stringify(
      {
        nodes: flow.nodes,
        edges: flow.edges,
        viewport: {
          x: flow.transform[0],
          y: flow.transform[1],
          zoom: flow.transform[2],
        },
      },
      null,
      2
    );

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flow.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const flowData = JSON.parse(event.target?.result as string);
        let { nodes = [], edges = [], viewport = { x: 0, y: 0, zoom: 1 } } = flowData;

        // Create ID mapping and generate new nodes
        const idMap = new Map<string, string>();
        const newNodes = nodes.map((n: Node) => {
          const newId = getId();
          idMap.set(n.id, newId);
          return { 
            ...n, 
            id: newId,
            position: n.position || { x: 0, y: 0 }
          };
        });

        // Update edges with new IDs
        const newEdges = edges.map((e: Edge) => ({
          ...e,
          id: `edge_${edgeIdCounter.current++}`,
          source: idMap.get(e.source) || e.source,
          target: idMap.get(e.target) || e.target,
          sourceHandle: e.sourceHandle || null,
          targetHandle: e.targetHandle || null
        }));

        // Find max IDs to update counters
        const maxNodeId = Math.max(...newNodes.map((n: Node) => {
          const match = n.id.match(/node_(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        }));
        const maxEdgeId = Math.max(...newEdges.map((e: Edge) => {
          const match = e.id.match(/edge_(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        }));

        idCounter.current = maxNodeId + 1;
        edgeIdCounter.current = maxEdgeId + 1;

        setNodes(newNodes);
        setEdges(newEdges);
        setViewport({
          x: viewport.x || 0,
          y: viewport.y || 0,
          zoom: viewport.zoom || 1,
        });

        setShowRightSidebar(false);
      } catch (err) {
        console.error("Import error:", err);
        alert("Failed to import flow. Please check the file format.");
      }
    };
    reader.readAsText(file);
  };

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
    setShowRightSidebar(true);
  }, []);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConn: Connection) =>
      setEdges((eds) => reconnectEdge(oldEdge, newConn, eds)),
    [setEdges]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setShowRightSidebar(false);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left sidebar */}
      <aside className="w-52 p-4 bg-gray-100 border-r overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">🧩 Drag Nodes</h2>
        {nodeTypes.map((type) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("application/reactflow", type)}
            className="cursor-move bg-white px-3 py-2 rounded shadow mb-2 hover:bg-gray-200"
          >
            Node {type}
          </div>
        ))}

        <div className="mt-6 space-y-2">
          <button
            onClick={handleExport}
            className="w-full bg-blue-600 text-white py-1 rounded hover:bg-blue-700"
          >
            Export JSON
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full bg-green-600 text-white py-1 rounded hover:bg-green-700"
          >
            Import JSON
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </aside>

      {/* Canvas */}
      <div className="flex-1" ref={wrapperRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onReconnect={onReconnect}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* Right sidebar (Node details) - Collapsible */}
      {showRightSidebar && (
        <aside className="w-64 p-4 bg-gray-50 border-l overflow-y-auto relative transition-all duration-300 ease-in-out">
          <button
            onClick={() => setShowRightSidebar(false)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200"
            aria-label="Close sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <h2 className="text-lg font-semibold mb-2">📌 Node Details</h2>
          {selectedNode ? (
            <div className="space-y-2 text-sm">
              <p><strong>ID:</strong> {selectedNode.id}</p>
              <p><strong>Label:</strong> {String(selectedNode.data?.label)}</p>
              <div>
                <strong>Connected to:</strong>
                <ul className="list-disc list-inside">
                  {connectedNodes.from?.map((target, i) => (
                    <li key={i}>{String(target || "")}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Connected from:</strong>
                <ul className="list-disc list-inside">
                  {connectedNodes.to?.map((source, i) => (
                    <li key={i}>{String(source || "")}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Click a node to see details.</p>
          )}
        </aside>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}