import { Handle, Position } from "@xyflow/react";
import type { CustomNodeData } from "../../interfaces";

const CustomNodes= ({ data }: { data: CustomNodeData }) => (
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

export default CustomNodes;
