type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
    hChildren?: MarkdownNode[];
  };
};

type InlineFootnote = {
  id: number;
  text: string;
};

const INLINE_FOOTNOTE_PATTERN = /\^\[([^\]]+)\]/g;

function text(value: string): MarkdownNode {
  return { type: 'text', value };
}

function footnoteReference(id: number): MarkdownNode {
  return {
    type: 'inlineFootnoteReference',
    data: {
      hName: 'sup',
      hProperties: {
        id: `fnref-${id}`,
        className: ['footnote-ref'],
      },
      hChildren: [
        {
          type: 'element',
          tagName: 'a',
          properties: {
            href: `#fn-${id}`,
            ariaLabel: `각주 ${id}`,
            className: ['footnote-link'],
          },
          children: [{ type: 'text', value: String(id) }],
        } as MarkdownNode,
      ],
    },
  };
}

function footnotesSection(footnotes: InlineFootnote[]): MarkdownNode {
  return {
    type: 'inlineFootnotesSection',
    data: {
      hName: 'section',
      hProperties: {
        className: ['footnotes'],
        ariaLabel: '각주',
      },
      hChildren: [
        {
          type: 'element',
          tagName: 'hr',
          properties: {},
          children: [],
        } as MarkdownNode,
        {
          type: 'element',
          tagName: 'ol',
          properties: {},
          children: footnotes.map((note) => ({
            type: 'element',
            tagName: 'li',
            properties: { id: `fn-${note.id}` },
            children: [
              { type: 'text', value: note.text },
              { type: 'text', value: ' ' },
              {
                type: 'element',
                tagName: 'a',
                properties: {
                  href: `#fnref-${note.id}`,
                  ariaLabel: `각주 ${note.id}로 돌아가기`,
                  className: ['footnote-backref'],
                },
                children: [{ type: 'text', value: '↩' }],
              },
            ],
          })) as MarkdownNode[],
        } as MarkdownNode,
      ],
    },
  };
}

function expandInlineFootnotes(node: MarkdownNode, footnotes: InlineFootnote[]): void {
  if (!node.children) return;

  const nextChildren: MarkdownNode[] = [];

  for (const child of node.children) {
    if (child.type === 'text' && typeof child.value === 'string') {
      INLINE_FOOTNOTE_PATTERN.lastIndex = 0;
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      let replaced = false;

      while ((match = INLINE_FOOTNOTE_PATTERN.exec(child.value)) !== null) {
        replaced = true;
        if (match.index > lastIndex) {
          nextChildren.push(text(child.value.slice(lastIndex, match.index)));
        }

        const id = footnotes.length + 1;
        footnotes.push({ id, text: match[1] });
        nextChildren.push(footnoteReference(id));
        lastIndex = match.index + match[0].length;
      }

      if (replaced) {
        if (lastIndex < child.value.length) {
          nextChildren.push(text(child.value.slice(lastIndex)));
        }
      } else {
        nextChildren.push(child);
      }
    } else {
      expandInlineFootnotes(child, footnotes);
      nextChildren.push(child);
    }
  }

  node.children = nextChildren;
}

export function remarkInlineFootnotes() {
  return (tree: MarkdownNode) => {
    const footnotes: InlineFootnote[] = [];
    expandInlineFootnotes(tree, footnotes);

    if (footnotes.length > 0) {
      tree.children = [...(tree.children ?? []), footnotesSection(footnotes)];
    }
  };
}
