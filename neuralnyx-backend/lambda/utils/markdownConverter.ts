import * as TurndownService from 'turndown';

export interface MarkdownConversionOptions {
  includeImages?: boolean;
  includeLinks?: boolean;
  includeTables?: boolean;
  headingStyle?: 'setext' | 'atx';
}

// Type definitions for DOM elements
interface HTMLImageElement {
  src: string;
  alt: string;
  title: string;
}

interface HTMLAnchorElement {
  href: string;
  title: string;
}

export class MarkdownConverter {
  private turndownService: TurndownService;

  constructor(options: MarkdownConversionOptions = {}) {
    this.turndownService = new TurndownService({
      headingStyle: options.headingStyle || 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full',
    });

    // Configure custom rules for better markdown output
    this.configureCustomRules();
  }

  private configureCustomRules(): void {
    // Add rule for handling images
    this.turndownService.addRule('images', {
      filter: 'img',
      replacement: (content: string, node: any) => {
        const img = node as HTMLImageElement;
        const src = img.src || '';
        const alt = img.alt || '';
        const title = img.title || '';

        if (!src) return '';

        const titleAttr = title ? ` "${title}"` : '';
        return `![${alt}](${src}${titleAttr})`;
      },
    });

    // Add rule for handling links
    this.turndownService.addRule('links', {
      filter: 'a',
      replacement: (content: string, node: any) => {
        const link = node as HTMLAnchorElement;
        const href = link.href || '';
        const title = link.title || '';

        if (!href) return content;

        const titleAttr = title ? ` "${title}"` : '';
        return `[${content}](${href}${titleAttr})`;
      },
    });

    // Add rule for handling code blocks
    this.turndownService.addRule('codeBlocks', {
      filter: 'pre',
      replacement: (content: string, node: any) => {
        const code = node.querySelector('code');
        if (code) {
          const language = code.className.match(/language-(\w+)/)?.[1] || '';
          return `\n\`\`\`${language}\n${code.textContent}\n\`\`\`\n`;
        }
        return `\n\`\`\`\n${content}\n\`\`\`\n`;
      },
    });

    // Add rule for handling tables
    this.turndownService.addRule('tables', {
      filter: 'table',
      replacement: (content: string) => {
        return `\n${content}\n`;
      },
    });
  }

  /**
   * Convert HTML content to Markdown
   */
  public convertToMarkdown(
    html: string,
    options: MarkdownConversionOptions = {}
  ): string {
    try {
      // Clean up HTML before conversion
      const cleanedHtml = this.cleanHtml(html);

      // Convert to markdown
      let markdown = this.turndownService.turndown(cleanedHtml);

      // Post-process the markdown
      markdown = this.postProcessMarkdown(markdown);

      return markdown;
    } catch (error) {
      console.error('Error converting HTML to Markdown:', error);
      throw new Error('Failed to convert HTML to Markdown');
    }
  }

  /**
   * Clean HTML content before conversion
   */
  private cleanHtml(html: string): string {
    // Remove script and style tags
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove comments
    html = html.replace(/<!--[\s\S]*?-->/g, '');

    // Remove empty paragraphs
    html = html.replace(/<p[^>]*>\s*<\/p>/gi, '');

    // Normalize whitespace
    html = html.replace(/\s+/g, ' ');

    return html;
  }

  /**
   * Post-process markdown for better formatting
   */
  private postProcessMarkdown(markdown: string): string {
    // Remove excessive blank lines
    markdown = markdown.replace(/\n{3,}/g, '\n\n');

    // Ensure proper spacing around headers
    markdown = markdown.replace(/(\n|^)(#{1,6}\s+)/g, '\n\n$2');

    // Clean up list formatting
    markdown = markdown.replace(/\n- \n/g, '\n- ');

    // Remove leading/trailing whitespace
    markdown = markdown.trim();

    return markdown;
  }

  /**
   * Extract metadata from HTML for markdown generation
   */
  public extractMetadata(html: string): {
    title: string;
    description: string;
    wordCount: number;
    hasImages: boolean;
    hasLinks: boolean;
    hasTables: boolean;
  } {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const descMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i
    );
    const description = descMatch ? descMatch[1].trim() : '';

    // Count words in text content
    const textContent = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const wordCount = textContent
      .split(' ')
      .filter((word) => word.length > 0).length;

    const hasImages = /<img[^>]*>/i.test(html);
    const hasLinks = /<a[^>]*href/i.test(html);
    const hasTables = /<table[^>]*>/i.test(html);

    return {
      title,
      description,
      wordCount,
      hasImages,
      hasLinks,
      hasTables,
    };
  }
}
