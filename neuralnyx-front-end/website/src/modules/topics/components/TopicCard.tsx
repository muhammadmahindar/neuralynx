import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Github, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Topic } from "@/types/content";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

// Simple seeded random number generator
const seededRandom = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) / 2147483647; // Normalize to 0-1
};

// Generate random time ago based on topic title
const getRandomTimeAgo = (topicTitle: string): string => {
  const random = seededRandom(topicTitle + "_time"); // Different seed for time
  const timeOptions = [
    { min: 0, max: 60, unit: "minutes", label: "minute" },
    { min: 1, max: 24, unit: "hours", label: "hour" },
    { min: 1, max: 3, unit: "days", label: "day" },
  ];

  const timeOption = timeOptions[Math.floor(random * timeOptions.length)];
  const value =
    Math.floor(random * (timeOption.max - timeOption.min + 1)) + timeOption.min;

  return `Last crawled: ${value} ${timeOption.label}${
    value > 1 ? "s" : ""
  } ago`;
};

// Generate platform-specific percentages based on topic title
const getPlatformPercentages = (topicTitle: string) => {
  const platforms = [
    { name: "ChatGPT", weight: 0.5 },
    { name: "Perplexity", weight: 0.3 },
    { name: "Google AI Overview", weight: 0.2 },
  ];

  const totalPercentage = Math.floor(seededRandom(topicTitle) * 100);

  return platforms
    .map((platform) => {
      const percentage = Math.floor(totalPercentage * platform.weight);
      return { ...platform, percentage };
    })
    .filter((platform) => platform.percentage > 0);
};

// Generate mention counts for different platforms based on topic title
const getMentionCounts = (topicTitle: string) => {
  const platforms = [
    { name: "Reddit", icon: "reddit" },
    { name: "LinkedIn", icon: "linkedin" },
    { name: "Medium", icon: "medium" },
  ];

  return platforms.map((platform) => {
    const random = seededRandom(topicTitle + "_" + platform.name);
    const count = Math.floor(random * 1000) + 10; // 10-1009 mentions
    return { ...platform, count };
  });
};

interface TopicCardProps {
  topic: Topic;
  onEdit: (topic: Topic) => void;
  onDelete: (topic: Topic) => void;
}

export default function TopicCard({ topic, onEdit, onDelete }: TopicCardProps) {
  return (
    <Card className="group p-4 cursor-pointer">
      <CardContent className="p-0">
        <div className="flex items-center justify-between pb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-lg">{topic.value}</h3>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(topic);
              }}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => e.stopPropagation()}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Topic</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete the topic "{topic.value}"?
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(topic)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="border-t pt-2 flex items-center gap-2">
          <Badge variant="secondary">{topic.domain}</Badge>
          <HoverCard>
            <HoverCardTrigger asChild>
              <p className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                cited {Math.floor(seededRandom(topic.value) * 100)}% in last 1
                month
              </p>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Citation by Platform</h4>
                <div className="space-y-1">
                  {getPlatformPercentages(topic.value).map((platform) => (
                    <div
                      key={platform.name}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-muted-foreground">
                        {platform.name}
                      </span>
                      <span className="text-sm font-medium">
                        {platform.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
          <p className="text-sm text-muted-foreground">-</p>
          <div className="flex flex-row gap-2 items-center">
            <p className="text-sm text-muted-foreground">Mentions:</p>
            <div className="flex flex-row gap-1 items-center">
              {getMentionCounts(topic.value).map((platform) => (
                <div key={platform.name} className="flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    className="text-muted-foreground"
                  >
                    {platform.icon === "reddit" && (
                      <>
                        <path
                          fill="currentColor"
                          d="M10.75 13.04c0-.57-.47-1.04-1.04-1.04s-1.04.47-1.04 1.04a1.04 1.04 0 1 0 2.08 0m3.34 2.37c-.45.45-1.41.61-2.09.61s-1.64-.16-2.09-.61a.26.26 0 0 0-.38 0a.26.26 0 0 0 0 .38c.71.71 2.07.77 2.47.77s1.76-.06 2.47-.77a.26.26 0 0 0 0-.38c-.1-.1-.27-.1-.38 0m.2-3.41c-.57 0-1.04.47-1.04 1.04s.47 1.04 1.04 1.04s1.04-.47 1.04-1.04S14.87 12 14.29 12"
                        />
                        <path
                          fill="currentColor"
                          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m5.8 11.33c.02.14.03.29.03.44c0 2.24-2.61 4.06-5.83 4.06s-5.83-1.82-5.83-4.06c0-.15.01-.3.03-.44c-.51-.23-.86-.74-.86-1.33a1.455 1.455 0 0 1 2.47-1.05c1.01-.73 2.41-1.19 3.96-1.24l.74-3.49c.01-.07.05-.13.11-.16c.06-.04.13-.05.2-.04l2.42.52a1.04 1.04 0 1 1 .93 1.5c-.56 0-1.01-.44-1.04-.99l-2.17-.46l-.66 3.12c1.53.05 2.9.52 3.9 1.24a1.455 1.455 0 1 1 1.6 2.38"
                        />
                      </>
                    )}
                    {platform.icon === "linkedin" && (
                      <path
                        fill="currentColor"
                        d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93zM6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37z"
                      />
                    )}
                    {platform.icon === "medium" && (
                      <path
                        fill="currentColor"
                        d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20zm0-2h10.5v-3.5H4zm12.5 0H20V9h-3.5zM4 12.5h10.5V9H4z"
                      />
                    )}
                  </svg>
                  <p className="text-sm">{platform.count}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-end ms-auto text-muted-foreground">
            {getRandomTimeAgo(topic.value)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
