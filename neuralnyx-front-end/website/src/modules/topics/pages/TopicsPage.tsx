import { useState, useEffect, useCallback } from "react";
import TopicsList from "../components/TopicsList";
import { api, API_ENDPOINTS } from "@/lib/api";
import { useDomain } from "@/contexts/DomainContext";
import type { Topic } from "@/types/content";

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentDomain } = useDomain();

  const fetchTopics = useCallback(async () => {
    if (!currentDomain) return;

    try {
      setIsLoading(true);
      const response = await api.topics.getByDomain();
      setTopics(response.data || []);
    } catch (error) {
      console.error("Error fetching topics:", error);
      setTopics([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentDomain]);

  const handleAddTopic = async (value: string) => {
    if (!currentDomain) return;

    try {
      const response = await api.topics.create(currentDomain.domain, value);
      setTopics((prev) => [...prev, response.data]);
    } catch (error) {
      console.error("Error creating topic:", error);
    }
  };

  const handleEditTopic = async (oldTopic: Topic, newValue: string) => {
    if (!currentDomain) return;

    try {
      const response = await api.topics.update(
        currentDomain.domain,
        oldTopic.id,
        newValue
      );
      setTopics((prev) =>
        prev.map((topic) => (topic.id === oldTopic.id ? response.data : topic))
      );
    } catch (error) {
      console.error("Error updating topic:", error);
    }
  };

  const handleDeleteTopic = async (topic: Topic) => {
    if (!currentDomain) return;

    try {
      await api.topics.delete(currentDomain.domain, topic.id);
      setTopics((prev) => prev.filter((t) => t.id !== topic.id));
    } catch (error) {
      console.error("Error deleting topic:", error);
    }
  };

  // Load topics when domain changes
  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading topics...</div>
      </div>
    );
  }

  return (
    <div className="">
      <TopicsList
        topics={topics}
        onAddTopic={handleAddTopic}
        onEditTopic={handleEditTopic}
        onDeleteTopic={handleDeleteTopic}
      />
    </div>
  );
}
