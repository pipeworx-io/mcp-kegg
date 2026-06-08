interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * KEGG REST MCP — Kyoto Encyclopedia of Genes and Genomes.
 *
 * Authoritative bioinformatics database: search compounds, drugs, diseases,
 * pathways, genes, and enzymes by name; fetch full flat-file entries (formula,
 * pathways, cross-references); list database contents. Keyless.
 *
 * NOTE: KEGG responses are FLAT TAB-SEPARATED TEXT, not JSON. Everything here
 * fetches as text and parses line-by-line.
 */


const BASE = 'https://rest.kegg.jp';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const FIND_DATABASES = [
  'compound',
  'drug',
  'disease',
  'pathway',
  'genes',
  'enzyme',
  'glycan',
  'module',
  'ko',
];

const FIND_CAP = 50;
const LIST_CAP = 100;

const tools: McpToolExport['tools'] = [
  {
    name: 'find',
    description:
      'Search KEGG by keyword. KEGG is the authoritative bioinformatics database for compounds, drugs, diseases, metabolic pathways, genes, and enzymes. Pick a database (compound|drug|disease|pathway|genes|enzyme|glycan|module|ko) and pass a query like "glucose", "aspirin", or "diabetes". Returns matching KEGG IDs with descriptions. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        database: {
          type: 'string',
          description:
            'One of: compound, drug, disease, pathway, genes, enzyme, glycan, module, ko.',
        },
        query: {
          type: 'string',
          description: 'Search term, e.g. "glucose", "aspirin", "diabetes".',
        },
      },
      required: ['database', 'query'],
    },
  },
  {
    name: 'get_entry',
    description:
      'Fetch a full KEGG flat-file entry by ID and return it as parsed fields plus raw text. IDs look like "C00031" (compound), "hsa00010" (pathway), "D00009" (drug), "K00844" (KO/ortholog), or "ec:1.1.1.1" (enzyme). Parsed fields include ENTRY, NAME, FORMULA, CLASS, PATHWAY, DESCRIPTION, cross-references, and more. Use find first to discover IDs. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description:
            'A KEGG entry ID, e.g. "C00031", "hsa00010", "D00009", "K00844", "ec:1.1.1.1".',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_database',
    description:
      'List all entries in a KEGG database (id + description). Useful for enumerating things like KEGG pathways ("pathway"), drugs ("drug"), or supported organisms ("organism"). Results are capped at 100 with a truncated flag. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        database: {
          type: 'string',
          description: 'A KEGG database name, e.g. "pathway", "organism", "drug", "compound".',
        },
      },
      required: ['database'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'find':
        return await doFind(args);
      case 'get_entry':
        return await doGetEntry(args);
      case 'list_database':
        return await doListDatabase(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

async function doFind(args: Record<string, unknown>): Promise<unknown> {
  const database = reqStr(args, 'database');
  const query = reqStr(args, 'query');
  if (!database) return { error: 'invalid database', valid: FIND_DATABASES };
  if (!FIND_DATABASES.includes(database)) return { error: 'invalid database', valid: FIND_DATABASES };
  if (!query) return { error: 'query is required' };

  const text = await keggGet(`/find/${enc(database)}/${enc(query)}`);
  const lines = nonEmptyLines(text);
  const all = lines.map((line) => {
    const tab = line.indexOf('\t');
    if (tab === -1) return { id: line.trim(), description: '' };
    return { id: line.slice(0, tab).trim(), description: line.slice(tab + 1).trim() };
  });
  const truncated = all.length > FIND_CAP;
  const results = all.slice(0, FIND_CAP);
  return {
    database,
    query,
    count: all.length,
    truncated,
    results,
  };
}

async function doGetEntry(args: Record<string, unknown>): Promise<unknown> {
  const id = reqStr(args, 'id');
  if (!id) return { error: 'id is required' };

  const text = await keggGet(`/get/${enc(id)}`);
  if (text.trim() === '') return { error: 'entry not found', id };

  const fields = parseFlatFile(text);
  return {
    id,
    fields,
    raw: text.slice(0, 4000),
  };
}

async function doListDatabase(args: Record<string, unknown>): Promise<unknown> {
  const database = reqStr(args, 'database');
  if (!database) return { error: 'database is required' };

  const text = await keggGet(`/list/${enc(database)}`);
  const lines = nonEmptyLines(text);
  const all = lines.map((line) => {
    const tab = line.indexOf('\t');
    if (tab === -1) return { id: line.trim(), description: '' };
    return { id: line.slice(0, tab).trim(), description: line.slice(tab + 1).trim() };
  });
  const truncated = all.length > LIST_CAP;
  return {
    database,
    count: all.length,
    truncated,
    entries: all.slice(0, LIST_CAP),
  };
}

/**
 * Parse a KEGG flat-file entry into FIELD -> value.
 * A line whose first character (col 0) is non-space starts a new field: the
 * first whitespace-delimited token is the keyword, the rest of the line is the
 * value. Indented continuation lines (starting with a space) append to the
 * current field's value.
 */
function parseFlatFile(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let current: string | null = null;
  for (const rawLine of text.split('\n')) {
    if (rawLine === '///' || rawLine.trim() === '///') continue;
    if (rawLine.trim() === '') {
      if (current) fields[current] += '\n';
      continue;
    }
    if (rawLine[0] !== ' ' && rawLine[0] !== '\t') {
      // New field. Keyword is the first token; value is the remainder.
      const match = rawLine.match(/^(\S+)\s*(.*)$/);
      if (match) {
        const keyword = match[1];
        const value = match[2];
        current = keyword;
        if (keyword in fields) {
          fields[keyword] += '\n' + value;
        } else {
          fields[keyword] = value;
        }
      }
    } else if (current) {
      // Continuation line: append trimmed value.
      const cont = rawLine.trim();
      fields[current] += (fields[current] ? '\n' : '') + cont;
    }
  }
  // Tidy: collapse trailing whitespace/newlines.
  for (const k of Object.keys(fields)) {
    fields[k] = fields[k].replace(/\n+$/g, '').replace(/[ \t]+$/gm, '');
  }
  return fields;
}

async function keggGet(path: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'User-Agent': UA, Accept: 'text/plain' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`KEGG: ${res.status} ${body.slice(0, 200)}`.trim());
  }
  return res.text();
}

function nonEmptyLines(text: string): string[] {
  return text.split('\n').filter((l) => l.trim() !== '');
}

function enc(s: string): string {
  return encodeURIComponent(s);
}

function reqStr(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  return typeof v === 'string' ? v.trim() : '';
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
