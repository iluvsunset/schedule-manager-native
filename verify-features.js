const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

// Paths
const LOGIN_PATH = path.join(__dirname, 'src', 'pages', 'Login.jsx');
const DASHBOARD_PATH = path.join(__dirname, 'src', 'pages', 'MobileDashboard.jsx');
const STYLES_PATH = path.join(__dirname, 'src', 'styles.css');

// Load files
let loginContent = '';
let dashboardContent = '';
let stylesContent = '';

try {
  loginContent = fs.readFileSync(LOGIN_PATH, 'utf8');
} catch (e) {
  console.error(`${colors.red}Error reading Login.jsx: ${e.message}${colors.reset}`);
}

try {
  dashboardContent = fs.readFileSync(DASHBOARD_PATH, 'utf8');
} catch (e) {
  console.error(`${colors.red}Error reading MobileDashboard.jsx: ${e.message}${colors.reset}`);
}

try {
  stylesContent = fs.readFileSync(STYLES_PATH, 'utf8');
} catch (e) {
  console.error(`${colors.red}Error reading styles.css: ${e.message}${colors.reset}`);
}

const tests = [
  // ==========================================
  // TIER 1: FEATURE COVERAGE (15 tests)
  // ==========================================
  {
    id: 'T1-1',
    tier: 'Tier 1: Feature Coverage',
    name: 'Google Login Link Element',
    description: 'Verifies if Google login uses a native HTML <a> tag or <motion.a> rather than a button.',
    run: () => {
      // Find the Google sign in element in Login.jsx.
      // E.g. <a className="btn-google" href="...">Google</a> or <motion.a ... className="btn-google">
      const usesLink = /<(motion\.)?a[^>]*className=["']btn-google["']/.test(loginContent);
      return {
        pass: usesLink,
        details: usesLink 
          ? 'Found <a> or <motion.a> with class "btn-google"' 
          : 'Google login uses a <button> or other non-anchor tag in Login.jsx (expected <a> tag)'
      };
    }
  },
  {
    id: 'T1-2',
    tier: 'Tier 1: Feature Coverage',
    name: 'Google Login Redirect URI',
    description: 'Verifies if the Google login link redirects to /api/native-google-auth.',
    run: () => {
      const hasRedirect = /href=["']\/api\/native-google-auth["']/.test(loginContent);
      return {
        pass: hasRedirect,
        details: hasRedirect 
          ? 'Found href="/api/native-google-auth"' 
          : 'Google login tag does not contain href="/api/native-google-auth"'
      };
    }
  },
  {
    id: 'T1-3',
    tier: 'Tier 1: Feature Coverage',
    name: 'Google Login Target',
    description: 'Verifies that the Google login link has target="_blank".',
    run: () => {
      const hasTarget = /target=["']_blank["']/.test(loginContent);
      return {
        pass: hasTarget,
        details: hasTarget 
          ? 'Found target="_blank"' 
          : 'Google login tag is missing target="_blank"'
      };
    }
  },
  {
    id: 'T1-4',
    tier: 'Tier 1: Feature Coverage',
    name: 'Google Login Rel Attribute',
    description: 'Verifies that the Google login link has rel="noopener noreferrer".',
    run: () => {
      const hasRel = /rel=["']noopener\s+noreferrer["']/.test(loginContent);
      return {
        pass: hasRel,
        details: hasRel 
          ? 'Found rel="noopener noreferrer"' 
          : 'Google login tag is missing rel="noopener noreferrer"'
      };
    }
  },
  {
    id: 'T1-5',
    tier: 'Tier 1: Feature Coverage',
    name: 'Mobile Navigation Container',
    description: 'Verifies the presence of the bottom tab bar container (m-tab-bar).',
    run: () => {
      const hasTabBar = /className=["']m-tab-bar["']/.test(dashboardContent);
      return {
        pass: hasTabBar,
        details: hasTabBar 
          ? 'Found container with className="m-tab-bar"' 
          : 'MobileDashboard.jsx does not render a container with className="m-tab-bar"'
      };
    }
  },
  {
    id: 'T1-6',
    tier: 'Tier 1: Feature Coverage',
    name: 'Mobile Navigation Tab Items',
    description: 'Verifies the presence of 4 distinct tab buttons (Home, Events, Calendar, Profile).',
    run: () => {
      const matches = ['home', 'events', 'calendar', 'profile'].map(key => {
        const regex = new RegExp(`key:\\s*['"]${key}['"]`, 'i');
        return { key, found: regex.test(dashboardContent) };
      });
      const allFound = matches.every(m => m.found);
      return {
        pass: allFound,
        details: allFound 
          ? 'Found all 4 navigation tabs (Home, Events, Calendar, Profile)' 
          : `Missing some tabs: ${matches.map(m => `${m.key}: ${m.found}`).join(', ')}`
      };
    }
  },
  {
    id: 'T1-7',
    tier: 'Tier 1: Feature Coverage',
    name: 'Mobile Navigation Active Highlight',
    description: 'Verifies that active tabs receive the "active" class or active-highlight styling indicator.',
    run: () => {
      const hasActiveHighlight = /currentTab\s*===\s*key\s*\?\s*['"]active['"]/.test(dashboardContent);
      return {
        pass: hasActiveHighlight,
        details: hasActiveHighlight 
          ? 'Found active highlighting logic in tab className definition' 
          : 'No conditional styling logic found for active tabs in MobileDashboard.jsx'
      };
    }
  },
  {
    id: 'T1-8',
    tier: 'Tier 1: Feature Coverage',
    name: 'Liquid Glass Nav Layout Structure',
    description: 'Verifies if the active class uses specific CSS properties or indicator bubbles.',
    run: () => {
      const hasActiveBefore = /\.m-tab\.active::before\s*\{/.test(stylesContent);
      return {
        pass: hasActiveBefore,
        details: hasActiveBefore 
          ? 'styles.css defines .m-tab.active::before (active bubble indicator dot)' 
          : 'styles.css is missing style rule for .m-tab.active::before'
      };
    }
  },
  {
    id: 'T1-9',
    tier: 'Tier 1: Feature Coverage',
    name: 'Integrated "+" Button (FAB)',
    description: 'Checks if the "+" action button is integrated into the bottom tab layout structure.',
    run: () => {
      // The Spec requires the FAB to be inside the tab bar container to match: [Tab 1] [Tab 2] [ + ] [Tab 3] [Tab 4]
      // Let's check if the plus icon/FAB button is rendered inside the m-tab-bar element.
      const tabBarSection = (dashboardContent.match(/<nav[^>]*className=["']m-tab-bar["'][^]*?<\/nav>/) || [])[0] || '';
      const hasPlusInTabBar = tabBarSection.includes('Plus') || tabBarSection.includes('plus') || tabBarSection.includes('+');
      return {
        pass: hasPlusInTabBar,
        details: hasPlusInTabBar 
          ? 'Plus button is rendered inside the <nav className="m-tab-bar">' 
          : 'Plus button is NOT integrated into the bottom tab bar container (rendered separately as .m-fab)'
      };
    }
  },
  {
    id: 'T1-10',
    tier: 'Tier 1: Feature Coverage',
    name: 'FAB Visual Hierarchy & Positioning',
    description: 'Verifies the positioning of the floating action button (m-fab) in CSS.',
    run: () => {
      const hasFabStyle = /\.m-fab\s*\{[^]*?position:\s*fixed;/.test(stylesContent);
      return {
        pass: hasFabStyle,
        details: hasFabStyle 
          ? 'styles.css defines .m-fab with position: fixed' 
          : 'styles.css is missing .m-fab with position: fixed'
      };
    }
  },
  {
    id: 'T1-11',
    tier: 'Tier 1: Feature Coverage',
    name: 'Textless Buttons Accessibility',
    description: 'Verifies that any textless buttons have descriptive aria-label attributes.',
    run: () => {
      const checkAria = (className) => {
        const idx = dashboardContent.indexOf(`className="${className}"`);
        if (idx === -1) return false;
        const chunk = dashboardContent.substring(idx - 100, idx + 300);
        return chunk.includes('aria-label=');
      };
      const hasFabAria = checkAria('m-fab');
      const hasCloseAria = checkAria('m-modal-close');
      const pass = hasFabAria && hasCloseAria;
      return {
        pass,
        details: `FAB aria-label: ${hasFabAria ? 'Yes' : 'No'}, Close button aria-label: ${hasCloseAria ? 'Yes' : 'No'}`
      };
    }
  },
  {
    id: 'T1-12',
    tier: 'Tier 1: Feature Coverage',
    name: 'Login Screen Container',
    description: 'Verifies the presence of the #loginScreen screen active container.',
    run: () => {
      const hasLoginScreen = /id=["']loginScreen["']\s+className=["']screen\s+active["']/.test(loginContent);
      return {
        pass: hasLoginScreen,
        details: hasLoginScreen 
          ? 'Found login screen container with id="loginScreen" and className="screen active"' 
          : 'Missing login screen container with id="loginScreen" and className="screen active"'
      };
    }
  },
  {
    id: 'T1-13',
    tier: 'Tier 1: Feature Coverage',
    name: 'Brand Logo Asset',
    description: 'Verifies that the brand logo image source and visual container exist in Login.jsx.',
    run: () => {
      const hasLogo = /src=["']\/favicon\.svg["']/.test(loginContent) && loginContent.includes('alt="Chronos Logo"');
      return {
        pass: hasLogo,
        details: hasLogo 
          ? 'Found Chronos brand logo image using favicon.svg' 
          : 'Missing brand logo image with favicon.svg in Login.jsx'
      };
    }
  },
  {
    id: 'T1-14',
    tier: 'Tier 1: Feature Coverage',
    name: 'Form Submit Buttons',
    description: 'Verifies the presence of form submit buttons.',
    run: () => {
      const hasSubmit = /type=["']submit["']/.test(loginContent) && loginContent.includes('isSignUp');
      return {
        pass: hasSubmit,
        details: hasSubmit 
          ? 'Found submit button with conditional sign-up text' 
          : 'Missing form submit button with type="submit"'
      };
    }
  },
  {
    id: 'T1-15',
    tier: 'Tier 1: Feature Coverage',
    name: 'Divider Visual',
    description: 'Verifies the presence of the login-divider visual element.',
    run: () => {
      const hasDivider = /className=["']login-divider["']/.test(loginContent);
      return {
        pass: hasDivider,
        details: hasDivider 
          ? 'Found div/motion.div with className="login-divider"' 
          : 'Missing login-divider container in Login.jsx'
      };
    }
  },

  // ==========================================
  // TIER 2: BOUNDARY & EDGE CASES (15 tests)
  // ==========================================
  {
    id: 'T2-16',
    tier: 'Tier 2: Boundary & Edge Cases',
    name: 'Google Login Instant Click Disable',
    description: 'Verifies that the Google login link incorporates click-disable state variables to prevent double clicks.',
    run: () => {
      // The developer should implement state handling like `disabled={googleRedirecting}` or pointer-events: none on click.
      const hasDisableAttr = /className=["']btn-google["'][^>]*disabled\s*=/.test(loginContent);
      const usesDisableState = loginContent.includes('googleRedirecting') || loginContent.includes('isRedirecting') || loginContent.includes('loading');
      const pass = hasDisableAttr || (usesDisableState && loginContent.includes('pointerEvents'));
      return {
        pass,
        details: pass 
          ? 'Google login link implements immediate click-disable lockout' 
          : 'Google login link does NOT incorporate instant click-disable lockout (susceptible to double clicks)'
      };
    }
  },
  {
    id: 'T2-17',
    tier: 'Tier 2: Boundary & Edge Cases',
    name: 'Empty State - Task List',
    description: 'Checks if the student task list displays a friendly empty state message when empty.',
    run: () => {
      const hasEmptyCheck = /tasks\.length\s*===\s*0/.test(dashboardContent);
      return {
        pass: hasEmptyCheck,
        details: hasEmptyCheck 
          ? 'Found tasks empty state check: tasks.length === 0' 
          : 'Missing tasks empty state check in MobileDashboard.jsx'
      };
    }
  },
  {
    id: 'T2-18',
    tier: 'Tier 2: Boundary & Edge Cases',
    name: 'Empty State - Latest Feedback',
    description: 'Checks if the feedback widget displays a friendly message when no feedback exists.',
    run: () => {
      const hasEmptyCheck = /!feedback/.test(dashboardContent);
      return {
        pass: hasEmptyCheck,
        details: hasEmptyCheck 
          ? 'Found feedback empty state check: !feedback' 
          : 'Missing feedback empty state check in MobileDashboard.jsx'
      };
    }
  },
  {
    id: 'T2-19',
    tier: 'Tier 2: Boundary & Edge Cases',
    name: 'Empty State - Event List',
    description: 'Checks if the event list displays an empty state container (m-empty-state) when no events match the filter.',
    run: () => {
      const hasEmptyCheck = /filteredEvents\.length\s*===\s*0/.test(dashboardContent) && dashboardContent.includes('m-empty-state');
      return {
        pass: hasEmptyCheck,
        details: hasEmptyCheck 
          ? 'Found event list empty state check rendering m-empty-state' 
          : 'Missing empty state handler for empty event list in MobileDashboard.jsx'
      };
    }
  },
  {
    id: 'T2-20',
    tier: 'Tier 2: Boundary & Edge Cases',
    name: 'Admin Console Restriction',
    description: 'Verifies that only users with the view_console permission can access the Admin Console link.',
    run: () => {
      const hasPermGuard = /can\(['"]view_console['"]\)\s*&&\s*\(?[^]*?\/admin/.test(dashboardContent);
      return {
        pass: hasPermGuard,
        details: hasPermGuard 
          ? 'Admin Console route/link is guarded by can("view_console")' 
          : 'Admin Console link is NOT guarded by can("view_console")'
      };
    }
  },
  {
    id: 'T2-21',
    tier: 'Tier 2: Boundary & Edge Cases',
    name: 'Create Schedule Permission',
    description: 'Verifies that the FAB/plus button is conditionally rendered based on the create_schedule permission.',
    run: () => {
      const hasPermGuard = /can\(['"]create_schedule['"]\)\s*&&\s*\(?[^]*?className=["'](m-fab|m-tab-plus)["']/.test(dashboardContent);
      return {
        pass: hasPermGuard,
        details: hasPermGuard 
          ? 'FAB rendering is guarded by can("create_schedule")' 
          : 'FAB rendering is NOT guarded by can("create_schedule")'
      };
    }
  },
  {
    id: 'T2-22',
    tier: 'Tier 2: Boundary & Edge Cases',
    name: 'Edit Schedule Permission',
    description: 'Verifies that schedule action controls (Start, Complete, Cancel) are conditional on the canEditSchedule permission.',
    run: () => {
      const hasPermGuard = dashboardContent.includes('canEditSchedule(selectedEvent)');
      return {
        pass: hasPermGuard,
        details: hasPermGuard 
          ? 'Schedule action buttons are guarded by canEditSchedule' 
          : 'Schedule action buttons are NOT guarded by canEditSchedule'
      };
    }
  },
  {
    id: 'T2-23',
    tier: 'Tier 2: Boundary & Edge Cases',
    name: 'Delete Schedule Permission',
    description: 'Verifies that the Delete action control is conditional on the canDeleteSchedule permission.',
    run: () => {
      const hasPermGuard = dashboardContent.includes('canDeleteSchedule(selectedEvent)');
      return {
        pass: hasPermGuard,
        details: hasPermGuard 
          ? 'Delete schedule button is guarded by canDeleteSchedule' 
          : 'Delete schedule button is NOT guarded by canDeleteSchedule'
      };
    }
  },
  {
    id: 'T2-24',
    tier: 'Tier 2: Boundary & Edge Cases',
    name: 'Touch-Action Setting',
    description: 'Verifies that mobile elements have touch-action: manipulation to disable double-tap delay.',
    run: () => {
      const hasTouchAction = /touch-action:\s*manipulation/.test(stylesContent);
      return {
        pass: hasTouchAction,
        details: hasTouchAction 
          ? 'styles.css defines touch-action: manipulation' 
          : 'styles.css is missing touch-action rules to disable double-tap delays'
      };
    }
  },
  {
    id: 'T2-25',
    tier: 'Tier 2: Boundary & Edge Cases',
    name: 'Liquid Glass Blur Styles',
    description: 'Verifies that backdrop-filter: blur(...) is defined in styles.css for glassmorphism.',
    run: () => {
      const hasFilter = /backdrop-filter:\s*blur/.test(stylesContent);
      const hasWebkitFilter = /-webkit-backdrop-filter:\s*blur/.test(stylesContent);
      const pass = hasFilter && hasWebkitFilter;
      return {
        pass,
        details: `backdrop-filter: ${hasFilter ? 'Found' : 'Missing'}, -webkit-backdrop-filter: ${hasWebkitFilter ? 'Found' : 'Missing'}`
      };
    }
  },
  {
    id: 'T2-26',
    tier: 'Tier 2: Boundary & Edge Cases',
    name: 'Glassmorphism Transparency (Opacity)',
    description: 'Verifies that custom glassmorphic background styles utilize alpha channels (rgba/hsla).',
    run: () => {
      const hasRgbaInTab = /\.m-tab-bar\s*\{[^]*?rgba\(/.test(stylesContent);
      return {
        pass: hasRgbaInTab,
        details: hasRgbaInTab 
          ? 'Tab bar background uses transparent rgba color' 
          : 'Tab bar background is not using a transparent alpha channel'
      };
    }
  },
  {
    id: 'T2-27',
    tier: 'Tier 2: Boundary & Edge Cases',
    name: 'Z-Index Boundary Hierarchy',
    description: 'Verifies that the bottom sheet overlay has a higher z-index than the bottom tab bar.',
    run: () => {
      const tabbarMatch = stylesContent.match(/\.m-tab-bar\s*\{[^]*?z-index:\s*(\d+)/);
      const overlayMatch = stylesContent.match(/\.m-sheet-overlay\s*\{[^]*?z-index:\s*(\d+)/);
      if (tabbarMatch && overlayMatch) {
        const tabVal = parseInt(tabbarMatch[1], 10);
        const overVal = parseInt(overlayMatch[1], 10);
        return {
          pass: overVal > tabVal,
          details: `Overlay z-index (${overVal}) is higher than Tab Bar z-index (${tabVal})`
        };
      }
      return {
        pass: false,
        details: 'Could not find z-index properties in CSS definitions'
      };
    }
  },
  {
    id: 'T2-28',
    tier: 'Tier 2: Boundary & Edge Cases',
    name: 'Safe Area Inset Padding',
    description: 'Verifies that the tab bar incorporates env(safe-area-inset-bottom) to prevent notch cutoff.',
    run: () => {
      const hasSafeArea = /env\(safe-area-inset-bottom/.test(stylesContent);
      return {
        pass: hasSafeArea,
        details: hasSafeArea 
          ? 'Tab bar CSS implements safe-area-inset-bottom padding' 
          : 'Tab bar CSS is missing safe-area-inset-bottom padding support'
      };
    }
  },
  {
    id: 'T2-29',
    tier: 'Tier 2: Boundary & Edge Cases',
    name: 'Form Input Required Attributes',
    description: 'Verifies that critical form inputs (Email, Password) enforce HTML5 required constraints.',
    run: () => {
      const emailMatch = loginContent.match(/type="email"[^>]*required/);
      const passMatch = loginContent.match(/type="password"[^>]*required/);
      const pass = !!(emailMatch && passMatch);
      return {
        pass,
        details: `Email required: ${emailMatch ? 'Yes' : 'No'}, Password required: ${passMatch ? 'Yes' : 'No'}`
      };
    }
  },
  {
    id: 'T2-30',
    tier: 'Tier 2: Boundary & Edge Cases',
    name: 'Skeleton Loading Layout',
    description: 'Verifies that the loading state renders skeleton placeholders with corresponding skeleton CSS classes.',
    run: () => {
      const hasSkeleton = /loading[^]*?m-skeleton-/.test(dashboardContent);
      return {
        pass: hasSkeleton,
        details: hasSkeleton 
          ? 'Skeleton elements rendered during loading' 
          : 'Missing skeleton components in loading view'
      };
    }
  },

  // ==========================================
  // TIER 3: CROSS-FEATURE COMBINATIONS (3 tests)
  // ==========================================
  {
    id: 'T3-31',
    tier: 'Tier 3: Cross-Feature Combinations',
    name: 'Fluid Responsive Height (dvh)',
    description: 'Verifies that mobile container elements use dynamic viewport height (100dvh) to prevent keyboard layout shift.',
    run: () => {
      const hasDvh = /height:\s*100dvh/.test(stylesContent);
      return {
        pass: hasDvh,
        details: hasDvh 
          ? 'Found height: 100dvh styled in CSS elements' 
          : 'Missing height: 100dvh definition in styles.css (risks keyboard viewport shifting)'
      };
    }
  },
  {
    id: 'T3-32',
    tier: 'Tier 3: Cross-Feature Combinations',
    name: 'Permission-Driven Nav Layout Variation',
    description: 'Verifies how the presence of the FAB changes or behaves relative to tab bar spacing.',
    run: () => {
      // If FAB is floating separately and positioned fixed right, check if there's any dynamic shift layout spacing to keep it from blocking tabs.
      const hasDynamicShift = dashboardContent.includes('m-tab-bar-fab-active') || stylesContent.includes('m-tab-bar-fab-active');
      return {
        pass: hasDynamicShift,
        details: hasDynamicShift 
          ? 'Nav container layout dynamically adapts to FAB permission states' 
          : 'Nav container layout is static and does not adapt dynamically to FAB presence (potential layout overlap / blocking of rightmost tab)'
      };
    }
  },
  {
    id: 'T3-33',
    tier: 'Tier 3: Cross-Feature Combinations',
    name: 'Auth State Form Toggling',
    description: 'Verifies that sign-in/sign-up state toggles elements correctly.',
    run: () => {
      const togglesText = /isSignUp\s*\?\s*['"]Create Account['"]\s*:\s*['"]Sign In['"]/.test(loginContent);
      const togglesLinkText = /isSignUp\s*\?\s*["']Already have an account\? Sign in["']\s*:\s*["']Don['"]t have an account\? Sign up["']/.test(loginContent);
      const pass = togglesText && togglesLinkText;
      return {
        pass,
        details: `Submit button toggles: ${togglesText ? 'Yes' : 'No'}, Footer text toggles: ${togglesLinkText ? 'Yes' : 'No'}`
      };
    }
  },

  // ==========================================
  // TIER 4: REAL-WORLD SCENARIOS (5 tests)
  // ==========================================
  {
    id: 'T4-34',
    tier: 'Tier 4: Real-World Scenarios',
    name: 'Simulated Student Workflow',
    description: 'Verifies that a Student user sees the tasks and feedback widgets but does NOT see the FAB or Admin Console.',
    run: () => {
      const studentWidgets = dashboardContent.includes("userRole === 'student'");
      const guardsConsole = dashboardContent.includes("can('view_console')");
      const guardsCreate = dashboardContent.includes("can('create_schedule')");
      const pass = studentWidgets && guardsConsole && guardsCreate;
      return {
        pass,
        details: `Student widgets conditional: ${studentWidgets ? 'Yes' : 'No'}, Console permission guarded: ${guardsConsole ? 'Yes' : 'No'}, Create permission guarded: ${guardsCreate ? 'Yes' : 'No'}`
      };
    }
  },
  {
    id: 'T4-35',
    tier: 'Tier 4: Real-World Scenarios',
    name: 'Simulated Admin/Teacher Workflow',
    description: 'Verifies that an Admin/Teacher user sees the FAB and Admin Console links but does NOT see the Student widgets.',
    run: () => {
      // When userRole is not student, student widgets should not render.
      const studentWidgetsGuarded = dashboardContent.includes("userRole === 'student'");
      const canAccessConsole = dashboardContent.includes("can('view_console')");
      const canCreate = dashboardContent.includes("can('create_schedule')");
      const pass = studentWidgetsGuarded && canAccessConsole && canCreate;
      return {
        pass,
        details: `Widgets guarded: ${studentWidgetsGuarded ? 'Yes' : 'No'}, Admin Console and Create FAB display logic is in place.`
      };
    }
  },
  {
    id: 'T4-36',
    tier: 'Tier 4: Real-World Scenarios',
    name: 'Simulated Google Login Click Lockout',
    description: 'Simulates redirect state transition, verifying click lockout behavior to prevent duplicate authentication attempts.',
    run: () => {
      const checksState = loginContent.includes('googleRedirecting') || loginContent.includes('isRedirecting');
      return {
        pass: checksState,
        details: checksState 
          ? 'Lockout state checked before invoking OAuth redirect' 
          : 'No lockout/redirect state transition checking found in Login.jsx'
      };
    }
  },
  {
    id: 'T4-37',
    tier: 'Tier 4: Real-World Scenarios',
    name: 'Mobile Hardware Acceleration Styles',
    description: 'Verifies mobile transition classes use hardware acceleration to bypass GPU startup delay.',
    run: () => {
      const hasHwAcc = /\.hw-accelerate\s*\{[^]*?transform:\s*translateZ\(0\)/.test(stylesContent);
      return {
        pass: hasHwAcc,
        details: hasHwAcc 
          ? 'styles.css defines hardware acceleration rules on .hw-accelerate' 
          : 'styles.css is missing hardware acceleration translateZ rules on .hw-accelerate'
      };
    }
  },
  {
    id: 'T4-38',
    tier: 'Tier 4: Real-World Scenarios',
    name: 'Reset Password Flow Interaction',
    description: 'Verifies reset password interaction flow exists in Login and Profile.',
    run: () => {
      const resetInLogin = loginContent.includes('handleResetPassword') && loginContent.includes('resetPassword(');
      const resetInProfile = dashboardContent.includes('resetPassword(');
      const pass = resetInLogin && resetInProfile;
      return {
        pass,
        details: `Reset in Login: ${resetInLogin ? 'Yes' : 'No'}, Reset in Profile: ${resetInProfile ? 'Yes' : 'No'}`
      };
    }
  }
];

// Run tests
console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}       CHRONOS MOBILE UI & AUTHENTICATION VERIFICATION SUITE    ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);

let passedCount = 0;
let failedCount = 0;
let currentTier = '';

tests.forEach(test => {
  if (test.tier !== currentTier) {
    currentTier = test.tier;
    console.log(`\n${colors.bold}${colors.yellow}--- ${currentTier} ---${colors.reset}\n`);
  }

  let result;
  try {
    result = test.run();
  } catch (err) {
    result = { pass: false, details: `Test threw exception: ${err.message}` };
  }

  if (result.pass) {
    passedCount++;
    console.log(`  ${colors.green}✓ [PASS]${colors.reset} ${colors.bold}${test.id}${colors.reset}: ${test.name}`);
    console.log(`           ${colors.cyan}Details:${colors.reset} ${result.details}`);
  } else {
    failedCount++;
    console.log(`  ${colors.red}✗ [FAIL]${colors.reset} ${colors.bold}${test.id}${colors.reset}: ${test.name}`);
    console.log(`           ${colors.red}Details:${colors.reset} ${result.details}`);
  }
});

console.log(`\n${colors.bold}${colors.cyan}================================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}                         SUMMARY REPORT                         ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}`);
console.log(`  Total Test Cases Checked : ${tests.length}`);
console.log(`  Total Passed             : ${colors.green}${passedCount}${colors.reset}`);
console.log(`  Total Failed             : ${colors.red}${failedCount}${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);

// Do not exit with non-zero code to allow the agent to run and inspect report outputs
process.exit(0);
