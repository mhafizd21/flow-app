import { useCallback, useRef, useState, useMemo, useEffect } from "react";
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
  Position,
  Handle,
  type NodeChange,
  applyNodeChanges,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Cross2Icon,
  PlusIcon,
  FileIcon,
  DownloadIcon,
  UploadIcon,
} from "@radix-ui/react-icons";

type FlowData = {
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
};

type CustomNodeData = {
  label: string;
  description: string;
  image: string;
  code: string;
};

const initialNodes: Node<CustomNodeData>[] = [];
const initialEdges: Edge[] = [];

const NODE_LIST: CustomNodeData[] = [
  {
    code: "eksplorasi",
    label: "Eksplorasi & Pengeboran",
    description: "Tahap pencarian dan pengeboran sumber minyak mentah.",
    image:
      "https://ik.imagekit.io/corazonImgKit/explorasi.png?updatedAt=1750322953264",
  },
  {
    code: "kilang",
    label: "Kilang Minyak",
    description: "Fasilitas pemrosesan minyak mentah menjadi produk jadi.",
    image:
      "https://ik.imagekit.io/corazonImgKit/kilang.png?updatedAt=1750322954013",
  },
  {
    code: "tanker",
    label: "Tanker Minyak",
    description: "Kapal tanker untuk distribusi minyak dalam jumlah besar.",
    image:
      "https://ik.imagekit.io/corazonImgKit/tanker.png?updatedAt=1750322954602",
  },
  {
    code: "truk",
    label: "Truk Tangki",
    description: "Truk untuk pengangkutan BBM dari depot ke SPBU.",
    image:
      "https://ik.imagekit.io/corazonImgKit/truk.png?updatedAt=1750322954231",
  },
  {
    code: "spbu",
    label: "SPBU",
    description: "Stasiun pengisian bahan bakar untuk konsumen akhir.",
    image:
      "https://ik.imagekit.io/corazonImgKit/spbu.png?updatedAt=1750322954510",
  },
];

// TODO: Move this component to new file

const CustomNode = ({ data }: { data: CustomNodeData }) => {
  return (
    <div className="group p-3 rounded-lg border border-gray-200 bg-white shadow-sm w-48 relative cursor-pointer">
      <Handle
        type="target"
        position={Position.Top}
        className="opacity-0 group-hover:opacity-100 transition-all duration-200"
        id="input-top"
      />

      <Handle
        type="target"
        position={Position.Left}
        className="opacity-0 group-hover:opacity-100 transition-all duration-200"
        id="input-left"
      />

      <div className="flex flex-col items-center text-center">
        <img
          src={data.image}
          alt={data.label}
          className="w-16 h-16 object-cover rounded-md mb-2"
        />
        <h3 className="font-semibold text-gray-800 text-sm">{data.label}</h3>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="opacity-0 group-hover:opacity-100 transition-all duration-200"
        id="output-right"
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className="opacity-0 group-hover:opacity-100 transition-all duration-200"
        id="output-bottom"
      />
    </div>
  );
};

