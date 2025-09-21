import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Linkedin, MessageSquare, Instagram, Sparkles } from "lucide-react";
import { aiService } from "@/lib/ai";

interface SocialTool {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    category: string;
}

const socialTools: SocialTool[] = [
    {
        id: "linkedin-post",
        name: "LinkedIn Post",
        description: "Generate professional LinkedIn posts for your network",
        icon: Linkedin,
        category: "Professional",
    },
    {
        id: "reddit-post",
        name: "Reddit Post",
        description: "Create engaging Reddit posts for communities",
        icon: MessageSquare,
        category: "Community",
    },
    {
        id: "instagram-caption",
        name: "Instagram Caption",
        description: "Write engaging captions for Instagram posts",
        icon: Instagram,
        category: "Visual",
    },
];

export default function SocialToolsPage() {
    const [selectedTool, setSelectedTool] = useState<string>("linkedin-post");
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!input.trim()) return;

        setIsLoading(true);
        try {
            const response = await generateSocialContent(selectedTool, input);
            setOutput(response);
        } catch (error) {
            console.error("Error generating content:", error);
            setOutput("Error generating content. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const generateSocialContent = async (toolId: string, prompt: string): Promise<string> => {
        const platformMap = {
            "linkedin-post": "linkedin" as const,
            "reddit-post": "reddit" as const,
            "instagram-caption": "instagram" as const,
        };

        const platform = platformMap[toolId as keyof typeof platformMap];
        if (!platform) {
            return "Invalid tool selected.";
        }

        try {
            return await aiService.generateSocialContent({ platform, prompt });
        } catch (error) {
            console.error("Error generating social content:", error);
            return "Error generating content. Please try again.";
        }
    };


    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Social Tools</h1>
                <p className="text-muted-foreground">
                    Generate engaging content for social with AI assistance
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Tools Grid */}
                {socialTools.map((tool) => (
                    <Card
                        key={tool.id}
                        className={`cursor-pointer transition-colors ${selectedTool === tool.id
                            ? "ring-2 ring-primary bg-primary/5"
                            : "hover:bg-muted/50"
                            }`}
                        onClick={() => setSelectedTool(tool.id)}
                    >
                        <CardContent className="pt-4 pb-0">
                            <div className="flex items-start space-x-3">
                                <tool.icon className="h-5 w-5 mt-0.5 text-primary" />
                                <div className="space-y-1">
                                    <h3 className="font-medium">{tool.name}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {tool.description}
                                    </p>
                                    <span className="inline-block px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded">
                                        {tool.category}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end">
                            <Button variant="outline" onClick={() => setSelectedTool(tool.id)}><Sparkles /> Generate Content</Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
