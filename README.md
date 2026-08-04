# mcp-kegg

KEGG REST MCP — Kyoto Encyclopedia of Genes and Genomes.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Kegg data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
