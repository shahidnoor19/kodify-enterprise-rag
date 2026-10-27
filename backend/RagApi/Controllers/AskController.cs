using System.Text;
using Microsoft.AspNetCore.Mvc;
using RagApi.Models;
using RagApi.Services;

namespace RagApi.Controllers;

[ApiController]
[Route("api/ask")]
public sealed class AskController(AnswerService answers, RagAgents agents, ImageAnswers images) : ControllerBase
{
    // Guardrail: limits on the input, so nobody sends an empty question or a whole book to the model.
    private const int MaxQuestionLength = 1000;
    private const string InvalidQuestion = "Send a question of 1 to 1000 characters.";

    // The whole answer at once, with its citations.
    [HttpPost]
    public async Task<ActionResult<AskResponse>> Post(ChatRequest request, CancellationToken ct)
    {
        if (!IsValid(request)) return BadRequest(InvalidQuestion);
        return await answers.AskAsync(request.Message, ct);
    }

    // Knowledge Base mode: a status line, the answer token by token, then its citations.
    [HttpPost("stream")]
    [Produces("text/event-stream")]
    public async Task<IActionResult> Stream(ChatRequest request, CancellationToken ct)
    {
        if (!IsValid(request)) return BadRequest(InvalidQuestion);
        Sse.Start(Response);

        try
        {
            await WriteAnswerAsync(request, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // The client left (Stop, a closed tab): not an error.
        }
        return new EmptyResult();
    }

    private async Task WriteAnswerAsync(ChatRequest request, CancellationToken ct)
    {
        await Sse.SendAsync(Response, "status", "Searching the knowledge base…", ct);
        var question = await answers.StandaloneQuestionAsync(request, ct);
        var (prompt, citations) = await answers.PrepareAsync(question, ct);
        if (prompt is null)
        {
            await Sse.SendAsync(Response, "token", AnswerService.NotFound, ct);
            await Sse.SendAsync(Response, "citations", citations, ct);
            await Sse.SendAsync(Response, "done", "", ct);
            return;
        }

        await Sse.SendAsync(Response, "status", "Writing the answer…", ct);
        var answer = new StringBuilder();
        await foreach (var update in agents.Grounded.RunStreamingAsync(prompt, cancellationToken: ct))
        {
            if (string.IsNullOrEmpty(update.Text)) continue;
            answer.Append(update.Text);
            await Sse.SendAsync(Response, "token", update.Text, ct);
        }
        await Sse.SendAsync(Response, "citations", AnswerService.CitedBy(answer.ToString(), citations), ct);
        await Sse.SendAsync(Response, "done", "", ct);
    }

    // Image mode: find the best image, show it to the vision model, and stream what it sees.
    [HttpPost("images/stream")]
    [Produces("text/event-stream")]
    public async Task<IActionResult> ImageStream(ChatRequest request, CancellationToken ct)
    {
        if (!IsValid(request)) return BadRequest(InvalidQuestion);
        Sse.Start(Response);

        try
        {
            await WriteImageAnswerAsync(request, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // The client left (Stop, a closed tab): not an error.
        }
        return new EmptyResult();
    }

    private async Task WriteImageAnswerAsync(ChatRequest request, CancellationToken ct)
    {
        await Sse.SendAsync(Response, "status", "Searching the image library…", ct);
        var question = await answers.StandaloneQuestionAsync(request, ct);
        var image = await images.FindAsync(question, ct);
        if (image is null)
        {
            await Sse.SendAsync(Response, "token", "I couldn't find a matching image in the library.", ct);
            await Sse.SendAsync(Response, "done", "", ct);
            return;
        }

        await Sse.SendAsync(Response, "status", "Looking at the image…", ct);
        await Sse.SendAsync(Response, "citations", new[] { new Citation(1, image.FileName, image.Caption) }, ct);
        await foreach (var text in images.AnswerAsync(question, image, ct))
            await Sse.SendAsync(Response, "token", text, ct);
        await Sse.SendAsync(Response, "done", "", ct);
    }

    private static bool IsValid(ChatRequest request) =>
        !string.IsNullOrWhiteSpace(request.Message) && request.Message.Length <= MaxQuestionLength;
}
