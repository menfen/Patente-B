namespace PatenteB.App;

public partial class App : Application
{
	public App()
	{
		InitializeComponent();
	}

	protected override Window CreateWindow(IActivationState? activationState)
	{
		return new Window(new MainPage())
		{
			Title = "Patente B",
			Width = 1200,
			Height = 820,
			MinimumWidth = 380,
			MinimumHeight = 560,
		};
	}
}
