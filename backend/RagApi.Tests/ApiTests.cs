using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RagApi.Controllers;
using RagApi.Models;
using RagApi.Services;

namespace RagApi.Tests;

public class ApiTests
{
    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Ask_rejects_an_empty_question(string message)
    {
        var controller = new AskController(null!, null!, null!);

        var result = await controller.Post(new ChatRequest(message), default);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Ask_rejects_a_question_over_1000_characters()
    {
        var controller = new AskController(null!, null!, null!);

        var result = await controller.Post(new ChatRequest(new string('x', 1001)), default);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Search_rejects_an_unknown_mode()
    {
        var controller = new SearchController(null!);

        var result = await controller.Get("time off", "banana");

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public void Citations_keep_only_the_sources_the_answer_cites()
    {
        var citations = new[]
        {
            new Citation(1, "leave.md", "ten days"),
            new Citation(2, "travel.md", "economy class"),
            new Citation(3, "hr.md", "five years"),
        };

        var cited = AnswerService.CitedBy("Ten days [1], and more after five years [3].", citations);

        Assert.Equal(new[] { 1, 3 }, cited.Select(c => c.Number));
    }

    [Fact]
    public async Task Sse_writes_the_event_name_and_the_data()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await Sse.SendAsync(context.Response, "token", "Hello", default);

        context.Response.Body.Position = 0;
        var text = await new StreamReader(context.Response.Body).ReadToEndAsync();
        Assert.Equal("event: token|data: \"Hello\"||", text.ReplaceLineEndings("|"));
    }
}
