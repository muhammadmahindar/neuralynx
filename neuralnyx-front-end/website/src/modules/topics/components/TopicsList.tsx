import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import TopicCard from "./TopicCard";
import TopicForm from "./TopicForm";
import { useEffect, useState } from "react";
import type { Topic } from "@/types/content";
import { api, API_ENDPOINTS } from "@/lib/api";
import { useDomain } from "@/contexts/DomainContext";
import { useAuth } from "@/contexts/AuthContext";

interface TopicsListProps {
  topics: Topic[];
  onAddTopic: (topic: string) => void;
  onEditTopic: (oldTopic: Topic, newTopic: string) => void;
  onDeleteTopic: (topic: Topic) => void;
}

export default function TopicsList({
  topics,
  onAddTopic,
  onEditTopic,
  onDeleteTopic,
}: TopicsListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { currentDomain } = useDomain();
  const { user } = useAuth();
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);

  const handleAddTopic = (topic: string) => {
    onAddTopic(topic);
    setIsFormOpen(false);
  };

  const handleEditTopic = (topic: Topic) => {
    setEditingTopic(topic);
  };

  const handleUpdateTopic = (newTopic: string) => {
    if (editingTopic) {
      onEditTopic(editingTopic, newTopic);
      setEditingTopic(null);
    }
  };

  const handleDeleteTopic = (topic: Topic) => {
    onDeleteTopic(topic);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTopic(null);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full pb-4">
      <div className="flex justify-between border-b px-4 py-2 items-center sticky top-0 bg-background z-10">
        <h2 className="text-lg font-semibold">Topics</h2>
        <Button onClick={() => setIsFormOpen(true)} size="sm">
          <Plus className="h-4 w-4" />
          Add Topic
        </Button>
      </div>

      {topics.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No topics yet</p>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Topic
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col grid-cols-1 px-4 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics
            .filter((topic) => topic.domain === currentDomain?.domain)
            .map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                onEdit={handleEditTopic}
                onDelete={handleDeleteTopic}
              />
            ))}
        </div>
      )}

      <TopicForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleAddTopic}
        isEdit={false}
        topics={topics}
      />

      <TopicForm
        topics={topics}
        isOpen={editingTopic !== null}
        onClose={handleCloseForm}
        onSubmit={handleUpdateTopic}
        initialValue={editingTopic?.value || ""}
        isEdit={true}
      />
    </div>
  );
}
