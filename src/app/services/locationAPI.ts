import { apiCall } from "./api"; // make sure apiCall is exported from api.ts

export const locationAPI = {
  getLocations: async () => {
    return apiCall("/locations");
  },

  createLocation: async (data: {
    name: string;
    address: string;
    type: string;
    capacity?: number;
    enableGeofence?: boolean;
    latitude?: number | null;
    longitude?: number | null;
    radius?: number | null;
  }) => {
    return apiCall("/locations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
