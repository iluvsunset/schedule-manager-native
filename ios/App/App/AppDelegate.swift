import UIKit
import Capacitor
import BackgroundTasks

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if #available(iOS 13.0, *) {
            BGTaskScheduler.shared.register(forTaskWithIdentifier: "com.sunset.schedule.sync", using: nil) { task in
                self.handleAppRefresh(task: task as! BGAppRefreshTask)
            }
        } else {
            application.setMinimumBackgroundFetchInterval(UIApplication.backgroundFetchIntervalMinimum)
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // App is moving to inactive state
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        if #available(iOS 13.0, *) {
            scheduleAppRefresh()
        }
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

    // MARK: - Background Tasks (iOS 13+)
    @available(iOS 13.0, *)
    private func handleAppRefresh(task: BGAppRefreshTask) {
        scheduleAppRefresh()
        
        // Give Firebase a few seconds to sync
        DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
            task.setTaskCompleted(success: true)
        }
    }

    @available(iOS 13.0, *)
    private func scheduleAppRefresh() {
        let request = BGAppRefreshTaskRequest(identifier: "com.sunset.schedule.sync")
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            print("Could not schedule app refresh: \(error)")
        }
    }

    // MARK: - Legacy Background Fetch (iOS < 13.0)
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
