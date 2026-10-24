using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using RagApi.Models;
using RagApi.Services;

namespace RagApi.Controllers;

[ApiController]
[Route("api/ask")]
public sealed class AskController(AnswerService answers, RagAgents agents) : ControllerBase
{
    // Guardrail: limits on the input, so nobody sends an empty question or a whole book to the model.
    private const int MaxQuestionLength = 1000;
    private const string InvalidQuestion = "Send a question of 1 to 1000 characters.";

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    /// <summary>The whole answer at once, with its citations.</summary>
    [HttpPost]
    public async Task<ActionResult<AskResponse>> Post(ChatRequest request, CancellationToken ct)
    {
        if (!IsValid(request)) return BadRequest(InvalidQuestion);

        return await answers.AskAsync(request.Message, ct);
    }

    /// <summary>Server-Sent Events: the answer token by token, then its citations.</summary>
    [HttpPost("stream")]
    [Produces("text/event-stream")]
    public async Task<IActionResult> Stream(ChatRequest request, CancellationToken ct)
    {
        if (!IsValid(request)) return BadRequest(InvalidQuestion);

        Response.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no";

        var (prompt, citations) = await answers.PrepareAsync(request.Message, ct);
        if (prompt is null)
        {
            await Send("token", AnswerService.NotFound, ct);
            await Send("citations", citations, ct);
            await Send("done", "", ct);
            return new EmptyResult();
        }

        var answer = new StringBuilder();

        await foreach (var update in agents.Grounded.RunStreamingAsync(prompt, cancellationToken: ct))
        {
            if (string.IsNullOrEmpty(update.Text)) continue;
            answer.Append(update.Text);
            await Send("token", update.Text, ct);
        }

        await Send("citations", AnswerService.CitedBy(answer.ToString(), citations), ct);
        await Send("done", "", ct);
        return new EmptyResult();
    }

    private static bool IsValid(ChatRequest request) =>
        !string.IsNullOrWhiteSpace(request.Message) && request.Message.Length <= MaxQuestionLength;

    private async Task Send(string name, object data, CancellationToken ct)
    {
        await Response.WriteAsync($"event: {name}\ndata: {JsonSerializer.Serialize(data, Json)}\n\n", ct);
        await Response.Body.FlushAsync(ct);
    }
}
