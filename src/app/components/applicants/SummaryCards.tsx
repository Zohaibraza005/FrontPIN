import { Card, CardContent } from "../ui/card";

// components/SummaryCards.tsx

  
  export default function SummaryCards({ applicants }) {
    const total = applicants.length;
    const interviews = applicants.filter(a => a.status === "INTERVIEW").length;
    const offers = applicants.filter(a => a.status === "OFFERED").length;
    const hired = applicants.filter(a => a.status === "HIRED").length;
  
    const cards = [
      { label: "Total Applicants", value: total },
      { label: "Interviews", value: interviews },
      { label: "Offers", value: offers },
      { label: "Hired", value: hired },
    ];
  
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-6">
              <div className="text-sm text-gray-500">
                {card.label}
              </div>
              <div className="text-3xl font-bold mt-2">
                {card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }