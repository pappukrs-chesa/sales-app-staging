const { withMainApplication, withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Custom Expo config plugin to initialize Firebase in MainApplication
 * and add necessary dependencies
 * This fixes the "Default FirebaseApp is not initialized" error
 */
module.exports = function withFirebaseInit(config) {
  // Add Firebase dependencies to app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    const { modResults } = config;
    let contents = modResults.contents;

    // Add Firebase dependencies if not already present
    if (!contents.includes('firebase-bom')) {
      const dependenciesMatch = contents.match(/(dependencies\s*\{[^}]*implementation\("com\.facebook\.react:react-android"\))/);
      if (dependenciesMatch) {
        const firebaseDeps = `${dependenciesMatch[1]}

    // Firebase dependencies
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'`;
        contents = contents.replace(dependenciesMatch[1], firebaseDeps);
      }
    }

    // Apply Google Services plugin at the end if not already present
    if (!contents.includes("apply plugin: 'com.google.gms.google-services'")) {
      contents = contents.trimEnd() + "\n\n// Apply Google Services plugin\napply plugin: 'com.google.gms.google-services'\n";
    }

    modResults.contents = contents;
    return config;
  });

  // Add Google Services classpath to project build.gradle
  config = withProjectBuildGradle(config, (config) => {
    const { modResults } = config;
    let contents = modResults.contents;

    // Add Google Services classpath if not already present
    if (!contents.includes('com.google.gms:google-services')) {
      const classpathMatch = contents.match(/(dependencies\s*\{[^}]*classpath\('org\.jetbrains\.kotlin:kotlin-gradle-plugin'\))/);
      if (classpathMatch) {
        const googleServicesClasspath = `${classpathMatch[1]}
    classpath('com.google.gms:google-services:4.4.0')`;
        contents = contents.replace(classpathMatch[1], googleServicesClasspath);
      }
    }

    modResults.contents = contents;
    return config;
  });

  // Add Firebase initialization to MainApplication
  config = withMainApplication(config, async (config) => {
    const { modResults } = config;
    let contents = modResults.contents;

    // Check if Firebase is already imported
    if (!contents.includes('com.google.firebase.FirebaseApp')) {
      // Add Firebase import after Configuration import
      const importMatch = contents.match(/(import\s+android\.content\.res\.Configuration)/);
      if (importMatch) {
        const importStatement = `${importMatch[1]}\n\nimport com.google.firebase.FirebaseApp`;
        contents = contents.replace(importMatch[1], importStatement);
      } else {
        // Fallback to Java syntax
        const packageMatch = contents.match(/(package\s+[\w.]+;)/);
        if (packageMatch) {
          const importStatement = `${packageMatch[1]}\n\nimport com.google.firebase.FirebaseApp;`;
          contents = contents.replace(packageMatch[1], importStatement);
        }
      }
    }

    // Check if Firebase is already initialized
    if (!contents.includes('FirebaseApp.initializeApp')) {
      // Find the onCreate method and add Firebase initialization
      const onCreateMatch = contents.match(/(override\s+fun\s+onCreate\(\)\s*\{\s*super\.onCreate\(\))/);

      if (onCreateMatch) {
        const firebaseInit = `${onCreateMatch[1]}\n    FirebaseApp.initializeApp(this)`;
        contents = contents.replace(onCreateMatch[1], firebaseInit);
      } else {
        // Try Java syntax
        const javaOnCreateMatch = contents.match(/(public\s+void\s+onCreate\(\)\s*\{\s*super\.onCreate\(\);)/);
        if (javaOnCreateMatch) {
          const firebaseInit = `${javaOnCreateMatch[1]}\n    FirebaseApp.initializeApp(this);`;
          contents = contents.replace(javaOnCreateMatch[1], firebaseInit);
        }
      }
    }

    modResults.contents = contents;
    return config;
  });

  return config;
};
