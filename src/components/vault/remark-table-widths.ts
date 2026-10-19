import { separatorDashes, separatorLine } from '@/lib/vault-ui/table-widths';

/** The slice of mdast this plugin touches. */
interface MdNode {
  type: string;
  children?: MdNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
  data?: { hProperties?: Record<string, unknown> };
}

interface MdFile {
  value: unknown;
}

/** Tables with custom column widths (see table-widths) get them as a `data-col-widths` attribute, in percent. */
export function remarkTableWidths() {
  return (tree: MdNode, file: MdFile) => {
    const source = String(file.value);
    const visit = (node: MdNode) => {
      if (node.type === 'table') {
        const { start, end } = node.position ?? {};
        const dashes =
          start?.offset !== undefined && end?.offset !== undefined
            ? separatorDashes(separatorLine(source.slice(start.offset, end.offset)))
            : null;
        if (dashes) {
          const total = dashes.reduce((sum, d) => sum + d, 0);
          const percents = dashes.map((d) => ((d / total) * 100).toFixed(2));
          node.data = { ...node.data, hProperties: { 'data-col-widths': percents.join(',') } };
        }
        return;
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}
