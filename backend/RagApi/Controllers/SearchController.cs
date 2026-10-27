using Microsoft.AspNetCore.Mvc;
using RagApi.Models;
using RagApi.Services;

namespace RagApi.Controllers;

[ApiController]
[Route("api/search")]
public sealed class SearchController(KnowledgeSearch search) : ControllerBase
{
    /// <summary>Searches the knowledge index. Mode: keyword, vector, hybrid or semantic.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SearchHit>>> Get(
        string q, string mode = "hybrid", int top = 5, CancellationToken ct = default)
    {
        if (!Enum.TryParse<RetrievalMode>(mode, ignoreCase: true, out var retrievalMode))
            return BadRequest("Mode must be keyword, vector, hybrid or semantic.");

        return Ok(await search.SearchAsync(q, retrievalMode, top, ct));
    }
}