const FlowCanvas = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodeIdCounter = useRef(1);
  const edgeIdCounter = useRef(1);
  const store = useStoreApi();
  const { setViewport } = useReactFlow();

  const [nodes, setNodes] = useNodesState<Node<CustomNodeData>>(initialNodes);
  const [edges, setEdges, onEdgeChanges] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "" });

  const getId = useCallback(() => `n${nodeIdCounter.current++}`, []);
  const getEdgeId = useCallback(() => `e${edgeIdCounter.current++}`, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((node) => {
        const updatedNodes = applyNodeChanges(
          changes,
          node
        ) as Node<CustomNodeData>[];

        const deletedNodeIds = changes
          .filter((c) => c.type === "remove")
          .map((c) => c.id);

        if (deletedNodeIds.length > 0) {
          setEdges((eds) =>
            eds.filter(
              (e) =>
                !deletedNodeIds.includes(e.source) &&
                !deletedNodeIds.includes(e.target)
            )
          );

          const maxNodeId = updatedNodes.reduce((max, node) => {
            const num = Number(node.id.replace("n", ""));
            return isNaN(num) ? max : Math.max(max, num);
          }, 0);
          nodeIdCounter.current = maxNodeId + 1;
        }

        return updatedNodes;
      });
    },
    [setNodes, setEdges]
  );

  const updateCounters = useCallback((nodes: Node[], edges: Edge[]) => {
    const maxNodeId = Math.max(
      0,
      ...nodes.map((n) => {
        const idNum = Number(n.id.replace("n", ""));
        return isNaN(idNum) ? 0 : idNum;
      })
    );
    nodeIdCounter.current = maxNodeId + 1;

    const maxEdgeId = Math.max(
      0,
      ...edges.map((e) => {
        const idNum = Number(e.id?.replace("e", "") || "0");
        return isNaN(idNum) ? 0 : idNum;
      })
    );
    edgeIdCounter.current = maxEdgeId + 1;
  }, []);

  const showToast = useCallback((message: string) => {
    setToast({ open: true, message });
    setTimeout(() => setToast({ open: false, message: "" }), 3000);
  }, []);

  const handleNewCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setViewport({ x: 0, y: 0, zoom: 1 });
    nodeIdCounter.current = 1;
    edgeIdCounter.current = 1;
    showToast("New workspace created");
  }, [setNodes, setEdges, setViewport, showToast]);

  useEffect(() => {
    const savedFlow = localStorage.getItem("react-flow-data");
    if (savedFlow) {
      try {
        const flowData: FlowData = JSON.parse(savedFlow);
        setNodes(flowData.nodes);
        setEdges(flowData.edges);
        setViewport(flowData.viewport);
        updateCounters(flowData.nodes, flowData.edges);
        showToast("Workspace loaded");
      } catch (err) {
        console.error("Failed to load workspace:", err);
        showToast("Failed to load workspace");
      }
    }
  }, [setNodes, setEdges, setViewport, updateCounters, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const { nodes, edges, transform } = store.getState();
      localStorage.setItem(
        "react-flow-data",
        JSON.stringify({
          nodes,
          edges,
          viewport: {
            x: transform[0],
            y: transform[1],
            zoom: transform[2],
          },
        })
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [nodes, edges, store]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: getEdgeId(),
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          },
          eds
        )
      ),
    [setEdges, getEdgeId]
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConn: Connection) =>
      setEdges((eds) => reconnectEdge(oldEdge, newConn, eds)),
    []
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const code = event.dataTransfer.getData("application/reactflow");
      if (!code) return;

      const bounds = wrapperRef.current?.getBoundingClientRect();
      if (!bounds) return;

      const { transform } = store.getState();
      const position = {
        x: (event.clientX - bounds.left - transform[0]) / transform[2],
        y: (event.clientY - bounds.top - transform[1]) / transform[2],
      };

      const selectedTemplate = NODE_LIST.find((n) => n.code === code);
      if (!selectedTemplate) return;

      const newNode: Node<CustomNodeData> = {
        id: getId(),
        type: "custom",
        position,
        data: {
          ...selectedTemplate,
        },
      };

      setNodes((node) => [...node, newNode]);
    },
    [setNodes, store, getId]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    setSelectedNodeId(node.id);
    setShowRightSidebar(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setShowRightSidebar(false);
  }, []);

  const handleExport = useCallback(() => {
    const { nodes, edges, transform } = store.getState();
    const blob = new Blob(
      [
        JSON.stringify(
          {
            nodes,
            edges,
            viewport: {
              x: transform[0],
              y: transform[1],
              zoom: transform[2],
            },
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flow-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Workspace exported");
  }, [store, showToast]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const flowData: FlowData = JSON.parse(event.target?.result as string);
          setNodes(flowData.nodes);
          setEdges(flowData.edges);
          setViewport(flowData.viewport);
          updateCounters(flowData.nodes, flowData.edges);
          setShowRightSidebar(false);
          showToast("Workspace imported");
        } catch (err) {
          console.error("Import error:", err);
          showToast("Failed to import");
        }
      };
      reader.readAsText(file);
    },
    [setNodes, setEdges, setViewport, updateCounters, showToast]
  );

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [selectedNodeId, nodes]
  );

  const nodeDetails = useMemo(() => {
    if (!selectedNode) return "Pilih salah satu node";

    return (
      <div className="space-y-3 text-sm text-gray-700">
        <img
          src={selectedNode.data.image}
          alt={selectedNode.data.label}
          className="w-full h-full object-cover rounded-md"
        />
        <div>
          <h3 className="font-semibold text-gray-800 text-base">
            {selectedNode.data.label}
          </h3>
          <p className="text-gray-600">{selectedNode.data.description}</p>
        </div>
        <div className="text-xs text-gray-400">
          Kode: {selectedNode.data.code}
        </div>
        <div className="text-xs text-gray-400">ID Node: {selectedNode.id}</div>
      </div>
    );
  }, [selectedNode]);

  const connectedNodes = useMemo(() => {
    if (!selectedNodeId) return { from: [], to: [] };

    const getNodeLabelById = (id: string) =>
      nodes.find((n) => n.id === id)?.data?.label || id;

    return {
      from: edges
        .filter((e) => e.source === selectedNodeId)
        .map((e) => getNodeLabelById(e.target)),
      to: edges
        .filter((e) => e.target === selectedNodeId)
        .map((e) => getNodeLabelById(e.source)),
    };
  }, [selectedNodeId, edges, nodes]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Left Sidebar */}
      <aside className="w-56 p-4 bg-white border-r border-gray-200 flex flex-col h-full">
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Flow Management</h2>

          <button
            onClick={handleNewCanvas}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded mb-4 bg-amber-700 hover:bg-amber-800 text-white cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            New Workspace
          </button>
        </div>

        <div className="flex-grow overflow-y-auto min-h-0 mb-6">
          <div className="space-y-4 pr-1">
            {NODE_LIST.map((node) => (
              <div
                key={node.code}
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("application/reactflow", node.code)
                }
                className="cursor-move p-3 rounded border border-gray-200 hover:bg-gray-50 flex flex-col items-center"
              >
                <img
                  src={node.image}
                  alt={node.label}
                  className="w-12 h-12 rounded-md object-cover mb-2"
                />
                <span className="text-sm font-medium text-center">
                  {node.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() =>
              localStorage.getItem("react-flow-data") && showToast("Workspace saved")
            }
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded bg-green-600 hover:bg-green-700 text-white cursor-pointer"
          >
            <FileIcon className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded border border-green-600 text-green-600 hover:bg-green-50 cursor-pointer"
          >
            <DownloadIcon className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded border border-green-600 text-green-600 hover:bg-green-50 cursor-pointer"
          >
            <UploadIcon className="w-4 h-4" />
            Import
            <input
              ref={inputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </button>
        </div>
      </aside>

      {/* Main Canvas */}
      <div className="flex-1 relative" ref={wrapperRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgeChanges}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={{ custom: CustomNode }}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* Right Sidebar */}
      <aside
        className={`
        fixed right-0 top-0 h-full w-64 p-4 bg-white border-l border-gray-200 overflow-y-auto
        transition-all duration-300 ease-in-out transform
        ${showRightSidebar ? "translate-x-0" : "translate-x-full"}
        shadow-lg z-10
      `}
      >
        <button
          onClick={() => setShowRightSidebar(false)}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 cursor-pointer"
        >
          <Cross2Icon className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-semibold mb-4 text-gray-800">Details</h2>

        <div className="mb-4">{nodeDetails}</div>

        <div>
          <h3 className="font-medium text-gray-900 mb-2">Relasi:</h3>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Terhubung ke:
              </h4>
              {connectedNodes.from.length > 0 ? (
                <ul className="ml-4 list-disc text-sm text-gray-600">
                  {connectedNodes.from.map((target, i) => (
                    <li key={i}>{target}</li>
                  ))}
                </ul>
              ) : (
                <p className="ml-4 text-sm text-gray-400 italic">Tidak ada</p>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Terhubung dari:
              </h4>
              {connectedNodes.to.length > 0 ? (
                <ul className="ml-4 list-disc text-sm text-gray-600">
                  {connectedNodes.to.map((source, i) => (
                    <li key={i}>{source}</li>
                  ))}
                </ul>
              ) : (
                <p className="ml-4 text-sm text-gray-400 italic">Tidak ada</p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Toast Notification */}
      {toast.open && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-200 text-green-900 px-4 py-3 rounded shadow-lg flex items-center animate-fade-in">
          <span>{toast.message}</span>
          <button
            onClick={() => setToast({ open: false, message: "" })}
            className="ml-4 p-1 rounded-full hover:bg-green-300"
          >
            <Cross2Icon className="w-3 h-3" />
          </button>
        </div>
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
