
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";

export default function InterviewModal({ open, setOpen }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input type="date" />
          <Input placeholder="Interviewer Name" />
          <Input placeholder="Interview Mode (Online/Onsite)" />

          <Button className="w-full">Schedule</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}