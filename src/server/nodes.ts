import type { CustomNodeData } from "../interfaces";
import api from "../utils/api";

export const getNodes = async (): Promise<CustomNodeData[]> => {
  const response = await api.get<CustomNodeData[]>("/nodes");
  return response.data;
};