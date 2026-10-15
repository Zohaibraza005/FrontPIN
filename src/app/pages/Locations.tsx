import React, { useState, useEffect, useRef } from 'react';
import {
  GoogleMap,
  Marker,
  Circle,
  useJsApiLoader,
} from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { MapPin, Plus, Edit, Users, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL, locationAPI } from '../services/api';
import { Checkbox } from '../components/ui/checkbox';
const ALL_TIMEZONES = Intl.supportedValuesOf('timeZone');
const mapStyles = {
  width: '100%',
  height: '100%',
};

const containerStyle = {
  position: 'relative' as const,
  width: '100%',
  height: '250px', // adjust as needed
};

interface LocationForm {
  name: string;
  type: string;
  address: string;
  capacity: number;
  enableGeofence: boolean;
  latitude: number | null;
  longitude: number | null;
  radius: number;
  timezone: string; // ✅ ADD THIS

}

interface Props {
  google: any; // from GoogleApiWrapper
}

const Locations: React.FC<Props> = ({ google }) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyAfyx885bELbQBM6rfQoWCyKG-LFe7AN74",
    libraries: ["places"],
  });
  const [form, setForm] = useState<LocationForm>({
    name: '',
    type: '',
    address: '',
    capacity: 0,
    enableGeofence: false,
    latitude: null,
    longitude: null,
    radius: 0,
    timezone: '', // ✅ ADD
  });

  const [locations, setLocations] = useState<any[]>([]);
  const [newLocationOpen, setNewLocationOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<any | null>(null);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
const autocompleteRef = useRef<any>(null);
const [suggestions, setSuggestions] = useState<any[]>([]);
const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await locationAPI.getLocations();
      setLocations(res.data);
    } catch (err) {
      toast.error('Failed to load locations');
    }
  };

  const handleSave = async () => {
    try {
      if (isEditMode && editLocation) {
        await locationAPI.updateLocation(editLocation.id, form);
        toast.success('Location updated!');
      } else {
        await locationAPI.createLocation(form);
        toast.success('Location added!');
      }
      setNewLocationOpen(false);
      setIsEditMode(false);
      setEditLocation(null);
      setForm({
        name: '',
        type: '',
        address: '',
        capacity: 0,
        enableGeofence: false,
        latitude: null,
        longitude: null,
        radius: 0,
        timezone: '', // ✅ ADD


      });
      fetchLocations();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    }
  };

  const handleDelete = async () => {
    if (!editLocation?.id) return;
    try {
      await locationAPI.deleteLocation(editLocation.id);
      toast.success('Location deleted successfully!');
      setNewLocationOpen(false);
      setIsEditMode(false);
      setEditLocation(null);
      fetchLocations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const confirmDeleteLocation = (location: any) => {
    setLocationToDelete(location);
    setDeleteDialogOpen(true);
  };

  const handleExecuteDelete = async () => {
    if (!locationToDelete?.id) return;
    try {
      await locationAPI.deleteLocation(locationToDelete.id);
      toast.success(`Location "${locationToDelete.name}" deleted successfully!`);
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
      fetchLocations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete location');
    }
  };

  const openEdit = (location: any) => {
    setForm({
      name: location.name || '',
      type: location.type || '',
      address: location.address || '',
      capacity: location.capacity || 0,
      enableGeofence: !!location.enableGeofence,
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
      radius: location.radius || 0,
      timezone: location.timezone || '',
    });
    setEditLocation(location);
    setIsEditMode(true);
    setNewLocationOpen(true);
  };
  const fetchPlaceSuggestions = async (input: string) => {
    try {
      const response = await fetch(
        API_BASE_URL+`/locations/autocomplete?input=${input}`,{method:'GET'}
      );
  
      const data = await response.json();
  
      setSuggestions(data.predictions || []);
  
    } catch (error) {
      console.error(error);
    }
  };
  const handleSelectSuggestion = async (place: any) => {
    try {
      setSuggestions([]);
  
      const { Place } = await google.maps.importLibrary("places");
  
      const placeObj = new Place({
        id: place.place_id,
        requestedLanguage: "en",
      });
  
      await placeObj.fetchFields({
        fields: ["location", "formattedAddress"],
      });
  
      if (!placeObj.location) return;
  
      setForm((prev) => ({
        ...prev,
        address: placeObj.formattedAddress,
        latitude: placeObj.location.lat(),
        longitude: placeObj.location.lng(),
      }));
  
    } catch (error) {
      console.error(error);
    }
  };
  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Location Management</h2>
          <p className="text-gray-600">Manage company locations and offices</p>
        </div>
        <Dialog open={newLocationOpen} onOpenChange={setNewLocationOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit Location' : 'Add New Location'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Location Name</Label>
                <Input
                  placeholder="Headquarters"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                      placeholder="Search address..."
                      value={form.address}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm({ ...form, address: value });

                        if (value.length > 2) {
                          fetchPlaceSuggestions(value);
                        } else {
                          setSuggestions([]);
                        }
                      }}
                    />
                    {suggestions.length > 0 && (
                          <div className="border rounded-md bg-white shadow-md max-h-60 overflow-y-auto">
                            {suggestions.map((item) => (
                              <div
                                key={item.place_id}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                onClick={() => handleSelectSuggestion(item)}
                              >
                                {item.description}
                              </div>
                            ))}
                          </div>
                        )}
              </div>
              <div className="space-y-2">
  <Label>Timezone</Label>
  <Select
    value={form.timezone}
    onValueChange={(val) => setForm({ ...form, timezone: val })}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select Timezone" />
    </SelectTrigger>
    <SelectContent className="max-h-60">
      {ALL_TIMEZONES.map((tz) => (
        <SelectItem key={tz} value={tz}>
          {tz}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(val) => setForm({ ...form, type: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) || 0 })}
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  
                  id="geofence"
                  value={form.enableGeofence}
                  onCheckedChange={(e) => setForm({ ...form, enableGeofence: e })}
                  
                />
                <Label htmlFor="geofence">Enable Geofencing</Label>
              </div>
           

              {form.enableGeofence && isLoaded && (
  <>
    <div style={containerStyle} className="rounded-lg overflow-hidden border">
      <GoogleMap
        mapContainerStyle={mapStyles}
        zoom={form.latitude ? 15 : 13}
        center={
          form.latitude && form.longitude
            ? { lat: form.latitude, lng: form.longitude }
            : { lat: 24.8607, lng: 67.0011 }
        }
        onClick={(e) => {
          if (!e.latLng) return;
          setForm({
            ...form,
            latitude: e.latLng.lat(),
            longitude: e.latLng.lng(),
          });
        }}
      >
        {form.latitude && form.longitude && (
          <>
            <Marker
              position={{ lat: form.latitude, lng: form.longitude }}
            />

            <Circle
              center={{ lat: form.latitude, lng: form.longitude }}
              radius={form.radius || 0}
              options={{
                strokeColor: "#2563eb",
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: "#2563eb",
                fillOpacity: 0.3,
              }}
            />
          </>
        )}
      </GoogleMap>
    </div>

    <div className="space-y-2">
      <Label>Geofence Radius (meters)</Label>
      <Input
        type="number"
        value={form.radius}
        onChange={(e) =>
          setForm({ ...form, radius: Number(e.target.value) || 0 })
        }
      />
    </div>
  </>
)}

              <div className="flex gap-3 justify-end pt-4">
                {isEditMode && (
                  <Button variant="destructive" onClick={handleDelete}>
                    Delete
                  </Button>
                )}
                <Button variant="outline" onClick={() => setNewLocationOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {isEditMode ? 'Save Changes' : 'Add Location'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {locations.map((location) => (
          <Card key={location.id} className="hover:shadow-lg transition-shadow border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <MapPin className="size-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">{location.name}</CardTitle>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {location.type || 'Office'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {location.active ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-600">
                <p className="flex items-start gap-2">
                  <MapPin className="size-4 mt-0.5 shrink-0 text-gray-400" />
                  <span className="line-clamp-2">{location.address || 'No address specified'}</span>
                </p>
              </div>

              {/* Total Employees & Capacity */}
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Users className="size-4 text-blue-600" />
                  <div>
                    <span className="text-xs text-gray-500 block">Total Employees</span>
                    <span className="font-bold text-gray-900 text-base">
                      {location._count?.employees ?? 0}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 justify-end">
                  <div className="text-right">
                    <span className="text-xs text-gray-500 block">Capacity</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {location.capacity || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer with Timezone, Edit and Delete Actions */}
              <div className="flex items-center justify-between pt-2 border-t text-sm">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="size-3.5" />
                  <span>{location?.timezone || 'Asia/Karachi'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-blue-600 hover:bg-blue-50"
                    onClick={() => openEdit(location)}
                    title="Edit Location"
                  >
                    <Edit className="size-4 mr-1" />
                    <span>Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => confirmDeleteLocation(location)}
                    title="Delete Location"
                  >
                    <Trash2 className="size-4 mr-1" />
                    <span>Delete</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Location Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="size-5" /> Delete Location
            </DialogTitle>
            <DialogDescription className="pt-2 text-gray-600">
              Are you sure you want to delete the location{" "}
              <strong className="text-gray-900">"{locationToDelete?.name}"</strong>? Any active employees
              currently at this location will be automatically reassigned to another available location.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleExecuteDelete}>
              Delete Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Locations;