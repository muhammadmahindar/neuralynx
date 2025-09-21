import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, API_ENDPOINTS } from "@/lib/api";
import type {
  OnboardingRequest,
  OnboardingResponse,
  BusinessSummaryResponse,
  ContentTopicsResponse,
} from "@/types/onboarding";
import { toast } from "sonner";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { ChevronLeft, ChevronRight, Loader2, Plus, XIcon } from "lucide-react";
import { mockApiService } from "@/services/mockApiService";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

// Define the form schema
const onboardingSchema = z.object({
  domain: z.string().min(1, "Domain is required"),
  businessSummary: z.string().min(1, "Business summary is required"),
  contentTopics: z
    .array(z.string().min(1, "Topic cannot be empty"))
    .min(1, "At least one content topic is required"),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const delay = (delayInms) => {
  return new Promise((resolve) => setTimeout(resolve, delayInms));
};
const generateBusinessSummary = async (
  formData: OnboardingFormData,
  setFormValue: (field: string, value: string) => void,
  setIsGeneratingSummary: (loading: boolean) => void,
  previousDomain?: string
) => {
  if (!formData.domain) {
    throw new Error("Please fill in domain first");
  }

  // If domain hasn't changed, skip API call
  if (previousDomain && previousDomain === formData.domain) {
    return {
      success: true,
      message: "Domain unchanged, using existing summary",
    };
  }

  await api.post(API_ENDPOINTS.DOMAINS.CREATE, {
    domain: formData.domain,
  });

  setIsGeneratingSummary(true);
  try {
    // Try to call the actual API endpoint first
    try {
      let count = 0;
      while (count <= 10) {
        const response = await api.get<BusinessSummaryResponse>(
          API_ENDPOINTS.DOMAINS.LIST
        );
        const currentDomain = response?.data?.find(
          (domain) => domain?.domain === formData.domain
        );
        if (currentDomain?.businessAnalysis) {
          setFormValue(
            "businessSummary",
            JSON.stringify(currentDomain.businessAnalysis)
          );
          return {
            success: true,
            message: "Business summary generated successfully!",
          };
        }
        count++;
        await delay(5000);
      }

      return {
        success: true,
        message: "Business summary generated successfully!",
      };
    } catch (apiError) {
      console.warn("API call failed, using mock service:", apiError);

      setFormValue("businessSummary", "");
      return {
        success: true,
        message: "Using mock service - API temporarily unavailable",
      };
    }
  } catch (error) {
    console.error("Error generating summary:", error);
    throw new Error("Failed to generate business summary. Please try again.");
  } finally {
    setIsGeneratingSummary(false);
  }
};

const generateContentTopics = async (
  formData: OnboardingFormData,
  setFormValue: (field: string, value: unknown) => void,
  userID: string
) => {
  try {
    const topicsRequest = {
      domain: formData.domain,
      businessSummary: formData.businessSummary,
    };

    // Try to call the actual API endpoint first
    try {
      const response = await api.post<ContentTopicsResponse>(
        API_ENDPOINTS.GENERATE,
        {
          domain: formData.domain,
          userId: userID,
          goals: "Increase brand awareness",
          existingKeywords: [],
          businessSummary: formData?.businessSummary,
        }
      );

      setFormValue("contentTopics", response?.data?.generatedKeywords || []);
      return {
        success: true,
        message: "Content topics generated successfully!",
      };
    } catch (apiError) {
      console.warn("API call failed, using mock service:", apiError);

      // Fallback to mock service
      const mockResponse = await mockApiService.generateContentTopics(
        topicsRequest
      );
      setFormValue("contentTopics", mockResponse.topics);
      return {
        success: true,
        message: "Using mock service for content topics",
      };
    }
  } catch (error) {
    console.error("Error generating content topics:", error);
    throw new Error("Failed to generate content topics. Please try again.");
  }
};

const handleFinalSubmission = async (formData: OnboardingFormData) => {
  const onboardingRequest: OnboardingRequest = {
    domain: formData.domain,
    businessSummary: formData.businessSummary,
  };

  // Store onboarding completion status
  localStorage.setItem("onboardingComplete", "true");
  localStorage.setItem(
    "onboardingData",
    JSON.stringify({
      ...onboardingRequest,
      formData: formData,
    })
  );

  return { success: true, message: "Onboarding completed successfully!" };
};

// Define the form steps structure
const getFormSteps = (
  previousDomain: string | undefined,
  setPreviousDomain: (domain: string) => void,
  userID: string
) => [
  {
    step: 0,
    title: "Tell us about your company",
    subtitle: "We'll use this information to create a personalized experience",
    onSubmit: async (
      formData: OnboardingFormData,
      setFormValue: (field: string, value: string) => void,
      setIsGeneratingSummary: (loading: boolean) => void
    ) => {
      // Then generate business summary
      const result = await generateBusinessSummary(
        formData,
        setFormValue,
        setIsGeneratingSummary,
        previousDomain
      );

      // Update previous domain after successful generation
      setPreviousDomain(formData.domain);

      return result;
    },
  },
  {
    step: 1,
    title: "Review your business summary",
    subtitle:
      "We've generated a business summary based on your information. You can edit it as needed.",
    onSubmit: async (
      formData: OnboardingFormData,
      setFormValue: (field: string, value: string) => void
    ) => {
      await generateContentTopics(formData, setFormValue, userID);
      return {
        success: true,
        message: "Content topics generated successfully!",
      };
    },
  },
  {
    step: 2,
    title: "Content Strategy Topics",
    subtitle:
      "Based on your business, we've generated content topics for your strategy. You can edit, add, or remove topics.",
    onSubmit: async () => {
      return {
        success: true,
        message: "Onboarding completed successfully!",
      };
    },
  },
];

export default function OnboardingForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessingStep, setIsProcessingStep] = useState(false);
  const [previousDomain, setPreviousDomain] = useState<string | undefined>();
  const { user } = useAuth();

  const formSteps = getFormSteps(previousDomain, setPreviousDomain, user?.sub);
  const totalSteps = formSteps.length;

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      domain: "",
      businessSummary: "",
      contentTopics: [],
    },
  });

  const currentStepData = formSteps[currentStep];

  const handleNext = async () => {
    const formData = form.getValues();

    // Validate current step based on step requirements
    const validationFields =
      currentStep === 0
        ? (["domain"] as const)
        : currentStep === 1
        ? (["businessSummary"] as const)
        : (["contentTopics"] as const);
    const isValid = await form.trigger(validationFields);

    if (!isValid) return;

    setIsProcessingStep(true);
    try {
      // Call the step's onSubmit function
      const result = await currentStepData.onSubmit(
        formData,
        (field: string, value: unknown) =>
          form.setValue(
            field as keyof OnboardingFormData,
            value as string | string[]
          ),
        () => {} // No longer needed
      );

      if (result.success) {
        toast.success(result.message);

        if (currentStep < totalSteps - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          // Final step completed, submit onboarding
          try {
            const finalResult = await handleFinalSubmission(formData);
            if (finalResult.success) {
              toast.success(finalResult.message);
              window.location.href = "/dashboard/topics";
            } else {
              toast.error(finalResult.message);
            }
          } catch (error) {
            console.error("Error in final submission:", error);
            toast.error("Failed to complete onboarding. Please try again.");
          }
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error(`Error processing step ${currentStep}:`, error);
      toast.error(
        `Failed to process step ${currentStep + 1}. Please try again.`
      );
    } finally {
      setIsProcessingStep(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed top-0 left-0 h-screen w-screen z-50">
      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()}>
          <AuthLayout
            title={currentStepData.title}
            description={currentStepData.subtitle}
          >
            <div className="w-full space-y-6">
              {/* Breadcrumb */}
              <div className="flex items-center justify-start space-x-2">
                {Array.from({ length: totalSteps }, (_, i) => i).map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-6 h-1 rounded-full flex items-center justify-center text-sm font-medium ${
                        step === currentStep
                          ? "bg-primary text-primary-foreground"
                          : step < currentStep
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    ></div>
                  </div>
                ))}
              </div>

              {/* Step Content */}
              {currentStep === 0 && <DomainName form={form} />}
              {currentStep === 1 && <BusinessSummary form={form} />}
              {currentStep === 2 && <ContentTopics form={form} />}

              {/* Navigation Buttons */}
              <div className="flex justify-between w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0 || isProcessingStep}
                  className="flex items-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isProcessingStep}
                  className="flex items-center"
                >
                  {isProcessingStep && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  <span>
                    {isProcessingStep
                      ? "Processing..."
                      : currentStep === totalSteps - 1
                      ? "Complete Onboarding"
                      : "Next"}
                  </span>
                  {!isProcessingStep && currentStep < totalSteps - 1 && (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </AuthLayout>
        </form>
      </Form>
    </div>
  );
}

function DomainName({ form }: { form: UseFormReturn<OnboardingFormData> }) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <FormField
        control={form.control}
        name="domain"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Domain</FormLabel>
            <FormControl>
              <Input placeholder="https://example.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function BusinessSummary({
  form,
}: {
  form: UseFormReturn<OnboardingFormData>;
}) {
  return (
    <div className="flex border-b px-2 flex-col gap-4 w-full max-h-[500px] overflow-y-auto scrollbar-hide">
      <FormField
        control={form.control}
        name="businessSummary"
        render={({ field }) => {
          const businessSummary = JSON.parse(field.value);
          console.log(businessSummary);
          return (
            <FormItem>
              <FormControl>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3">
                    <Label>Summary</Label>
                    <Textarea
                      placeholder="Your business summary will appear here..."
                      value={businessSummary?.summary}
                      className="resize-none"
                      rows={6}
                      disabled
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <Label>Industry</Label>
                    <Input value={businessSummary?.industry} disabled />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Label>Business Type</Label>
                    <Input value={businessSummary?.businessType} disabled />
                  </div>

                  <div className="flex flex-col gap-3">
                    <Label>Target Audience</Label>
                    <Textarea
                      value={businessSummary?.targetAudience}
                      disabled
                      rows={3}
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Label>Key Services</Label>
                    <div className="flex flex-col border rounded p-2 bg-muted gap-2 max-h-[200px] overflow-y-auto scrollbar-hide">
                      {businessSummary?.keyServices.map((service) => (
                        <p
                          key={service}
                          className="text-sm border rounded-md bg-background p-2 text-muted-foreground"
                        >
                          {service}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />

      <p className="text-sm text-muted-foreground">
        This summary is generated based on your domain and description.
      </p>
    </div>
  );
}

function ContentTopics({ form }: { form: UseFormReturn<OnboardingFormData> }) {
  const [inputValue, setInputValue] = useState("");

  const contentTopics = form.watch("contentTopics") || [];

  const addTopic = () => {
    if (inputValue.trim()) {
      const updatedTopics = [inputValue.trim(), ...contentTopics];
      form.setValue("contentTopics", updatedTopics);
      setInputValue("");
    }
  };

  const removeTopic = (index: number) => {
    const updatedTopics = contentTopics.filter((_, i) => i !== index);
    form.setValue("contentTopics", updatedTopics);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTopic();
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <FormLabel>Content Strategy Topics</FormLabel>

      {/* Input for adding new topics */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add Topics and Press Enter to add..."
          />
          <Button
            type="button"
            onClick={addTopic}
            disabled={!inputValue.trim()}
            size="sm"
            className="flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add
          </Button>
        </div>

        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            Press Enter to add topic
          </p>
        </div>
      </div>

      {/* Tags display */}
      <div className="bg-muted/50 rounded-2xl p-3 border max-h-[200px] overflow-y-auto">
        {contentTopics.length === 0 ? (
          <div className="text-center text-sm py-8 text-muted-foreground">
            <p>No content topics yet. Add one above to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {contentTopics.map((prompt, index) => (
              <div
                key={index}
                className="p-1 px-2 flex bg-background items-center border rounded-md justify-between"
              >
                <p className="p-1 text-xs text-muted-foreground">{prompt}</p>
                <Button
                  type="button"
                  size="icon"
                  className="size-4"
                  variant="ghost"
                  onClick={() => removeTopic(index)}
                >
                  <XIcon className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        These topics will be used to generate content for your strategy. Use the
        close button to remove topics.
      </p>
    </div>
  );
}
