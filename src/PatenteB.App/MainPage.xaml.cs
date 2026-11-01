namespace PatenteB.App;

public partial class MainPage : ContentPage
{
	Thickness barPadding;
	CancellationTokenSource? speech;
	IEnumerable<Locale>? locales;

	public MainPage()
	{
		InitializeComponent();
#if ANDROID
		// Android 15+ draws apps edge-to-edge; keep the web UI clear of the status and navigation bars.
		var res = Android.App.Application.Context.Resources!;
		float BarHeight(string name)
		{
			var id = res.GetIdentifier(name, "dimen", "android");
			return id > 0 ? res.GetDimensionPixelSize(id) / res.DisplayMetrics!.Density : 0;
		}
		Padding = new Thickness(0, BarHeight("status_bar_height"), 0, BarHeight("navigation_bar_height"));
#endif
		barPadding = Padding;
		// Messages from js/native.js: "speak|<lang>|<text>", "stop", "landscape|1", "landscape|0" or "open|<url>".
		AppView.RawMessageReceived += (_, e) => MainThread.BeginInvokeOnMainThread(() => OnWebMessage(e.Message ?? ""));
	}

	void OnWebMessage(string msg)
	{
		var parts = msg.Split('|', 3);
		switch (parts[0])
		{
			case "speak" when parts.Length == 3: _ = SpeakAsync(parts[2], parts[1]); break;
			case "stop": speech?.Cancel(); break;
			case "landscape" when parts.Length == 2: SetFullScreen(parts[1] == "1"); break;
			case "open" when parts.Length == 2 && Uri.TryCreate(parts[1], UriKind.Absolute, out var uri) && uri.Scheme is "https" or "http" or "mailto":
				_ = Launcher.Default.OpenAsync(uri); break;
		}
	}

	// The Android WebView has no speechSynthesis, so the web app asks the phone's own text-to-speech engine.
	async Task SpeakAsync(string text, string lang)
	{
		speech?.Cancel();
		var cts = speech = new CancellationTokenSource();
		try
		{
			locales ??= await TextToSpeech.Default.GetLocalesAsync();
			// Prefer Italy for Italian, Britain then the US for English, Egypt for Arabic.
			string[] countries = lang switch { "it" => ["IT"], "en" => ["GB", "US"], "ar" => ["EG"], _ => [] };
			var same = locales.Where(l => l.Language.StartsWith(lang, StringComparison.OrdinalIgnoreCase)).ToList();
			var locale = countries.Select(c => same.FirstOrDefault(l => string.Equals(l.Country, c, StringComparison.OrdinalIgnoreCase))).FirstOrDefault(l => l != null)
				?? same.FirstOrDefault();
			await TextToSpeech.Default.SpeakAsync(text, new SpeechOptions { Locale = locale }, cts.Token);
		}
		catch (OperationCanceledException) { }
		catch (Exception ex) { System.Diagnostics.Debug.WriteLine($"TTS failed: {ex.Message}"); }
		if (speech == cts)
		{
			speech = null;
			await AppView.EvaluateJavaScriptAsync("window.Native && window.Native.done()");
		}
	}

	// Full-screen video: landscape and no system bars on Android.
	void SetFullScreen(bool on)
	{
		Padding = on ? new Thickness(0) : barPadding;
#if ANDROID
		if (Platform.CurrentActivity is not { } act) return;
		act.RequestedOrientation = on ? Android.Content.PM.ScreenOrientation.SensorLandscape : Android.Content.PM.ScreenOrientation.Unspecified;
		var ctl = AndroidX.Core.View.WindowCompat.GetInsetsController(act.Window!, act.Window!.DecorView);
		var bars = AndroidX.Core.View.WindowInsetsCompat.Type.SystemBars();
		if (on)
		{
			ctl.SystemBarsBehavior = AndroidX.Core.View.WindowInsetsControllerCompat.BehaviorShowTransientBarsBySwipe;
			ctl.Hide(bars);
		}
		else ctl.Show(bars);
#endif
	}

	// Android hardware back button: step back inside the web app instead of closing it.
	protected override bool OnBackButtonPressed()
	{
		_ = GoBackInAppAsync();
		return true;
	}

	async Task GoBackInAppAsync()
	{
		var handled = await AppView.EvaluateJavaScriptAsync("window.appBack ? window.appBack() : false");
		if (handled != "true")
			Application.Current?.Quit();
	}
}
