import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, Filter } from "lucide-react";

function AnalyticsReports() {
  const reports = [
    {
      id: 1,
      name: "Monthly Traffic Report",
      description: "Comprehensive traffic analysis for the current month",
      type: "Traffic",
      lastGenerated: "2024-01-15",
      size: "2.3 MB"
    },
    {
      id: 2,
      name: "User Behavior Analysis",
      description: "Deep dive into user interaction patterns",
      type: "Behavior",
      lastGenerated: "2024-01-14",
      size: "1.8 MB"
    },
    {
      id: 3,
      name: "Conversion Funnel Report",
      description: "Analysis of user conversion paths and drop-off points",
      type: "Conversion",
      lastGenerated: "2024-01-13",
      size: "1.2 MB"
    },
    {
      id: 4,
      name: "Performance Metrics",
      description: "Site performance and technical metrics overview",
      type: "Performance",
      lastGenerated: "2024-01-12",
      size: "950 KB"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Analytics Reports</h1>
        <p className="text-muted-foreground">
          Generate and download detailed analytics reports
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <Button variant="outline" className="gap-2">
          <Calendar className="h-4 w-4" />
          Date Range
        </Button>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
        <Button className="gap-2">
          <FileText className="h-4 w-4" />
          Generate New Report
        </Button>
      </div>

      <div className="grid gap-4">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{report.name}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm text-muted-foreground">
                <div className="flex gap-4">
                  <span>Type: {report.type}</span>
                  <span>Size: {report.size}</span>
                </div>
                <span>Last generated: {report.lastGenerated}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default AnalyticsReports;
