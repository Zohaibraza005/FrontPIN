// components/ApplicantSheet.tsx
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
  } from "../ui/sheet";
  import { Button } from "../ui/button";
  
  export default function ApplicantSheet({
    applicant,
    open,
    setOpen,
    onScheduleInterview,
    onGenerateOffer,
  }) {
    if (!applicant) return null;
  
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:w-[600px]">
          <SheetHeader>
            <SheetTitle>Candidate Profile</SheetTitle>
          </SheetHeader>
  
          <div className="mt-6 space-y-6 px-4">
  
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-semibold">
                {applicant.name}
              </h3>
              <p className="text-sm text-gray-500">
                {applicant.job}
              </p>
            </div>
  
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Email: {applicant.email}</div>
              <div>Phone: {applicant.phone}</div>
              <div>Status: {applicant.status}</div>
              <div>Experience: {applicant.experience} yrs</div>
            </div>
  
            {/* Interview Section */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">
                Interview
              </h4>
              <Button
                size="sm"
                onClick={onScheduleInterview}
              >
                Schedule Interview
              </Button>
            </div>
  
            {/* Offer Section */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">
                Offer
              </h4>
              <Button
                size="sm"
                onClick={onGenerateOffer}
              >
                Generate Offer
              </Button>
            </div>
  
            {/* Convert to Employee */}
            {applicant.status === "HIRED" && (
              <div className="border-t pt-4">
                <Button className="w-full">
                  Convert to Employee
                </Button>
              </div>
            )}
  
          </div>
        </SheetContent>
      </Sheet>
    );
  }