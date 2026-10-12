using Microsoft.AspNetCore.Mvc;
using RagApi.Models;
using RagApi.Services;

namespace RagApi.Controllers;

[ApiController]
[Route("api/chat")]
public sealed class ChatController(RagAgents agents) : ControllerBase
{
    [HttpPost]
    public async Task<ChatResponse> Post(ChatRequest request, CancellationToken ct)
    {
        var response = await agents.General.RunAsync(request.Message, cancellationToken: ct);
        return new ChatResponse(response.Text);
    }
}
