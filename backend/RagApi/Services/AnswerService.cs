using System.Text.RegularExpressions;
using RagApi.Models;

namespace RagApi.Services;

/// <summary>Retrieval-augmented answers: search first, then answer from the sources only.</summary>
public sealed class AnswerService(KnowledgeSearch search, RagAgents agents)
{
    private const int TopChunks = 5;

    /// <summary>Guardrail: a chunk the semantic ranker scores below this (the scale is 0 to 4) is too weak to answer from.</summary>
    private const double MinRerankerScore = 1.0;

    public const string NotFound = "I couldn't find that in the documents.";

    /// <summary>Finds the best chunks and builds the grounded prompt. No prompt means nothing good enough was found.</summary>
    public async Task<(string? Prompt, IReadOnlyList<Citation> Citations)> PrepareAsync(string question, CancellationToken ct)
    {
        var found = await search.SearchAsync(question, RetrievalMode.Semantic, TopChunks, ct);
        var hits = found.Where(hit => hit.RerankerScore >= MinRerankerScore).ToList();

        if (hits.Count == 0) return (null, []);

        var citations = hits
            .Select((hit, i) => new Citation(i + 1, hit.FileName, Shorten(hit.Content)))
            .ToList();

        var sources = string.Join("\n\n", hits.Select((hit, i) => $"[{i + 1}] {hit.FileName}\n{hit.Content}"));
        return ($"Sources:\n{sources}\n\nQuestion: {question}", citations);
    }

    public async Task<AskResponse> AskAsync(string question, CancellationToken ct)
    {
        var (prompt, citations) = await PrepareAsync(question, ct);
        if (prompt is null) return new AskResponse(NotFound, []);

        var response = await agents.Grounded.RunAsync(prompt, cancellationToken: ct);
        return new AskResponse(response.Text, CitedBy(response.Text, citations));
    }

    /// <summary>Keeps only the sources the answer cites, like [1] or [2].</summary>
    public static IReadOnlyList<Citation> CitedBy(string answer, IReadOnlyList<Citation> citations)
    {
        var cited = Regex.Matches(answer, @"\[(\d+)\]").Select(m => int.Parse(m.Groups[1].Value)).ToHashSet();
        return citations.Where(c => cited.Contains(c.Number)).ToList();
    }

    private static string Shorten(string text) => text.Length <= 160 ? text : text[..160] + "…";
}
