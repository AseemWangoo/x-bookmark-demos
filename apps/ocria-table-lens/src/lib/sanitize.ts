import { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";

const EXTRA_TAGS = [
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "br",
  "mark",
  "u",
  "sub",
  "sup",
  "page-header",
  "page-footer",
  "page-number",
  "page-watermark",
];

export const markdownSchema: SanitizeSchema = {
  ...defaultSchema,
  tagNames: Array.from(new Set([...(defaultSchema.tagNames ?? []), ...EXTRA_TAGS])),
  attributes: {
    ...defaultSchema.attributes,
    th: [...(defaultSchema.attributes?.th ?? []), "colspan", "rowspan"],
    td: [...(defaultSchema.attributes?.td ?? []), "colspan", "rowspan"],
  },
};
