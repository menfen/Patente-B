using Microsoft.Extensions.Logging;
using Microsoft.Maui.Handlers;

namespace PatenteB.App;

public static class MauiProgram
{
	public static MauiApp CreateMauiApp()
	{
		var builder = MauiApp.CreateBuilder();
		builder
			.UseMauiApp<App>()
			.ConfigureFonts(fonts =>
			{
				fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
				fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
			});

		// The web app keeps progress in localStorage; make sure Android's WebView allows it.
		HybridWebViewHandler.Mapper.AppendToMapping("EnableStorage", (handler, view) =>
		{
#if ANDROID
			handler.PlatformView.Settings.DomStorageEnabled = true;
			handler.PlatformView.Settings.MediaPlaybackRequiresUserGesture = false;
#endif
		});

#if DEBUG
		builder.Services.AddHybridWebViewDeveloperTools();
		builder.Logging.AddDebug();
#endif

		return builder.Build();
	}
}
