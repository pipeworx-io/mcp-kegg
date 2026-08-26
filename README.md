# mcp-kegg

KEGG REST MCP — Kyoto Encyclopedia of Genes and Genomes.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `find` | Search KEGG by keyword. KEGG is the authoritative bioinformatics database for compounds, drugs, diseases, metabolic pathways, genes, and enzymes. Pick a database (compound\|drug\|disease\|pathway\|genes\|enzyme\|glycan\|module\|ko) and pass a query like "glucose", "aspirin", or "diabetes". Returns matching KEGG IDs with descriptions. Keyless. |
| `get_entry` | Fetch a full KEGG flat-file entry by ID and return it as parsed fields plus raw text. IDs look like "C00031" (compound), "hsa00010" (pathway), "D00009" (drug), "K00844" (KO/ortholog), or "ec:1.1.1.1" (enzyme). Parsed fields include ENTRY, NAME, FORMULA, CLASS, PATHWAY, DESCRIPTION, cross-references, and more. Use find first to discover IDs. Keyless. |
| `list_database` | List all entries in a KEGG database (id + description). Useful for enumerating things like KEGG pathways ("pathway"), drugs ("drug"), or supported organisms ("organism"). Results are capped at 100 with a truncated flag. Keyless. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "kegg": {
      "url": "https://gateway.pipeworx.io/kegg/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/kegg/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Kegg data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
