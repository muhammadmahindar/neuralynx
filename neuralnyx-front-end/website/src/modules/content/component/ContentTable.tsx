import { DataTable } from "@/components/table/data-table";
import { Button } from "@/components/ui/button";
import type { Content } from "@/types/content";
import { Edit } from "lucide-react";
import { useCallback, useEffect, Fragment, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NewContentForm from "./NewContentForm";
import { api, API_ENDPOINTS } from "@/lib/api";
import { useDomain } from "@/contexts/DomainContext";
import { contentList } from "@/modules/content/pages/mock";
import { joinPath, sanitizeUrl } from "@/lib/utils";
import { useStore } from "@/contexts/StoreContext";

export function ContentTable() {
  const navigate = useNavigate();
  const { currentDomain } = useDomain();

  const columns = [
    {
      accessorKey: "title",
      header: () => <div className="text-start px-3">Title</div>,
      cell: ({ row }) => {
        const value = row.getValue("title");
        return (
          <div className="text-start px-3 flex-1 font-medium">{value}</div>
        );
      },
    },
    {
      accessorKey: "url",
      header: () => <div className="text-start">URL</div>,
      cell: ({ row }) => {
        const url = row.getValue("url");
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-start px-3 flex-1 font-medium"
          >
            {sanitizeUrl(url)}
          </a>
        );
      },
    },
    {
      accessorKey: "topics",
      header: () => <div className="text-start">Topics</div>,
      cell: ({ row }) => {
        const topics = row.getValue("topics");
        return (
          <>
            {topics?.map((topic: string) => (
              <div className="flex flex-wrap font-medium w-full text-xs text-muted-foreground">
                {topic}
              </div>
            ))}
            {!topics?.length && (
              <div className="flex flex-wrap font-medium w-full text-xs text-muted-foreground">
                No topics
              </div>
            )}
          </>
        );
      },
    },
    {
      id: "actions",
      header: () => <></>,
      cell: ({ row }) => {
        const { id, url } = row.original;
        return (
          <div className="text-end flex justify-end items-end font-medium w-full">
            <Button
              size="icon"
              variant="outline"
              onClick={() => handleEditContent(id, url)}
            >
              <Edit />
            </Button>
          </div>
        );
      },
    },
  ];

  const [contents, setContents] = useState<Content[]>([]);

  useEffect(() => {
    async function fetchUrls() {
      try {
        const { data } = await api.post<{ data: { content: Content[] } }>(
          API_ENDPOINTS.CONTENT.LIST,
          { domain: currentDomain.domain, limit: 10, offset: 0 }
        );
        console.log(data);
        setContents(data.content);
      } catch (error) {
        console.error("Error fetching content:", error);
        setContents(contentList);
      }
    }
    fetchUrls();
  }, [currentDomain]);

  interface FormData {
    selectedUrl: string;
    selectedTopic: string;
    tabType: "optimize-site" | "generate-content";
    platform: "linkedin" | "reddit" | "blog";
  }

  const handleFormSubmit = async (data: FormData) => {
    if (data.tabType === "optimize-site") {
      // Crawl url, obtain s3 urls
      const { content, title, metaDescription } = await getContentDetails(
        data.selectedUrl
      );
      store.set("content", {
        content,
        title,
        metaDescription,
      });
    } else {
      // TODO: Implement create content
      const createResponse = await api.post(API_ENDPOINTS.GENERATE_CONTENT, {
        payload: {
          businessSummary: JSON.stringify(currentDomain?.businessAnalysis),
          topics: [data.selectedTopic],
          platform: data?.platform,
        },
      });
      const { result } = createResponse.data;
      const { content, topics_covered } = result;
      store.set("content", {
        content: content.join("\n"),
        title: "",
        metaDescription: "",
        topics: topics_covered,
      });
    }
    navigate(`/dashboard/content/draft`);
  };

  const getContentDetails = async (url: string) => {
    const response = await api.post(API_ENDPOINTS.CONTENT.BASE, {
      url: joinPath(true, currentDomain.domain, url),
    });
    const { crawlResults, markdownResults } = response.data;
    const [markdownResponse, crawlResponse] = await Promise.all([
      fetch(markdownResults.presignedUrl),
      fetch(crawlResults.presignedUrl),
    ]);
    const markdown = await markdownResponse.text();
    const html = await crawlResponse.text();
    // obtain title, metaDescription from html
    const title = html.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const metaDescription =
      html.match(/<meta name="description" content="(.*?)"/)?.[1] || "";
    return { content: markdown, title, metaDescription };
  };

  const store = useStore();

  const handleEditContent = async (id: string, url: string) => {
    if (id) {
      navigate(`/dashboard/content/${id}`);
    } else {
      const { content, title, metaDescription } = await getContentDetails(url);
      store.set("content", {
        content,
        title,
        metaDescription,
      });
      navigate(`/dashboard/content/${encodeURIComponent(url)}`);
    }
  };

  return (
    <Fragment>
      <div className="flex flex-col gap-0 w-full h-full ">
        <header className="flex flex-row gap-2 justify-between items-center px-4 py-2 border-b">
          <p className="font-semibold">Content</p>
          <NewContentForm onSubmit={handleFormSubmit} />
        </header>
        <DataTable columns={columns} data={contents} />
      </div>
    </Fragment>
  );
}
