import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { Plus, Wand } from "lucide-react";
import React from "react";
import OptimizeSiteSelector from "./OptimizeSiteSelector";
import TopicSelector from "@/components/topic-selector";
import { api, API_ENDPOINTS } from "@/lib/api";
import { useEffect } from "react";
import type { Topic, TopicsResponse } from "@/types/content";
import { useDomain } from "@/contexts/DomainContext";
interface FormData {
  selectedUrl: string;
  selectedTopic: string;
  tabType: "optimize-site" | "generate-content";
  platform: "linkedin" | "reddit" | "blog";
}

interface NewContentFormProps {
  onSubmit: (data: FormData) => void;
}

export default function NewContentForm({ onSubmit }: NewContentFormProps) {
  const [openPopover, setOpenPopover] = React.useState(false);
  const { currentDomain } = useDomain();
  const [topics, setTopics] = React.useState<Topic[]>([]);

  useEffect(() => {
    const fetchTopics = async () => {
      const { data } = await api.get<TopicsResponse>(API_ENDPOINTS.TOPICS.LIST);
      setTopics(data);
    };
    if (openPopover) {
      fetchTopics();
    }
  }, [openPopover]);

  const form = useForm<FormData>({
    defaultValues: {
      selectedUrl: "",
      selectedTopic: "",
      tabType: "optimize-site",
      platform: "linkedin",
    },
    mode: "onChange",
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch,
  } = form;
  const selectedTab = watch("tabType");

  const handleFormSubmit = async (data: FormData) => {
    // Validate required fields based on tab type
    if (data.tabType === "optimize-site" && !data.selectedUrl) {
      console.error("URL is required for optimize site");
      return;
    }

    if (!data.selectedTopic) {
      console.error("Topic is required");
      return;
    }

    // Call the parent's onSubmit handler
    await onSubmit(data);
    setOpenPopover(false);
    reset();
  };

  const handleCancel = () => {
    setOpenPopover(false);
    reset();
  };

  return (
    <Popover open={openPopover}>
      <PopoverTrigger asChild>
        <Button size="sm" onClick={() => setOpenPopover(true)}>
          <Plus /> New Content
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full max-w-md min-w-md flex flex-col gap-2"
        side="bottom"
        align="end"
      >
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col gap-2"
        >
          <Controller
            name="tabType"
            control={control}
            render={({ field }) => (
              <Tabs value={field.value} onValueChange={field.onChange}>
                <TabsList>
                  <TabsTrigger value="optimize-site">
                    <Wand />
                    Optimize Site
                  </TabsTrigger>
                  <TabsTrigger value="generate-content">
                    <Wand /> Generate Content
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="optimize-site" className="py-2">
                  <Controller
                    name="selectedUrl"
                    control={control}
                    rules={{
                      required: "URL is required for optimize site",
                      validate: (value) => {
                        if (selectedTab === "optimize-site" && !value) {
                          return "URL is required for optimize site";
                        }
                        return true;
                      },
                    }}
                    render={({ field }) => (
                      <div>
                        <OptimizeSiteSelector
                          value={field.value}
                          setValue={field.onChange}
                        />
                        {errors.selectedUrl && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.selectedUrl.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                </TabsContent>
                <TabsContent value="generate-content" className="py-2">
                  <div className="flex flex-col gap-2">
                    <Label>Platform</Label>
                    <Controller
                      name="platform"
                      control={control}
                      rules={{ required: "Platform is required" }}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a platform" />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              {
                                icon: "linkedin",
                                value: "linkedin",
                                label: "LinkedIn",
                              },
                              {
                                icon: "reddit",
                                value: "reddit",
                                label: "Reddit",
                              },
                              { icon: "blog", value: "blog", label: "Blog" },
                            ].map((platform) => (
                              <SelectItem value={platform.value}>
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
                                  {platform.icon === "blog" && (
                                    <path
                                      fill="currentColor"
                                      d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20zm0-2h10.5v-3.5H4zm12.5 0H20V9h-3.5zM4 12.5h10.5V9H4z"
                                    />
                                  )}
                                </svg>
                                {platform.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}
          />

          <div className="flex flex-col gap-2">
            <Label>Topics</Label>
            <Controller
              name="selectedTopic"
              control={control}
              rules={{ required: "Topic is required" }}
              render={({ field }) => (
                <div>
                  <TopicSelector
                    list={topics
                      .filter((topic) => topic.domain === currentDomain?.domain)
                      .map((topic) => topic.value)}
                    value={field.value}
                    setValue={field.onChange}
                  />
                  {errors.selectedTopic && topics.length > 0 && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.selectedTopic.message}
                    </p>
                  )}
                </div>
              )}
            />
          </div>

          <div className="flex gap-1 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Proceeding..." : "Proceed"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
