const fs = require("fs");
const path = require("path");

// Update the config file path to point to the `script` folder
const configFile = path.join(__dirname, "flows_config.json");
// Update the output directory to be in the root directory
const outputDir = path.join(__dirname, "../ydx-edge-flow-templates");

function loadConfig() {
    if (!fs.existsSync(configFile)) {
        console.error("Config file not found!");
        process.exit(1); // Exit with failure
    }

    try {
        const configData = JSON.parse(fs.readFileSync(configFile, "utf8"));
        if (!Array.isArray(configData)) {
            console.error("Config file must contain an array of objects!");
            process.exit(1); // Exit with failure
        }
        return configData;
    } catch (error) {
        console.error("Error parsing config file:", error);
        process.exit(1); // Exit with failure
    }
}

function ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function mergeAndSortFlows(flowFiles) {
    let mergedFlows = [];

    flowFiles.forEach(file => {
        const filePath = path.join(__dirname, "../", file); // Adjusted to locate files in the root directory
        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${filePath}`);
            return;
        }

        try {
            const fileData = JSON.parse(fs.readFileSync(filePath, "utf8"));

            if (!Array.isArray(fileData)) {
                console.warn(`Skipping invalid JSON array file: ${filePath}`);
                return;
            }

            mergedFlows = [...mergedFlows, ...fileData];
        } catch (error) {
            console.error(`Error reading or parsing file: ${filePath}`, error);
        }
    });

    const uniqueFlows = Array.from(
        mergedFlows.reduce((map, flow) => map.set(flow.id, flow), new Map()).values()
    );

    const sortOrder = ["tab", "subflow", "mqtt-broker"];
    return uniqueFlows.sort((a, b) => {
        const indexA = sortOrder.indexOf(a.type);
        const indexB = sortOrder.indexOf(b.type);

        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;

        return indexA - indexB;
    });
}

function processConfig() {
    const config = loadConfig();
    if (!config) {
        process.exit(1); // Exit with failure
    }

    ensureDirectory(outputDir);

    config.forEach(entry => {
        const { name, dir, flows } = entry;

        dir.forEach(directory => {
            const targetDir = path.join(outputDir, directory);
            ensureDirectory(targetDir);

            const mergedFlows = mergeAndSortFlows(flows);
            const outputFile = path.join(targetDir, name);

            try {
                fs.writeFileSync(outputFile, JSON.stringify(mergedFlows, null, 2), "utf8");
                console.log(`Merged flows written to ${outputFile}`);
            } catch (error) {
                console.error(`Error writing file: ${outputFile}`, error);
                process.exit(1);
            }
        });
    });

    console.log("Processing completed successfully.");
    process.exit(0);
}

processConfig();
