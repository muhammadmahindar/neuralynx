import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { api, API_ENDPOINTS } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useDomain } from "@/contexts/DomainContext";
import type { Topic } from "@/types/content";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface TopicFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (topic: string) => void;
  initialValue?: string;
  isEdit?: boolean;
  topics: Topic[];
}

interface FormData {
  topic: string;
}

export default function TopicForm({
  isOpen,
  onClose,
  onSubmit,
  initialValue = "",
  isEdit = false,
  topics,
}: TopicFormProps) {
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const { currentDomain } = useDomain();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<FormData>({
    defaultValues: {
      topic: initialValue,
    },
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (isOpen) {
      reset({ topic: initialValue });
    }
  }, [isOpen, initialValue, reset]);

  const handleFormSubmit = (data: FormData) => {
    if (data.topic.trim()) {
      onSubmit(data.topic.trim());
      reset();
      onClose();
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    setIsLoading(true);
    api
      .post(API_ENDPOINTS.GENERATE, {
        domain: currentDomain?.domain,
        userId: user?.sub,
        goals: "Increase brand awareness",
        existingKeywords: topics?.map((topic) => topic.value).join(","),
        businessSummary: JSON.stringify(currentDomain?.businessAnalysis),
      })
      .then((response) => {
        setSuggestedTopics(response?.data?.generatedKeywords || []);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error generating suggested topics:", error);
        setIsLoading(false);
      });
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Topic" : "Add New Topic"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the topic name below."
              : "Enter a new topic name below."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="topic" className="text-right">
                Topic
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="topic"
                  rows={5}
                  {...register("topic", {
                    required: "Topic name is required",
                    minLength: {
                      value: 2,
                      message: "Topic name must be at least 2 characters",
                    },
                  })}
                  placeholder="Enter topic name"
                  className={errors.topic ? "border-red-500" : ""}
                />
                {errors.topic && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.topic.message}
                  </p>
                )}
              </div>
            </div>
          </div>
          <Label htmlFor="suggestedTopics" className="text-start mb-2">
            Suggested Topics
          </Label>
          <div className="flex bg-muted rounded-md flex-col gap-2 h-[200px] overflow-y-auto p-2 border">
            {isLoading ? (
              <div className="flex justify-center items-center h-full gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Finding suggested
                topics...
              </div>
            ) : (
              suggestedTopics
                .filter((topic) => topic !== initialValue)
                ?.map((topic) => (
                  <button
                    key={topic}
                    className="border bg-background text-start hover:shadow p-2 text-muted-foreground rounded-md cursor-pointer"
                    onClick={() => setValue("topic", topic)}
                  >
                    <p className="text-sm">{topic}</p>
                  </button>
                ))
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? "Update" : "Add"} Topic</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
