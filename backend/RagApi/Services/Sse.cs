using System.Text.Json;

namespace RagApi.Services;

// Server-Sent Events: "event: name", "data: json", and an empty line.
public static class Sse
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static void Start(HttpResponse response)
    {
        response.ContentType = "text/event-stream";
        response.Headers.CacheControl = "no-cache";
        response.Headers["X-Accel-Buffering"] = "no";
    }

    public static async Task SendAsync(HttpResponse response, string name, object data, CancellationToken ct)
    {
        await response.WriteAsync($"event: {name}\ndata: {JsonSerializer.Serialize(data, Json)}\n\n", ct);
        await response.Body.FlushAsync(ct);
    }
}
