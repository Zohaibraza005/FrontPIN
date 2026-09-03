// AttendanceDashboard.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { MapPin, Users, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { attendanceAPI, locationAPI } from '../services/api';

/**
 * Formats date/time to: "22 Feb 2026 01:00 AM"
 */
export function formatCheckInOutTime(input: string | number | Date | null | undefined, fallback = '—'): string {
  if (!input) return fallback;

  let date: Date;

  if (input instanceof Date) {
    date = input;
  } else if (typeof input === 'number') {
    date = new Date(input);
  } else if (typeof input === 'string') {
    const cleaned = input.trim();
    date = new Date(cleaned);
    if (isNaN(date.getTime())) {
      const spaceToT = cleaned.replace(/^(\d{4}-\d{2}-\d{2})\s/, '$1T');
      date = new Date(spaceToT);
    }
  } else {
    return fallback;
  }

  if (isNaN(date.getTime())) return fallback;

  const day = date.getDate().toString().padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${day} ${month} ${year} ${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface Employee {
  id: number | string;
  name: string;
  status: 'present' | 'absent' | 'on_leave';
  locationId?: string;
  lat?: number;
  lng?: number;
  checkIn?: string;
  checkOut?: string;
}

interface Location {
  id: string;
  name: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────────────────────────────────────

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' } as const;
const DEFAULT_CENTER = { lat: 24.8607, lng: 67.0011 }; // Karachi
const DEFAULT_ZOOM = 11;

const MAP_OPTIONS = {
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  gestureHandling: 'greedy',
} as const;

// Dummy locations — replace with real API fetch


// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

const AttendanceDashboard: React.FC = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyAfyx885bELbQBM6rfQoWCyKG-LFe7AN74',
    libraries: ['places'],
  });

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations,setLocations] = useState<Location[]>([]); // TODO: fetch real locations
  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => localStorage.getItem("selectedLocation") || 'all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleLocationEvent = (e: any) => {
      const loc = e.detail || localStorage.getItem("selectedLocation") || 'all';
      setSelectedLocationId(loc);
    };
    window.addEventListener("location-changed", handleLocationEvent);
    return () => {
      window.removeEventListener("location-changed", handleLocationEvent);
    };
  }, []);

  const mapRef = useRef<google.maps.Map | null>(null);

  // Fetch attendance
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch locations first
        const locRes = await locationAPI.getLocations();
        if (locRes?.data) {
          setLocations(locRes.data);
        }

        // Then fetch attendance
        const dashRes = await attendanceAPI.getAdminDashboard(
          selectedLocationId === 'all' ? undefined : selectedLocationId
        );

        if (dashRes?.success) {
          const combined = [
            ...(dashRes.data?.present || []),
            ...(dashRes.data?.absent || []),
            ...(dashRes.data?.onLeave || []),
          ].filter((e: any) => e.role !== 'ADMIN' && e.role !== 'admin');
          setEmployees(combined);
        } else {
          toast.error('Invalid response from server');
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedLocationId]);

  // Auto-fit map when employees or load state changes
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    const presentWithCoords = employees.filter(
      (e) => e.status === 'present' && typeof e.lat === 'number' && typeof e.lng === 'number'
    );

    if (presentWithCoords.length === 0) {
      mapRef.current.setCenter(DEFAULT_CENTER);
      mapRef.current.setZoom(DEFAULT_ZOOM);
      return;
    }

    // Give map time to render properly (important in grid/responsive layouts)
    setTimeout(() => {
      const bounds = new google.maps.LatLngBounds();

      presentWithCoords.forEach((emp) => {
        bounds.extend({ lat: emp.lat!, lng: emp.lng! });
      });

      if (presentWithCoords.length === 1) {
        // Single marker: center + fixed zoom (fitBounds ignores padding)
        mapRef.current!.setCenter(bounds.getCenter());
        mapRef.current!.setZoom(15.8); // nice street-level view
      } else {
        // Multiple: fit with padding
        mapRef.current!.fitBounds(bounds, {
          top: 80,
          bottom: 120,
          left: 60,
          right: 60,
        });
      }
    }, 400); // 400ms delay helps a lot with initial render / size issues
  }, [employees, isLoaded, selectedLocationId]); // added selectedLocationId

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // Optional: trigger initial fit after load
  }, []);

  const handleEmployeeCardClick = useCallback((emp: Employee) => {
    if (!emp.lat || !emp.lng || !mapRef.current) return;
    mapRef.current.panTo({ lat: emp.lat, lng: emp.lng });
    mapRef.current.setZoom(16.5);
    setSelectedEmployee(emp);
  }, []);

  const handleMarkerClick = useCallback((emp: Employee) => {
    setSelectedEmployee(emp);
  }, []);

  const closeInfoWindow = useCallback(() => {
    setSelectedEmployee(null);
  }, []);

  const presentEmployees = useMemo(
    () => employees.filter((e) => e.status === 'present'),
    [employees]
  );

  const absentEmployees = useMemo(
    () => employees.filter((e) => e.status === 'absent'),
    [employees]
  );

  const onLeaveEmployees = useMemo(
    () => employees.filter((e) => e.status === 'on_leave'),
    [employees]
  );

  if (loadError) {
    return (
      <div className="flex h-[70vh] items-center justify-center gap-3 text-red-600">
        <AlertCircle className="h-6 w-6" />
        <p>Google Maps failed to load. Check your API key / billing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Attendance Dashboard</h1>

        <div className="flex items-center gap-3">
          <Label htmlFor="location-filter" className="whitespace-nowrap">
            Location
          </Label>
          <Select 
            value={selectedLocationId} 
            onValueChange={(val) => {
              setSelectedLocationId(val);
              localStorage.setItem("selectedLocation", val);
              window.dispatchEvent(new CustomEvent("location-changed", { detail: val }));
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-140px)]">
        {/* Employee Lists */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
          <Tabs defaultValue="present" className="flex-1 flex flex-col">
            <div className="border-b px-5 py-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="present">Present</TabsTrigger>
                <TabsTrigger value="absent">Absent</TabsTrigger>
                <TabsTrigger value="on_leave">On Leave</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  <TabsContent value="present" className="mt-0">
                    {presentEmployees.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-500 py-12">
                        No present employees in this location
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {presentEmployees.map((emp) => (
                          <Card
                            key={emp.id}
                            className="cursor-pointer hover:shadow-md transition-all gap-1 hover:border-blue-300"
                            onClick={() => handleEmployeeCardClick(emp)}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between gap-3">
                                <CardTitle className="text-base font-semibold">{emp.name}</CardTitle>
                                <Badge>Present</Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0 text-sm text-muted-foreground space-y-1">
                              <p>Check-in: {formatCheckInOutTime(emp.checkIn)}</p>
                              <p>Check-out: {formatCheckInOutTime(emp.checkOut)}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="absent" className="mt-0">
                    {absentEmployees.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-500 py-12">
                        No absent employees
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {absentEmployees.map((emp) => (
                          <Card key={emp.id} className="hover:shadow-sm transition-shadow">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between gap-3">
                                <CardTitle className="text-base font-semibold">{emp.name}</CardTitle>
                                <Badge variant="destructive">Absent</Badge>
                              </div>
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="on_leave" className="mt-0">
                    {onLeaveEmployees.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-500 py-12">
                        No employees on leave
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {onLeaveEmployees.map((emp) => (
                          <Card key={emp.id} className="hover:shadow-sm transition-shadow">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between gap-3">
                                <CardTitle className="text-base font-semibold">{emp.name}</CardTitle>
                                <Badge variant="secondary">On Leave</Badge>
                              </div>
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </div>

        {/* Map */}
        

<div className="rounded-xl border shadow-sm overflow-hidden bg-white relative h-full">
  {loading && (
    <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
    </div>
  )}

  {isLoaded ? (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      options={MAP_OPTIONS}
      onLoad={handleMapLoad}
    >
      {presentEmployees
        .filter((e) => typeof e.lat === 'number' && typeof e.lng === 'number')
        .map((emp) => (
          <Marker
            key={emp.id}
            position={{ lat: emp.lat!, lng: emp.lng! }}
            onClick={() => handleMarkerClick(emp)}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
              scaledSize: new google.maps.Size(38, 38),
            }}
          />
        ))}

      {selectedEmployee &&
        typeof selectedEmployee.lat === 'number' &&
        typeof selectedEmployee.lng === 'number' && (
          <InfoWindow
            position={{ lat: selectedEmployee.lat, lng: selectedEmployee.lng }}
            onCloseClick={closeInfoWindow}
          >
            <div className="min-w-[240px] p-2">
              <h3 className="font-semibold text-lg mb-2">{selectedEmployee.name}</h3>
              <div className="space-y-1.5 text-sm">
                <p>
                  Check-in:{' '}
                  <span className="font-medium">
                    {formatCheckInOutTime(selectedEmployee.checkIn)}
                  </span>
                </p>
                <p>
                  Check-out:{' '}
                  <span className="font-medium">
                    {formatCheckInOutTime(selectedEmployee.checkOut)}
                  </span>
                </p>
              </div>
            </div>
          </InfoWindow>
        )}
    </GoogleMap>
  ) : (
    <div className="h-full flex items-center justify-center text-gray-500">
      Loading Google Maps...
    </div>
  )}
</div>
      </div>
    </div>
  );
};

export default AttendanceDashboard;