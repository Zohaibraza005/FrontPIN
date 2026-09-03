import { api } from "./api";

export interface BiometricDevice {
  id: number;
  name: string;
  brand: "HIKVISION" | "ZKTECO";
  ipAddress: string;
  port: number;
  username?: string;
  password?: string;
  status: "ONLINE" | "OFFLINE";
  lastSyncedAt?: string;
  createdAt: string;
}

export const deviceService = {
  getDevices: async () => {
    const res = await api.get("/devices");
    return res.data;
  },

  addDevice: async (data: Partial<BiometricDevice>) => {
    const res = await api.post("/devices", data);
    return res.data;
  },

  updateDevice: async (id: number, data: Partial<BiometricDevice>) => {
    const res = await api.put(`/devices/${id}`, data);
    return res.data;
  },

  deleteDevice: async (id: number) => {
    const res = await api.delete(`/devices/${id}`);
    return res.data;
  },

  testConnection: async (id: number) => {
    const res = await api.post(`/devices/${id}/test`);
    return res.data;
  },

  syncLogs: async (id: number) => {
    const res = await api.post(`/devices/${id}/sync`);
    return res.data;
  },
};
