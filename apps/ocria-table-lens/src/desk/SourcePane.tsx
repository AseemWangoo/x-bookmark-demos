import { Button } from "@/components/ui/button";

type SourcePaneProps = {
  url: string;
  name: string;
  alt: string;
  width: number;
  height: number;
  pdf: { page: number; count: number; note: string | null } | null;
  pending: boolean;
  onPage: (page: number) => void;
};

export function SourcePane({ url, name, alt, width, height, pdf, pending, onPage }: SourcePaneProps) {
  return (
    <section aria-labelledby="source-heading" className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="source-heading" className="text-base font-medium">
          Original
        </h2>
        <p className="text-sm text-muted-foreground">{name}</p>
      </div>
      {pdf ? (
        <div className="flex flex-wrap items-center gap-2" aria-label="PDF page">
          <Button type="button" variant="outline" disabled={pending || pdf.page <= 1} onClick={() => onPage(pdf.page - 1)}>
            Previous page
          </Button>
          <p className="text-sm">
            Page {pdf.page} of {pdf.count}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={pending || pdf.page >= pdf.count}
            onClick={() => onPage(pdf.page + 1)}
          >
            Next page
          </Button>
        </div>
      ) : null}
      {pdf?.note ? <p className="text-sm text-muted-foreground">{pdf.note}</p> : null}
      <figure className="page-well">
        <img src={url} alt={alt} width={width} height={height} fetchPriority="high" />
        <figcaption className="mt-2 text-xs text-muted-foreground">{name}</figcaption>
      </figure>
    </section>
  );
}
