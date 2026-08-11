import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";

export default function JobEditSheet({ job, open, setOpen }) {
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    setForm(job);
  }, [job]);

  if (!form) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="w-full sm:w-[650px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Job</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6 px-5">
          <Input value={form.title}
            onChange={(e)=>setForm({...form,title:e.target.value})}
          />

          <Textarea value={form.description}
            onChange={(e)=>setForm({...form,description:e.target.value})}
          />

          <Input value={form.department}
            onChange={(e)=>setForm({...form,department:e.target.value})}
          />

          <Input value={form.location}
            onChange={(e)=>setForm({...form,location:e.target.value})}
          />

          <Input type="number"
            value={form.experience}
            onChange={(e)=>setForm({...form,experience:e.target.value})}
          />

          <Input type="number"
            value={form.positions}
            onChange={(e)=>setForm({...form,positions:e.target.value})}
          />

          <Input type="number"
            value={form.salaryMin}
            onChange={(e)=>setForm({...form,salaryMin:e.target.value})}
          />

          <Input type="number"
            value={form.salaryMax}
            onChange={(e)=>setForm({...form,salaryMax:e.target.value})}
          />

          <Input value={form.hiringManager}
            onChange={(e)=>setForm({...form,hiringManager:e.target.value})}
          />

          <Textarea value={form.skills}
            onChange={(e)=>setForm({...form,skills:e.target.value})}
          />

          <Button className="w-full">Save Changes</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}