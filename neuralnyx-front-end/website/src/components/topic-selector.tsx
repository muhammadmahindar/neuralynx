import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface TopicSelectorProps {
  list: string[];
  value: string;
  setValue: (value: string) => void;
}

export default function TopicSelector({
  list,
  value,
  setValue,
}: TopicSelectorProps) {
  return (
    <div>
      <Select onValueChange={setValue} value={value}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a topic" />
        </SelectTrigger>
        <SelectContent>
          {list.map((topic) => (
            <SelectItem key={topic} value={topic}>
              {topic}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
