import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export default function OfferModal({ open, setOpen }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Offer</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input placeholder="Offered Salary" type="number" />
          <Input type="date" placeholder="Joining Date" />
          <Button className="w-full">Generate Offer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}