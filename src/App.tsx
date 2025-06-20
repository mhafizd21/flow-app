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
  type NodeChange,
  applyNodeChanges,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  PlusIcon,
  FileIcon,
  DownloadIcon,
  UploadIcon,
} from "@radix-ui/react-icons";
import type { CustomNodeData, FlowData } from "./interfaces";
import Toast from "./Components/Toast";
import CustomNodes from "./Components/CustomNodes";
import PopupDetail from "./Components/PopupDetail/PopupDetail";

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

const initialId = 1;

const FlowCanvas = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const nodeIdCounter = useRef(initialId);
  const edgeIdCounter = useRef(initialId);

  const store = useStoreApi();

  const { setViewport } = useReactFlow();

  const [nodes, setNodes] = useNodesState<Node<CustomNodeData>>(
    [] as Node<CustomNodeData>[]
  );
  const [edges, setEdges, onEdgeChanges] = useEdgesState([] as Edge[]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const getNewId = () => `n${nodeIdCounter.current++}`;
  const getEdgeId = () => `e${edgeIdCounter.current++}`;

  const onNodesChange = (changesNode: NodeChange[]) => {
    setNodes((node) => {
      const updatedNodes = applyNodeChanges(
        changesNode,
        node
      ) as Node<CustomNodeData>[];

      const deletedNodeIds = changesNode
        .filter((node) => node.type === "remove")
        .map((node) => node.id);

      if (deletedNodeIds.length > 0) {
        setEdges((edge) => {
          return edge.filter((e) => {
            return (
              !deletedNodeIds.includes(e.source) &&
              !deletedNodeIds.includes(e.target)
            )})
        });

        const maxNodeId = updatedNodes.reduce((max, node) => {
          const num = Number(node.id?.replace("n", ""));
          return isNaN(num) ? max : Math.max(max, num);
        }, 0);
        nodeIdCounter.current = maxNodeId + 1;
      }

      return updatedNodes;
    });
  };

  const updateCounters = (nodes: Node[], edges: Edge[]) => {
    const defaultId = 0;
    const maxNodeId = Math.max(
      defaultId,
      ...nodes.map((node) => {
        const nodId = Number(node.id.replace("n", ""));
        return isNaN(nodId) ? 0 : nodId;
      })
    );
    nodeIdCounter.current = maxNodeId + 1;

    const maxEdgeId = Math.max(
      defaultId,
      ...edges.map((edge) => {
        const edgeId = Number(edge.id?.replace("e", "") || "0");
        return isNaN(edgeId) ? 0 : edgeId;
      })
    );
    edgeIdCounter.current = maxEdgeId + 1;
  };

  const showToast = (message: string) => {
    setToastMsg(message);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleNewCanvas = () => {
    setNodes([]);
    setEdges([]);
    setViewport({ x: 0, y: 0, zoom: 1 });

    nodeIdCounter.current = initialId;
    edgeIdCounter.current = initialId;

    showToast("New workspace created");
  };

  useEffect(() => {
    const savedFlow = localStorage.getItem("flow-management-save-data");
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
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const { transform } = store.getState();
      localStorage.setItem(
        "flow-management-save-data",
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

  const onConnect = (connection: Connection) => {
    setEdges((item) =>
      addEdge(
        {
          ...connection,
          id: getEdgeId(),
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        },
        item
      ),
    );
  }

  const onReconnect = (oldEdge: Edge, newConn: Connection) =>
    setEdges((eds) => reconnectEdge(oldEdge, newConn, eds));

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const code = event.dataTransfer.getData("app-reactflow");
      if (!code) return;

      const bounds = wrapperRef.current?.getBoundingClientRect();
      if (!bounds) return;

      const { transform } = store.getState();
      const position = {
        x: (event.clientX - bounds.left - transform[0]) / transform[2],
        y: (event.clientY - bounds.top - transform[1]) / transform[2],
      };

      const selectedTemplate = NODE_LIST.find((node) => node.code === code);
      if (!selectedTemplate) return;

      const newNode: Node<CustomNodeData> = {
        id: getNewId(),
        type: "custom",
        position,
        data: {
          ...selectedTemplate,
        },
      };

      setNodes((node) => [...node, newNode]);
    },
    [store]
  );

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNodeId(node.id);
    setShowRightSidebar(true);
  };

  const onPaneClick = () => {
    setSelectedNodeId(null);
    setShowRightSidebar(false);
  };

  const handleExport = useCallback(() => {
    const { nodes, edges, transform } = store.getState();
    const blob = new Blob([
      JSON.stringify(
        {
          nodes,
          edges,
          viewport: {
            x: transform[0],
            y: transform[1],
            zoom: transform[2],
          },
        }, null, 2
      )],
    { type: "application/json" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "flow-management.json";
    a.click();
  
    URL.revokeObjectURL(url);
    showToast("Workspace exported");

  }, [store]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const flowData: FlowData = JSON.parse(String(event.target?.result));
        setNodes(flowData.nodes);
        setEdges(flowData.edges);
        setViewport(flowData.viewport);
        updateCounters(flowData.nodes, flowData.edges);
        setShowRightSidebar(false);
        showToast("Workspace imported");
      } catch (err) {
        console.error("Import error:", err);
        showToast("Gagal Import");
      }
    };
    reader.readAsText(file);
  };

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? {} as Node<CustomNodeData>,
    [selectedNodeId, nodes]
  );

  const connectedNodes = useMemo(() => {
    if (!selectedNodeId) {
      return { from: [], to: [] }
    };

    const getNodeLabelById = (id: string) =>
      nodes.find((node) => node.id === id)?.data?.label || id;

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
    <div className="flex bg-gray-50 h-screen overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-56 flex flex-col bg-white p-4 border-r border-gray-200 h-full">
        <div>
          <h1 className="text-lg font-semibold mb-4 text-gray-800">
            Flow Management
          </h1>

          <button
            onClick={handleNewCanvas}
            className="w-full bg-amber-700  text-white flex items-center justify-center gap-2 py-2 px-3 rounded mb-4 hover:bg-amber-800 cursor-pointer"
          >
            <PlusIcon 
              className="size-4"
            />
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
                  e.dataTransfer.setData("app-reactflow", node.code)
                }
                className=" hover:bg-gray-50 cursor-move p-3 rounded border border-gray-200 flex flex-col items-center"
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
            onClick={() => {
              if (localStorage.getItem("react-flow-data")) {
                showToast("Workspace already saved")
              }
            }}
            className="w-full flex items-center py-2 gap-2 bg-green-600 hover:bg-green-700 justify-center  px-3 rounded  text-white cursor-pointer"
          >
            <FileIcon className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={handleExport}
            className="w-full rounded border border-green-600 flex items-center gap-2 justify-center  py-2 px-3 text-green-600 hover:bg-green-50 cursor-pointer"
          >
            <DownloadIcon className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full rounded border border-green-600 flex items-center gap-2 justify-center  py-2 px-3 text-green-600 hover:bg-green-50 cursor-pointer"
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
          nodeTypes={{ custom: CustomNodes }}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* Right popup component */}
      <PopupDetail
        connectedNodes={connectedNodes}
        open={showRightSidebar}
        onClose={() => setShowRightSidebar(false)}
        selectedNode={selectedNode}
      />

      {toastMsg && (
        <Toast message={toastMsg} onClose={() => setToastMsg("")} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
