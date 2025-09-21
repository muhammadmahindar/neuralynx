import { moduleRegistry } from "@/lib/moduleRegistry";
// import { analyticsModule } from "./analytics";
import { contentModule } from "./content";
import { settingsModule } from "./settings";
// import { socialModule } from "./social";
import { topicsModule } from "./topics";

// Register all modules
export function initializeModules() {
  moduleRegistry.register(topicsModule);
  moduleRegistry.register(contentModule);
  // moduleRegistry.register(socialModule);
  // moduleRegistry.register(analyticsModule);
  moduleRegistry.register(settingsModule);
}

// Export the registry for use in other parts of the app
export { moduleRegistry } from "@/lib/moduleRegistry";

// Export individual modules for direct access if needed
// export { analyticsModule } from "./analytics";
// export { socialModule } from "./social";
export { topicsModule } from "./topics";
