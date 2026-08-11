import React, { useState } from 'react';
import { mockPerformance, mockEmployees } from '../services/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Plus, Star } from 'lucide-react';
import { toast } from 'sonner';

export const Performance: React.FC = () => {
  const [reviews, setReviews] = useState(mockPerformance);
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [newReviewOpen, setNewReviewOpen] = useState(false);

  const filteredReviews = reviews.filter((review) => {
    if (filterPeriod !== 'all' && review.period !== filterPeriod) return false;
    return true;
  });

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-blue-600';
    if (rating >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Performance Management</h2>
          <p className="text-gray-600">Track and manage employee performance reviews</p>
        </div>
        <Dialog open={newReviewOpen} onOpenChange={setNewReviewOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              New Review
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Performance Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Review Period</Label>
                  <Input placeholder="Q1 2026" />
                </div>
                <div className="space-y-2">
                  <Label>Rating (0-5)</Label>
                  <Input type="number" step="0.1" min="0" max="5" placeholder="4.5" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Strengths</Label>
                <Textarea placeholder="Key strengths and achievements" rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Areas for Improvement</Label>
                <Textarea placeholder="Areas to work on" rows={3} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setNewReviewOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  toast.success('Performance review created!');
                  setNewReviewOpen(false);
                }}>
                  Create Review
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Performance Reviews</CardTitle>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                <SelectItem value="Q4 2025">Q4 2025</SelectItem>
                <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                <SelectItem value="Q2 2025">Q2 2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Strengths</TableHead>
                  <TableHead>Improvements</TableHead>
                  <TableHead>Review Date</TableHead>
                  <TableHead>Reviewer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">{review.employeeName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{review.period}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 font-bold ${getRatingColor(review.rating)}`}>
                        <Star className="size-4 fill-current" />
                        {review.rating.toFixed(1)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm truncate">{review.strengths}</p>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm truncate">{review.improvements}</p>
                    </TableCell>
                    <TableCell>{review.reviewDate}</TableCell>
                    <TableCell>{review.reviewer}</TableCell>
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
