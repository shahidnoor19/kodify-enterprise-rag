using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using RagApi.Options;

namespace RagApi.Controllers;

[ApiController]
[Route("api/health")]
public sealed class HealthController(IOptions<FoundryOptions> foundry) : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new
    {
        status = "ok",
        foundry = new { configured = foundry.Value.IsConfigured, foundry.Value.ChatDeployment },
    });
}
