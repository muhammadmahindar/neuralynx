import { useDomain } from "@/contexts/DomainContext";
import { cn } from "@udecode/cn";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function OptimizeSiteSelector({
  value,
  setValue,
}: {
  value: string;
  setValue: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>URLs</Label>
      <SitemapSelector setValue={setValue} value={value} />
    </div>
  );
}

export function SitemapSelector({
  setValue,
  value,
}: {
  setValue: (value: string) => void;
  value: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  const { currentDomain } = useDomain();
  const [sitemaps, setSitemaps] = useState<string[]>([]);

  useEffect(() => {
    if (!currentDomain?.sitemapResults?.presignedUrl) return;

    fetch(currentDomain.sitemapResults.presignedUrl)
      .then((res) => res.json())
      .then((data) => {
        setSitemaps(
          data?.sitemapUrls.slice(0, 50)
            ?.filter((sitemap) => sitemap.includes("/blog"))
            .map((sitemap) => new URL(sitemap)?.pathname)
        );
      });
  }, [currentDomain?.sitemapResults?.presignedUrl]);

  const handleSelect = (selectedValue: string) => {
    setValue(selectedValue);
    setOpen(false);
    setSearchValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchValue.trim()) {
      // Allow custom input by pressing Enter
      handleSelect(searchValue.trim());
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between"
        >
          {value || "Select or enter URL..."}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput
            placeholder="Search URLs or type custom URL..."
            value={searchValue}
            onValueChange={setSearchValue}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            <CommandEmpty>
              {searchValue.trim() ? (
                <div className="py-2 text-center text-sm text-muted-foreground">
                  Press Enter to use "{searchValue.trim()}" or select from suggestions below
                </div>
              ) : (
                "No URLs found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {sitemaps.map((sitemap) => (
                <CommandItem
                  key={sitemap}
                  value={sitemap}
                  className="truncate"
                  onSelect={() => handleSelect(sitemap)}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === sitemap ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {sitemap}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
