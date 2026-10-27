using Microsoft.Agents.AI;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.AI;
using RagApi.Models;
using RagApi.Services;
using ChatResponse = RagApi.Models.ChatResponse;

namespace RagApi.Controllers;

[ApiController]
[Route("api/chat")]
public sealed class ChatController(RagAgents agents, ImageAgent imageAgent) : ControllerBase
{
    [HttpPost]
    public async Task<ChatResponse> Post(ChatRequest request, CancellationToken ct)
    {
        var response = await agents.General.RunAsync(request.Message, cancellationToken: ct);
        return new ChatResponse(response.Text);
    }

    // General mode, streamed: the image agent answers, and draws when the user asks for a picture.
    [HttpPost("stream")]
    [Produces("text/event-stream")]
    public async Task<IActionResult> Stream(ChatRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Message) || request.Message.Length > 1000)
            return BadRequest("Send a message of 1 to 1000 characters.");
        Sse.Start(Response);

        // The earlier messages go to the model first, so it remembers the conversation.
        var messages = (request.History ?? []).TakeLast(10)
            .Select(turn => new ChatMessage(turn.Role == "user" ? ChatRole.User : ChatRole.Assistant, turn.Text))
            .Append(new ChatMessage(ChatRole.User, request.Message));

        try
        {
            await foreach (var update in imageAgent.Agent.RunStreamingAsync(messages, cancellationToken: ct))
            {
                // The model asked for the tool: tell the client, because an image takes a while.
                if (update.Contents.OfType<FunctionCallContent>().Any())
                    await Sse.SendAsync(Response, "status", "Creating image…", ct);
                if (!string.IsNullOrEmpty(update.Text))
                    await Sse.SendAsync(Response, "token", update.Text, ct);
            }
            await Sse.SendAsync(Response, "done", "", ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // The client left (Stop, a closed tab): not an error.
        }
        return new EmptyResult();
    }
}
