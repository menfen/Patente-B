// Serves the shared learning app in wwwroot (the same files the MAUI app packages for Android and Windows).
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    // Revalidate on every load (cheap 304s via ETag) so new questions or lessons show up without a hard refresh.
    OnPrepareResponse = ctx => ctx.Context.Response.Headers.CacheControl = "no-cache",
});

app.Run();
