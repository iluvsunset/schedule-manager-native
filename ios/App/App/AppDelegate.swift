import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Enable background fetch - iOS will periodically wake the app
        // to let Firebase sync pending offline changes
        application.setMinimumBackgroundFetchInterval(UIApplication.backgroundFetchIntervalMinimum)
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // App is moving to inactive state
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // App entered background - Firebase WebView stays alive briefly
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Coming back to foreground
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // App became active again - Firebase will auto-reconnect
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // App is being terminated
    }

    // MARK: - Background Fetch
    // When iOS decides to wake the app for a background fetch,
    // the Capacitor WebView (and Firebase) will reconnect and
    // automatically sync any queued offline writes
    func application(_ application: UIApplication, performFetchWithCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        // Give Firebase a few seconds to sync
        DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
            completionHandler(.newData)
        }
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
