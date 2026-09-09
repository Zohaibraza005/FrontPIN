import { apiCall } from "./api";

export interface BiometricDevice {
  id: number;
  name: string;
  brand: "HIKVISION" | "ZKTECO";
  ipAddress: string;
  port: number;
  username?: string;
  password?: string;
  companyId?: number;
  status: "ONLINE" | "OFFLINE";
  lastSyncedAt?: string;
  createdAt: string;
}

export const deviceService = {
  getDevices: async () => {
    return await apiCall("/devices", { method: "GET" });
  },

  addDevice: async (data: Partial<BiometricDevice>) => {
    return await apiCall("/devices", {
      method: "POST",
      body: data as any,
    });
  },

  updateDevice: async (id: number, data: Partial<BiometricDevice>) => {
    return await apiCall(`/devices/${id}`, {
      method: "PUT",
      body: data as any,
    });
  },

  deleteDevice: async (id: number) => {
    return await apiCall(`/devices/${id}`, { method: "DELETE" });
  },

  testConnection: async (id: number) => {
    return await apiCall(`/devices/${id}/test`, { method: "POST" });
  },

  syncLogs: async (id: number) => {
    return await apiCall(`/devices/${id}/sync`, { method: "POST" });
  },
};
