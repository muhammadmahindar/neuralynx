import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Sparkles,
  Check,
  MoreHorizontal,
  Edit2,
  Trash2,
  TrendingUp,
  Target,
  BarChart3,
  Loader2,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChartContainer } from "@/components/ui/chart";
import {
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";
import { contentList, recommendations } from "./mock";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { getScoreChartColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownEditor, markdownToValue, valueToMarkdown } from "@/components/editor";
import { type Value } from 'platejs';
import { EmbeddingService, type ContentAnalysis } from "@/lib/embedding-service";
import { type Content } from "../../../types/content";
import { sanitizeUrl } from "@/lib/utils";
import { ScoreBar } from "@/components/score-bar";
import { aiService } from "@/lib/ai";
import { useStore } from "@/contexts/StoreContext";
import { api, API_ENDPOINTS } from "@/lib/api";

function ContentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("topics");
  const [content, setContent] = useState<Content | null>(null);
  const [isFetchingContent, setIsFetchingContent] = useState(true);
  const [editorContent, setEditorContent] = useState<Value>([]);

  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [embeddingService] = useState(() => EmbeddingService.getInstance());

  const [optimizingContent, setOptimizingContent] = useState(false);
  const [optimizingTitle, setOptimizingTitle] = useState(false);
  const [optimizingMetaDescription, setOptimizingMetaDescription] = useState(false);

  // Debounced values for content analysis
  const debouncedEditorContent = useDebounce(editorContent, 1500);
  const debouncedContent = useDebounce(content, 1500);

  const analyzeContent = useCallback(async () => {
    if (!debouncedContent || !debouncedContent?.topics) return;

    setIsAnalyzing(true);
    try {
      const analysis = await embeddingService.analyzeContent(
        debouncedContent.title,
        debouncedContent.metaDescription,
        valueToMarkdown(debouncedEditorContent),
        debouncedContent.topics,
      );
      setContentAnalysis(analysis);
    } catch (error) {
      console.error("Error analyzing content:", error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [debouncedContent, embeddingService, debouncedEditorContent]);

  const handleOptimizeContent = async () => {
    try {
      setOptimizingContent(true);
      const optimizedResponse = await api.post<{ data: { optimizedContent: string } }>(API_ENDPOINTS.CONTENT.OPTIMIZE, { content: valueToMarkdown(debouncedEditorContent), title: content?.title || "", meta: content?.metaDescription || "", topics: content?.topics || [] });
      const { optimizedContent } = optimizedResponse.data;
      setEditorContent(markdownToValue(optimizedContent as string));
    } catch (error) {
      console.error("Error optimizing content:", error);
    } finally {
      setOptimizingContent(false);
    }
  };

  const handleOptimizeTitle = async () => {
    try {
      setOptimizingTitle(true);
      const title = await aiService.suggestTitle({ content: valueToMarkdown(debouncedEditorContent), title: content?.title || "", metaDescription: content?.metaDescription || "" });
      setContent({ ...content, title });
    } catch (error) {
      console.error("Error optimizing title:", error);
    } finally {
      setOptimizingTitle(false);
    }
  };

  const handleOptimizeMetaDescription = async () => {
    try {
      setOptimizingMetaDescription(true);
      const metaDescription = await aiService.suggestMetaDescription({ content: valueToMarkdown(debouncedEditorContent), title: content?.title || "", metaDescription: content?.metaDescription || "" });
      setContent({ ...content, metaDescription });
    } catch (error) {
      console.error("Error optimizing meta description:", error);
    } finally {
      setOptimizingMetaDescription(false);
    }
  };

  const store = useStore();

  useEffect(() => {
    if (content) return;
    async function getContent() {
      let contentData = {};

      contentData = contentList.find((item) => item.id === parseInt(id || "0")) || store.get("content");
      // todo: get content from s3 bucket
      setContent(contentData as Content);
      setEditorContent(contentData ? markdownToValue(contentData.content as string) : []);
      setIsFetchingContent(false);
    }

    getContent();
  }, [content, id, store]);

  // Debounced analysis when content changes
  useEffect(() => {
    analyzeContent();
  }, [debouncedEditorContent, analyzeContent]);

  // Radial chart data for content score
  const scoreData = useMemo(() => {
    if (!contentAnalysis) return [];

    const { overallScore } = contentAnalysis;

    return [
      {
        score: overallScore,
        fill: getScoreChartColor(overallScore),
      },
    ];
  }, [contentAnalysis]);

  const chartConfig = {
    score: {
      label: "Content Score",
      color: "var(--chart-2)",
    },
  };

  if (isFetchingContent) {
    return (
      <div className="container mx-auto px-4 py-8 h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-primary mx-auto mb-2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Content not found</h1>
          <p className="text-muted-foreground mt-2">
            The content you're looking for doesn't exist.
          </p>
          <Button
            onClick={() => navigate("/dashboard/content")}
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Content
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col px-4">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate("/dashboard/content")}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm">Save</Button>
          <Button variant="ghost" size="sm">
            Export
          </Button>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0">
        {/* Right Sidebar */}
        <div className="min-w-128 max-w-156 border-l flex flex-col min-h-0 scrollbar-hide">
          <Tabs
            defaultValue="analysis"
            orientation="vertical"
            className="flex flex-row h-full"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <div className="w-48 border-r bg-muted/30 flex flex-col min-h-0">
              <div className="p-4 border-b flex-shrink-0">
                <div className="flex flex-col items-center space-y-3">
                  <h3 className="text-sm font-medium">Content Score</h3>
                  <ChartContainer config={chartConfig} className="h-32 w-32">
                    <RadialBarChart
                      data={scoreData}
                      startAngle={90}
                      endAngle={90 + (360 * (contentAnalysis?.overallScore ?? 0)) / 100}
                      innerRadius={40}
                      outerRadius={60}
                    >
                      <PolarGrid
                        gridType="circle"
                        radialLines={false}
                        stroke="none"
                        className="first:fill-muted last:fill-background"
                        polarRadius={[46, 54]}
                      />
                      <RadialBar dataKey="score" background cornerRadius={10} />
                      <PolarRadiusAxis
                        tick={false}
                        tickLine={false}
                        axisLine={false}
                      />
                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-foreground text-2xl font-bold"
                      >
                        {isAnalyzing ? "..." : contentAnalysis?.overallScore ?? 0}
                      </text>
                    </RadialBarChart>
                  </ChartContainer>
                </div>
              </div>
              <TabsList className="flex flex-col w-full border-0 rounded-none h-auto bg-transparent p-0 flex-shrink-0">
                <TabsTrigger
                  value="topics"
                  className="w-full justify-start px-4 py-3 border-0 rounded-none data-[state=active]:bg-background data-[state=active]:border-r-2 data-[state=active]:border-primary"
                >
                  <div className="flex items-center gap-3">
                    <span>Topics</span>
                  </div>
                </TabsTrigger>
                {/* <TabsTrigger
                  value="analysis"
                  className="w-full justify-start px-4 py-3 border-0 rounded-none data-[state=active]:bg-background data-[state=active]:border-r-2 data-[state=active]:border-primary"
                >
                  <div className="flex items-center gap-3">
                    <span>Analysis</span>
                  </div>
                </TabsTrigger> */}
                <TabsTrigger
                  value="competitors"
                  className="w-full justify-start px-4 py-3 border-0 rounded-none data-[state=active]:bg-background data-[state=active]:border-r-2 data-[state=active]:border-primary"
                >
                  <div className="flex items-center gap-3">
                    <span>Competitors</span>
                  </div>
                </TabsTrigger>
                {/* <TabsTrigger
                  value="ask-ai"
                  className="w-full justify-start px-4 py-3 border-0 rounded-none data-[state=active]:bg-background data-[state=active]:border-r-2 data-[state=active]:border-primary"
                >
                  <div className="flex items-center gap-3">
                    <span>Ask AI</span>
                  </div>
                </TabsTrigger> */}
                <TabsTrigger
                  value="title"
                  className="w-full justify-start px-4 py-3 border-0 rounded-none data-[state=active]:bg-background data-[state=active]:border-r-2 data-[state=active]:border-primary"
                >
                  <div className="flex items-center gap-3">
                    <span>Quality</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <TabsContent value="topics" className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Topics</h3>
                  </div>

                  {/* Topics with Analysis */}
                  {contentAnalysis?.topicScores && (
                    <div className="space-y-3">
                      {contentAnalysis.topicScores.map((topicScore, index) => (
                        <Card key={`${topicScore.topic}-${index}`}>
                          <CardHeader className="">
                            <div className="flex items-start justify-between group min-h-6">
                              <CardTitle className="text-sm">{topicScore.topic}</CardTitle>
                              <div className="flex items-center gap-2 justify-end hidden group-hover:flex">
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <ScoreBar score={topicScore.relevance * 100} label="Relevance" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Show AI topics if analysis hasn't completed yet */}
                  {content?.topics && !contentAnalysis?.topicScores && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-2">
                        {content?.topics?.map((topic, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <span className="text-sm">{topic}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Analysis, hidden for now */}
              <TabsContent value="analysis" className="p-6 space-y-6">
                {/* Content Quality Metrics */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Content Quality</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          <CardTitle className="text-sm">Title Score</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {contentAnalysis?.contentQuality.titleScore ?? 0}%
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mt-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${contentAnalysis?.contentQuality.titleScore ?? 0}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          <CardTitle className="text-sm">Meta Description</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {contentAnalysis?.contentQuality.metaDescriptionScore ?? 0}%
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mt-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${contentAnalysis?.contentQuality.metaDescriptionScore ?? 0}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          <CardTitle className="text-sm">Content Relevance</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {contentAnalysis?.contentQuality.contentRelevance ?? 0}%
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mt-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${contentAnalysis?.contentQuality.contentRelevance ?? 0}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          <CardTitle className="text-sm">Keyword Density</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {contentAnalysis?.contentQuality.keywordDensity ?? 0}%
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mt-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, contentAnalysis?.contentQuality.keywordDensity ?? 0)}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* AI-Generated Recommendations */}
                {contentAnalysis?.recommendations && contentAnalysis.recommendations.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">AI Recommendations</h3>
                    <div className="space-y-3">
                      {contentAnalysis.recommendations.map((recommendation, index) => (
                        <div key={index} className="border p-4 rounded-lg bg-muted/30">
                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded border-2 border-primary flex items-center justify-center mt-0.5 flex-shrink-0">
                              <Sparkles className="h-3 w-3 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm">{recommendation}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Legacy Recommendations */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Content Structure</h3>
                  <div className="space-y-3">
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="border p-4 rounded">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${rec.completed
                              ? "bg-green-600 border-green-600"
                              : "border-gray-500"
                              }`}
                          >
                            {rec.completed && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-2">
                              {rec.title}
                            </h4>
                            <p className="text-xs mb-2">{rec.details}</p>
                            <div className="p-2 rounded text-xs bg-muted/50">
                              <strong>Insight:</strong> {rec.insight}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="competitors" className="p-6 space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Competitor Analysis</h3>
                  <div className="space-y-3">
                    <div className="border p-4 rounded">
                      <a className="text-xs mb-2">example-competitor.com</a>
                      <ScoreBar score={78} label="Score" />
                    </div>
                    <div className="border p-4 rounded">
                      <a className="text-xs mb-2">another-competitor.com</a>
                      <ScoreBar score={82} label="Score" />
                    </div>
                    <div className="border p-4 rounded">
                      <a className="text-xs mb-2">third-competitor.com</a>
                      <ScoreBar score={65} label="Score" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ask-ai" className="p-6 space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Ask AI</h3>
                  <div className="space-y-4">
                    <div className="border p-4 rounded">
                      <h4 className="font-medium text-sm mb-2">
                        How can I improve my content score?
                      </h4>
                      <p className="text-xs">
                        Based on your current content, focus on adding more
                        structured data and improving keyword density in your
                        headings.
                      </p>
                    </div>
                    <div className="border p-4 rounded">
                      <h4 className="font-medium text-sm mb-2">
                        What keywords should I target?
                      </h4>
                      <p className="text-xs">
                        Consider targeting "AI visibility", "citation overlap",
                        and "content optimization" based on your topic.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Ask a question</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ask AI anything about your content..."
                          className="flex-1"
                        />
                        <Button size="sm">
                          <Sparkles className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="title" className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-2 justify-between">
                    <h3 className="font-semibold">Content</h3>
                    <Button variant="outline" size="sm" onClick={() => handleOptimizeContent()} disabled={optimizingContent}>
                      Optimize {optimizingContent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </Button>
                  </div>
                  <ScoreBar score={contentAnalysis?.contentQuality.contentRelevance ?? 0} label="Relevance" />
                  <ScoreBar score={contentAnalysis?.contentQuality.keywordDensity ?? 0} label="Keyword Density" />
                  <hr className="my-4" />
                  <div className="flex gap-2 justify-between">
                    <h3 className="font-semibold">Title</h3>
                    <Button variant="outline" size="sm" onClick={() => handleOptimizeTitle()}>
                      Optimize {optimizingTitle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </Button>
                  </div>
                  <ScoreBar score={contentAnalysis?.contentQuality.titleScore ?? 0} label="Content Quality" />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Enter your title..."
                        className="pr-10"
                        value={content?.title}
                        onChange={(e) => setContent({ ...content, title: e.target.value })}
                      />
                    </div>
                  </div>
                  <hr className="my-4" />
                  <div className="flex gap-2 justify-between">
                    <h3 className="font-semibold">Meta Description</h3>
                    <Button variant="outline" size="sm" onClick={() => handleOptimizeMetaDescription()}>
                      Optimize {optimizingMetaDescription ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Enter your meta description..."
                        className="pr-10"
                        value={content?.metaDescription}
                        onChange={(e) => setContent({ ...content, metaDescription: e.target.value })}
                      />
                      <ScoreBar score={contentAnalysis?.contentQuality.metaDescriptionScore ?? 0} label="Content Quality" />
                    </div>
                  </div>
                  <hr className="my-4" />
                  <div className="flex gap-2 justify-between">
                    <h3 className="font-semibold">Recommendations</h3>
                  </div>
                  {contentAnalysis?.recommendations && contentAnalysis.recommendations.length > 0 && (
                    <div className="space-y-4">
                      {contentAnalysis.recommendations.map((recommendation, index) => (
                        <Card key={index} className="space-y-4">
                          <CardContent>
                            <p className="text-sm">{recommendation}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Left Panel - Main Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-5 pt-5 flex-shrink-0">
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl font-semibold mb-2">{content?.title}</h1>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setActiveTab("title")}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 group">
              <p className="text-sm text-muted-foreground">
                {content?.metaDescription || "No description available"}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setActiveTab("title")}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>

            {content?.url && (
              <div className="my-3 flex w-full gap-2 items-center justify-between text-sm">
                <Label>URL: </Label>
                <div className="relative w-full line-clamp-1">
                  <a href={content?.url} target="_blank" rel="noopener noreferrer"> {sanitizeUrl(content?.url)} </a>
                </div>
              </div>
            )}
            <hr className="mt-6 border-t-2 border-t-muted" />
          </div>

          {/* Scrollable Editor Area */}
          <div className="flex-1 overflow-y-auto">
            {editorContent && (
              <MarkdownEditor content={editorContent} onChange={setEditorContent} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContentDetails;
