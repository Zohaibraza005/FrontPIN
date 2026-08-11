import React, { useState } from 'react';
import { mockAssets, mockEmployees } from '../services/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Plus, Search, Laptop, Smartphone, Monitor, Armchair, Tablet } from 'lucide-react';
import { toast } from 'sonner';

export const Assets: React.FC = () => {
  const [assets, setAssets] = useState(mockAssets);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [newAssetOpen, setNewAssetOpen] = useState(false);

  const filteredAssets = assets.filter((asset) => {
    if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !asset.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterCategory !== 'all' && asset.category !== filterCategory) return false;
    if (filterStatus !== 'all' && asset.status !== filterStatus) return false;
    return true;
  });

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      laptop: Laptop,
      phone: Smartphone,
      monitor: Monitor,
      furniture: Armchair,
      tablet: Tablet,
    };
    const Icon = icons[category] || Laptop;
    return <Icon className="size-5" />;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      available: 'bg-green-100 text-green-800',
      assigned: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      retired: 'bg-gray-100 text-gray-800',
    };
    return <Badge className={variants[status] || variants.available}>{status}</Badge>;
  };

  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  const assignedCount = assets.filter(a => a.status === 'assigned').length;
  const availableCount = assets.filter(a => a.status === 'available').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Asset Management</h2>
          <p className="text-gray-600">Track and manage company assets</p>
        </div>
        <Dialog open={newAssetOpen} onOpenChange={setNewAssetOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Asset Name</Label>
                <Input placeholder='MacBook Pro 16"' />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="laptop">Laptop</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="monitor">Monitor</SelectItem>
                      <SelectItem value="tablet">Tablet</SelectItem>
                      <SelectItem value="furniture">Furniture</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Serial Number</Label>
                  <Input placeholder="SN123456" />
                </div>
                <div className="space-y-2">
                  <Label>Purchase Date</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Value ($)</Label>
                  <Input type="number" placeholder="2500" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assign To (Optional)</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Available)</SelectItem>
                    {mockEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setNewAssetOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  toast.success('Asset added successfully!');
                  setNewAssetOpen(false);
                }}>
                  Add Asset
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{assets.length}</div>
            <p className="text-xs text-gray-500 mt-1">Total value: ${totalValue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{assignedCount}</div>
            <p className="text-xs text-gray-500 mt-1">Currently in use</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{availableCount}</div>
            <p className="text-xs text-gray-500 mt-1">Ready to assign</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="laptop">Laptop</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="monitor">Monitor</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Asset Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          {getCategoryIcon(asset.category)}
                        </div>
                        <span className="font-medium">{asset.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{asset.serialNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{asset.category}</Badge>
                    </TableCell>
                    <TableCell>{asset.assignedTo || '-'}</TableCell>
                    <TableCell>{asset.purchaseDate}</TableCell>
                    <TableCell className="font-semibold">${asset.value.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(asset.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};