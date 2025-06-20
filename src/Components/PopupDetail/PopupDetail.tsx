import { Cross2Icon } from '@radix-ui/react-icons'
import clsx from "clsx";
import type { Node } from '@xyflow/react';
import type { CustomNodeData } from '../../interfaces';

interface IPopupDetail {
  open: boolean;
  onClose: () => void;
  selectedNode: Node<CustomNodeData>;
  connectedNodes: {
    from: string[];
    to: string[];
  }
}

const PopupDetail = ({
  open,
  onClose,
  selectedNode,
  connectedNodes,
}: IPopupDetail) => (
  <div
    className={clsx("fixed right-0 top-0 h-full w-64 p-4 bg-white border-l border-gray-200 overflow-y-auto transition-all duration-300 ease-in-out transform shadow-lg z-10", open ? "translate-x-0" : "translate-x-full")}
  >
    <button
      onClick={onClose}
      className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 cursor-pointer"
    >
      <Cross2Icon className="size-4" />
    </button>

    <h2 className="text-lg font-semibold mb-4 text-gray-800">Details</h2>

    <div className="mb-4">
      {selectedNode.data ? (
        <div className="space-y-3 text-sm text-gray-700">
          <img
            src={selectedNode.data?.image}
            alt={selectedNode.data?.label}
            className="w-full h-full object-cover rounded-md"
          />
          <div>
            <h3 className="font-semibold text-gray-800 text-base">
              {selectedNode.data?.label}
            </h3>
            <p className="text-gray-600">{selectedNode.data?.description}</p>
          </div>
          <div className="text-xs text-gray-400">
            Kode:
            {" "}
            {selectedNode.data?.code}
          </div>
          <div className="text-xs text-gray-400">ID Node: {selectedNode?.id}</div>
        </div>
      ) : "Pilih salah satu node"}
    </div>

    <div>
      <h2 className="font-medium text-gray-900 mb-2">
        Relasi
      </h2>
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-900">
            Terhubung ke:
          </p>
          {connectedNodes.from?.length ? (
            <ul className="ml-4 list-disc text-sm text-gray-600">
              {connectedNodes.from.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="ml-4 text-sm text-gray-400 italic">Tidak ada</p>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            Terhubung dari:
          </p>
          {connectedNodes.to?.length ? (
            <ul className="ml-4 list-disc text-sm text-gray-600">
              {connectedNodes.to.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="ml-4 text-sm text-gray-400 italic">Tidak ada</p>
          )}
        </div>
      </div>
    </div>
  </div>
)

export default PopupDetail