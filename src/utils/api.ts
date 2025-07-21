// src/lib/axios.ts
import axios from "axios";

const api = axios.create({
  baseURL: "https://687db3f1918b642243327845.mockapi.io/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
